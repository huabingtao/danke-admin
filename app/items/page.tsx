'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getApiBase } from '@/lib/api';
import {
  Package,
  Search,
  Plus,
  Trash2,
  Edit3,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  ImageIcon,
  Grid,
  Sparkles,
  Maximize2,
} from 'lucide-react';

export interface Item {
  id: string;
  name: string;
  icon?: string | null;
  type?: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// 27 个预置常用资源图标（位于 /icons/items/）
export const PRESET_ITEM_ICONS = [
  's杰出装备',
  '史诗配件',
  '杰出配件',
  '史诗宠物',
  '杰出宠物',
  '觉醒水晶',
  'sp特工万能碎片',
  's特工碎片',
  '传奇载具碎片',
  '史诗收藏品',
  '杰出收藏品',
  '高级收藏之心',
  '传奇收藏品',
  '载具零件钥匙',
  's级军备钥匙',
  '收藏品宝箱钥匙',
  '配件宝箱钥匙',
  '高级钥匙',
  '普通钥匙',
  '宠物钥匙',
  '高级宠物箱钥匙',
  '神器核心',
  '异宠核心',
  '谐振芯片',
  '特工核心',
  '自选核心',
  '其他钥匙',
];

// 图标解析辅助：优先使用配置的 icon（支持本地相对路径或腾讯云 OSS 链接），无配置时回退到默认文件名规则
export const getItemDisplayIcon = (item: { name: string; icon?: string | null }): string => {
  if (item.icon && item.icon.trim()) {
    return item.icon.trim();
  }
  return `/icons/items/${encodeURIComponent(item.name)}.png`;
};

export default function ItemsPage() {
  const { hasPermission, token, user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || hasPermission('item:create');

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal State for Add / Edit
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Lightbox State (大图预览)
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Delete Confirmation State (二次防误删确认)
  const [deleteItemTarget, setDeleteItemTarget] = useState<Item | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
        setItems(Array.isArray(data) ? data : []);
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
    setIcon('/icons/items/s杰出装备.png');
    setShowModal(true);
  };

  const handleOpenEditModal = (item: Item) => {
    setEditingId(item.id);
    setName(item.name);
    setIcon(item.icon || `/icons/items/${item.name}.png`);
    setShowModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || submitting || !name.trim()) return;

    try {
      setSubmitting(true);
      const url = editingId ? `${getApiBase()}/items/${editingId}` : `${getApiBase()}/items`;
      const method = editingId ? 'PATCH' : 'POST';

      const payload: { name: string; icon?: string } = {
        name: name.trim(),
      };
      if (icon.trim()) {
        payload.icon = icon.trim();
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
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

  const handleConfirmDelete = async () => {
    if (!isAdmin || !deleteItemTarget || isDeleting) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`${getApiBase()}/items/${deleteItemTarget.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        setItems((prev) => prev.filter((it) => it.id !== deleteItemTarget.id));
        triggerToast(`道具「${deleteItemTarget.name}」已成功删除！`);
        setDeleteItemTarget(null);
      } else {
        const err = await res.json().catch(() => ({}));
        triggerToast(err.message || '删除失败', 'error');
      }
    } catch (err) {
      console.error('Delete item error:', err);
      triggerToast('网络错误，删除失败', 'error');
    } finally {
      setIsDeleting(false);
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
                管理全站资源矩阵所引用的道具词条、自定义图标与基础定义。
              </p>
            </div>
          </div>
        </div>

        {isAdmin ? (
          <button
            data-testid="add-item-btn"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 rounded-2xl text-xs font-black transition-all cursor-pointer shadow-[0_0_20px_rgba(249,115,22,0.2)] flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>新增道具</span>
          </button>
        ) : (
          <span className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-500 flex items-center gap-1.5">
            🔒 助理只读模式
          </span>
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

      {/* Items Table */}
      <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800/80 text-zinc-400 font-bold bg-zinc-950/80">
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4 w-16 text-center">图标</th>
                <th className="py-3.5 px-5">道具名称</th>
                <th className="py-3.5 px-5 text-right w-36 whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-zinc-500 font-mono">
                    <div className="inline-block animate-spin w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full mb-2" />
                    <div>正在加载道具列表...</div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-zinc-500">
                    {searchQuery ? '未找到匹配的道具' : '暂无道具数据'}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const displayIcon = getItemDisplayIcon(item);
                  return (
                    <tr key={item.id} className="hover:bg-zinc-800/40 transition-colors group">
                      <td className="py-3 px-4 text-center font-mono text-zinc-500 text-xs">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ url: displayIcon, title: item.name })}
                          className="w-9 h-9 rounded-xl bg-zinc-950/80 border border-zinc-800 p-1 flex items-center justify-center group-hover:border-orange-500/50 hover:border-orange-400 hover:scale-110 active:scale-95 transition-all shadow-inner relative overflow-hidden cursor-pointer"
                          title="点击查看大图"
                        >
                          <img
                            src={displayIcon}
                            alt={item.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              // Fallback display if image fails to load
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.currentTarget.parentElement?.querySelector('.icon-fallback') as HTMLElement)?.classList.remove('hidden');
                            }}
                          />
                          <div className="icon-fallback hidden text-zinc-600">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center text-orange-400 transition-opacity">
                            <Maximize2 className="w-3 h-3" />
                          </div>
                        </button>
                      </td>
                      <td className="py-3 px-5">
                        <span className="font-bold text-zinc-100 group-hover:text-orange-400 transition-colors text-sm">
                          {item.name}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                          {isAdmin && (
                            <>
                              <button
                                data-testid={`edit-btn-${item.id}`}
                                onClick={() => handleOpenEditModal(item)}
                                className="h-7 px-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1 shrink-0"
                                title="编辑道具"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>编辑</span>
                              </button>
                              <button
                                data-testid={`delete-btn-${item.id}`}
                                onClick={() => setDeleteItemTarget(item)}
                                className="h-7 px-2.5 bg-red-950/20 hover:bg-red-500/20 text-red-400 border border-red-500/30 hover:border-red-500/50 rounded-xl text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1 shrink-0"
                                title="删除道具"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>删除</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lightbox Modal (查看大图) */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="w-full max-w-sm bg-zinc-900/95 border border-zinc-700/80 p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1.5 rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1 pt-2">
              <h3 className="text-base font-black text-white flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-400" />
                {previewImage.title}
              </h3>
              <p className="text-xs text-zinc-500 font-mono max-w-[280px] truncate" title={previewImage.url}>
                {previewImage.url}
              </p>
            </div>

            {/* 大图展示 */}
            <div className="w-48 h-48 rounded-2xl bg-zinc-950/90 border border-zinc-800 p-4 flex items-center justify-center shadow-inner relative">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="w-full h-full object-contain drop-shadow-md"
                onError={(e) => {
                  (e.target as HTMLImageElement).alt = '图片加载失败';
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              关闭预览
            </button>
          </div>
        </div>
      )}

      {/* Delete Double Confirmation Modal (二次防误删确认框) */}
      {deleteItemTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-900 border border-red-500/30 p-6 rounded-3xl shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">确认删除道具？</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  您正在永久删除道具{' '}
                  <span className="text-orange-400 font-bold">
                    「{deleteItemTarget.name}」
                  </span>
                  。
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-red-950/30 border border-red-500/20 text-red-300 text-xs leading-relaxed space-y-1">
              <p className="font-bold flex items-center gap-1 text-red-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                级联清理风险提示：
              </p>
              <p className="text-[11px] text-red-300/80">
                删除该道具后，数据库中所有月份绑定的该道具产出数据也将同步级联清理，该操作不可撤销！
              </p>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteItemTarget(null)}
                className="flex-1 py-2.5 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-50 shadow-[0_0_15px_rgba(239,68,68,0.3)] flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>正在删除...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>确认删除</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal with Icon Configuration */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-800/80">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-orange-400" />
                {editingId ? '编辑道具及图标' : '新增道具'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              {/* 道具名称 */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 font-medium">道具名称 *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    // 若用户在新建且未填图标，自动辅助联想
                    if (!editingId && !icon) {
                      setIcon(`/icons/items/${e.target.value}.png`);
                    }
                  }}
                  placeholder="如：S钥匙、自选核心、S特工碎片..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-orange-500/50"
                />
              </div>

              {/* 道具图标选择 (仅支持从图库点选，不支持输入路径) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-orange-400" />
                    <span>选择道具图标 *</span>
                  </label>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    共 {PRESET_ITEM_ICONS.length} 款可选
                  </span>
                </div>

                {/* 当前选中的图标高亮提示卡片 */}
                <div className="p-2.5 rounded-2xl bg-zinc-950 border border-zinc-800/90 flex items-center gap-3 shadow-inner">
                  <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-700/60 p-1 shrink-0 flex items-center justify-center relative overflow-hidden shadow-sm">
                    {icon.trim() ? (
                      <img
                        src={icon.trim()}
                        alt="预览"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Package className="w-5 h-5 text-zinc-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-zinc-500 font-medium">当前选中图标</div>
                    <div className="text-xs font-bold text-orange-400 truncate">
                      {icon.trim() ? icon.replace(/^\/icons\/items\//, '').replace(/\.png$/, '') : '尚未选择图标，请在下方点击选择'}
                    </div>
                  </div>
                </div>

                {/* 纯点选图标库网格面板 */}
                <div className="p-2 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl space-y-1.5">
                  <div className="text-[10px] text-zinc-500 font-semibold px-1">
                    点击下方图库即可直接选定：
                  </div>
                  <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                    {PRESET_ITEM_ICONS.map((presetName) => {
                      const presetPath = `/icons/items/${presetName}.png`;
                      const isSelected = icon === presetPath || icon.replace(/^\/icons\/items\//, '').replace(/\.png$/, '') === presetName;
                      return (
                        <button
                          key={presetName}
                          type="button"
                          onClick={() => setIcon(presetPath)}
                          className={`p-1.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
                            isSelected
                              ? 'bg-orange-500/20 border-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.35)] scale-105'
                              : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/60 hover:scale-102'
                          }`}
                          title={presetName}
                        >
                          {isSelected && (
                            <div className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-orange-500 text-zinc-950 flex items-center justify-center text-[8px] font-black">
                              ✓
                            </div>
                          )}
                          <img
                            src={presetPath}
                            alt={presetName}
                            className="w-7 h-7 object-contain"
                          />
                          <span
                            className={`text-[9px] truncate max-w-full font-medium ${
                              isSelected ? 'text-orange-300 font-bold' : 'text-zinc-400'
                            }`}
                          >
                            {presetName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 底部按钮 */}
              <div className="flex space-x-3 pt-3 border-t border-zinc-800/60">
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
