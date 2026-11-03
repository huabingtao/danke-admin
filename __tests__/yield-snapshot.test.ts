import { describe, expect, test } from 'vitest';
import { latestYieldSnapshot } from '../lib/yield-snapshot';

describe('latest resource snapshot', () => {
  test('uses one complete latest batch regardless of response order', () => {
    const old = { year: 2025, month: 12, amount: 42 };
    const newest = { year: 2026, month: 1, amount: 0 };
    const other = { year: 2026, month: 1, amount: 8 };
    expect(latestYieldSnapshot([newest, old, other])).toEqual({ period: { year: 2026, month: 1 }, records: [newest, other] });
  });
  test('empty data uses the present period for first save', () => {
    expect(latestYieldSnapshot([], new Date(2026, 10, 1)).period).toEqual({ year: 2026, month: 11 });
  });
  test('ignores malformed dates instead of selecting an invalid batch', () => {
    expect(latestYieldSnapshot([{ year: 2026, month: 13 }, { year: 2026, month: 8 }]).period).toEqual({ year: 2026, month: 8 });
  });
});
