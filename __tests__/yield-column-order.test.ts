import { expect, test } from 'vitest';
import { applyColumnOrder, moveColumnOrder, parseColumnOrder, sortColumnsByValue, yieldUnitPrice } from '../lib/yield-column-order';

test('moves in both directions and does not mutate the original order', () => {
  const ids = ['a', 'b', 'c'];
  expect(moveColumnOrder(ids, 'a', 'c')).toEqual(['b', 'c', 'a']);
  expect(moveColumnOrder(ids, 'c', 'a')).toEqual(['c', 'a', 'b']);
  expect(moveColumnOrder(ids, 'missing', 'a')).toEqual(ids);
  expect(ids).toEqual(['a', 'b', 'c']);
});
test('ignores deleted IDs, retains new columns and preserves default order for new columns', () => {
  const columns = ['a', 'b', 'c'].map((id) => ({ id }));
  expect(applyColumnOrder(columns, ['deleted', 'b'])).toEqual([{ id: 'b' }, { id: 'a' }, { id: 'c' }]);
});
test('tolerates invalid or unavailable saved order and deduplicates IDs', () => {
  for (const value of [null, '', '{bad', '{}', '123']) expect(parseColumnOrder(value)).toEqual([]);
  expect(parseColumnOrder('["b",null,"a","b",42,""]')).toEqual(['b', 'a']);
});

test('a merged alias retains the column position previously saved for its ID', () => {
  expect(applyColumnOrder([{ id: 'other' }, { id: 'official', aliasIds: ['old'] }], ['old', 'other']).map((item) => item.id)).toEqual(['official', 'other']);
});

const valuedItem = (id: string, value: number) => ({ id, gemValuation: { manuallyModified: false, prices: [{ id: 'default', label: '单价', value }] } });

test('sorts real unit values in both directions, keeps unpriced last and zero distinct from unpriced', () => {
  const columns = [valuedItem('cheap', 0.12), { id: 'unpriced' }, valuedItem('expensive', 17200), valuedItem('free', 0), valuedItem('same', 0.12)];
  expect(sortColumnsByValue(columns, 'DESC').map((item) => item.id)).toEqual(['expensive', 'cheap', 'same', 'free', 'unpriced']);
  expect(sortColumnsByValue(columns, 'ASC').map((item) => item.id)).toEqual(['free', 'cheap', 'same', 'expensive', 'unpriced']);
  expect(columns.map((item) => item.id)).toEqual(['cheap', 'unpriced', 'expensive', 'free', 'same']);
});

test('uses the default plan, otherwise highest plan, and excludes invalid values', () => {
  const item = valuedItem('multi', 10);
  item.gemValuation.prices.push({ id: 'late', label: '后期', value: 50 });
  expect(yieldUnitPrice(item)).toBe(10);
  item.gemValuation.prices.shift();
  item.gemValuation.prices.push({ id: 'early', label: '前期', value: 30 });
  expect(yieldUnitPrice(item)).toBe(50);
  expect(yieldUnitPrice(valuedItem('invalid', NaN))).toBeNull();
  expect(yieldUnitPrice(valuedItem('negative', -1))).toBeNull();
  expect(yieldUnitPrice(valuedItem('infinite', Infinity))).toBeNull();
});
