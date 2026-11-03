'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ClassificationControls } from './ClassificationControls';
import { classificationLabel, type ClassifiedItem, type ClassificationDictionary } from '@/lib/item-classifications';
import { PRESET_ITEM_ICONS } from '@/lib/item-display';
import { resolveItemIcon } from '@/lib/item-icons';
import catalog from '@/lib/web-item-catalog.json';
import { apiFetch } from '@/lib/api-client';
export function ItemEditorDialog({ item, dictionary, token, onClose, onSaved }: {
  item: ClassifiedItem | null; dictionary: ClassificationDictionary; token: string | null; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(item?.name ?? '');
  const [icon, setIcon] = useState(item?.icon || '/icons/items/s杰出装备.png');
  const [iconName, setIconName] = useState(item?.name ?? 's杰出装备');
  const [categories, setCategories] = useState(item?.categoryIds ?? []);
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  async function submit() {
    if (!name.trim()) { setError('请输入道具名称'); return; }
    if (!review) { setReview(true); setError(''); return; }
    setBusy(true); setError('');
    try {
      await apiFetch(item ? `/items/${encodeURIComponent(item.id)}` : '/items', { method: item ? 'PATCH' : 'POST', token, body: JSON.stringify({ name: name.trim(), icon, categoryIds: categories }) });
      await onSaved(); onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : '道具保存失败'); }
    finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}><DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto" showCloseButton={!busy}>
    <DialogHeader><DialogTitle>{review ? '确认道具修改' : item ? '编辑道具及图标' : '新增道具'}</DialogTitle><DialogDescription>统一维护名称、图标和一级分类。已有道具ID及产出数值保留。</DialogDescription></DialogHeader>
    {review ? <div className="flex flex-col gap-2">
      <p>原名称：{item?.name ?? '新增道具'}</p><p>新名称：{name.trim()}</p>
      <p>原分类：{item ? classificationLabel(item, dictionary) : '无'}</p><p>新分类：{classificationLabel({ id: item?.id ?? '', name, categoryIds: categories }, dictionary)}</p>
      <div className="flex items-center gap-3"><Image unoptimized width={48} height={48} src={resolveItemIcon(icon)} alt="保存图标" /><span>{iconName}</span></div>
    </div> : <>
      <label htmlFor="item-editor-name">道具名称</label><Input id="item-editor-name" placeholder="如：S钥匙、自选核心、S特工碎片..." value={name} onChange={(event) => setName(event.target.value)} />
      <ClassificationControls dictionary={dictionary} categoryIds={categories} onCategories={setCategories} editing />
      <div className="flex items-center gap-3"><Image unoptimized src={resolveItemIcon(icon)} alt="预览" width={48} height={48} /><span>当前选中图标</span><span>{iconName}</span></div>
      <h3>选择道具图标 *</h3><p>共 {PRESET_ITEM_ICONS.length} 款可选</p>
      <Input aria-label="搜索图标" value={query} placeholder="搜索图标名称" onChange={(event) => setQuery(event.target.value)} />
      <div className="grid max-h-60 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-6">
        {PRESET_ITEM_ICONS.filter((entry) => entry.includes(query)).map((entry) => {
          const found = catalog.find((value) => value.name === entry);
          const path = found?.icon ?? `/icons/items/${entry}.png`;
          return <Button key={entry} variant={icon === path ? 'secondary' : 'ghost'} className="h-auto flex-col whitespace-normal p-2" title={entry} aria-pressed={icon === path} onClick={() => { setIcon(path); setIconName(entry); }}>
            <Image unoptimized src={found?.preview ?? path} alt={entry} width={32} height={32} /><span className="text-xs">{entry}</span>
          </Button>;
        })}
      </div>
    </>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <DialogFooter><Button variant="outline" disabled={busy} onClick={onClose}>取消</Button>{review && <Button variant="outline" disabled={busy} onClick={() => setReview(false)}>返回修改</Button>}<Button disabled={busy} onClick={submit}>{busy ? '保存中…' : review ? '确认保存' : '下一步确认'}</Button></DialogFooter>
  </DialogContent></Dialog>;
}
