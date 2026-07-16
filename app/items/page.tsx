'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

interface Item {
  id: string;
  name: string;
  type: string;
  description: string;
  stats: string;
}

export default function ItemsPage() {
  const { hasPermission } = useAuth();
  const isAdmin = hasPermission('item:create');

  // Sample local state of items
  const [items, setItems] = useState<Item[]>([
    { id: '1', name: 'S钥匙', type: 'KEY', description: '用于开启S级军备宝箱', stats: '{"description":"无直接战斗加成"}' },
    { id: '2', name: '宝石', type: 'CURRENCY', description: '游戏内核心代币，用于购买各种资源', stats: '{"description":"游戏代币"}' },
    { id: '3', name: '随机杰出装备', type: 'EQUIPMENT', description: '开启后随机获得一件杰出品质(紫色)装备', stats: '{"baseAtkAdd":200,"baseHpAdd":1000}' },
    { id: '4', name: '随机精良配件', type: 'TECH_PART', description: '提供特定技能的额外攻击效果', stats: '{"skillName":"哨箭","bonusAtk":150}' },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('EQUIPMENT');
  const [description, setDescription] = useState('');
  const [stats, setStats] = useState('{}');

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return; // double protection

    const newItem: Item = {
      id: Date.now().toString(),
      name,
      type,
      description,
      stats,
    };
    setItems([...items, newItem]);
    setShowModal(false);
    setName('');
    setDescription('');
    setStats('{}');
  };

  const handleDeleteItem = (id: string) => {
    if (!isAdmin) return; // double protection
    setItems(items.filter(item => item.id !== id));
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-white">道具配置库</h1>
          <p className="text-xs text-zinc-500">配置《弹壳特攻队》游戏核心物品及未来计算器所需的伤害数值系数。</p>
        </div>

        {isAdmin ? (
          <button
            onClick={() => setShowModal(true)}
            data-testid="add-item-btn"
            className="px-4 py-2 bg-orange-505 bg-orange-500 text-zinc-950 rounded-xl text-xs font-bold hover:bg-orange-400 transition-all cursor-pointer"
          >
            + 新增配置道具
          </button>
        ) : (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-zinc-900 border border-zinc-800 text-zinc-400">
            🔒 助理只读模式
          </span>
        )}
      </div>

      {/* Grid items */}
      <div className="border border-zinc-900 bg-zinc-900/10 rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500 font-bold bg-zinc-950/40">
              <th className="p-4">物品名称</th>
              <th className="p-4">道具类别</th>
              <th className="p-4">描述说明</th>
              <th className="p-4">属性数值 (JSON Stats)</th>
              {isAdmin && <th className="p-4 text-right">操作</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-zinc-900/60 hover:bg-zinc-900/20 text-zinc-300">
                <td className="p-4 font-bold text-white">{item.name}</td>
                <td className="p-4">
                  <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700">
                    {item.type}
                  </span>
                </td>
                <td className="p-4 text-zinc-400 max-w-xs truncate">{item.description}</td>
                <td className="p-4 font-mono text-[10px] text-zinc-500 truncate max-w-xs">{item.stats}</td>
                {isAdmin && (
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      data-testid={`delete-btn-${item.id}`}
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

      {/* Add Item Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-4">
            <h3 className="text-lg font-bold text-white">新增道具配置</h3>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-zinc-500 font-medium">物品名称</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-orange-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-500 font-medium">道具类别</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-orange-500/50"
                >
                  <option value="KEY">KEY (钥匙)</option>
                  <option value="CURRENCY">CURRENCY (代币)</option>
                  <option value="EQUIPMENT">EQUIPMENT (装备/武器)</option>
                  <option value="TECH_PART">TECH_PART (配件)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-500 font-medium">描述说明</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-orange-500/50 h-20 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-500 font-medium">属性数值 (JSON Stats)</label>
                <input
                  type="text"
                  value={stats}
                  onChange={(e) => setStats(e.target.value)}
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
