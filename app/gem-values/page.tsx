'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Diamond, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { GemValueEditor } from '@/components/GemValueEditor';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api-client';
import { classifiedIcon } from '@/lib/item-transfer-icons';
import { formatGems, gemPriceLabel, type ValuedItem } from '@/lib/gem-valuation';
import type { ClassificationDictionary } from '@/lib/item-classifications';
export default function GemValuesPage() {
  const { token, user, hasPermission } = useAuth();
  const canEdit = user?.role === 'ADMIN' || hasPermission('item:create');
  const [items, setItems] = useState<ValuedItem[]>([]);
  const [dictionary, setDictionary] = useState<ClassificationDictionary>({ categories: [] });
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<ValuedItem | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.all([apiFetch('/items', { token }).then((response) => response.json()), apiFetch('/item-classifications', { token }).then((response) => response.json())])
      .then(([data, classifications]) => {
        if (!Array.isArray(data) || !Array.isArray(classifications?.categories)) throw new Error('道具或分类数据格式错误');
        if (active) { setItems(data); setDictionary(classifications); setError(''); }
      }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : '读取失败'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, retry]);
  const needle = query.trim().toLowerCase();
  const filtered = items.filter((item) => [item.name, ...(item.aliases ?? []), ...(item.gemValuation?.referenceNames ?? []), ...(item.gemValuation?.eventNames ?? [])].some((name) => name.toLowerCase().includes(needle)));
  const categories = [...dictionary.categories, { id: '__unclassified__', name: '未分类' }];
  return <div className="flex flex-col gap-6 pb-12">
    <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex flex-col gap-2"><h1 className="flex items-center gap-2 text-2xl font-bold"><Diamond className="text-primary" />钻石价值配置</h1><p className="text-sm text-muted-foreground">维护每项资源的参考钻石单价</p></div><Input className="w-full sm:max-w-sm" aria-label="搜索估值道具" placeholder="搜索名称或活动" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
    {error && <div role="alert" className="flex items-center gap-3 text-destructive">{error}<Button variant="outline" onClick={() => setRetry((previous) => previous + 1)}>重试读取</Button></div>}
    {loading ? <p role="status">正在读取钻石价值…</p> : categories.map((category) => {
      const members = filtered.filter((item) => category.id === '__unclassified__' ? !item.categoryIds?.length : item.categoryIds?.includes(category.id));
      if (!members.length) return null;
      return <section key={category.id} aria-label={`${category.name}估值`} className="flex flex-col gap-4 rounded-xl border bg-card/40 p-4 sm:p-5">
        <h2 className="flex items-center gap-3 text-lg font-semibold">{category.name}<Badge variant="secondary">{members.length}</Badge></h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{members.map((item) => <Card key={item.id} className="gap-3 py-4">
          <CardHeader className="flex flex-row items-center gap-3 px-4"><Image unoptimized width={44} height={44} src={classifiedIcon(item)} alt="" className="size-11 shrink-0 object-contain" /><div className="min-w-0 flex-1"><CardTitle className="break-words text-sm leading-6">{item.name}</CardTitle>{item.gemValuation?.translationPending && <CardDescription>中文名待核对</CardDescription>}</div>{canEdit && <Button size="sm" variant="ghost" aria-label={`编辑${item.name}价值`} title="编辑" onClick={() => setEditing(item)}><Pencil data-icon="inline-start" />编辑</Button>}</CardHeader>
          <CardContent className="flex flex-col gap-2 px-4">{item.gemValuation?.prices?.length ? item.gemValuation.prices.map((price) => <div key={price.id} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="text-muted-foreground">{gemPriceLabel(price)}</span><span className="inline-flex items-center gap-1 font-mono font-semibold tabular-nums">{formatGems(price.value)}<Diamond className="size-4 text-primary" aria-label="钻石" /></span></div>) : <p className="text-sm text-muted-foreground">未配置</p>}</CardContent>

        </Card>)}</div>
      </section>;
    })}
    {!loading && !error && !filtered.length && <p role="status">没有匹配的道具，请调整搜索内容。</p>}
    {editing && <GemValueEditor key={editing.id} item={editing} token={token} onClose={() => setEditing(null)} onSaved={(updated) => setItems((previous) => previous.map((item) => item.id === updated.id ? updated : item))} />}
  </div>;
}
