'use client';

import { ResourceViewTabs } from '@/components/ResourceViewTabs';

import { MatrixItemTransfer } from '@/components/MatrixItemTransfer';
import { matchesResourceView, resourceViews, ALL_RESOURCE_VIEW, type ClassifiedItem, type ClassificationDictionary } from '@/lib/item-classifications';

import Image from 'next/image';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MatrixDefinitionDialog, type MatrixDefinitionAction } from '@/components/MatrixDefinitionDialog';
import { catalogItemIcon, getItemIconUrl } from '@/lib/item-icons';
import { latestYieldSnapshot, type YieldPeriod } from '@/lib/yield-snapshot';
import { buildYieldColumns, yieldItemKey, sortYieldItems } from '@/lib/yield-columns';
import type { GemValuation } from '@/lib/gem-valuation';
import { applyColumnOrder, moveColumnOrder, parseColumnOrder, sortColumnsByValue, YIELD_COLUMN_ORDER_STORAGE_KEY, YIELD_ROW_ORDER_STORAGE_KEY, YIELD_VALUE_SORT_STORAGE_KEY, type YieldValueSort } from '@/lib/yield-column-order';
import {
  Sparkles,
  Filter,
  Download,
  Check,
  Search,
  Grid3X3,
  GripVertical,
  Trash2,
  Shield,
  Layers,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Edit3,
  Loader2,
} from 'lucide-react';

interface Source {
  id: string;
  name: string;
  type: string;
  category: string;
  subcategory: string | null;
  description: string | null;
}

interface Item extends ClassifiedItem {
  gemValuation?: GemValuation | null;
  id: string;
  name: string;
  icon?: string | null;
  type: string;
  description: string | null;
}

interface MonthlyYieldRecord {
  id: string;
  itemId: string;
  sourceId: string;
  amount: number;
  month: number;
  year: number;
  notes: string | null;
}

// 26 个标准获取途径排序规则 (已剔除非通用道具的派对/连锁礼包)
const STANDARD_SOURCE_NAMES = [
  '工会远征第一阶段难度12以上',
  '工会远征第二阶段',
  '工会商店兑换',
  '工会远征排行榜',
  '工会探索',
  '通用兑换',
  '日常挑战',
  '回响日常部分',
  '回响结算部分',
  '区域',
  '逃离行动',
  '试炼之路+永久卡',
  '主线+挑战更新，按照10关',
  '通行证免费',
  '任务好礼',
  '限时好礼',
  '联机挑战',
  '特别行动',
  '工会神秘商人',
  '广告',
  '巡逻掉落',
  '活动1（配件）',
  '活动2（武器，载具）',
  '活动3（宠物）',
  '活动4（无进度或兑换）',
  '活动5（四合一）',
];

export default function YieldsPage() {
  const { token, user, hasPermission } = useAuth();
  const canEditRows = user?.role === 'ADMIN' || hasPermission?.('yield:edit');
  const canEditColumns = user?.role === 'ADMIN' || hasPermission?.('item:create');
  const canDeleteColumns = user?.role === 'ADMIN' || hasPermission?.('item:delete');
  const [definitionAction, setDefinitionAction] = useState<MatrixDefinitionAction | null>(null);

  const [snapshotPeriod, setSnapshotPeriod] = useState<YieldPeriod | null>(null);

  const [sources, setSources] = useState<Source[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [yields, setYields] = useState<MonthlyYieldRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [viewId, setViewId] = useState('all');
  const [dictionary, setDictionary] = useState<ClassificationDictionary>({ categories: [] });
  const [dictionaryError, setDictionaryError] = useState('');
  const [transferOpen, setTransferOpen] = useState(false);
  const [preference, setPreference] = useState<{ owner: string; viewId: string; ids: string[] | null; loaded: boolean; error: string }>({ owner: '', viewId: 'all', ids: null, loaded: false, error: '' });
  const [preferenceRetry, setPreferenceRetry] = useState(0);
  const preferenceOwner = user?.id ?? token ?? '';

  useEffect(() => {
    let active = true;
    apiFetch('/item-classifications').then((response) => response.json()).then((data) => {
      if (!data || !Array.isArray(data.categories)) throw new Error('分类数据格式错误');
      if (active) { setDictionary(data); setDictionaryError(''); }
    }).catch((cause) => { if (active) setDictionaryError(cause instanceof Error ? cause.message : '分类读取失败'); });
    return () => { active = false; };
  }, [preferenceRetry]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    apiFetch(`/me/preferences/yield-matrix?viewId=${encodeURIComponent(viewId)}`, { token }).then((response) => response.json()).then((data) => {
      if (!data || !(data.selectedItemIds === null || (Array.isArray(data.selectedItemIds) && data.selectedItemIds.every((id: unknown) => typeof id === 'string')))) throw new Error('显示列配置格式错误');
      if (active) setPreference({ owner: preferenceOwner, viewId, ids: data.selectedItemIds, loaded: true, error: '' });
    }).catch((cause) => { if (active) setPreference({ owner: preferenceOwner, viewId, ids: null, loaded: false, error: cause instanceof Error ? cause.message : '显示列配置读取失败' }); });
    return () => { active = false; };
  }, [token, preferenceOwner, preferenceRetry, viewId]);
  const [hideEmptySources, setHideEmptySources] = useState(true);
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [valueSort, setValueSort] = useState<YieldValueSort>('DESC');
  const [rowOrder, setRowOrder] = useState<string[]>([]);
  const [dropRowTarget, setDropRowTarget] = useState<string | null>(null);
  const draggedRow = useRef<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const draggedColumn = useRef<string | null>(null);
  const matrixScroll = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setColumnOrder(parseColumnOrder(localStorage.getItem(YIELD_COLUMN_ORDER_STORAGE_KEY))); }
      catch { /* Keep in-memory ordering when storage is unavailable. */ }
      try {
        const saved = localStorage.getItem(YIELD_VALUE_SORT_STORAGE_KEY);
        if (saved === 'ASC' || saved === 'MANUAL') setValueSort(saved);
      } catch { /* Default to descending value without storage. */ }
      try { setRowOrder(parseColumnOrder(localStorage.getItem(YIELD_ROW_ORDER_STORAGE_KEY))); }
      catch { /* Row dragging remains available in memory. */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function saveValueSort(direction: YieldValueSort) {
    setValueSort(direction);
    try { localStorage.setItem(YIELD_VALUE_SORT_STORAGE_KEY, direction); }
    catch { /* Sorting remains available in memory. */ }
  }

  function saveColumnOrder(order: string[]) {
    setColumnOrder(order);
    saveValueSort(order.length ? 'MANUAL' : 'DESC');
    try {
      if (order.length) localStorage.setItem(YIELD_COLUMN_ORDER_STORAGE_KEY, JSON.stringify(order));
      else localStorage.removeItem(YIELD_COLUMN_ORDER_STORAGE_KEY);
    } catch { /* Dragging still works without persistence. */ }
  }


  function saveRowOrder(order: string[]) {
    setRowOrder(order);
    try {
      if (order.length) localStorage.setItem(YIELD_ROW_ORDER_STORAGE_KEY, JSON.stringify(order));
      else localStorage.removeItem(YIELD_ROW_ORDER_STORAGE_KEY);
    } catch { /* Keep in-memory row ordering. */ }
  }

  // In-place Editing States
  const [editingCell, setEditingCell] = useState<{ itemId: string; sourceId: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());
  const pendingCells = useRef(new Set<string>());
  const closedCellEdits = useRef(new Set<string>());
  const failedDrafts = useRef(new Map<string, string>());
  const [cellErrors, setCellErrors] = useState<Record<string, string>>({});
  const saveStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copiedMd, setCopiedMd] = useState(false);

  useEffect(() => () => {
    if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current);
  }, []);

  function showSaveStatus(message: string) {
    if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current);
    setSaveStatus(message);
    saveStatusTimer.current = setTimeout(() => setSaveStatus(''), 3000);
  }

  // 途径名称就地双击编辑状态



  // 排序状态
  // 1. 获取途径按名称拼音首字母排序: 'ASC' (A-Z) | 'DESC' (Z-A)
  const [sourceSortOrder, setSourceSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  // 2. 资源列按产出数量排序: { itemId, direction: 'DESC' | 'ASC' } | null
  const [quantitySort, setQuantitySort] = useState<{ itemId: string; direction: 'DESC' | 'ASC' } | null>(null);
  const activeView = resourceViews(dictionary).find((view) => view.id === viewId) ?? ALL_RESOURCE_VIEW;
  const viewItems = useMemo(() => items.filter((item) => matchesResourceView(item, activeView)), [items, activeView]);
  function changeView(id: string, updateUrl = true) {
    setViewId(id);
    setTransferOpen(false);
    setSearchQuery(''); setQuantitySort(null);
    if (updateUrl) {
      const url = new URL(window.location.href);
      if (id === 'all') url.searchParams.delete('view'); else url.searchParams.set('view', id);
      window.history.replaceState(null, '', url);
    }
  }
  useEffect(() => {
    const restore = () => {
      const requested = new URL(window.location.href).searchParams.get('view') ?? 'all';
      const next = resourceViews(dictionary).some((view) => view.id === requested) ? requested : 'all';
      if (next !== viewId) changeView(next, false);
    };
    const timer = window.setTimeout(restore, 0);
    window.addEventListener('popstate', restore);
    return () => { window.clearTimeout(timer); window.removeEventListener('popstate', restore); };
  }, [dictionary, viewId]);


  // 1. Fetch Items
  useEffect(() => {
    apiFetch('/items')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setItems(data);
      })
      .catch((err) => console.error('Failed to fetch items', err));
  }, []);

  // 2. Fetch Sources
  useEffect(() => {
    apiFetch('/sources')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setSources(data);
      })
      .catch((err) => console.error('Failed to fetch sources', err));
  }, []);

  // 3. Fetch Yields
  const fetchYields = useCallback(() => {
    setLoading(true);
    apiFetch('/yields')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const snapshot = latestYieldSnapshot<MonthlyYieldRecord>(data);
          setSnapshotPeriod(snapshot.period);
          setYields(snapshot.records);
        }
      })
      .catch((err) => console.error('Failed to fetch yields', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchYields();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchYields]);

  // Yield lookup map: key = `${sourceId}_${itemId}` -> amount
  const yieldLookup = useMemo(() => {
    const map = new Map<string, number>();
    yields.forEach((y) => {
      map.set(`${y.sourceId}_${y.itemId}`, y.amount);
    });
    return map;
  }, [yields]);

  const selectedItemIds = preference.owner === preferenceOwner && preference.viewId === viewId ? preference.ids : null;
  const displayItems = useMemo(() => {
    const columns = selectedItemIds === null ? buildYieldColumns(viewItems, yields) : sortYieldItems(viewItems.filter((item) => new Set(selectedItemIds).has(item.id)));
    const ordered = applyColumnOrder(columns, columnOrder);
    return valueSort === 'MANUAL' ? ordered : sortColumnsByValue(ordered, valueSort);
  }, [viewItems, yields, columnOrder, selectedItemIds, valueSort]);
  const sortedItems = displayItems;

  // Sort and filter rows (Sources)
  const sortedSources = useMemo(() => {
    let list = [...sources];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.category && s.category.toLowerCase().includes(q))
      );
    }

    if (hideEmptySources) {
      const visibleIds = new Set(sortedItems.map((item) => item.id));
      list = list.filter((source) => {
        const sourceYields = yields.filter((y) => y.sourceId === source.id);
        return sourceYields.some((y) => visibleIds.has(y.itemId) && y.amount !== 0);
      });
    }

    // 排序优先级：如果指定了资源数量列排序，则按该资源的产出数量排；否则默认按途径拼音首字母排序
    if (quantitySort) {
      list.sort((a, b) => {
        const amtA = yieldLookup.get(`${a.id}_${quantitySort.itemId}`) || 0;
        const amtB = yieldLookup.get(`${b.id}_${quantitySort.itemId}`) || 0;
        if (amtA !== amtB) {
          return quantitySort.direction === 'DESC' ? amtB - amtA : amtA - amtB;
        }
        // 产出数量相同时按拼音首字母次要排序
        return a.name.localeCompare(b.name, 'zh-CN');
      });
    } else {
      // 严格按途径名称首字母 (中文拼音) 排序
      list.sort((a, b) => {
        const comp = a.name.localeCompare(b.name, 'zh-CN');
        return sourceSortOrder === 'ASC' ? comp : -comp;
      });
    }

    return !quantitySort && rowOrder.length ? applyColumnOrder(list, rowOrder) : list;
  }, [sources, searchQuery, hideEmptySources, yields, yieldLookup, quantitySort, sourceSortOrder, sortedItems, rowOrder]);

  // 排序切换处理
  const handleToggleSourceSort = () => {
    saveRowOrder([]);
    // 切换途径名称拼音首字母排序时，清除资源数量列排序
    setQuantitySort(null);
    setSourceSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
  };

  const handleToggleQuantitySort = (itemId: string) => {
    if (quantitySort?.itemId === itemId) {
      if (quantitySort.direction === 'DESC') {
        // 从降序切换为升序
        setQuantitySort({ itemId, direction: 'ASC' });
      } else {
        // 从升序重置回途径名称首字母默认排序
        setQuantitySort(null);
      }
    } else {
      // 点击新列首次默认为降序 (数量从高到低)
      setQuantitySort({ itemId, direction: 'DESC' });
    }
  };

  const handleSourceDoubleClick = (source: Source) => {
    if (canEditRows) setDefinitionAction({ kind: 'row', mode: 'rename', id: source.id, name: source.name, members: [source] });
  };

  function moveSource(fromId: string, toId: string) {
    const base = [...sources].sort((a, b) => {
      if (quantitySort) {
        const difference = (yieldLookup.get(`${a.id}_${quantitySort.itemId}`) ?? 0) - (yieldLookup.get(`${b.id}_${quantitySort.itemId}`) ?? 0);
        if (difference) return quantitySort.direction === 'DESC' ? -difference : difference;
        return a.name.localeCompare(b.name, 'zh-CN');
      }
      const difference = a.name.localeCompare(b.name, 'zh-CN');
      return sourceSortOrder === 'ASC' ? difference : -difference;
    });
    const allIds = (quantitySort ? base : applyColumnOrder(base, rowOrder)).map((source) => source.id);
    saveRowOrder(moveColumnOrder(allIds, fromId, toId));
    setQuantitySort(null);
  }

  function openColumnAction(item: Item, mode: 'rename' | 'delete') {
    const original = items.find((entry) => entry.id === item.id) ?? item;
    const key = yieldItemKey(item.name);
    const logicalSiblings = displayItems.filter((entry) => yieldItemKey(entry.name) === key);
    const members = mode === 'delete' && logicalSiblings.length === 1
      ? items.filter((entry) => yieldItemKey(entry.name) === key)
      : [original];
    setDefinitionAction({ kind: 'column', mode, id: original.id, name: original.name, members });
  }

  async function confirmDefinitionAction(name: string) {
    const action = definitionAction;
    if (!action) return;
    const endpoint = action.kind === 'row' ? '/sources' : '/items';
    if (action.mode === 'rename') {
      const response = await apiFetch(`${endpoint}/${encodeURIComponent(action.id)}`, { method: 'PATCH', token, body: JSON.stringify({ name }) });
      const updated = await response.json();
      if (action.kind === 'row') setSources((previous) => previous.map((source) => source.id === action.id ? { ...source, name: updated.name } : source));
      else setItems((previous) => previous.map((item) => item.id === action.id ? { ...item, name: updated.name } : item));
      return;
    }
    // Fetch all periods immediately before deletion; do not back up only the visible snapshot.
    const response = await apiFetch('/yields', { token });
    const records: MonthlyYieldRecord[] = await response.json();
    if (!Array.isArray(records)) throw new Error('无法读取关联记录，已停止删除');
    const ids = new Set(action.members.map((member) => member.id));
    const related = records.filter((record) => ids.has(action.kind === 'row' ? record.sourceId : record.itemId));
    const blob = new Blob([JSON.stringify({ deletedAt: new Date().toISOString(), kind: action.kind, definitions: action.members, yields: related }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `matrix-${action.kind}-backup-${Date.now()}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    // Refresh local state after every successful delete; a failure leaves remaining members visible.
    for (const member of action.members) {
      const stillPresent = action.kind === 'row' ? sources.some((source) => source.id === member.id) : items.some((item) => item.id === member.id);
      if (!stillPresent) continue;
      await apiFetch(`${endpoint}/${encodeURIComponent(member.id)}`, { method: 'DELETE', token });
      if (action.kind === 'row') {
        setSources((previous) => previous.filter((source) => source.id !== member.id));
        setYields((previous) => previous.filter((record) => record.sourceId !== member.id));
      } else {
        setItems((previous) => previous.filter((item) => item.id !== member.id));
        setYields((previous) => previous.filter((record) => record.itemId !== member.id));
      }
    }
    setQuantitySort(null);
  }

  // Compute column totals
  const columnTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    sortedItems.forEach((item) => {
      let sum = 0;
      sortedSources.forEach((src) => {
        const amt = yieldLookup.get(`${src.id}_${item.id}`) || 0;
        sum += amt;
      });
      // Round to 2 decimal places
      totals[item.id] = Math.round(sum * 100) / 100;
    });
    return totals;
  }, [sortedItems, sortedSources, yieldLookup]);

  // Core metrics for top stats bar
  const statsOverview = useMemo(() => {
    const total = (kind: string) => sortedItems.filter((item) => item.categoryIds?.includes(kind)).reduce((sum, item) => sum + (columnTotals[item.id] ?? 0), 0);
    return { totalKeys: Math.round(total('key') * 100) / 100, totalCores: sortedItems.filter((item) => item.categoryIds?.includes('core')).length };
  }, [sortedItems, columnTotals]);

  // In-place Cell Edit Save Handler
  const handleCellDoubleClick = (itemId: string, sourceId: string, currentVal: number) => {
    if (!canEditRows || loading || pendingCells.current.has(`${sourceId}_${itemId}`)) return;
    closedCellEdits.current.delete(`${sourceId}_${itemId}`);
    setEditingCell({ itemId, sourceId });
    setEditValue(failedDrafts.current.get(`${sourceId}_${itemId}`) ?? (currentVal === 0 ? '' : currentVal.toString()));
  };

  const handleSaveCell = async (itemId: string, sourceId: string) => {
    const key = `${sourceId}_${itemId}`;
    if (!snapshotPeriod || loading || !canEditRows || closedCellEdits.current.has(key) || pendingCells.current.has(key)) return;
    const draft = editValue;
    const numericValue = draft.trim() === '' ? 0 : Number(draft);
    const closeThisEditor = () => {
      closedCellEdits.current.add(key);
      setEditingCell((current) => current?.itemId === itemId && current.sourceId === sourceId ? null : current);
    };
    const clearError = () => setCellErrors((previous) => { const next = { ...previous }; delete next[key]; return next; });
    if (!Number.isFinite(numericValue)) {
      setCellErrors((previous) => ({ ...previous, [key]: '请输入有效数字' }));
      failedDrafts.current.set(key, draft);
      return;
    }
    if (numericValue === (yieldLookup.get(key) ?? 0)) {
      failedDrafts.current.delete(key);
      clearError();
      closeThisEditor();
      return;
    }

    // Ref guards Enter + blur in the same event cycle; different cells may save independently.
    pendingCells.current.add(key);
    setSavingCells((previous) => new Set(previous).add(key));
    clearError();

    try {
      const response = await apiFetch('/yields', {
        method: 'POST',
        token,
        body: JSON.stringify({
          itemId,
          sourceId,
          year: snapshotPeriod.year,
          month: snapshotPeriod.month,
          amount: numericValue,
        }),
      });
      const saved: MonthlyYieldRecord = await response.json();
      if (!saved || typeof saved.id !== 'string' || saved.itemId !== itemId || saved.sourceId !== sourceId || saved.year !== snapshotPeriod.year || saved.month !== snapshotPeriod.month || typeof saved.amount !== 'number' || !Number.isFinite(saved.amount)) {
        throw new Error('保存结果异常，请重试确认');
      }
      setYields((previous) => {
        const matches = (record: MonthlyYieldRecord) => record.id === saved.id || (record.itemId === saved.itemId && record.sourceId === saved.sourceId && record.year === saved.year && record.month === saved.month);
        return previous.some(matches) ? previous.map((record) => matches(record) ? saved : record) : [...previous, saved];
      });
      failedDrafts.current.delete(key);
      showSaveStatus('已保存');
      closeThisEditor();
    } catch (err) {
      failedDrafts.current.set(key, draft);
      setCellErrors((previous) => ({ ...previous, [key]: err instanceof Error ? err.message : '保存失败，请重试' }));
      showSaveStatus('保存失败，输入已保留，可重试');
    } finally {
      pendingCells.current.delete(key);
      setSavingCells((previous) => { const next = new Set(previous); next.delete(key); return next; });
    }
  };

  // Copy as Markdown Table
  const handleExportMarkdown = () => {
    let md = `### 资源获取统计全景表\n\n`;
    md += `| 获取途径 | ` + sortedItems.map((i) => i.name).join(' | ') + ` |\n`;
    md += `| :--- | ` + sortedItems.map(() => `:---:`).join(' | ') + ` |\n`;

    sortedSources.forEach((src) => {
      const rowVals = sortedItems.map((itm) => {
        const v = yieldLookup.get(`${src.id}_${itm.id}`);
        return v !== undefined && v !== 0 ? v : '-';
      });
      md += `| ${src.name} | ` + rowVals.join(' | ') + ` |\n`;
    });

    // Totals row
    const totalRowVals = sortedItems.map((itm) => columnTotals[itm.id] || 0);
    md += `| **合计** | ` + totalRowVals.map((v) => `**${v}**`).join(' | ') + ` |\n`;

    navigator.clipboard.writeText(md);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2500);
  };

  // Category Color Map for Pill
  const getCategoryBadgeClass = (cat: string) => {
    if (cat?.includes('工会')) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (cat?.includes('活动')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    if (cat?.includes('日常') || cat?.includes('回响')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (cat?.includes('常规') || cat?.includes('通行证')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    return 'bg-zinc-800 text-zinc-400 border-zinc-700';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {transferOpen && <MatrixItemTransfer key={viewId} items={viewItems} dictionary={dictionary} selectedIds={displayItems.map((item) => item.id)} onClose={() => setTransferOpen(false)} onSave={async (ids) => {
        const response = await apiFetch('/me/preferences/yield-matrix', { method: 'PUT', token, body: JSON.stringify({ selectedItemIds: ids, viewId }) });
        const saved = await response.json();
        setPreference((previous) => previous.owner === preferenceOwner && previous.viewId === viewId ? { owner: preferenceOwner, viewId, ids: saved.selectedItemIds, loaded: true, error: '' } : previous);
      }} />}
      {definitionAction && <MatrixDefinitionDialog action={definitionAction} onClose={() => setDefinitionAction(null)} onConfirm={confirmDefinitionAction} />}
      {/* 顶部标题与操作栏 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500/20 to-amber-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-lg shadow-orange-500/5">
              <Grid3X3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                基础资源获取大表
              </h1>
            </div>
          </div>
        </div>

        {/* 操作栏 */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="outline" disabled={!preference.loaded || preference.owner !== preferenceOwner || preference.viewId !== viewId || !!dictionaryError} onClick={() => setTransferOpen(true)}>管理显示道具</Button>
          <Button
            variant="outline"
            title="按钻石单价排列；优先使用默认单价，无默认单价时取最高方案价，未配置价格置后"
            onClick={() => saveValueSort(valueSort === 'DESC' ? 'ASC' : 'DESC')}
          >
            {valueSort === 'DESC' ? <ArrowDown aria-hidden="true" /> : valueSort === 'ASC' ? <ArrowUp aria-hidden="true" /> : <ArrowUpDown aria-hidden="true" />}
            {valueSort === 'DESC' ? '价值：高 → 低' : valueSort === 'ASC' ? '价值：低 → 高' : '按价值降序'}
          </Button>
          {rowOrder.length > 0 && <Button variant="outline" size="sm" onClick={() => { saveRowOrder([]); setQuantitySort(null); }}>恢复默认行序</Button>}
          {columnOrder.length > 0 && <Button variant="outline" size="sm" onClick={() => saveColumnOrder([])}>恢复默认列序</Button>}

          <button
            onClick={handleExportMarkdown}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-xs font-bold rounded-2xl transition-all cursor-pointer shadow-sm"
          >
            {copiedMd ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">已复制 Markdown</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-zinc-400" />
                <span>导出 MD 表格</span>
              </>
            )}
          </button>

          {saveStatus && (
            <span role="status" className="text-xs font-bold text-orange-400 bg-orange-500/10 px-3 py-1.5 rounded-xl border border-orange-500/20">
              {saveStatus}
            </span>
          )}
        </div>
      </div>

      {/* 核心指标微缩仪表盘 (Quick Stats Bar) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-zinc-900/70 border border-zinc-800/80 p-4 rounded-3xl flex items-center justify-between shadow-lg shadow-amber-500/5">
          <div className="space-y-1">
            <div className="text-xs text-zinc-400 font-semibold flex items-center gap-1.5">
              <Image unoptimized width={24} height={24} src={catalogItemIcon('s级军备钥匙')} alt="S级军备钥匙" className="size-6 object-contain" /> 钥匙
            </div>
            <p className="text-[11px] text-zinc-500">
              已显示道具中的钥匙数量
            </p>
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {statsOverview.totalKeys.toLocaleString()} <span className="text-xs text-zinc-500 font-normal">把</span>
          </div>
        </div>

        <div className="bg-zinc-900/70 border border-zinc-800/80 p-4 rounded-3xl flex items-center justify-between shadow-lg shadow-cyan-500/5">
          <div className="space-y-1">
            <div className="text-xs text-zinc-400 font-semibold flex items-center gap-1.5">
              <Image unoptimized width={24} height={24} src={catalogItemIcon('神器核心')} alt="武器核心" className="size-6 object-contain" /> 核心
            </div>
            <p className="text-[11px] text-zinc-500">
              当前显示的核心类道具种类
            </p>
          </div>
          <div className="text-2xl font-black text-cyan-400 font-mono">
            {statsOverview.totalCores} <span className="text-xs text-zinc-500 font-normal">种</span>
          </div>
        </div>
      </div>

      {/* 筛选与搜索工具条 */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-zinc-900/50 border border-zinc-800/80 p-3 rounded-2xl">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <ResourceViewTabs dictionary={dictionary} value={viewId} onChange={changeView} />
          {(dictionaryError || preference.error) && <div role="alert" className="text-sm text-destructive">{dictionaryError || preference.error}<Button variant="outline" size="sm" onClick={() => setPreferenceRetry((value) => value + 1)}>重试读取</Button></div>}
        </div>

        {/* 途径搜索 & 零产出过滤开关 */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索获取途径..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500/50"
            />
          </div>

          <label className="flex items-center space-x-2 text-xs text-zinc-400 cursor-pointer select-none shrink-0 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800/60 hover:text-zinc-200">
            <input
              type="checkbox"
              checked={hideEmptySources}
              onChange={(e) => setHideEmptySources(e.target.checked)}
              className="rounded bg-zinc-900 border-zinc-700 text-orange-500 focus:ring-0 cursor-pointer"
            />
            <span>仅看有产出途径</span>
          </label>
        </div>
      </div>

      {!loading && displayItems.length === 0 && <p role="status">请通过管理显示道具选择资源</p>}
      {/* 全景主矩阵大表 */}
      <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl">
        <div
          ref={matrixScroll}
          className="yield-matrix-scroll overflow-x-auto max-h-[68vh]"
          tabIndex={0}
          aria-label="资源产出表格滚动区域"
          onDragOver={(event) => {
            if ((!draggedColumn.current && !draggedRow.current) || !matrixScroll.current) return;
            event.preventDefault();
            const container = matrixScroll.current;
            const rect = container.getBoundingClientRect();
            if (draggedRow.current) {
              if (event.clientY < rect.top + 100) container.scrollTop -= 24;
              else if (event.clientY > rect.bottom - 56) container.scrollTop += 24;
              return;
            }
            // Include the sticky source column in the left-edge scrolling zone.
            if (event.clientX > rect.right - 56) container.scrollLeft += 24;
            else if (event.clientX < rect.left + 250) container.scrollLeft -= 24;
          }}
        >
          <table className="w-full text-left border-collapse font-sans text-xs">
            {/* 表头 (Sticky) */}
            <thead className="bg-zinc-950/95 sticky top-0 z-30 backdrop-blur-md border-b border-zinc-800">
              <tr>
                {/* 途径名称 (双向固定: Sticky Top + Sticky Left) - 支持拼音首字母排序 */}
                <th
                  onClick={handleToggleSourceSort}
                  className="py-3 px-4 font-extrabold text-zinc-300 min-w-[210px] sticky left-0 z-40 bg-zinc-950/95 border-r border-zinc-800 cursor-pointer select-none hover:bg-zinc-900 transition-colors group"
                  title="点击切换途径名称拼音首字母排序 (A-Z / Z-A)"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="group-hover:text-orange-400 transition-colors">获取途径 / 来源</span>
                      {!quantitySort && rowOrder.length === 0 && (
                        <span className="text-[10px] text-orange-400 font-mono font-bold flex items-center bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                          {sourceSortOrder === 'ASC' ? (
                            <>
                              A-Z <ArrowUp className="w-3 h-3 ml-0.5 inline" />
                            </>
                          ) : (
                            <>
                              Z-A <ArrowDown className="w-3 h-3 ml-0.5 inline" />
                            </>
                          )}
                        </span>
                      )}
                    </div>
                    {!quantitySort && rowOrder.length > 0 && <Badge variant="secondary">自定义行序</Badge>}
                    <span className="text-[10px] text-zinc-500 font-normal">
                      共 {sortedSources.length} 途径
                    </span>
                  </div>
                </th>

                {/* 资源列头 (含道具真实图标与产出数量排序) */}
                {sortedItems.map((item) => {
                  const isSorted = quantitySort?.itemId === item.id;
                  return (
                    <th
                      key={item.id}
                      data-column-id={item.id}
                      data-drop-target={dropTarget === item.id || undefined}
                      onDragOver={(event) => {
                        if (!draggedColumn.current) return;
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                        setDropTarget(item.id);

                      }}
                      onDrop={(event) => {
                        if (!draggedColumn.current) return;
                        event.preventDefault();
                        saveColumnOrder(moveColumnOrder(displayItems.map((column) => column.id), draggedColumn.current, item.id));
                        draggedColumn.current = null;
                        setDropTarget(null);
                      }}
                      onClick={() => handleToggleQuantitySort(item.id)}
                      className={`relative py-2 px-2 font-bold text-center min-w-[110px] data-[drop-target=true]:outline-2 data-[drop-target=true]:outline-orange-400 data-[drop-target=true]:-outline-offset-2 border-r border-zinc-800/50 whitespace-nowrap cursor-pointer select-none transition-colors group ${
                        isSorted
                          ? 'bg-orange-500/15 text-orange-400 border-b-2 border-orange-500'
                          : 'text-zinc-300 hover:bg-zinc-900/90'
                      }`}
                      title={`点击按【${item.name}】产出数量排序 (当前: ${
                        isSorted
                          ? quantitySort.direction === 'DESC'
                            ? '数量从多到少'
                            : '数量从少到多'
                          : '未排序，点击按数量从高到低'
                      })`}
                    >
                      <div className="flex justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="cursor-grab active:cursor-grabbing"
                        aria-label={`拖动${item.name}列调整顺序`}
                        title="拖动调整列序，也可按 Alt + 左右方向键移动"
                        draggable
                        onClick={(event) => event.stopPropagation()}
                        onDragStart={(event) => {
                          event.stopPropagation();
                          draggedColumn.current = item.id;
                          event.dataTransfer.effectAllowed = 'move';
                          event.dataTransfer.setData('text/plain', item.id);
                        }}
                        onDragEnd={() => { draggedColumn.current = null; setDropTarget(null); }}
                        onKeyDown={(event) => {
                          if (!event.altKey || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
                          event.preventDefault();
                          event.stopPropagation();
                          const index = sortedItems.findIndex((column) => column.id === item.id);
                          const target = sortedItems[index + (event.key === 'ArrowLeft' ? -1 : 1)];
                          if (target) saveColumnOrder(moveColumnOrder(displayItems.map((column) => column.id), item.id, target.id));
                        }}
                      >
                        <GripVertical />
                      </Button>
                        {canEditColumns && <Button variant="ghost" size="icon-xs" aria-label={`编辑${item.name}列名称`} onClick={(event) => { event.stopPropagation(); openColumnAction(item, 'rename'); }}><Edit3 /></Button>}
                        {canDeleteColumns && <Button variant="ghost" size="icon-xs" aria-label={`删除${item.name}列`} onClick={(event) => { event.stopPropagation(); openColumnAction(item, 'delete'); }}><Trash2 /></Button>}
                      </div>
                      <div className="flex flex-col items-center gap-1 py-0.5">
                        {/* 道具图标 */}
                        <div className="w-7 h-7 rounded-lg bg-zinc-900/90 border border-zinc-700/60 p-0.5 flex items-center justify-center shadow-sm shrink-0 group-hover:border-orange-500/60 group-hover:scale-105 transition-all">
                          <img
                            src={getItemIconUrl(item.name, item.icon)}
                            alt={item.name}
                            className="w-full h-full object-contain drop-shadow-sm"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>

                        {/* 道具名称与排序指示器 */}
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-[11px] font-bold truncate max-w-[80px] ${
                              isSorted ? 'text-orange-400' : 'text-zinc-300 group-hover:text-white'
                            }`}
                            title={item.name}
                          >
                            {item.name}
                          </span>
                          {isSorted ? (
                            quantitySort.direction === 'DESC' ? (
                              <ArrowDown className="w-3 h-3 text-orange-400 shrink-0" />
                            ) : (
                              <ArrowUp className="w-3 h-3 text-orange-400 shrink-0" />
                            )
                          ) : (
                            <ArrowUpDown className="w-2.5 h-2.5 text-zinc-600 opacity-60 group-hover:opacity-100 shrink-0 transition-opacity" />
                          )}
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* 表体 */}
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                <tr>
                  <td
                    colSpan={sortedItems.length + 1}
                    className="py-16 text-center text-zinc-500 font-mono"
                  >
                    加载资源产出矩阵中...
                  </td>
                </tr>
              ) : sortedSources.length === 0 ? (
                <tr>
                  <td
                    colSpan={sortedItems.length + 1}
                    className="py-16 text-center text-zinc-500 font-mono"
                  >
                    <p>未找到符合条件的途径或产出数据</p>
                    <Button variant="outline" onClick={() => { setSearchQuery(''); setHideEmptySources(false); }}>清除筛选并查看全部来源</Button>
                    <Button variant="outline" disabled={!preference.loaded || preference.viewId !== viewId} onClick={() => setTransferOpen(true)}>调整显示道具</Button>
                  </td>
                </tr>
              ) : (
                sortedSources.map((source, rIdx) => {
                  return (
                    <tr
                      key={source.id}
                      data-source-id={source.id}
                      data-drop-target={dropRowTarget === source.id || undefined}
                      onDragOver={(event) => { if (draggedRow.current) { event.preventDefault(); setDropRowTarget(source.id); } }}
                      onDrop={(event) => {
                        if (!draggedRow.current) return;
                        event.preventDefault();
                        moveSource(draggedRow.current, source.id);
                        draggedRow.current = null;
                        setDropRowTarget(null);
                      }}
                      className="hover:bg-zinc-800/40 transition-colors group data-[drop-target=true]:outline-2 data-[drop-target=true]:outline-orange-400 data-[drop-target=true]:-outline-offset-2"
                    >
                      {/* 途径名称 (Sticky Left) - 支持双击就地修改并保存至数据库 */}
                      <td
                        className="py-2 px-4 sticky left-0 z-20 bg-zinc-900/95 group-hover:bg-zinc-850 border-r border-zinc-800 transition-colors"
                        onDoubleClick={() => handleSourceDoubleClick(source)}
                        title="双击就地修改途径名称"
                      >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 truncate">
                              <Button
                                variant="ghost" size="icon-xs"
                                className="cursor-grab active:cursor-grabbing"
                                aria-label={`拖动${source.name}行调整顺序`}
                                title="拖动调整行序，也可按 Alt + 上下方向键移动"
                                draggable
                                onClick={(event) => event.stopPropagation()}
                                onDoubleClick={(event) => event.stopPropagation()}
                                onDragStart={(event) => {
                                  event.stopPropagation();
                                  draggedRow.current = source.id;
                                  event.dataTransfer.effectAllowed = 'move';
                                  event.dataTransfer.setData('text/plain', source.id);
                                }}
                                onDragEnd={() => { draggedRow.current = null; setDropRowTarget(null); }}
                                onKeyDown={(event) => {
                                  if (!event.altKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
                                  event.preventDefault();
                                  event.stopPropagation();
                                  const target = sortedSources[rIdx + (event.key === 'ArrowUp' ? -1 : 1)];
                                  if (target) moveSource(source.id, target.id);
                                }}
                              ><GripVertical /></Button>
                              <span title={source.name} className="font-semibold text-zinc-200 group-hover:text-orange-400 transition-colors truncate cursor-pointer">
                                {source.name}
                              </span>
                            </div>
                            {canEditRows && <div className="flex shrink-0 gap-0.5" onDoubleClick={(event) => event.stopPropagation()}>
                              <Button variant="ghost" size="icon-xs" aria-label={`编辑${source.name}行名称`} onClick={() => setDefinitionAction({ kind: 'row', mode: 'rename', id: source.id, name: source.name, members: [source] })}><Edit3 /></Button>
                              <Button variant="ghost" size="icon-xs" aria-label={`删除${source.name}行`} onClick={() => setDefinitionAction({ kind: 'row', mode: 'delete', id: source.id, name: source.name, members: [source] })}><Trash2 /></Button>
                            </div>}
                          </div>
                      </td>

                      {/* 资源数值单元格 */}
                      {sortedItems.map((item) => {
                        const cellKey = `${source.id}_${item.id}`;
                        const amount = yieldLookup.get(cellKey) || 0;
                        const isEditing =
                          editingCell?.itemId === item.id && editingCell?.sourceId === source.id;

                        return (
                          <td
                            key={item.id}
                            aria-busy={savingCells.has(cellKey)}
                            data-error={!!cellErrors[cellKey]}
                            onDoubleClick={() => handleCellDoubleClick(item.id, source.id, amount)}
                            className="relative py-2 px-2 text-center border-r border-zinc-800/30 cursor-pointer hover:bg-orange-500/5 transition-colors select-none data-[error=true]:outline data-[error=true]:-outline-offset-1 data-[error=true]:outline-destructive"
                            title={cellErrors[cellKey] || '双击就地修改'}
                          >
                            {isEditing ? (
                              <Input
                                autoFocus
                                aria-label={`${source.name}的${item.name}产出数量`}
                                aria-invalid={!!cellErrors[cellKey]}
                                aria-describedby={cellErrors[cellKey] ? `cell-error-${cellKey}` : undefined}
                                disabled={savingCells.has(cellKey)}
                                type="number"
                                step="any"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleSaveCell(item.id, source.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') { e.preventDefault(); handleSaveCell(item.id, source.id); }
                                  if (e.key === 'Escape') {
                                    e.preventDefault();
                                    closedCellEdits.current.add(cellKey);
                                    failedDrafts.current.delete(cellKey);
                                    setCellErrors((previous) => { const next = { ...previous }; delete next[cellKey]; return next; });
                                    setEditingCell(null);
                                  }
                                }}
                                className="mx-auto h-6 w-20 text-center"
                              />
                            ) : amount !== 0 ? (
                              <span
                                className={`inline-block font-mono font-bold px-2 py-0.5 rounded-lg text-xs ${
                                  item.name.includes('核心')
                                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                    : item.name.includes('钥匙')
                                    ? 'bg-amber-500/10 text-amber-400'
                                    : item.name.includes('碎片')
                                    ? 'bg-orange-500/10 text-orange-400'
                                    : 'text-zinc-200 bg-zinc-800/80'
                                }`}
                              >
                                {amount}
                              </span>
                            ) : (
                              <span className="text-zinc-700 text-xs font-mono">-</span>
                            )}
                            {savingCells.has(cellKey) && <Loader2 aria-label="正在保存此单元格" className="absolute right-1 top-1/2 size-3 -translate-y-1/2 motion-safe:animate-spin text-primary" />}
                            {cellErrors[cellKey] && <span id={`cell-error-${cellKey}`} role="alert" className="sr-only">{source.name} / {item.name}：{cellErrors[cellKey]}</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}

              {/* 显式合计行 (作为第 28 行) */}
              {!loading && sortedSources.length > 0 && (
                <tr className="bg-zinc-950/90 font-bold border-t-2 border-orange-500/40">
                  <td className="py-3.5 px-4 sticky left-0 z-20 bg-zinc-950 border-r border-zinc-800 text-orange-400 font-black">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-orange-400" />
                        合计 (Total)
                      </span>
                      <span className="text-[10px] text-zinc-500 font-normal">
                        共 {sortedSources.length} 途径
                      </span>
                    </div>
                  </td>

                  {sortedItems.map((item) => {
                    const total = columnTotals[item.id] || 0;
                    return (
                      <td
                        key={item.id}
                        className="py-3.5 px-2 text-center border-r border-zinc-800/50 font-mono font-extrabold text-xs"
                      >
                        {total > 0 ? (
                          <span
                            className={`inline-block px-2.5 py-1 rounded-xl shadow-sm ${
                              item.name.includes('核心')
                                ? 'text-cyan-300 bg-cyan-950/60 border border-cyan-500/40'
                                : item.name.includes('钥匙')
                                ? 'text-amber-300 bg-amber-950/60 border border-amber-500/40'
                                : 'text-orange-400 bg-orange-950/60 border border-orange-500/40'
                            }`}
                          >
                            {total}
                          </span>
                        ) : (
                          <span className="text-zinc-700">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              )}

              {/* 宠物资源转化钥匙额外备注行 */}
              {!loading && sortedSources.length > 0 && (
                <tr className="bg-zinc-950/50 text-[11px] text-zinc-400">
                  <td className="py-2.5 px-4 sticky left-0 z-20 bg-zinc-950/90 border-r border-zinc-800 font-medium text-zinc-400">
                    宠物资源转化钥匙
                  </td>
                  {sortedItems.map((item) => (
                    <td
                      key={item.id}
                      className="py-2.5 px-2 text-center border-r border-zinc-800/30 font-mono"
                    >
                      {item.name === '其他钥匙' ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-bold border border-amber-500/20">
                          240
                        </span>
                      ) : (
                        <span className="text-zinc-800">-</span>
                      )}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>


    </div>
  );
}
