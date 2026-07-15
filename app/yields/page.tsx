'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface Source {
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
  const searchParams = useSearchParams();
  const filterType = searchParams ? searchParams.get('type') : null;

  const [year, setYear] = useState('2026');
  const [month, setMonth] = useState('7');
  const [sources, setSources] = useState<Source[]>([]);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_CORE_API_URL || 'http://localhost:3000';
    fetch(`${apiBase}/sources`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSources(data);
        }
      })
      .catch(err => console.error('Failed to fetch sources', err));
  }, []);

  // Filter sources based on query parameter
  const filteredSources = filterType
    ? sources.filter(source => source.type === filterType)
    : sources;

  // Rows: Items
  const [rows, setRows] = useState<YieldRow[]>([
    {
      itemId: 'item_gems',
      itemName: '宝石',
      type: 'CURRENCY',
      yields: {
        src_daily_challenge: 1500,
        src_daily_sign_in: 300,
        src_weekly_chest: 0,
        src_special_event: 2000,
      },
    },
    {
      itemId: 'item_skeys',
      itemName: 'S钥匙',
      type: 'KEY',
      yields: {
        src_daily_challenge: 5,
        src_daily_sign_in: 0,
        src_weekly_chest: 4,
        src_special_event: 10,
      },
    },
    {
      itemId: 'item_equip',
      itemName: '随机杰出装备',
      type: 'EQUIPMENT',
      yields: {
        src_daily_challenge: 0,
        src_daily_sign_in: 0,
        src_weekly_chest: 0,
        src_special_event: 1,
      },
    },
  ]);

  // Track which cell is being edited: { itemId, sourceId }
  const [editingCell, setEditingCell] = useState<{ itemId: string; sourceId: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<string>('');

  const handleDoubleClick = (itemId: string, sourceId: string, currentValue: number) => {
    setEditingCell({ itemId, sourceId });
    setEditValue(currentValue.toString());
  };

  const handleSave = (itemId: string, sourceId: string) => {
    const numericValue = parseInt(editValue, 10) || 0;

    // Update local state
    setRows(prevRows =>
      prevRows.map(row => {
        if (row.itemId === itemId) {
          return {
            ...row,
            yields: {
              ...row.yields,
              [sourceId]: numericValue,
            },
          };
        }
        return row;
      })
    );

    setEditingCell(null);
    setSaveStatus('保存成功 ✅');
    setTimeout(() => setSaveStatus(''), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent, itemId: string, sourceId: string) => {
    if (e.key === 'Enter') {
      handleSave(itemId, sourceId);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  // Calculate total based only on visible/filtered sources
  const getRowTotal = (row: YieldRow) => {
    return filteredSources.reduce((sum, src) => {
      const val = row.yields[src.id] || 0;
      return sum + val;
    }, 0);
  };

  if (sources.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 font-mono text-xs">
        加载数据源中...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Date Selectors */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-white">资产产出统计看板</h1>
          <p className="text-xs text-zinc-500">
            录入并管理当前月份所有挑战、活动产出的资产数量。双击任意表格单元格进行行内就地修改。
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

      {/* Spreadsheet Status Notification */}
      <div className="flex justify-between items-center text-xs h-6">
        <div className="text-zinc-500 font-medium">
          💡 操作小提示：<span className="text-orange-400">双击数字</span> 直接修改录入值，按 <span className="text-zinc-300 font-mono">Enter</span> 回车或点击空白处保存。
        </div>
        <span className="text-emerald-400 font-bold font-mono transition-all duration-300">
          {saveStatus}
        </span>
      </div>

      {/* Grid Spreadsheet */}
      <div className="border border-zinc-900 bg-zinc-900/10 rounded-2xl overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs select-none">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500 font-bold bg-zinc-950/40">
              <th className="p-4 w-40">物品名称</th>
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

                  return (
                    <td
                      key={source.id}
                      onDoubleClick={() => handleDoubleClick(row.itemId, source.id, val)}
                      className={`p-4 text-center border-r border-zinc-900/40 relative cursor-cell font-mono transition-all ${
                        isEditing ? 'bg-orange-500/5' : 'hover:bg-zinc-800/20'
                      }`}
                    >
                      {isEditing ? (
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
      </div>
    </div>
  );
}
