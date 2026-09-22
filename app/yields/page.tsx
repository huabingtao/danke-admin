'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getApiBase } from '@/lib/api';
import {
  Sparkles,
  Filter,
  Download,
  Check,
  Search,
  Grid3X3,
  Calendar,
  Zap,
  Shield,
  Layers,
  Key,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Edit3,
} from 'lucide-react';

interface Source {
  id: string;
  name: string;
  type: string;
  category: string;
  subcategory: string | null;
  description: string | null;
}

interface Item {
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

// 道具图标获取工具（优先使用数据库配置的 icon，支持 OSS 路径，若无则回退到默认文件名）
export const getItemIconUrl = (itemName: string, iconUrl?: string | null): string => {
  if (iconUrl && iconUrl.trim()) {
    return iconUrl.trim();
  }
  return `/icons/items/${encodeURIComponent(itemName)}.png`;
};

// 26 项标准资源排序规则 (含细分 8 类钥匙)
const STANDARD_ITEM_NAMES = [
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
];

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

// 玩家 8 大核心培养体系 (多标签 Multi-Tag 筛选)
const ITEM_CATEGORY_TABS = [
  { id: 'ALL', label: '全部' },
  {
    id: 'KEYS',
    label: '🔑 钥匙',
    items: [
      's级军备钥匙',
      '高级钥匙',
      '普通钥匙',
      '配件宝箱钥匙',
      '宠物钥匙',
      '高级宠物箱钥匙',
      '收藏品宝箱钥匙',
      '载具零件钥匙',
    ],
  },
  {
    id: 'VEHICLE',
    label: '🚗 载具',
    items: ['传奇载具碎片', '载具零件钥匙'],
  },
  {
    id: 'AGENT',
    label: '👤 特工',
    items: ['sp特工万能碎片', 's特工碎片', '觉醒水晶', '特工核心', '自选核心'],
  },
  {
    id: 'EQUIP',
    label: '🛡️ 装备',
    items: ['s杰出装备', 's级军备钥匙', '高级钥匙', '普通钥匙', '神器核心', '自选核心'],
  },
  {
    id: 'PET',
    label: '🐾 宠物',
    items: ['史诗宠物', '杰出宠物', '宠物钥匙', '高级宠物箱钥匙', '异宠核心', '自选核心'],
  },
  {
    id: 'TECH',
    label: '⚙️ 配件',
    items: ['史诗配件', '杰出配件', '配件宝箱钥匙', '谐振芯片', '自选核心'],
  },
  {
    id: 'COLLECT',
    label: '🏆 收藏品',
    items: ['史诗收藏品', '杰出收藏品', '高级收藏之心', '传奇收藏品', '收藏品宝箱钥匙'],
  },
  {
    id: 'CORE',
    label: '🔮 核心',
    items: ['神器核心', '异宠核心', '谐振芯片', '特工核心', '自选核心'],
  },
];

export default function YieldsPage() {
  const { token } = useAuth();
  const apiBase = getApiBase();

  const [year, setYear] = useState('2026');
  const [month, setMonth] = useState('8');

  const [sources, setSources] = useState<Source[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [yields, setYields] = useState<MonthlyYieldRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeItemTab, setActiveItemTab] = useState('ALL');
  const [hideEmptySources, setHideEmptySources] = useState(false);

  // In-place Editing States
  const [editingCell, setEditingCell] = useState<{ itemId: string; sourceId: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [copiedMd, setCopiedMd] = useState(false);

  // 途径名称就地双击编辑状态
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [editSourceName, setEditSourceName] = useState<string>('');
  const [savingSource, setSavingSource] = useState(false);

  // 排序状态
  // 1. 获取途径按名称拼音首字母排序: 'ASC' (A-Z) | 'DESC' (Z-A)
  const [sourceSortOrder, setSourceSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  // 2. 资源列按产出数量排序: { itemId, direction: 'DESC' | 'ASC' } | null
  const [quantitySort, setQuantitySort] = useState<{ itemId: string; direction: 'DESC' | 'ASC' } | null>(null);

  // 1. Fetch Items
  useEffect(() => {
    fetch(`${apiBase}/items`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setItems(data);
      })
      .catch((err) => console.error('Failed to fetch items', err));
  }, [apiBase]);

  // 2. Fetch Sources
  useEffect(() => {
    fetch(`${apiBase}/sources`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setSources(data);
      })
      .catch((err) => console.error('Failed to fetch sources', err));
  }, [apiBase]);

  // 3. Fetch Yields
  const fetchYields = () => {
    setLoading(true);
    fetch(`${apiBase}/yields?year=${year}&month=${month}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setYields(data);
      })
      .catch((err) => console.error('Failed to fetch yields', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchYields();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, apiBase]);

  // Yield lookup map: key = `${sourceId}_${itemId}` -> amount
  const yieldLookup = useMemo(() => {
    const map = new Map<string, number>();
    yields.forEach((y) => {
      map.set(`${y.sourceId}_${y.itemId}`, y.amount);
    });
    return map;
  }, [yields]);

  // Sort and filter columns (Items)
  const sortedItems = useMemo(() => {
    const list = [...items].sort((a, b) => {
      const idxA = STANDARD_ITEM_NAMES.indexOf(a.name);
      const idxB = STANDARD_ITEM_NAMES.indexOf(b.name);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.name.localeCompare(b.name, 'zh-CN');
    });

    if (activeItemTab === 'ALL') return list;
    const tabConfig = ITEM_CATEGORY_TABS.find((t) => t.id === activeItemTab);
    if (!tabConfig || !tabConfig.items) return list;
    return list.filter((item) => tabConfig.items.includes(item.name));
  }, [items, activeItemTab]);

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
      list = list.filter((source) => {
        const sourceYields = yields.filter((y) => y.sourceId === source.id);
        return sourceYields.some((y) => y.amount > 0);
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

    return list;
  }, [sources, searchQuery, hideEmptySources, yields, yieldLookup, quantitySort, sourceSortOrder]);

  // 排序切换处理
  const handleToggleSourceSort = () => {
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

  // 途径名称就地双击修改处理器 (保存到数据库)
  const handleSourceDoubleClick = (source: Source) => {
    setEditingSourceId(source.id);
    setEditSourceName(source.name);
  };

  const handleSaveSourceName = async (sourceId: string) => {
    const trimmed = editSourceName.trim();
    const current = sources.find((s) => s.id === sourceId);
    if (!trimmed || trimmed === current?.name) {
      setEditingSourceId(null);
      return;
    }

    setSavingSource(true);
    try {
      const res = await fetch(`${apiBase}/sources/${sourceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || '更新途径名称失败');
      }

      const updated = await res.json();
      setSources((prev) =>
        prev.map((s) => (s.id === sourceId ? { ...s, name: updated.name } : s))
      );
      setSaveStatus('✅ 途径名称已同步保存');
      setTimeout(() => setSaveStatus(''), 2500);
    } catch (err: any) {
      console.error('Failed to update source name', err);
      setSaveStatus(`❌ ${err.message || '更新途径名称失败'}`);
      setTimeout(() => setSaveStatus(''), 3000);
    } finally {
      setSavingSource(false);
      setEditingSourceId(null);
    }
  };

  // Compute column totals
  const columnTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    sortedItems.forEach((item) => {
      let sum = 0;
      sources.forEach((src) => {
        const amt = yieldLookup.get(`${src.id}_${item.id}`) || 0;
        sum += amt;
      });
      // Round to 2 decimal places
      totals[item.id] = Math.round(sum * 100) / 100;
    });
    return totals;
  }, [sortedItems, sources, yieldLookup]);

  // Core metrics for top stats bar
  const statsOverview = useMemo(() => {
    const keyItemNames = [
      's级军备钥匙',
      '高级钥匙',
      '普通钥匙',
      '配件宝箱钥匙',
      '宠物钥匙',
      '高级宠物箱钥匙',
      '收藏品宝箱钥匙',
      '载具零件钥匙',
    ];

    const coreItemNames = [
      '神器核心',
      '异宠核心',
      '谐振芯片',
      '特工核心',
      '自选核心',
    ];

    const getItemTotal = (name: string) => {
      const itm = items.find((i) => i.name === name);
      return itm ? columnTotals[itm.id] || 0 : 0;
    };

    const totalKeys = keyItemNames.reduce((sum, name) => sum + getItemTotal(name), 0);
    const totalCores = coreItemNames.reduce((sum, name) => sum + getItemTotal(name), 0);

    return {
      totalKeys: Math.round(totalKeys * 100) / 100,
      totalCores: Math.round(totalCores * 100) / 100,
      customCores: getItemTotal('自选核心'),
    };
  }, [items, columnTotals]);

  // In-place Cell Edit Save Handler
  const handleCellDoubleClick = (itemId: string, sourceId: string, currentVal: number) => {
    setEditingCell({ itemId, sourceId });
    setEditValue(currentVal === 0 ? '' : currentVal.toString());
  };

  const handleSaveCell = async (itemId: string, sourceId: string) => {
    const parsed = parseFloat(editValue);
    const numericValue = isNaN(parsed) ? 0 : parsed;

    try {
      const res = await fetch(`${apiBase}/yields`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          itemId,
          sourceId,
          year: parseInt(year, 10),
          month: parseInt(month, 10),
          amount: numericValue,
        }),
      });

      if (!res.ok) throw new Error('保存失败');

      setSaveStatus('✅ 已同步保存');
      setTimeout(() => setSaveStatus(''), 2000);
      fetchYields();
    } catch (err) {
      console.error(err);
      setSaveStatus('❌ 保存失败');
      setTimeout(() => setSaveStatus(''), 2500);
    }

    setEditingCell(null);
  };

  // Copy as Markdown Table
  const handleExportMarkdown = () => {
    let md = `### 📊 ${year}年 ${month}月 资源获取统计全景表\n\n`;
    md += `| 获取途径 | ` + sortedItems.map((i) => i.name).join(' | ') + ` |\n`;
    md += `| :--- | ` + sortedItems.map(() => `:---:`).join(' | ') + ` |\n`;

    sortedSources.forEach((src) => {
      const rowVals = sortedItems.map((itm) => {
        const v = yieldLookup.get(`${src.id}_${itm.id}`);
        return v && v > 0 ? v : '-';
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
      {/* 顶部标题与月度切换器 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500/20 to-amber-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-lg shadow-orange-500/5">
              <Grid3X3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                全景月度基础资源获取大表
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  {year}年 {month}月
                </span>
              </h1>
              <p className="text-xs text-zinc-500">
                共 {sources.length} 大获取途径 × {items.length} 项核心资源全矩阵统计 · 双击途径名称/单元格就地修改保存 · 点击表头智能排序
              </p>
            </div>
          </div>
        </div>

        {/* 年月选择 & 操作栏 */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800/90 px-3 py-1.5 rounded-2xl shadow-inner">
            <Calendar className="w-4 h-4 text-orange-400" />
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="bg-transparent text-xs text-zinc-200 font-bold focus:outline-none cursor-pointer"
            >
              <option value="2026">2026 年</option>
              <option value="2025">2025 年</option>
            </select>
            <span className="text-zinc-700 font-light">/</span>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-transparent text-xs text-zinc-200 font-bold focus:outline-none cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={(i + 1).toString()}>
                  {i + 1} 月
                </option>
              ))}
            </select>
          </div>

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
            <span className="text-xs font-bold text-orange-400 bg-orange-500/10 px-3 py-1.5 rounded-xl border border-orange-500/20 animate-in fade-in">
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
              <Key className="w-4 h-4 text-amber-400" /> 钥匙
            </div>
            <p className="text-[11px] text-zinc-500">
              包含S军备、高级、普通、配件、宠物、收藏品及载具钥匙等
            </p>
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {statsOverview.totalKeys.toLocaleString()} <span className="text-xs text-zinc-500 font-normal">把</span>
          </div>
        </div>

        <div className="bg-zinc-900/70 border border-zinc-800/80 p-4 rounded-3xl flex items-center justify-between shadow-lg shadow-cyan-500/5">
          <div className="space-y-1">
            <div className="text-xs text-zinc-400 font-semibold flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-cyan-400" /> 核心
            </div>
            <p className="text-[11px] text-zinc-500">
              包含自选核心 ({statsOverview.customCores}个) 及各类专属突破重铸核心
            </p>
          </div>
          <div className="text-2xl font-black text-cyan-400 font-mono">
            {statsOverview.totalCores} <span className="text-xs text-zinc-500 font-normal">个</span>
          </div>
        </div>
      </div>

      {/* 筛选与搜索工具条 */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-zinc-900/50 border border-zinc-800/80 p-3 rounded-2xl">
        {/* 资源列维度 Tab 切换 */}
        <div className="flex flex-wrap items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800/60">
          {ITEM_CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveItemTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeItemTab === tab.id
                  ? 'bg-orange-500 text-zinc-950 shadow-md shadow-orange-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
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

      {/* 全景主矩阵大表 */}
      <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar max-h-[68vh]">
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
                      {!quantitySort && (
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
                      onClick={() => handleToggleQuantitySort(item.id)}
                      className={`py-2 px-2 font-bold text-center min-w-[110px] border-r border-zinc-800/50 whitespace-nowrap cursor-pointer select-none transition-colors group ${
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
                    加载月度产出矩阵中...
                  </td>
                </tr>
              ) : sortedSources.length === 0 ? (
                <tr>
                  <td
                    colSpan={sortedItems.length + 1}
                    className="py-16 text-center text-zinc-500 font-mono"
                  >
                    未找到符合条件的途径或产出数据
                  </td>
                </tr>
              ) : (
                sortedSources.map((source, rIdx) => {
                  const isEditingSource = editingSourceId === source.id;
                  return (
                    <tr
                      key={source.id}
                      className="hover:bg-zinc-800/40 transition-colors group"
                    >
                      {/* 途径名称 (Sticky Left) - 支持双击就地修改并保存至数据库 */}
                      <td
                        className="py-2 px-4 sticky left-0 z-20 bg-zinc-900/95 group-hover:bg-zinc-850 border-r border-zinc-800 transition-colors"
                        onDoubleClick={() => handleSourceDoubleClick(source)}
                        title="双击就地修改途径名称"
                      >
                        {isEditingSource ? (
                          <div className="flex items-center space-x-1.5 py-0.5">
                            <input
                              autoFocus
                              type="text"
                              value={editSourceName}
                              onChange={(e) => setEditSourceName(e.target.value)}
                              onBlur={() => handleSaveSourceName(source.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveSourceName(source.id);
                                if (e.key === 'Escape') setEditingSourceId(null);
                              }}
                              disabled={savingSource}
                              className="w-full bg-zinc-950 border border-orange-500 rounded px-2 py-0.5 text-xs text-orange-400 font-bold focus:outline-none shadow-sm"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 truncate">
                              <span className="text-[10px] font-mono text-zinc-500 w-4 shrink-0">
                                {rIdx + 1}
                              </span>
                              <span className="font-semibold text-zinc-200 group-hover:text-orange-400 transition-colors truncate cursor-pointer">
                                {source.name}
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0 font-normal">
                              双击修改
                            </span>
                          </div>
                        )}
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
                            onDoubleClick={() => handleCellDoubleClick(item.id, source.id, amount)}
                            className="py-2 px-2 text-center border-r border-zinc-800/30 cursor-pointer hover:bg-orange-500/5 transition-all select-none"
                            title="双击就地修改"
                          >
                            {isEditing ? (
                              <input
                                autoFocus
                                type="number"
                                step="any"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleSaveCell(item.id, source.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveCell(item.id, source.id);
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                className="w-16 bg-zinc-950 border border-orange-500 rounded px-1.5 py-0.5 text-center text-xs text-orange-400 font-bold focus:outline-none"
                              />
                            ) : amount > 0 ? (
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

      {/* 底部使用提示与说明 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-zinc-500 bg-zinc-900/30 border border-zinc-800/60 p-4 rounded-2xl">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
          <span>
            提示：表格支持<strong>双击途径名称或任意数值单元格就地编辑</strong>并回车即时保存至数据库；支持点击「获取途径」按拼音首字母排序，点击任意道具列头按产出数量升降序排序。
          </span>
        </div>
        <div className="font-mono text-zinc-600">
          矩阵规模：{sortedSources.length} 途径 × {sortedItems.length} 资源
        </div>
      </div>
    </div>
  );
}
