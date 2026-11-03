'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ClassificationControls } from './ClassificationControls';
import { apiFetch } from '@/lib/api-client';
import type { ClassifiedItem, ClassificationDictionary } from '@/lib/item-classifications';
export function ItemClassificationDialog({ items, dictionary, token, onClose, onSaved }: {
  items: ClassifiedItem[]; dictionary: ClassificationDictionary; token: string | null;
  onClose: () => void; onSaved: () => Promise<void>;
}) {
  const [categories, setCategories] = useState<string[]>(items.length === 1 ? items[0].categoryIds ?? [] : []);
  const [categoryMode, setCategoryMode] = useState<'keep' | 'set' | 'clear'>(items.length === 1 ? 'set' : 'keep');
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    setBusy(true); setError('');
    try {
      await apiFetch('/item-classifications/bulk', { method: 'POST', token, body: JSON.stringify({ itemIds: items.map((item) => item.id), ...(categoryMode === 'keep' ? {} : { categoryIds: categoryMode === 'clear' ? [] : categories }) }) });
      await onSaved(); onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : '分类保存失败'); }
    finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}><DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" showCloseButton={!busy}>
    <DialogHeader><DialogTitle>{review ? '确认道具分类' : '设置道具分类'}</DialogTitle><DialogDescription>为所选 {items.length} 项道具统一设置分类，保留名称、图片和所有产出数值。一级分类可多选。</DialogDescription></DialogHeader>
    {!review && <div className="flex flex-col gap-2">
      <div role="group" aria-label="一级分类修改方式">一级分类：{(['keep', 'set', 'clear'] as const).map((mode) => <Button key={mode} variant={categoryMode === mode ? 'secondary' : 'ghost'} onClick={() => setCategoryMode(mode)}>{({ keep: '保持一级分类', set: '设置一级分类', clear: '清空一级分类' })[mode]}</Button>)}</div>
    </div>}
    {review ? <div className="flex flex-col gap-2"><p>道具：{items.map((item) => item.name).join('、')}</p><p>一级：{categoryMode === 'keep' ? '保持原值' : categoryMode === 'clear' ? '清空' : dictionary.categories.filter((category) => categories.includes(category.id)).map((category) => category.name).join('、') || '未分类'}</p></div> : categoryMode === 'set' ? <ClassificationControls dictionary={dictionary} categoryIds={categories} onCategories={(ids) => { setCategories(ids); setCategoryMode('set'); }} editing /> : null}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <DialogFooter><Button variant="outline" disabled={busy} onClick={onClose}>取消</Button>{review && <Button variant="outline" disabled={busy} onClick={() => setReview(false)}>返回修改</Button>}<Button disabled={busy || categoryMode === 'keep'} onClick={() => review ? void save() : setReview(true)}>{busy ? '正在保存…' : review ? '确认保存分类' : '下一步确认'}</Button></DialogFooter>
  </DialogContent></Dialog>;
}
