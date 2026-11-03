export interface YieldPeriod {
  year: number;
  month: number;
}

// Read one complete latest snapshot; never mix cells from different periods.
export function latestYieldSnapshot<T extends YieldPeriod>(records: T[], now = new Date()) {
  const period = records.reduce<YieldPeriod | null>((latest, record) => {
    if (!Number.isInteger(record.year) || !Number.isInteger(record.month) || record.month < 1 || record.month > 12) return latest;
    return !latest || record.year * 12 + record.month > latest.year * 12 + latest.month
      ? { year: record.year, month: record.month }
      : latest;
  }, null) ?? { year: now.getFullYear(), month: now.getMonth() + 1 };

  return {
    period,
    records: records.filter((record) => record.year === period.year && record.month === period.month),
  };
}
