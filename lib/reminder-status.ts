export const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/**
 * 获取本地今日日期 YYYY-MM-DD
 */
export const getTodayStr = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * 动态精准计算提醒规则在目标日期的实际状态与倒计时天数
 */
export function computeRuleStatus(
  rule: {
    name: string;
    ruleType: string;
    routineType?: string | null;
    weeklyDay?: number | null;
    startDate?: string | null;
    durationDays?: number | null;
    cycleDays?: number | null;
    hasRedeemDay?: boolean | null;
    digestTemplate?: string | null;
    redeemTemplate?: string | null;
    routineTemplate?: string | null;
  },
  targetDate: Date = new Date()
) {
  const currentYear = targetDate.getFullYear();
  const currentMonth = targetDate.getMonth();
  const currentDate = targetDate.getDate();
  const normalizedTarget = new Date(currentYear, currentMonth, currentDate, 0, 0, 0, 0);

  if (rule.ruleType === 'CYCLE' && rule.startDate) {
    const parts = rule.startDate.substring(0, 10).split('-');
    if (parts.length === 3) {
      const startYear = parseInt(parts[0], 10);
      const startMonth = parseInt(parts[1], 10) - 1;
      const startDay = parseInt(parts[2], 10);

      const diffTime = Date.UTC(currentYear, currentMonth, currentDate) - Date.UTC(startYear, startMonth, startDay);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      const duration = Number(rule.durationDays) || 7;
      const eventDays = duration + (rule.hasRedeemDay ? 1 : 0);
      const cycle = Math.max(Number(rule.cycleDays) || eventDays, eventDays);

      if (diffDays < 0) {
        const daysToStart = Math.abs(diffDays);
        return {
          status: 'UPCOMING',
          daysRemaining: daysToStart,
          text: `距首期【${rule.name || '活动'}】开始还剩 ${daysToStart} 天`,
          isRedeemDay: false,
          dayInCycle: 0,
        };
      }

      const dayInCycle = ((diffDays % cycle) + cycle) % cycle;

      if (dayInCycle < duration) {
        const daysLeft = eventDays - dayInCycle;
        const tpl = rule.digestTemplate?.trim() || (rule.hasRedeemDay
          ? '离本轮【{name}】结束还剩 {days} 天（含最后 1 天仅兑换）'
          : '离本轮【{name}】结束还剩 {days} 天');
        const text = tpl.replace(/\{name\}/g, rule.name || '活动名称').replace(/\{days\}/g, String(daysLeft));
        return {
          status: 'ACTIVE',
          daysRemaining: daysLeft,
          playableDaysRemaining: duration - dayInCycle,
          text,
          isRedeemDay: false,
          dayInCycle,
        };
      } else if (rule.hasRedeemDay && dayInCycle === duration) {
        const tpl = rule.redeemTemplate?.trim() || '今天是【{name}】专属兑换日，仅可兑换奖励，不可游玩。';
        const text = tpl.replace(/\{name\}/g, rule.name || '活动名称').replace(/\{days\}/g, '1');
        return {
          status: 'REDEEM',
          daysRemaining: 1,
          playableDaysRemaining: 0,
          text,
          isRedeemDay: true,
          dayInCycle,
        };
      } else {
        const daysUntilNext = cycle - dayInCycle;
        return {
          status: 'COOLDOWN',
          daysRemaining: daysUntilNext,
          text: `距离下轮【${rule.name || '活动'}】开始还剩 ${daysUntilNext} 天`,
          isRedeemDay: false,
          dayInCycle,
        };
      }
    }
  } else if (rule.ruleType === 'ROUTINE') {
    if (rule.routineType === 'DAILY') {
      const tpl = rule.routineTemplate?.trim() || '今日【{name}】记得打卡';
      const text = tpl.replace(/\{name\}/g, rule.name || '打卡项目').replace(/\{days\}/g, '0');
      return {
        status: 'ACTIVE',
        daysRemaining: 0,
        text,
        isRedeemDay: false,
        dayInCycle: 0,
      };
    } else if (rule.routineType === 'WEEKLY' && rule.weeklyDay !== undefined && rule.weeklyDay !== null) {
      const currentWeekday = normalizedTarget.getDay();
      if (currentWeekday === rule.weeklyDay) {
        const tpl = rule.routineTemplate?.trim() || '今天是【{name}】打卡日';
        const text = tpl.replace(/\{name\}/g, rule.name || '打卡项目').replace(/\{days\}/g, '0');
        return {
          status: 'ACTIVE',
          daysRemaining: 0,
          text,
          isRedeemDay: false,
          dayInCycle: 0,
        };
      } else {
        const daysUntil = (rule.weeklyDay - currentWeekday + 7) % 7;
        const tpl = rule.digestTemplate?.trim() || '离本周【{name}】打卡还剩 {days} 天';
        const text = tpl.replace(/\{name\}/g, rule.name || '打卡项目').replace(/\{days\}/g, String(daysUntil));
        return {
          status: 'ACTIVE',
          daysRemaining: daysUntil,
          text,
          isRedeemDay: false,
          dayInCycle: 0,
        };
      }
    }
  }

  const tpl = rule.digestTemplate?.trim() || '离本轮【{name}】结束还剩 {days} 天';
  return {
    status: 'ACTIVE',
    daysRemaining: 3,
    text: tpl.replace(/\{name\}/g, rule.name || '活动名称').replace(/\{days\}/g, '3'),
    isRedeemDay: false,
    dayInCycle: 0,
  };
}

