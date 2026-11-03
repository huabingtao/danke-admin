import { describe, expect, test } from 'vitest';
import { computeRuleStatus } from '../lib/reminder-status';

const weekly = { name: '远征对战', ruleType: 'ROUTINE', routineType: 'WEEKLY', weeklyDay: 0,
  routineTemplate: '{name}剩{days}天', digestTemplate: '不应提前输出{name}{days}' };

describe('routine reminder dates', () => {
  test.each([0, 12, 23])('Sunday at %s:00 is a trigger with one day remaining', hour => {
    expect(computeRuleStatus(weekly, new Date(2026, 10, 1, hour, 59))).toMatchObject({
      status: 'ROUTINE_TRIGGER', daysRemaining: 1, text: '远征对战剩1天',
    });
  });
  test.each([[2026, 9, 31, 1], [2026, 10, 2, 6]])('non-trigger calendar date %s-%s-%s does not preview a reminder', (year, month, day, next) => {
    const state = computeRuleStatus(weekly, new Date(year, month, day));
    expect(state.status).not.toBe('ROUTINE_TRIGGER');
    expect(state.daysRemaining).toBe(next);
    expect(state.text).toBe('本日不提醒（每周日打卡）');
    expect(state.text).not.toContain('不应提前输出');
  });
  test.each([new Date(2026, 9, 31), new Date(2026, 10, 1), new Date(2026, 10, 2)])('daily rules trigger every calendar day', date => {
    expect(computeRuleStatus({ ...weekly, routineType: 'DAILY' }, date)).toMatchObject({
      status: 'ROUTINE_TRIGGER', daysRemaining: 1, text: '远征对战剩1天',
    });
  });
});
