'use client';
import { Button } from '@/components/ui/button';
import type { ClassificationDictionary } from '@/lib/item-classifications';
export function ClassificationControls({ dictionary, categoryIds, onCategories, editing = false }: {
 dictionary: ClassificationDictionary; categoryIds: string[]; onCategories: (ids: string[]) => void; editing?: boolean;
}) {
 return <div role="group" aria-label="一级分类" className="flex flex-wrap gap-1">
  <Button size="sm" variant={!categoryIds.length ? 'selected' : 'ghost'} aria-pressed={!categoryIds.length} onClick={() => onCategories([])}>{editing ? '清空一级分类' : '全部分类'}</Button>
  {dictionary.categories.map((category) => <Button key={category.id} size="sm" variant={categoryIds.includes(category.id) ? 'selected' : 'ghost'} aria-pressed={categoryIds.includes(category.id)} onClick={() => onCategories(categoryIds.includes(category.id) ? categoryIds.filter((id) => id !== category.id) : [...categoryIds, category.id])}>{category.name}</Button>)}
  {!editing && <Button size="sm" variant={categoryIds.includes('__unclassified__') ? 'selected' : 'ghost'} aria-pressed={categoryIds.includes('__unclassified__')} onClick={() => onCategories(categoryIds.includes('__unclassified__') ? [] : ['__unclassified__'])}>未分类</Button>}
 </div>;
}
