'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getApiBase } from '@/lib/api';

interface Source {
  id: string;
  name: string;
  type: string;
  category: string;
  subcategory: string | null;
}

interface Item {
  id: string;
  name: string;
  type: string;
}

interface YieldRow {
  itemId: string;
  itemName: string;
  type: string;
  yields: {
    [sourceId: string]: number;
  };
}

export default function YieldsPage() {
  const { token, hasPermission } = useAuth();
  const searchParams = useSearchParams();
  const filterCategory = searchParams ? searchParams.get('category') : null;

  const [year, setYear] = useState('2026');
  const [month, setMonth] = useState('7');
  
  const [categories, setCategories] = useState<any[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [yields, setYields] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState<string | null>(null);
  
  // Track editing cell
  const [editingCell, setEditingCell] = useState<{ itemId: string; sourceId: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<string>('');

  const apiBase = getApiBase();

  // 1. Fetch categories (menus)
  useEffect(() => {
    fetch(`${apiBase}/menus`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch(err => console.error('Failed to fetch menus', err));
  }, [apiBase]);

  // 2. Fetch items
  useEffect(() => {
    fetch(`${apiBase}/items`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setItems(data);
        }
      })
      .catch(err => console.error('Failed to fetch items', err));
  }, [apiBase]);

  // 3. Fetch sources
  useEffect(() => {
    fetch(`${apiBase}/sources`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSources(data);
        }
      })
      .catch(err => console.error('Failed to fetch sources', err));
  }, [apiBase]);

  // 4. Fetch yields
  const fetchYields = () => {
    fetch(`${apiBase}/yields?year=${year}&month=${month}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setYields(data);
        }
      })
      .catch(err => console.error('Failed to fetch yields', err));
  };

  useEffect(() => {
    fetchYields();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, apiBase]);

  // Determine active category
  const activeCategory = filterCategory || (categories.length > 0 ? categories[0].name : '广告');

  // Compute subcategories for the active category
  const subcategories = Array.from(
    new Set(
      sources
        .filter(s => s.category === activeCategory && s.subcategory)
        .map(s => s.subcategory as string)
    )
  );

  // Sync activeTab when category changes
  useEffect(() => {
    if (sources.length > 0) {
      const subs = Array.from(
        new Set(
          sources
            .filter(s => s.category === activeCategory && s.subcategory)
            .map(s => s.subcategory as string)
        )
      );
      if (subs.length > 0) {
        if (!activeTab || !subs.includes(activeTab)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setActiveTab(subs[0]);
        }
      } else {
        if (activeTab !== null) {
          setActiveTab(null);
        }
      }
    }
  }, [activeCategory, sources, activeTab]);

  // Filter sources to display in spreadsheet columns
  const filteredSources = sources.filter(source => {
    if (source.category !== activeCategory) return false;
    if (activeTab) {
      return source.subcategory === activeTab;
    }
    return !source.subcategory;
  });

  // Construct rows based on items and yields
  const rows: YieldRow[] = items.map(item => {
    const itemYields: { [sourceId: string]: number } = {};
    sources.forEach(src => {
      const match = yields.find(y => y.itemId === item.id && y.sourceId === src.id);
      itemYields[src.id] = match ? match.amount : 0;
    });

    return {
      itemId: item.id,
      itemName: item.name,
      type: item.type,
      yields: itemYields,
    };
  });

  const handleDoubleClick = (itemId: string, sourceId: string, currentValue: number) => {
    setEditingCell({ itemId, sourceId });
    setEditValue(currentValue.toString());
  };

  const handleSave = async (itemId: string, sourceId: string) => {
    const numericValue = parseInt(editValue, 10) || 0;

    try {
      const res = await fetch(`${apiBase}/yields`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          itemId,
          sourceId,
          year: parseInt(year, 10),
          month: parseInt(month, 10),
          amount: numericValue,
        }),
      });

      if (!res.ok) {
        throw new Error('保存失败');
      }

      setSaveStatus('保存成功 ✅');
      setTimeout(() => setSaveStatus(''), 2000);
      fetchYields(); // Refresh from DB
    } catch (err) {
      console.error(err);
      setSaveStatus('❌ 保存失败');
      setTimeout(() => setSaveStatus(''), 2000);
    }

    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, itemId: string, sourceId: string) => {
    if (e.key === 'Enter') {
      handleSave(itemId, sourceId);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  // Helper to identify mine sources
  const isMineSource = (source: Source) => {
    return source.category === '每日活动' && source.subcategory === '矿洞挑战';
  };

  // Helper to check if another mine has a non-zero value for the current item
  const hasOtherMineValue = (row: YieldRow, currentSourceId: string) => {
    const mineSources = sources.filter(isMineSource);
    return mineSources.some(src => {
      if (src.id === currentSourceId) return false;
      return (row.yields[src.id] || 0) > 0;
    });
  };

  // Calculate row total based only on currently visible sources
  const getRowTotal = (row: YieldRow) => {
    return filteredSources.reduce((sum, src) => {
      const val = row.yields[src.id] || 0;
      return sum + val;
    }, 0);
  };

  if (sources.length === 0 || items.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 font-mono text-xs">
        加载数据中...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Date Selectors */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-white">{activeCategory} 资产产出看板</h1>
          <p className="text-xs text-zinc-500">
            录入并管理当前月份在「{activeCategory}」分类下各个细分途径产出的资产数量。
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 p-1.5 rounded-2xl">
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="bg-transparent text-xs text-zinc-300 font-bold focus:outline-none px-2 cursor-pointer"
          >
            <option value="2026">2026 年</option>
            <option value="2025">2025 年</option>
          </select>
          <span className="text-zinc-700">|</span>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="bg-transparent text-xs text-zinc-300 font-bold focus:outline-none px-2 cursor-pointer"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={(i + 1).toString()}>
                {i + 1} 月
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Subcategory Tab Bar */}
      {subcategories.length > 0 && (
        <div className="flex space-x-1 border-b border-zinc-900 pb-px">
          {subcategories.map(sub => (
            <button
              key={sub}
              onClick={() => setActiveTab(sub)}
              className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer relative ${
                activeTab === sub
                  ? 'border-orange-500 text-orange-400 font-extrabold'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      )}

      {/* Spreadsheet Status Notification */}
      <div className="flex justify-between items-center text-xs h-6">
        <div className="text-zinc-500 font-medium">
          💡 操作小提示：<span className="text-orange-400">双击数字</span> 直接修改录入值，按 <span className="text-zinc-300 font-mono">Enter</span> 保存。
        </div>
        <span className="text-emerald-400 font-bold font-mono transition-all duration-300">
          {saveStatus}
        </span>
      </div>

      {/* Grid Spreadsheet */}
      <div className="border border-zinc-900 bg-zinc-900/10 rounded-2xl overflow-x-auto">
        {filteredSources.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-xs font-mono">
            该分类下暂无已配置的产出途径。
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs select-none">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 font-bold bg-zinc-950/40">
                <th className="p-4 w-48">物品名称</th>
                {filteredSources.map(source => (
                  <th key={source.id} className="p-4 text-center">
                    <div>{source.name}</div>
                    <span className="text-[9px] text-zinc-600 font-normal px-1 py-0.5 rounded bg-zinc-900 border border-zinc-800/80 mt-1 inline-block">
                      {source.type}
                    </span>
                  </th>
                ))}
                <th className="p-4 text-center text-orange-400">行总计</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.itemId} className="border-b border-zinc-900/60 hover:bg-zinc-900/10 text-zinc-300 transition-colors">
                  {/* Item Name */}
                  <td className="p-4 font-bold text-white border-r border-zinc-900 bg-zinc-950/10">
                    {row.itemName}
                    <span className="block text-[9px] text-zinc-500 font-normal mt-0.5">{row.type}</span>
                  </td>

                  {/* Sources values */}
                  {filteredSources.map(source => {
                    const val = row.yields[source.id] || 0;
                    const isEditing = editingCell?.itemId === row.itemId && editingCell?.sourceId === source.id;
                    const isMine = isMineSource(source);
                    const isLocked = (isMine && hasOtherMineValue(row, source.id)) || !hasPermission('yield:edit');

                    return (
                      <td
                        key={source.id}
                        onDoubleClick={() => {
                          if (isLocked) return;
                          handleDoubleClick(row.itemId, source.id, val);
                        }}
                        className={`p-4 text-center border-r border-zinc-900/40 relative font-mono transition-all ${
                          isLocked 
                            ? 'bg-zinc-950/40 text-zinc-600 cursor-not-allowed opacity-40' 
                            : isEditing 
                              ? 'bg-orange-500/5 cursor-cell' 
                              : 'hover:bg-zinc-800/20 cursor-cell'
                        }`}
                      >
                        {isLocked ? (
                          <span className="text-zinc-700 flex items-center justify-center gap-1 select-none">
                            0 <span className="text-[10px] opacity-60">🔒</span>
                          </span>
                        ) : isEditing ? (
                          <input
                            type="number"
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSave(row.itemId, source.id)}
                            onKeyDown={(e) => handleKeyDown(e, row.itemId, source.id)}
                            className="w-16 bg-zinc-950 border border-orange-500/80 rounded px-1.5 py-0.5 text-center text-zinc-100 font-bold focus:outline-none text-xs"
                          />
                        ) : (
                          <span className={`font-bold ${val === 0 ? 'text-zinc-700' : 'text-zinc-100'}`}>
                            {val}
                          </span>
                        )}
                      </td>
                    );
                  })}

                  {/* Row Total */}
                  <td className="p-4 text-center font-bold text-orange-400 font-mono bg-orange-950/5">
                    {getRowTotal(row)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
