'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { apiFetch } from '@/lib/api-client';
import { formatGems, gemPriceLabel, type ValuedItem } from '@/lib/gem-valuation';
export function GemValueEditor({ item, token, onClose, onSaved }: { item: ValuedItem; token: string | null; onClose: () => void; onSaved: (item: ValuedItem) => void }) {
  const schemes = item.gemValuation?.prices ?? [{ id: 'default', label: '单价', value: null }];
  const [values, setValues] = useState(() => schemes.map((price) => price.value === null ? '' : String(price.value)));
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit() {
    if (values.some((value) => !value.trim() || !Number.isFinite(Number(value)) || Number(value) < 0)) { setError('请输入非负的有效钻石单价'); return; }
    if (!review) { setReview(true); setError(''); return; }
    setBusy(true); setError('');
    try {
      const response = await apiFetch(`/items/${encodeURIComponent(item.id)}`, { method: 'PATCH', token, body: JSON.stringify({ gemValuation: { prices: schemes.map((price, index) => ({ id: price.id, value: Number(values[index]) })) } }) });
      onSaved(await response.json()); onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : '价格保存失败'); }
    finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" showCloseButton={!busy}>
    <DialogHeader><DialogTitle>{review ? '确认钻石价值修改' : '编辑钻石价值'}</DialogTitle><DialogDescription>{item.name}</DialogDescription></DialogHeader>
    <div className="flex flex-col gap-4">{schemes.map((price, index) => <div key={price.id} className="flex flex-col gap-2">
      <label htmlFor={`price-${index}`}>{gemPriceLabel(price)}</label>
      {review ? <p>{price.value === null ? '未配置' : formatGems(price.value)} → {formatGems(Number(values[index]))} 钻石</p> : <Input id={`price-${index}`} type="number" inputMode="decimal" min="0" step="any" value={values[index]} onChange={(event) => setValues((previous) => previous.map((value, position) => position === index ? event.target.value : value))} />}
    </div>)}</div>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <DialogFooter><Button variant="outline" disabled={busy} onClick={onClose}>取消</Button>{review && <Button variant="outline" disabled={busy} onClick={() => setReview(false)}>返回修改</Button>}<Button disabled={busy} onClick={submit}>{busy ? '保存中…' : review ? '确认保存价值' : '下一步确认'}</Button></DialogFooter>
  </DialogContent></Dialog>;
}
