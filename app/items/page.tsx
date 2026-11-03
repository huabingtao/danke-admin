'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api-client';
import { ItemEditorDialog } from '@/components/ItemEditorDialog';
import { ResourceViewTabs } from '@/components/ResourceViewTabs';
import { Input } from '@/components/ui/input';
import { ItemClassificationDialog } from '@/components/ItemClassificationDialog';
import { classificationLabel, matchesResourceView, resourceViews, ALL_RESOURCE_VIEW, type ClassificationDictionary } from '@/lib/item-classifications';
import { Button } from '@/components/ui/button';
import { WebItemImport } from '@/components/WebItemImport';
import { getItemDisplayIcon } from '@/lib/item-display';
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
  aliases?: string[];
  icon?: string | null;
  type?: string;
  description?: string | null;
  categoryIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export default function ItemsPage() {
  const { hasPermission, token, user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || hasPermission('item:create');

  const [items, setItems] = useState<Item[]>([]);
  const [dictionary, setDictionary] = useState<ClassificationDictionary>({ categories: [] });
  const [classificationItems, setClassificationItems] = useState<Item[] | null>(null);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [classificationError, setClassificationError] = useState('');
  useEffect(() => {
    let active = true;
    apiFetch('/item-classifications').then((response) => response.json()).then((data) => {
      if (!Array.isArray(data?.categories)) throw new Error('无法读取分类');
      if (active) setDictionary(data);
    }).catch((cause) => { if (active) setClassificationError(cause instanceof Error ? cause.message : '无法读取分类'); });
    return () => { active = false; };
  }, []);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [viewId, setViewId] = useState('all');
  const [onlyUnclassified, setOnlyUnclassified] = useState(false);

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
      const res = await apiFetch('/items', { token });
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
    const timer = window.setTimeout(() => {
      void fetchItems();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchItems]);

  const handleOpenAddModal = () => { setEditingItem(null); setShowModal(true); };
  const handleOpenEditModal = (item: Item) => { setEditingItem(item); setShowModal(true); };

  const handleConfirmDelete = async () => {
    if (!isAdmin || !deleteItemTarget || isDeleting) return;

    try {
      setIsDeleting(true);
      const response = await apiFetch('/yields', { token });
      const records = await response.json();
      if (!Array.isArray(records)) throw new Error('无法读取产出备份，已停止删除');
      const blob = new Blob([JSON.stringify({ item: deleteItemTarget, yields: records.filter((record: { itemId: string }) => record.itemId === deleteItemTarget.id) }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `item-backup-${Date.now()}.json`; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      await apiFetch(`/items/${encodeURIComponent(deleteItemTarget.id)}`, {
        method: 'DELETE',
        token,
      });

      setItems((prev) => prev.filter((it) => it.id !== deleteItemTarget.id));
      triggerToast(`道具「${deleteItemTarget.name}」已成功删除！`);
      setDeleteItemTarget(null);
    } catch (err) {
      console.error('Delete item error:', err);
      triggerToast(err instanceof Error ? err.message : '网络错误，删除失败', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter items by name search
  const filteredItems = items.filter((item) =>
    [item.name, ...(item.aliases ?? [])].some((name) => name.toLowerCase().includes(searchQuery.trim().toLowerCase())) &&
    matchesResourceView(item, resourceViews(dictionary).find((view) => view.id === viewId) ?? ALL_RESOURCE_VIEW) &&
    (!onlyUnclassified || !item.categoryIds?.length)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {classificationError && <p role="alert" className="text-destructive">{classificationError}</p>}
      {classificationItems && <ItemClassificationDialog items={classificationItems} dictionary={dictionary} token={token} onClose={() => setClassificationItems(null)} onSaved={fetchItems} />}
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

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && <Button variant="outline" disabled={!checkedItems.length || !!classificationError} onClick={() => setClassificationItems(items.filter((item) => checkedItems.includes(item.id)))}>批量分类（{checkedItems.length}）</Button>}
          {isAdmin && token && <WebItemImport token={token} onComplete={async (message, failed) => {
            triggerToast(message, failed ? 'error' : 'success');
            await fetchItems();
          }} />}
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
      </div>

      <ResourceViewTabs dictionary={dictionary} value={viewId} onChange={(id) => { setViewId(id); setSearchQuery(''); }} />
      <Button variant={onlyUnclassified ? 'secondary' : 'outline'} aria-pressed={onlyUnclassified} onClick={() => setOnlyUnclassified((previous) => !previous)}>未分类</Button>
      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <Input
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
                <th className="py-3.5 px-4 w-12 text-center"><Button variant="ghost" size="sm" aria-label="勾选当前道具结果" onClick={() => setCheckedItems((previous) => filteredItems.every((item) => previous.includes(item.id)) ? previous.filter((id) => !filteredItems.some((item) => item.id === id)) : [...new Set([...previous, ...filteredItems.map((item) => item.id)])])}>选择</Button></th>
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
                filteredItems.map((item) => {
                  const displayIcon = getItemDisplayIcon(item);
                  return (
                    <tr key={item.id} className="hover:bg-zinc-800/40 transition-colors group">
                      <td className="py-3 px-4 text-center font-mono text-zinc-500 text-xs">
                        <Button variant="ghost" size="sm" aria-label={`勾选${item.name}`} aria-pressed={checkedItems.includes(item.id)} onClick={() => setCheckedItems((previous) => previous.includes(item.id) ? previous.filter((id) => id !== item.id) : [...previous, item.id])}>{checkedItems.includes(item.id) ? "✓" : "○"}</Button>
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
                        <p className="text-xs text-muted-foreground">{classificationLabel(item, dictionary)}</p>

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

      {showModal && <ItemEditorDialog item={editingItem} dictionary={dictionary} token={token} onClose={() => setShowModal(false)} onSaved={fetchItems} />}
    </div>
  );
}
