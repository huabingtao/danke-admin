'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

interface GameEvent {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  rewards: string;
}

export default function EventsPage() {
  const { hasPermission } = useAuth();
  const isAdmin = hasPermission('event:create');

  const [events, setEvents] = useState<GameEvent[]>([
    {
      id: '1',
      name: '弹壳周年庆典活动',
      startDate: '2026-07-01',
      endDate: '2026-07-07',
      rewards: '{"sKeys":15,"gems":3000,"randomEpicEquip":1}',
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rewards, setRewards] = useState('{}');

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const newEvent: GameEvent = {
      id: Date.now().toString(),
      name,
      startDate,
      endDate,
      rewards,
    };
    setEvents([...events, newEvent]);
    setShowModal(false);
    setName('');
    setStartDate('');
    setEndDate('');
    setRewards('{}');
  };

  const handleDeleteEvent = (id: string) => {
    if (!isAdmin) return;
    setEvents(events.filter(e => e.id !== id));
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-white">限时活动库</h1>
          <p className="text-xs text-zinc-500">追踪并发布游戏内限时节日与大庆活动，统计活动产出奖励。</p>
        </div>

        {isAdmin ? (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-orange-500 text-zinc-950 rounded-xl text-xs font-bold hover:bg-orange-400 transition-all cursor-pointer"
          >
            + 新增限时活动
          </button>
        ) : (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-zinc-900 border border-zinc-800 text-zinc-400">
            🔒 助理只读模式
          </span>
        )}
      </div>

      {/* Table grid */}
      <div className="border border-zinc-900 bg-zinc-900/10 rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500 font-bold bg-zinc-950/40">
              <th className="p-4">活动名称</th>
              <th className="p-4">开始日期</th>
              <th className="p-4">结束日期</th>
              <th className="p-4">产出奖励 (JSON Rewards)</th>
              {isAdmin && <th className="p-4 text-right">操作</th>}
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id} className="border-b border-zinc-900/60 hover:bg-zinc-900/20 text-zinc-300">
                <td className="p-4 font-bold text-white">{ev.name}</td>
                <td className="p-4 font-mono text-zinc-400">{ev.startDate}</td>
                <td className="p-4 font-mono text-zinc-400">{ev.endDate}</td>
                <td className="p-4 font-mono text-[10px] text-zinc-500 truncate max-w-xs">{ev.rewards}</td>
                {isAdmin && (
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDeleteEvent(ev.id)}
                      className="px-2.5 py-1 bg-red-950/20 text-red-400 border border-red-500/25 rounded-lg hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                    >
                      删除
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-4">
            <h3 className="text-lg font-bold text-white">新增限时活动</h3>
            <form onSubmit={handleAddEvent} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-zinc-500 font-medium">活动名称</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-orange-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-500 font-medium">开始日期</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-orange-500/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-500 font-medium">结束日期</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-orange-500/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-500 font-medium">产出奖励 (JSON)</label>
                <input
                  type="text"
                  value={rewards}
                  onChange={(e) => setRewards(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-orange-500/50"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-bold transition-all"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-orange-500 text-zinc-950 rounded-xl text-xs font-bold hover:bg-orange-400 transition-all"
                >
                  确认保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
