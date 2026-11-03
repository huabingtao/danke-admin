import type { GemValuation } from './gem-valuation';

export const YIELD_ROW_ORDER_STORAGE_KEY = 'danke-admin:yield-row-order:v1';
export const YIELD_COLUMN_ORDER_STORAGE_KEY = 'danke-admin:yield-column-order:v1';
export const YIELD_VALUE_SORT_STORAGE_KEY = 'danke-admin:yield-value-sort:v1';
export type YieldValueSort = 'DESC' | 'ASC' | 'MANUAL';

// Prefer the configured default; multi-plan items without one use their highest unit price.
export function yieldUnitPrice(item: { gemValuation?: GemValuation | null }): number | null {
  const prices = item.gemValuation?.prices.filter((price) => Number.isFinite(price.value) && price.value >= 0) ?? [];
  return prices.find((price) => price.id === 'default')?.value
    ?? (prices.length ? Math.max(...prices.map((price) => price.value)) : null);
}

export function sortColumnsByValue<T extends { id: string; gemValuation?: GemValuation | null }>(columns: T[], direction: 'ASC' | 'DESC'): T[] {
  const valued = columns.map((item) => ({ item, price: yieldUnitPrice(item) }));
  return valued.sort((a, b) => {
    if (a.price === null) return b.price === null ? 0 : 1;
    if (b.price === null) return -1;
    return direction === 'DESC' ? b.price - a.price : a.price - b.price;
  }).map(({ item }) => item);
}

export function parseColumnOrder(value: string | null): string[] {
  try {
    const parsed: unknown = value ? JSON.parse(value) : [];
    return Array.isArray(parsed)
      ? [...new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0))]
      : [];
  } catch {
    return [];
  }
}

export function applyColumnOrder<T extends { id: string; aliasIds?: string[] }>(columns: T[], savedOrder: string[]): T[] {
  const positions = new Map(savedOrder.map((id, index) => [id, index]));
  const position = (item: T) => Math.min(...[item.id, ...(item.aliasIds ?? [])].map((id) => positions.get(id) ?? savedOrder.length));
  return [...columns].sort((a, b) => position(a) - position(b));
}

export function moveColumnOrder(ids: string[], fromId: string, toId: string): string[] {
  const from = ids.indexOf(fromId);
  const to = ids.indexOf(toId);
  if (from < 0 || to < 0 || from === to) return [...ids];
  const result = [...ids];
  result.splice(from, 1);
  result.splice(to, 0, fromId);
  return result;
}
