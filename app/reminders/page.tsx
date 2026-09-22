'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getApiBase } from '@/lib/api';

const SortIcon = ({ active, order }: { active: boolean; order: 'asc' | 'desc' }) => {
  if (!active) {
    return <span className="text-zinc-600 text-[10px] ml-1 select-none">⇅</span>;
  }
  return (
    <span className="text-orange-400 text-[10px] ml-1 font-bold select-none">
      {order === 'asc' ? '▲' : '▼'}
    </span>
  );
};

export interface ReminderRule {
  id: string;
  name: string;
  category: string; // 'START_END' | 'GUILD' | 'EVENT'
  ruleType: 'ROUTINE' | 'CYCLE';
  routineType?: 'DAILY' | 'WEEKLY' | null;
  weeklyDay?: number | null;
  startDate?: string | null;
  durationDays?: number | null;
  cycleDays?: number | null;
  hasRedeemDay?: boolean | null;
  digestTemplate?: string | null;
  redeemTemplate?: string | null;
  routineTemplate?: string | null;
  digestNote?: string | null;
  humanSchedule?: string | null;
  enabled: boolean;
}

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

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
      const normalizedStart = new Date(startYear, startMonth, startDay, 0, 0, 0, 0);

      const diffTime = normalizedTarget.getTime() - normalizedStart.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      const duration = Number(rule.durationDays) || 7;
      const cycle = Number(rule.cycleDays) || (rule.hasRedeemDay ? duration + 1 : duration);

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
        const daysLeft = duration - dayInCycle;
        const tpl = rule.digestTemplate?.trim() || '离本轮【{name}】结束还剩 {days} 天';
        const text = tpl.replace(/\{name\}/g, rule.name || '活动名称').replace(/\{days\}/g, String(daysLeft));
        return {
          status: 'ACTIVE',
          daysRemaining: daysLeft,
          text,
          isRedeemDay: false,
          dayInCycle,
        };
      } else if (rule.hasRedeemDay && dayInCycle === duration) {
        const tpl = rule.redeemTemplate?.trim() || '今天是【{name}】专属兑换日，别忘了兑换奖励！';
        const text = tpl.replace(/\{name\}/g, rule.name || '活动名称').replace(/\{days\}/g, '0');
        return {
          status: 'REDEEM',
          daysRemaining: 0,
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

export default function RemindersPage() {
  const { user, hasPermission, token } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || hasPermission('reminders:manage');

  // Active Category Filter State: 'ALL' | 'START_END' | 'GUILD' | 'EVENT'
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  // Data States
  const [rules, setRules] = useState<ReminderRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('START_END');
  const [ruleType, setRuleType] = useState<'ROUTINE' | 'CYCLE'>('CYCLE');

  // Routine Form Fields
  const [routineType, setRoutineType] = useState<'DAILY' | 'WEEKLY'>('WEEKLY');
  const [weeklyDay, setWeeklyDay] = useState<number>(0);

  // Cycle Form Fields (统一持续天数，移除冗余 cycleDays 输入)
  const [startDate, setStartDate] = useState<string>(getTodayStr());
  const [durationDays, setDurationDays] = useState<number>(7);
  const [hasRedeemDay, setHasRedeemDay] = useState(false);

  // Editable Template States
  const [digestTemplate, setDigestTemplate] = useState('');
  const [redeemTemplate, setRedeemTemplate] = useState('');
  const [routineTemplate, setRoutineTemplate] = useState('');
  const [digestNote, setDigestNote] = useState('');
  const [enabled, setEnabled] = useState(true);

  // Sort States (Default to daysRemaining ascending)
  const [sortField, setSortField] = useState<'daysRemaining' | 'name' | 'category' | 'enabled'>('daysRemaining');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: 'daysRemaining' | 'name' | 'category' | 'enabled') => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Fetch Rules from Backend
  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url =
        activeCategory === 'ALL'
          ? `${getApiBase()}/reminders`
          : `${getApiBase()}/reminders?category=${activeCategory}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('获取提醒规则失败');
      const data = await res.json();
      setRules(data);
    } catch (err: any) {
      setError(err.message || '获取规则失败');
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Column Resizing Logic
  const [colWidths, setColWidths] = useState<{ [key: string]: number }>({
    name: 200,
    category: 120,
    daysRemaining: 180,
    digestNote: 320,
    status: 90,
    actions: 130,
  });

  const resizingCol = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  const onMouseDownResize = (e: React.MouseEvent, colKey: string) => {
    resizingCol.current = colKey;
    startX.current = e.clientX;
    startWidth.current = colWidths[colKey] || 120;
    document.addEventListener('mousemove', onMouseMoveResize);
    document.addEventListener('mouseup', onMouseUpResize);
    e.preventDefault();
  };

  const onMouseMoveResize = useCallback((e: MouseEvent) => {
    if (!resizingCol.current) return;
    const diff = e.clientX - startX.current;
    const newWidth = Math.max(70, startWidth.current + diff);
    setColWidths((prev) => ({
      ...prev,
      [resizingCol.current!]: newWidth,
    }));
  }, []);

  const onMouseUpResize = useCallback(() => {
    resizingCol.current = null;
    document.removeEventListener('mousemove', onMouseMoveResize);
    document.removeEventListener('mouseup', onMouseUpResize);
  }, [onMouseMoveResize]);

  // Modal Handlers
  const handleOpenAddModal = () => {
    setEditingId(null);
    setName('');
    setCategory(activeCategory === 'ALL' ? 'START_END' : activeCategory);
    setRuleType('CYCLE');
    setRoutineType('WEEKLY');
    setWeeklyDay(0);
    setStartDate(getTodayStr());
    setDurationDays(7);
    setHasRedeemDay(false);
    setDigestTemplate('');
    setRedeemTemplate('');
    setRoutineTemplate('');
    setDigestNote('');
    setEnabled(true);
    setShowModal(true);
  };

  const handleOpenEditModal = (rule: ReminderRule) => {
    setEditingId(rule.id);
    setName(rule.name);
    setCategory(rule.category || 'START_END');
    setRuleType(rule.ruleType || 'CYCLE');
    setRoutineType(rule.routineType || 'WEEKLY');
    setWeeklyDay(rule.weeklyDay ?? 0);
    setStartDate(rule.startDate ? rule.startDate.substring(0, 10) : getTodayStr());
    setDurationDays(rule.durationDays ?? 7);
    setHasRedeemDay(rule.hasRedeemDay ?? false);
    setDigestTemplate(rule.digestTemplate || '');
    setRedeemTemplate(rule.redeemTemplate || '');
    setRoutineTemplate(rule.routineTemplate || '');
    setDigestNote(rule.digestNote || '');
    setEnabled(rule.enabled);
    setShowModal(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const dur = Number(durationDays) || 7;
    const cyc = hasRedeemDay ? dur + 1 : dur;

    const payload = {
      name: name.trim(),
      category,
      ruleType,
      routineType: ruleType === 'ROUTINE' ? routineType : null,
      weeklyDay: ruleType === 'ROUTINE' && routineType === 'WEEKLY' ? Number(weeklyDay) : null,
      startDate: ruleType === 'CYCLE' ? startDate : null,
      durationDays: ruleType === 'CYCLE' ? dur : null,
      cycleDays: ruleType === 'CYCLE' ? cyc : null,
      hasRedeemDay: ruleType === 'CYCLE' ? hasRedeemDay : false,
      digestTemplate: digestTemplate.trim() ? digestTemplate.trim() : null,
      redeemTemplate: hasRedeemDay && redeemTemplate.trim() ? redeemTemplate.trim() : null,
      routineTemplate: ruleType === 'ROUTINE' && routineTemplate.trim() ? routineTemplate.trim() : null,
      digestNote: digestNote.trim() ? digestNote.trim() : null,
      enabled,
    };

    try {
      if (editingId) {
        const res = await fetch(`${getApiBase()}/reminders/${editingId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('更新规则失败');
      } else {
        const res = await fetch(`${getApiBase()}/reminders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('创建规则失败');
      }

      setShowModal(false);
      fetchRules();
    } catch (err: any) {
      alert(err.message || '操作失败');
    }
  };

  const handleToggleEnabled = async (id: string) => {
    try {
      const res = await fetch(`${getApiBase()}/reminders/${id}/toggle`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('切换状态失败');
      fetchRules();
    } catch (err: any) {
      alert(err.message || '操作失败');
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('确定要删除这条提醒规则吗？')) return;
    try {
      const res = await fetch(`${getApiBase()}/reminders/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('删除规则失败');
      fetchRules();
    } catch (err: any) {
      alert(err.message || '删除失败');
    }
  };

  // Helper badge renderers
  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'START_END':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            活动/定时
          </span>
        );
      case 'GUILD':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            公会专区
          </span>
        );
      case 'EVENT':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            限时大事件
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300">
            {cat}
          </span>
        );
    }
  };

  // Filtered & Sorted Rules
  const filteredRules = useMemo(() => {
    const list = rules.filter((r) => {
      if (activeCategory === 'ALL') return true;
      return r.category === activeCategory;
    });

    return [...list].sort((a, b) => {
      const statusA = computeRuleStatus(a);
      const statusB = computeRuleStatus(b);

      let valA: any = a[sortField as keyof ReminderRule];
      let valB: any = b[sortField as keyof ReminderRule];

      if (sortField === 'daysRemaining') {
        valA = statusA.isRedeemDay ? 0 : (statusA.daysRemaining ?? 999);
        valB = statusB.isRedeemDay ? 0 : (statusB.daysRemaining ?? 999);
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      if (sortField === 'name' || sortField === 'category') {
        valA = (valA || '').toString();
        valB = (valB || '').toString();
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      if (sortField === 'enabled') {
        valA = a.enabled ? 1 : 0;
        valB = b.enabled ? 1 : 0;
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      return 0;
    });
  }, [rules, activeCategory, sortField, sortOrder]);

  // Calculate stats
  const cycleCount = rules.filter((r) => r.ruleType === 'CYCLE').length;
  const routineCount = rules.filter((r) => r.ruleType === 'ROUTINE').length;
  const activeCount = rules.filter((r) => r.enabled).length;

  // Live preview inside modal
  const modalPreviewStatus = computeRuleStatus({
    name,
    ruleType,
    routineType,
    weeklyDay,
    startDate,
    durationDays,
    cycleDays: hasRedeemDay ? Number(durationDays) + 1 : Number(durationDays),
    hasRedeemDay,
    digestTemplate,
    redeemTemplate,
    routineTemplate,
  });

  return (
    <div className="space-y-4">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/50 px-5 py-4 rounded-xl border border-zinc-800/80 backdrop-blur-sm shadow-xl">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="text-2xl">⏰</span>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              活动提醒与倒计时规则
            </h1>
          </div>
          <p className="text-zinc-400 text-xs mt-1">
            配置循环活动与常规定时，支持自定义模板（占位符{' '}
            <code className="text-orange-400 font-mono">&#123;name&#125;</code>、
            <code className="text-orange-400 font-mono">&#123;days&#125;</code>
            ），为每日提醒接口提供精准聚合数据。
          </p>
        </div>

        {isAdmin ? (
          <button
            data-testid="add-rule-btn"
            onClick={handleOpenAddModal}
            className="flex items-center justify-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold text-xs rounded-xl hover:from-orange-400 hover:to-amber-400 transition-all shadow-[0_0_15px_rgba(249,115,22,0.15)] cursor-pointer shrink-0"
          >
            <span>+ 新增提醒规则</span>
          </button>
        ) : (
          <div className="text-xs text-zinc-500 font-medium bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800">
            🔒 助理只读模式
          </div>
        )}
      </div>

      {/* Stats and Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-2.5">
        {/* Category Tabs */}
        <div className="flex items-center space-x-1.5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeCategory === 'ALL'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            全部规则 ({rules.length})
          </button>
          <button
            onClick={() => setActiveCategory('START_END')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeCategory === 'START_END'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            活动/定时
          </button>
          <button
            onClick={() => setActiveCategory('GUILD')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeCategory === 'GUILD'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            公会专区
          </button>
          <button
            onClick={() => setActiveCategory('EVENT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeCategory === 'EVENT'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            限时大事件
          </button>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center space-x-2 text-xs text-zinc-400">
          <span className="flex items-center space-x-1.5 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>已启用: {activeCount}</span>
          </span>
          <span className="flex items-center space-x-1.5 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span>循环活动: {cycleCount}</span>
          </span>
          <span className="flex items-center space-x-1.5 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>常规定时: {routineCount}</span>
          </span>
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-zinc-900/40 rounded-xl border border-zinc-800/80 overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse table-fixed">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/90 text-zinc-400 font-bold uppercase tracking-wider text-[11px]">
                {/* Name */}
                <th
                  style={{ width: colWidths.name }}
                  className="relative px-3.5 py-2.5 select-none group cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center space-x-1">
                    <span>规则名称</span>
                    <SortIcon active={sortField === 'name'} order={sortOrder} />
                  </div>
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      onMouseDownResize(e, 'name');
                    }}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-orange-500 group-hover:bg-zinc-700 transition-colors"
                  />
                </th>

                {/* Category */}
                <th
                  style={{ width: colWidths.category }}
                  className="relative px-3.5 py-2.5 select-none group cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center space-x-1">
                    <span>分类</span>
                    <SortIcon active={sortField === 'category'} order={sortOrder} />
                  </div>
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      onMouseDownResize(e, 'category');
                    }}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-orange-500 group-hover:bg-zinc-700 transition-colors"
                  />
                </th>

                {/* Days Remaining / Status Badge (New Column) */}
                <th
                  style={{ width: colWidths.daysRemaining }}
                  className="relative px-3.5 py-2.5 select-none group cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('daysRemaining')}
                >
                  <div className="flex items-center space-x-1">
                    <span>倒计时天数</span>
                    <SortIcon active={sortField === 'daysRemaining'} order={sortOrder} />
                  </div>
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      onMouseDownResize(e, 'daysRemaining');
                    }}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-orange-500 group-hover:bg-zinc-700 transition-colors"
                  />
                </th>

                {/* Digest Note */}
                <th
                  style={{ width: colWidths.digestNote }}
                  className="relative px-3.5 py-2.5 select-none group"
                >
                  <span>附加备注</span>
                  <div
                    onMouseDown={(e) => onMouseDownResize(e, 'digestNote')}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-orange-500 group-hover:bg-zinc-700 transition-colors"
                  />
                </th>

                {/* Status Toggle */}
                <th
                  style={{ width: colWidths.status }}
                  className="relative px-3.5 py-2.5 select-none group cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('enabled')}
                >
                  <div className="flex items-center space-x-1">
                    <span>状态</span>
                    <SortIcon active={sortField === 'enabled'} order={sortOrder} />
                  </div>
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      onMouseDownResize(e, 'status');
                    }}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-orange-500 group-hover:bg-zinc-700 transition-colors"
                  />
                </th>

                {/* Actions */}
                <th
                  style={{ width: colWidths.actions }}
                  className="px-3.5 py-2.5 text-right"
                >
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>加载提醒规则中...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500">
                    暂无提醒规则，点击右上角新建规则
                  </td>
                </tr>
              ) : (
                filteredRules.map((rule) => {
                  // Compute rendered preview dynamically based on entered startDate and current date
                  const statusResult = computeRuleStatus(rule);

                  return (
                    <tr
                      key={rule.id}
                      className="hover:bg-zinc-800/30 transition-colors"
                    >
                      {/* Name - Clean, without badge */}
                      <td className="px-3.5 py-2.5 truncate">
                        <span className="font-bold text-white text-sm truncate block">
                          {rule.name}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        {getCategoryBadge(rule.category)}
                      </td>

                      {/* Days Remaining / Status Badge */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        {statusResult.isRedeemDay ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            🎁 今日兑换日
                          </span>
                        ) : statusResult.status === 'ROUTINE_TRIGGER' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            ✅ 今日打卡
                          </span>
                        ) : statusResult.daysRemaining === 1 ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            🔥 剩 1 天
                          </span>
                        ) : statusResult.daysRemaining <= 3 ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            ⚡ 剩 {statusResult.daysRemaining} 天
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-800/80 text-zinc-300 border border-zinc-700/50">
                            ⏳ 剩 {statusResult.daysRemaining} 天
                          </span>
                        )}
                      </td>

                      {/* Digest Note */}
                      <td className="px-3.5 py-2.5 truncate">
                        {rule.digestNote?.trim() ? (
                          <span
                            className="text-zinc-300 text-xs truncate block"
                            title={rule.digestNote.trim()}
                          >
                            {rule.digestNote.trim()}
                          </span>
                        ) : (
                          <span className="text-zinc-600 text-xs">-</span>
                        )}
                      </td>

                      {/* Status Toggle */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        {isAdmin ? (
                          <button
                            onClick={() => handleToggleEnabled(rule.id)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              rule.enabled ? 'bg-emerald-500' : 'bg-zinc-700'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                rule.enabled ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        ) : (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              rule.enabled
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-zinc-800 text-zinc-500'
                            }`}
                          >
                            {rule.enabled ? '已启用' : '已暂停'}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                        {isAdmin ? (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleOpenEditModal(rule)}
                              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-semibold transition-all cursor-pointer border border-rose-500/20"
                            >
                              删除
                            </button>
                          </div>
                        ) : (
                          <span className="text-zinc-600 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/80 shrink-0">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>{editingId ? '⚙️ 编辑提醒规则' : '✨ 新增提醒规则'}</span>
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Body */}
            <form
              onSubmit={handleSaveRule}
              className="flex-1 overflow-y-auto px-5 py-3.5 space-y-3 custom-scrollbar text-xs"
            >
              {/* Basic Details */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-zinc-400 font-medium text-[11px]">规则名称 *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="如: 公会探索 / 区域行动"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 px-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-zinc-400 font-medium text-[11px]">所属类目</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 px-2.5 text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="START_END">活动 / 定时提醒 (通用)</option>
                    <option value="GUILD">公会专区活动</option>
                    <option value="EVENT">限时大事件</option>
                  </select>
                </div>
              </div>

              {/* Rule Type Selector */}
              <div className="flex flex-col gap-1">
                <label className="text-zinc-400 font-medium text-[11px]">调度模式</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRuleType('CYCLE')}
                    className={`py-1.5 px-2.5 rounded-lg border text-center transition-all cursor-pointer font-bold text-xs ${
                      ruleType === 'CYCLE'
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    🔄 周期循环活动 (如 7/28 天一轮)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRuleType('ROUTINE')}
                    className={`py-1.5 px-2.5 rounded-lg border text-center transition-all cursor-pointer font-bold text-xs ${
                      ruleType === 'ROUTINE'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    ⏰ 常规定时打卡 (按天/按周)
                  </button>
                </div>
              </div>

              {/* CYCLE Fields (统一持续天数) */}
              {ruleType === 'CYCLE' && (
                <div className="p-3 bg-zinc-950/70 border border-zinc-800/80 rounded-xl space-y-2.5">
                  <div className="text-[11px] font-bold text-amber-400 flex items-center justify-between">
                    <span>🔄 周期循环参数</span>
                    <span className="text-[10px] text-zinc-500 font-normal">默认 00:00:00 起算</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="flex flex-col gap-1">
                      <label className="text-zinc-400 text-[11px]">
                        基准首期开始日期 * <span className="text-[10px] text-zinc-500">(当天 00:00)</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg py-1.5 px-2.5 text-white focus:outline-none focus:border-amber-500 cursor-pointer text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-zinc-400 text-[11px]">持续天数 (天) *</label>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        required
                        value={durationDays}
                        onChange={(e) => setDurationDays(Math.max(1, Number(e.target.value)))}
                        placeholder="例如: 7 或 28"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg py-1.5 px-2.5 text-white focus:outline-none focus:border-amber-500 text-xs"
                      />
                    </div>
                  </div>

                  {/* Redeem Day Checkbox */}
                  <div className="pt-2 border-t border-zinc-800/60 space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="hasRedeemDay"
                        checked={hasRedeemDay}
                        onChange={(e) => setHasRedeemDay(e.target.checked)}
                        className="w-3.5 h-3.5 rounded bg-zinc-900 border-zinc-700 text-purple-500 focus:ring-0 cursor-pointer"
                      />
                      <label
                        htmlFor="hasRedeemDay"
                        className="text-xs text-purple-300 font-medium cursor-pointer"
                      >
                        设有专属兑换日（活动结束后第 +1 天进行兑换）
                      </label>
                    </div>

                    {/* Redeem Template Box (Only when hasRedeemDay is checked) */}
                    {hasRedeemDay && (
                      <div className="p-2.5 bg-purple-950/20 border border-purple-500/30 rounded-lg flex flex-col gap-1 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between">
                          <label className="text-purple-300 font-bold flex items-center space-x-1 text-[11px]">
                            <span>🎁 专属兑换日文案（用户自定义）</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setRedeemTemplate((prev) => `${prev}{name}`)}
                            className="bg-purple-900/50 hover:bg-purple-800 text-purple-300 px-1.5 py-0.5 rounded font-mono text-[10px] cursor-pointer"
                          >
                            + 插入 &#123;name&#125;
                          </button>
                        </div>
                        <input
                          type="text"
                          value={redeemTemplate}
                          onChange={(e) => setRedeemTemplate(e.target.value)}
                          placeholder="今天是【{name}】专属兑换日，别忘了兑换奖励！"
                          className="w-full bg-zinc-900 border border-purple-500/40 rounded-lg py-1.5 px-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-400 text-xs"
                        />
                        <p className="text-[10px] text-purple-400/80">
                          提示：当活动到达兑换日当天时，系统每日提醒与预览将精准展示此提示语。
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ROUTINE Fields */}
              {ruleType === 'ROUTINE' && (
                <div className="p-3 bg-zinc-950/70 border border-zinc-800/80 rounded-xl space-y-2.5">
                  <div className="text-[11px] font-bold text-emerald-400 flex items-center space-x-1">
                    <span>⏰ 常规定时参数</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="flex flex-col gap-1">
                      <label className="text-zinc-400 text-[11px]">打卡重复频率</label>
                      <select
                        value={routineType}
                        onChange={(e) =>
                          setRoutineType(e.target.value as 'DAILY' | 'WEEKLY')
                        }
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg py-1.5 px-2.5 text-white focus:outline-none focus:border-emerald-500 cursor-pointer text-xs"
                      >
                        <option value="WEEKLY">每周固定日期打卡</option>
                        <option value="DAILY">每日打卡</option>
                      </select>
                    </div>

                    {routineType === 'WEEKLY' && (
                      <div className="flex flex-col gap-1">
                        <label className="text-zinc-400 text-[11px]">选择打卡星期</label>
                        <select
                          value={weeklyDay}
                          onChange={(e) => setWeeklyDay(Number(e.target.value))}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg py-1.5 px-2.5 text-white focus:outline-none focus:border-emerald-500 cursor-pointer text-xs"
                        >
                          {WEEKDAY_NAMES.map((wName, idx) => (
                            <option key={idx} value={idx}>
                              {wName}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Editable Templates Section */}
              <div className="space-y-2.5 p-3 bg-zinc-950/80 border border-orange-500/20 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-orange-400 flex items-center space-x-1 text-[11px]">
                    <span>📝 每日提醒文案模板配置</span>
                  </span>
                  <div className="flex items-center space-x-1 text-[10px] text-zinc-400">
                    <span>快捷占位符:</span>
                    <button
                      type="button"
                      onClick={() =>
                        setDigestTemplate((prev) => `${prev}{name}`)
                      }
                      className="bg-zinc-800 hover:bg-zinc-700 text-orange-400 px-1.5 py-0.5 rounded font-mono cursor-pointer"
                    >
                      &#123;name&#125;
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDigestTemplate((prev) => `${prev}{days}`)
                      }
                      className="bg-zinc-800 hover:bg-zinc-700 text-orange-400 px-1.5 py-0.5 rounded font-mono cursor-pointer"
                    >
                      &#123;days&#125;
                    </button>
                  </div>
                </div>

                {/* Digest Template Input */}
                <div className="flex flex-col gap-1">
                  <label className="text-zinc-400 text-[11px]">
                    倒计时文案模板 (未输入则默认: <code>离本轮【&#123;name&#125;】结束还剩 &#123;days&#125; 天</code>)
                  </label>
                  <input
                    type="text"
                    value={digestTemplate}
                    onChange={(e) => setDigestTemplate(e.target.value)}
                    placeholder="离本轮【{name}】结束还剩 {days} 天"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg py-1.5 px-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 text-xs"
                  />
                </div>

                {/* Routine Template (If Routine Mode) */}
                {ruleType === 'ROUTINE' && (
                  <div className="flex flex-col gap-1 pt-2 border-t border-zinc-800">
                    <label className="text-emerald-300 text-[11px]">
                      ⏰ 打卡日文案模板 (未输入则默认: <code>今天是【&#123;name&#125;】打卡日</code>)
                    </label>
                    <input
                      type="text"
                      value={routineTemplate}
                      onChange={(e) => setRoutineTemplate(e.target.value)}
                      placeholder="今天是【{name}】打卡日"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg py-1.5 px-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>
                )}

                {/* Digest Note Field */}
                <div className="flex flex-col gap-1 pt-1.5 border-t border-zinc-800">
                  <label className="text-zinc-400 text-[11px]">
                    📢 附加备注 (选填，如: <code>记得提前备好体力打满</code>)
                  </label>
                  <input
                    type="text"
                    value={digestNote}
                    onChange={(e) => setDigestNote(e.target.value)}
                    placeholder="例如: 记得提前备好体力打满 / 商店即将清空速清"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg py-1.5 px-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 text-xs"
                  />
                </div>

                {/* Live Realtime Preview Panel */}
                <div className="space-y-1 pt-1.5 border-t border-zinc-800/80">
                  <div className="text-[11px] text-zinc-400 bg-zinc-900/60 px-2.5 py-1.5 rounded-lg border border-zinc-800 flex items-center space-x-2">
                    <span className="text-amber-400 font-bold shrink-0">👉 实时效果计算:</span>
                    <span className="text-white font-medium truncate">
                      {modalPreviewStatus.text}
                    </span>
                  </div>

                  {ruleType === 'CYCLE' && hasRedeemDay && (
                    <div className="text-[11px] text-purple-300 bg-purple-950/30 px-2.5 py-1.5 rounded-lg border border-purple-500/30 flex items-center space-x-2">
                      <span className="text-purple-400 font-bold shrink-0">🎁 兑换日效果:</span>
                      <span className="text-purple-200 font-medium truncate">
                        {(
                          redeemTemplate.trim() ||
                          '今天是【{name}】专属兑换日，别忘了兑换奖励！'
                        ).replace(/\{name\}/g, name || '活动名称')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Enabled Switch */}
              <div className="flex items-center space-x-2 pt-0.5">
                <input
                  type="checkbox"
                  id="modal-enabled"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="rounded bg-zinc-950 border-zinc-700 text-orange-500 focus:ring-0 cursor-pointer"
                />
                <label
                  htmlFor="modal-enabled"
                  className="text-xs text-zinc-300 cursor-pointer font-medium"
                >
                  立即启用此规则
                </label>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-zinc-800/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-1.5 bg-zinc-800 text-zinc-300 text-xs font-bold rounded-lg hover:bg-zinc-700 transition-all cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 text-xs font-black rounded-lg hover:from-orange-400 hover:to-amber-400 transition-all cursor-pointer shadow-[0_0_15px_rgba(249,115,22,0.15)]"
                >
                  {editingId ? '保存修改' : '创建规则'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
