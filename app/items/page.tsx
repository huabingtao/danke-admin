'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getApiBase } from '@/lib/api';
import { Package, Search, Plus, Trash2, Edit3, X, CheckCircle2, AlertCircle } from 'lucide-react';

export interface Item {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function ItemsPage() {
  const { hasPermission, token, user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || hasPermission('item:create');

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const triggerToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 2500);
  };

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${getApiBase()}/items`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      } else {
        triggerToast('获取道具列表失败', 'error');
      }
    } catch (err) {
      console.error('Failed to fetch items:', err);
      triggerToast('网络错误，无法加载道具列表', 'error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setName('');
    setShowModal(true);
  };

  const handleOpenEditModal = (item: Item) => {
    setEditingId(item.id);
    setName(item.name);
    setShowModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || submitting || !name.trim()) return;

    try {
      setSubmitting(true);
      const url = editingId ? `${getApiBase()}/items/${editingId}` : `${getApiBase()}/items`;
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (res.ok) {
        setShowModal(false);
        triggerToast(editingId ? `道具「${name}」修改成功！` : `道具「${name}」新增成功！`);
        await fetchItems();
      } else {
        const errorData = await res.json().catch(() => ({}));
        triggerToast(errorData.message || '操作失败，请重试', 'error');
      }
    } catch (err) {
      console.error('Save item error:', err);
      triggerToast('网络错误，保存失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string, itemName: string) => {
    if (!isAdmin) return;
    const confirmed = window.confirm(`确定要删除道具「${itemName}」吗？绑定的产出数据也将同步清理。`);
    if (!confirmed) return;

    try {
      const res = await fetch(`${getApiBase()}/items/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        setItems((prev) => prev.filter((it) => it.id !== id));
        triggerToast(`道具「${itemName}」已成功删除！`);
      } else {
        const err = await res.json().catch(() => ({}));
        triggerToast(err.message || '删除失败', 'error');
      }
    } catch (err) {
      console.error('Delete item error:', err);
      triggerToast('网络错误，删除失败', 'error');
    }
  };

  // Filter items by name search
  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center space-x-2 text-xs font-bold transition-all animate-in fade-in slide-in-from-top-4 ${
            toastMessage.type === 'success'
              ? 'bg-orange-500 text-zinc-950 shadow-orange-500/20'
              : 'bg-red-500 text-white shadow-red-500/20'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                道具配置库
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                  共 {filteredItems.length} 项
                </span>
              </h1>
              <p className="text-xs text-zinc-500">
                管理全站资源矩阵所引用的道具词条与基础定义。
              </p>
            </div>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 rounded-2xl text-xs font-black transition-all cursor-pointer shadow-[0_0_20px_rgba(249,115,22,0.2)] flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>新增道具</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索道具名称..."
          className="w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500/50 transition-all"
        />
      </div>

      {/* Simplified Items Table */}
      <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800/80 text-zinc-400 font-bold bg-zinc-950/80">
                <th className="py-3.5 px-5 w-16 text-center">#</th>
                <th className="py-3.5 px-5">道具名称</th>
                <th className="py-3.5 px-5 text-right w-44">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-16 text-center text-zinc-500 font-mono">
                    <div className="inline-block animate-spin w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full mb-2" />
                    <div>正在加载道具列表...</div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-16 text-center text-zinc-500">
                    {searchQuery ? '未找到匹配的道具' : '暂无道具数据'}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-zinc-800/40 transition-colors group">
                    <td className="py-3.5 px-5 text-center font-mono text-zinc-500 text-xs">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="font-bold text-zinc-100 group-hover:text-orange-400 transition-colors text-sm">
                        {item.name}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right space-x-2">
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> 编辑
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            className="px-3 py-1.5 bg-red-950/20 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> 删除
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Minimal Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-zinc-800/80">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-orange-400" />
                {editingId ? '编辑道具名称' : '新增道具'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="pt-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 font-medium">道具名称 *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="如：S钥匙、自选核心、S特工碎片..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-orange-500/50"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold hover:bg-zinc-700 transition-all cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 rounded-xl text-xs font-black hover:from-orange-400 hover:to-amber-400 transition-all cursor-pointer disabled:opacity-50 shadow-[0_0_15px_rgba(249,115,22,0.15)]"
                >
                  {submitting ? '保存中...' : '确认保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
