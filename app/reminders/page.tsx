'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getApiBase } from '@/lib/api';

export interface ReminderRule {
  id: string;
  name: string;
  category: string; // 'START_END' | 'REDEEM_DEADLINE'
  ruleType: 'ROUTINE' | 'EVENT' | 'CYCLE';
  routineType?: 'DAILY' | 'WEEKLY' | null;
  weeklyDay?: number | null;
  dailyTime?: string | null;
  startDate?: string | null;
  durationDays?: number | null;
  cycleDays?: number | null;
  remindTime?: string | null;
  remindDays?: string | null;
  hasRedeemDay?: boolean | null;
  humanSchedule?: string | null;
  enabled: boolean;
  content?: string | null;
}

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const REMIND_DAY_OPTIONS = [
  { key: 'FIRST_DAY', label: '首日', desc: '上线第 1 天' },
  { key: 'LAST_3_DAYS', label: '最后 3 天', desc: '倒数第 3 天' },
  { key: 'LAST_2_DAYS', label: '最后 2 天', desc: '倒数第 2 天' },
  { key: 'LAST_1_DAYS', label: '最后 1 天', desc: '截止当天' },
];

const parseRemindDays = (val?: string | null): string[] => {
  if (!val) return ['LAST_1_DAYS'];
  const parts = val.split(',').map((p) => p.trim()).filter(Boolean);
  return parts.map((p) => (p === 'LAST_DAY' ? 'LAST_1_DAYS' : p));
};

export default function RemindersPage() {
  const { user, hasPermission, token } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || hasPermission('reminders:manage');

  // Active Category Filter State: 'ALL' | 'START_END' | 'REDEEM_DEADLINE'
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  // Rules state
  const [rules, setRules] = useState<ReminderRule[]>([]);

  // Toast alert
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('START_END');
  const [ruleType, setRuleType] = useState<'ROUTINE' | 'EVENT' | 'CYCLE'>('CYCLE');

  // Routine Form Fields
  const [routineType, setRoutineType] = useState<'DAILY' | 'WEEKLY'>('WEEKLY');
  const [weeklyDay, setWeeklyDay] = useState<number>(0);
  const [dailyTime, setDailyTime] = useState('20:00');

  // Event & Cycle Form Fields
  const [startDate, setStartDate] = useState('2026-08-23');
  const [durationDays, setDurationDays] = useState<number>(7);
  const [cycleDays, setCycleDays] = useState<number>(7);
  const [remindDays, setRemindDays] = useState<string>('LAST_1_DAYS');
  const [hasRedeemDay, setHasRedeemDay] = useState(false);
  const [remindTime, setRemindTime] = useState('20:00');

  // Free-form user copywriting / content
  const [content, setContent] = useState('');
  const [enabled, setEnabled] = useState(true);

  const toggleRemindDay = (key: string) => {
    const current = parseRemindDays(remindDays);
    let updated: string[];
    if (current.includes(key)) {
      if (current.length === 1) return; // 至少保留选中 1 天
      updated = current.filter((k) => k !== key);
    } else {
      updated = [...current, key];
    }
    setRemindDays(updated.join(','));
  };

  // Table Column Widths (Resizable)
  const [colWidths, setColWidths] = useState({
    name: 280,
    category: 130,
    rule: 360,
    status: 120,
    actions: 140,
  });

  const isResizingRef = useRef<{ col: string; startX: number; startWidth: number } | null>(null);

  const handleMouseDown = (col: string, e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = {
      col,
      startX: e.clientX,
      startWidth: colWidths[col as keyof typeof colWidths],
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = moveEvent.clientX - isResizingRef.current.startX;
      const newWidth = Math.max(80, isResizingRef.current.startWidth + delta);
      setColWidths((prev) => ({ ...prev, [isResizingRef.current!.col]: newWidth }));
    };

    const handleMouseUp = () => {
      isResizingRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch rules from API
  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch(`${getApiBase()}/reminders`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch (err) {
      console.error('Failed to fetch reminders:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Toggle enabled state
  const handleToggleEnabled = async (id: string) => {
    try {
      const res = await fetch(`${getApiBase()}/reminders/${id}/toggle`, {
        method: 'PATCH',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      if (res.ok) {
        await fetchRules();
        triggerToast('规则状态已更新！');
      }
    } catch (err) {
      console.error('Toggle API call failed:', err);
    }
  };

  // Delete rule
  const handleDeleteRule = async (id: string) => {
    if (!confirm('确定要删除此提醒规则吗？')) return;

    try {
      const res = await fetch(`${getApiBase()}/reminders/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      if (res.ok) {
        await fetchRules();
        triggerToast('规则已成功删除！');
      }
    } catch (err) {
      console.error('Delete API call failed:', err);
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setName('');
    setCategory('START_END');
    setRuleType('CYCLE');
    setRoutineType('WEEKLY');
    setWeeklyDay(0);
    setDailyTime('20:00');
    setStartDate('2026-08-23');
    setDurationDays(7);
    setCycleDays(7);
    setRemindDays('FIRST_DAY,LAST_2_DAYS,LAST_1_DAYS');
    setHasRedeemDay(false);
    setRemindTime('20:00');
    setContent('');
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
    setDailyTime(rule.dailyTime || '20:00');
    setStartDate(rule.startDate ? rule.startDate.substring(0, 10) : '2026-08-23');
    setDurationDays(rule.durationDays ?? 7);
    setCycleDays(rule.cycleDays ?? 7);
    const parsedDays = parseRemindDays(rule.remindDays);
    setRemindDays(parsedDays.join(','));
    setHasRedeemDay(rule.hasRedeemDay ?? false);
    setRemindTime(rule.remindTime || '20:00');
    setContent(rule.content || '');
    setEnabled(rule.enabled);
    setShowModal(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name,
      category,
      ruleType,
      routineType: ruleType === 'ROUTINE' ? routineType : null,
      weeklyDay: ruleType === 'ROUTINE' && routineType === 'WEEKLY' ? Number(weeklyDay) : null,
      dailyTime: ruleType === 'ROUTINE' ? dailyTime : null,
      startDate: ruleType !== 'ROUTINE' ? startDate : null,
      durationDays: ruleType !== 'ROUTINE' ? Number(durationDays) : null,
      cycleDays: ruleType === 'CYCLE' ? Number(cycleDays) : null,
      remindDays: ruleType !== 'ROUTINE' ? remindDays : 'LAST_1_DAYS',
      hasRedeemDay: ruleType === 'EVENT' ? hasRedeemDay : false,
      remindTime: ruleType !== 'ROUTINE' ? remindTime : '20:00',
      content: content.trim() ? content.trim() : null,
      enabled,
    };

    try {
      if (editingId) {
        const res = await fetch(`${getApiBase()}/reminders/${editingId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          await fetchRules();
          triggerToast('规则修改成功！');
        }
      } else {
        const res = await fetch(`${getApiBase()}/reminders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          await fetchRules();
          triggerToast('新增规则成功！');
        }
      }
    } catch (err) {
      console.error('Save API call failed:', err);
    }

    setShowModal(false);
  };

  // Filter Rules
  const filteredRules = rules.filter((r) => {
    if (activeCategory === 'ALL') return true;
    return r.category === activeCategory;
  });

  const getCategoryBadge = (cat: string) => {
    if (cat === 'START_END') {
      return (
        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          开始结束提醒
        </span>
      );
    }
    if (cat === 'REDEEM_DEADLINE') {
      return (
        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
          兑换截止提醒
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
        通用提醒
      </span>
    );
  };

  const getRuleTypeBadge = (rule: ReminderRule) => {
    if (rule.ruleType === 'CYCLE') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
          循环
        </span>
      );
    }
    if (rule.ruleType === 'EVENT') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          动态
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700">
        定时
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 bg-orange-500 text-zinc-950 font-bold text-xs rounded-xl shadow-2xl animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-white">提醒规则</h1>

        {isAdmin ? (
          <button
            onClick={handleOpenAddModal}
            data-testid="add-rule-btn"
            className="px-4 py-2.5 bg-orange-500 text-zinc-950 rounded-xl text-xs font-bold hover:bg-orange-400 transition-all cursor-pointer shadow-lg shadow-orange-500/10 flex items-center space-x-1.5"
          >
            <span>+</span>
            <span>新增提醒规则</span>
          </button>
        ) : (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-zinc-900 border border-zinc-800 text-zinc-400">
            🔒 助理只读模式
          </span>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-zinc-900/40 border border-zinc-800/60 p-5 rounded-2xl space-y-1">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">总规则条数</p>
          <p className="text-3xl font-black text-white">
            {rules.length} <span className="text-xs font-normal text-zinc-500">条</span>
          </p>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800/60 p-5 rounded-2xl space-y-1">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">运行中规则</p>
          <p className="text-3xl font-black text-emerald-400">
            {rules.filter((r) => r.enabled).length} <span className="text-xs font-normal text-zinc-500">条</span>
          </p>
        </div>
      </div>

      {/* Category Dropdown Component */}
      <div className="flex items-center space-x-3 bg-zinc-900/50 border border-zinc-800 p-3 rounded-2xl w-fit">
        <span className="text-xs font-bold text-zinc-400 pl-1">分类筛选：</span>
        <div className="relative">
          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            className="appearance-none bg-zinc-950 text-xs font-bold text-zinc-100 border border-zinc-700/80 rounded-xl px-4 py-2 pr-9 cursor-pointer focus:outline-none focus:border-orange-500 hover:border-zinc-600 transition-all shadow-inner"
          >
            <option value="ALL">全部规则</option>
            <option value="START_END">开始结束提醒</option>
            <option value="REDEEM_DEADLINE">兑换截止提醒</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400">
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Resizable Grid Table */}
      <div className="border border-zinc-900 bg-zinc-900/10 rounded-2xl overflow-x-auto shadow-xl">
        <table className="w-full text-left border-collapse text-xs select-none table-fixed">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400 font-bold bg-zinc-950/60">
              {/* Column: 规则名称 */}
              <th
                style={{ width: `${colWidths.name}px` }}
                className="p-4 relative whitespace-nowrap group"
              >
                <span>规则名称</span>
                <div
                  onMouseDown={(e) => handleMouseDown('name', e)}
                  className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-orange-500/50 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                />
              </th>

              {/* Column: 类目 */}
              <th
                style={{ width: `${colWidths.category}px` }}
                className="p-4 relative whitespace-nowrap group"
              >
                <span>类目</span>
                <div
                  onMouseDown={(e) => handleMouseDown('category', e)}
                  className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-orange-500/50 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                />
              </th>

              {/* Column: 调度规则 */}
              <th
                style={{ width: `${colWidths.rule}px` }}
                className="p-4 relative whitespace-nowrap group"
              >
                <span>调度规则</span>
                <div
                  onMouseDown={(e) => handleMouseDown('rule', e)}
                  className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-orange-500/50 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                />
              </th>

              {/* Column: 状态 */}
              <th
                style={{ width: `${colWidths.status}px` }}
                className="p-4 relative whitespace-nowrap group"
              >
                <span>状态</span>
                <div
                  onMouseDown={(e) => handleMouseDown('status', e)}
                  className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-orange-500/50 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                />
              </th>

              {/* Column: 操作 */}
              {isAdmin && (
                <th
                  style={{ width: `${colWidths.actions}px` }}
                  className="p-4 text-right relative whitespace-nowrap group"
                >
                  <span>操作</span>
                  <div
                    onMouseDown={(e) => handleMouseDown('actions', e)}
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-orange-500/50 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                  />
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredRules.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-zinc-500 whitespace-nowrap">
                  暂无规则记录。
                </td>
              </tr>
            ) : (
              filteredRules.map((rule) => (
                <tr key={rule.id} className="border-b border-zinc-900/60 hover:bg-zinc-900/20 text-zinc-300 transition-colors">
                  {/* Name Column */}
                  <td className="p-4 font-bold text-white whitespace-nowrap truncate">
                    <div className="truncate">{rule.name}</div>
                    {rule.content && (
                      <div className="text-[10px] text-zinc-500 font-normal truncate mt-0.5" title={rule.content}>
                        {rule.content}
                      </div>
                    )}
                  </td>

                  {/* Category Column */}
                  <td className="p-4 whitespace-nowrap">
                    {getCategoryBadge(rule.category)}
                  </td>

                  {/* Rule Column */}
                  <td className="p-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getRuleTypeBadge(rule)}
                      <span className="font-mono text-xs text-orange-400 font-semibold truncate">
                        {rule.humanSchedule}
                      </span>
                    </div>
                  </td>

                  {/* Status Column */}
                  <td className="p-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleEnabled(rule.id)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                        rule.enabled
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                      }`}
                    >
                      {rule.enabled ? 'ON 已启用' : 'OFF 已停用'}
                    </button>
                  </td>

                  {/* Actions Column */}
                  {isAdmin && (
                    <td className="p-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEditModal(rule)}
                        className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg hover:border-zinc-700 transition-all text-xs font-bold cursor-pointer"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        data-testid={`delete-btn-${rule.id}`}
                        className="px-2.5 py-1 bg-red-950/20 text-red-400 border border-red-500/25 rounded-lg hover:bg-red-500 hover:text-white transition-all text-xs font-bold cursor-pointer"
                      >
                        删除
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800/90 p-6 rounded-3xl max-h-[88vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingId ? '编辑提醒规则' : '新增提醒规则'}
                  </h3>
                  <p className="text-[11px] text-zinc-500">配置活动周期排期与自定义备忘</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Form Body with Sleek Scrollbar */}
            <form onSubmit={handleSaveRule} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 py-4 space-y-4">
                {/* Mode Buttons: 循环, 动态 & 定时 */}
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 font-medium">提醒类型模式</label>
                  <div className="grid grid-cols-3 gap-2 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setRuleType('CYCLE')}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${
                        ruleType === 'CYCLE'
                          ? 'bg-orange-500 text-zinc-950'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      周期循环
                    </button>
                    <button
                      type="button"
                      onClick={() => setRuleType('EVENT')}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${
                        ruleType === 'EVENT'
                          ? 'bg-orange-500 text-zinc-950'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      单次活动
                    </button>
                    <button
                      type="button"
                      onClick={() => setRuleType('ROUTINE')}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${
                        ruleType === 'ROUTINE'
                          ? 'bg-orange-500 text-zinc-950'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      常规定时
                    </button>
                  </div>
                </div>

                {/* Rule Name */}
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 font-medium">规则名称</label>
                  <input
                    type="text"
                    required
                    placeholder="例如：区域行动 / 公会远征 / 每日签到"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Category Selection */}
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 font-medium">所属类目</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="START_END">开始结束提醒</option>
                    <option value="REDEEM_DEADLINE">兑换截止提醒</option>
                  </select>
                </div>

                {/* ROUTINE Specific Inputs */}
                {ruleType === 'ROUTINE' && (
                  <div className="p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-zinc-400 font-medium">周期模式</label>
                        <select
                          value={routineType}
                          onChange={(e) => setRoutineType(e.target.value as 'DAILY' | 'WEEKLY')}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        >
                          <option value="WEEKLY">按周提醒 (每周某天)</option>
                          <option value="DAILY">按天提醒 (每天定点)</option>
                        </select>
                      </div>

                      {routineType === 'WEEKLY' ? (
                        <div className="space-y-1">
                          <label className="text-xs text-zinc-400 font-medium">提醒周几</label>
                          <select
                            value={weeklyDay}
                            onChange={(e) => setWeeklyDay(Number(e.target.value))}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                          >
                            {WEEKDAY_NAMES.map((w, idx) => (
                              <option key={idx} value={idx}>
                                {w}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <label className="text-xs text-zinc-400 font-medium">每日时间</label>
                          <input
                            type="time"
                            value={dailyTime}
                            onChange={(e) => setDailyTime(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                          />
                        </div>
                      )}
                    </div>

                    {routineType === 'WEEKLY' && (
                      <div className="space-y-1">
                        <label className="text-xs text-zinc-400 font-medium">提醒时间点</label>
                        <input
                          type="time"
                          value={dailyTime}
                          onChange={(e) => setDailyTime(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* EVENT & CYCLE Specific Inputs */}
                {(ruleType === 'EVENT' || ruleType === 'CYCLE') && (
                  <div className="p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-zinc-400 font-medium">
                          {ruleType === 'CYCLE' ? '首期基准开始日' : '活动开始日期'}
                        </label>
                        <input
                          type="date"
                          required
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-zinc-400 font-medium">持续/玩法天数</label>
                        <input
                          type="number"
                          min={1}
                          max={90}
                          required
                          value={durationDays}
                          onChange={(e) => setDurationDays(Number(e.target.value))}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    {ruleType === 'CYCLE' && (
                      <div className="space-y-1">
                        <label className="text-xs text-zinc-400 font-medium">循环周期天数 (每隔多少天一轮)</label>
                        <input
                          type="number"
                          min={1}
                          max={90}
                          required
                          value={cycleDays}
                          onChange={(e) => setCycleDays(Number(e.target.value))}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-zinc-400 font-medium">提醒时间点</label>
                        <input
                          type="time"
                          value={remindTime}
                          onChange={(e) => setRemindTime(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      {ruleType === 'EVENT' && (
                        <div className="space-y-1 flex flex-col justify-end">
                          <label className="text-xs text-zinc-400 font-medium mb-2">专属兑换日</label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="hasRedeemDay"
                              checked={hasRedeemDay}
                              onChange={(e) => setHasRedeemDay(e.target.checked)}
                              className="rounded bg-zinc-950 border-zinc-700 text-orange-500 focus:ring-0 cursor-pointer"
                            />
                            <label htmlFor="hasRedeemDay" className="text-xs text-zinc-300 cursor-pointer">
                              活动结束后含额外 1 天兑换
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Multi-Day Timing Checkbox Bar */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-xs text-zinc-400 font-medium">提醒节点时机（支持多选）</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {REMIND_DAY_OPTIONS.map((opt) => {
                          const active = parseRemindDays(remindDays).includes(opt.key);
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => toggleRemindDay(opt.key)}
                              className={`py-2 px-1 rounded-xl text-center border transition-all cursor-pointer ${
                                active
                                  ? 'bg-orange-500/20 border-orange-500 text-orange-400 font-bold'
                                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              <div className="text-xs">{opt.label}</div>
                              <div className="text-[9px] opacity-70 scale-90">{opt.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Free-form User Content / Note */}
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 font-medium">自定义文案 / 备注（选填）</label>
                  <textarea
                    rows={3}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="在此输入您的自定义提示内容或备注信息..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 custom-scrollbar"
                  />
                </div>

                {/* Enabled State */}
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="enabled"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="rounded bg-zinc-950 border-zinc-700 text-orange-500 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="enabled" className="text-xs text-zinc-300 cursor-pointer">
                    立即启用此规则
                  </label>
                </div>
              </div>

              {/* Action Buttons (Fixed Footer) */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-zinc-800/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-zinc-800 text-zinc-300 text-xs font-bold rounded-xl hover:bg-zinc-700 transition-all cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 text-xs font-black rounded-xl hover:from-orange-400 hover:to-amber-400 transition-all cursor-pointer shadow-[0_0_15px_rgba(249,115,22,0.15)]"
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
