import { describe, expect, test } from 'vitest';
import { buildYieldColumns, yieldItemRank, sortYieldItems } from '../lib/yield-columns';

describe('resource columns', () => {
  test('uses core, legendary, epic, boxes, fragments, keys, other order', () => {
    const names = ['金币', '高级钥匙', '传奇收藏品碎片自选', '杰出宠物宝箱', '史诗收藏品', '传奇收藏品', '神器核心', '史诗配件自选宝箱'];
    const result = buildYieldColumns(names.map((name, id) => ({ id: String(id), name })), []);
    expect(result.map((item) => yieldItemRank(item.name))).toEqual([0, 1, 2, 2, 3, 4, 5, 6]);
    expect(result[0].name).toBe('神器核心');
    expect(yieldItemRank('配件宝箱钥匙')).toBe(5);
  });
  test('dedupes unused aliases while retaining the populated record ID for editing', () => {
    const items = [{ id: 'old', name: '特工核心' }, { id: 'alias', name: '特工觉醒核心' }];
    expect(buildYieldColumns(items, [{ itemId: 'alias', amount: 5 }])).toEqual([{ id: 'alias', name: '特工核心' }]);
    expect(items[1].name).toBe('特工觉醒核心');
  });
  test('prefers canonical name when neither alias has amounts', () => {
    expect(buildYieldColumns([{ id: 'alias', name: '核心自选宝箱' }, { id: 'old', name: '自选核心' }], [])).toEqual([{ id: 'old', name: '自选核心' }]);
  });
  test('preserves both populated definitions instead of silently dropping or summing values', () => {
    const items = [{ id: 'old', name: '特工核心' }, { id: 'alias', name: '特工觉醒核心' }];
    expect(buildYieldColumns(items, [{ itemId: 'old', amount: 5 }, { itemId: 'alias', amount: 2 }])).toHaveLength(2);
  });
  test('keeps random and selection chests distinct and previously removed columns hidden', () => {
    const names = ['史诗收藏品', '史诗收藏品宝箱', '史诗收藏品自选宝箱', '史诗宠物', '史诗宠物宝箱', '随机传奇收藏品宝箱', '体力_能量', '传奇载具碎片', '破坏之石', '混沌之石', '永恒之石'];
    expect(buildYieldColumns(names.map((name, id) => ({ id: String(id), name })), []).map((item) => item.name)).toEqual(['史诗收藏品', '史诗收藏品自选宝箱']);
  });
});

 test('saved explicit columns retain value ordering and a renamed core uses its stable category', () => {
  const items = [{ id: 'currency', name: '金币', resourceTypeId: 'currency' }, { id: 'core', name: '已改名资源', categoryIds: ['core'] }, { id: 'box', name: '核心自选宝箱', resourceTypeId: 'chest' }];
  const ids = sortYieldItems(items).map((item) => item.id);
  expect(ids.indexOf('core')).toBeLessThan(ids.indexOf('currency'));
  expect(new Set(ids).size).toBe(3);
 });
