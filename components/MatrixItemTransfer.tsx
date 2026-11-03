'use client';
import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ClassificationControls } from './ClassificationControls';
import { classifiedIcon } from '@/lib/item-transfer-icons';
import { classificationLabel, matchesClassification, type ClassifiedItem, type ClassificationDictionary } from '@/lib/item-classifications';

export function MatrixItemTransfer({ items, selectedIds, dictionary, onClose, onSave }: {
  items: ClassifiedItem[]; selectedIds: string[]; dictionary: ClassificationDictionary;
  onClose: () => void; onSave: (ids: string[]) => Promise<void>;
}) {
  const [chosen, setChosen] = useState(new Set(selectedIds));
  const [checked, setChecked] = useState(new Set<string>());
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const filtered = useMemo(() => items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()) && matchesClassification(item, categories)), [items, query, categories]);
  const added = items.filter((item) => chosen.has(item.id) && !selectedIds.includes(item.id));
  const removed = items.filter((item) => !chosen.has(item.id) && selectedIds.includes(item.id));
  function move(add: boolean) {
    setChosen((previous) => { const next = new Set(previous); for (const id of checked) { if (add) next.add(id); else next.delete(id); } return next; });
    setChecked(new Set());
  }
  async function save() {
    setBusy(true); setError('');
    try { await onSave(items.filter((item) => chosen.has(item.id)).map((item) => item.id)); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '保存失败'); }
    finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}><DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto" showCloseButton={!busy}>
    <DialogHeader><DialogTitle>{review ? '确认显示列调整' : '管理显示道具'}</DialogTitle><DialogDescription>只调整当前账号的大表显示列，不删除道具或产出数据。</DialogDescription></DialogHeader>
    {review ? <div className="flex flex-col gap-2"><p>新增列（{added.length}）：{added.map((item) => item.name).join('、') || '无'}</p><p>移除列（{removed.length}）：{removed.map((item) => item.name).join('、') || '无'}</p><p>保存后显示 {chosen.size} 项道具</p></div> : <>
      <Input aria-label="搜索道具" placeholder="搜索道具名称" value={query} onChange={(event) => setQuery(event.target.value)} />
      <ClassificationControls dictionary={dictionary} categoryIds={categories} onCategories={setCategories} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr]">
        {[false, true].map((isSelected, index) => <div key={String(isSelected)} className="contents">
          {index === 1 && <div className="flex items-center justify-center gap-2 sm:flex-col"><Button variant="outline" onClick={() => move(true)}>移入 →</Button><Button variant="outline" onClick={() => move(false)}>← 移出</Button></div>}
          <section className="flex flex-col gap-2 rounded-lg border p-3" aria-label={isSelected ? '已显示道具' : '未显示道具'}>
            <h3>{isSelected ? '已显示道具' : '未显示道具'}（{items.filter((item) => chosen.has(item.id) === isSelected).length}）</h3>
            <Button variant="outline" size="sm" onClick={() => setChecked((previous) => { const next = new Set(previous); const visible = filtered.filter((item) => chosen.has(item.id) === isSelected); const all = visible.every((item) => next.has(item.id)); for (const item of visible) { if (all) next.delete(item.id); else next.add(item.id); } return next; })}>勾选/取消当前结果</Button>
            <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
              {filtered.filter((item) => chosen.has(item.id) === isSelected).map((item) => <Button key={item.id} variant={checked.has(item.id) ? 'secondary' : 'ghost'} aria-pressed={checked.has(item.id)} className="h-auto justify-start whitespace-normal py-2" onClick={() => setChecked((previous) => { const next = new Set(previous); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })}>
                <Image unoptimized src={classifiedIcon(item)} alt="" width={28} height={28} /><span className="flex min-w-0 flex-col items-start"><span>{item.name}</span><span className="text-xs text-muted-foreground">{classificationLabel(item, dictionary)}</span></span>
              </Button>)}
            </div>
          </section>
        </div>)}
      </div>
    </>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <DialogFooter><Button variant="outline" disabled={busy} onClick={onClose}>取消</Button>{review && <Button variant="outline" disabled={busy} onClick={() => setReview(false)}>返回调整</Button>}<Button disabled={busy} onClick={() => review ? void save() : setReview(true)}>{busy ? '正在保存…' : review ? '确认保存显示列' : '下一步确认'}</Button></DialogFooter>
  </DialogContent></Dialog>;
}
