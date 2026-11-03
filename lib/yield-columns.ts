// Only aliases established by the Web icon preparation mapping are grouped.
// Matching icons alone are not evidence that two resources are interchangeable.
const ALIASES: Record<string, string> = {
  特工觉醒核心: '特工核心',
  核心自选宝箱: '自选核心',
  零件宝箱钥匙: '载具零件钥匙',
  普通宠物钥匙: '宠物钥匙',
  史诗配件自选宝箱: '史诗配件',
  杰出配件自选宝箱: '杰出配件',
  杰出宠物宝箱: '杰出宠物',
  史诗收藏品宝箱: '史诗收藏品',
  杰出收藏品宝箱: '杰出收藏品',
  传奇收藏品宝箱: '传奇收藏品',
};

const HIDDEN = new Set(['史诗宠物', '史诗宠物宝箱', '随机传奇收藏品宝箱', '体力_能量', '传奇载具碎片', '破坏之石', '混沌之石', '永恒之石']);
const GENERIC_BOXES = new Set(['s杰出装备', '杰出配件', '杰出收藏品', '杰出宠物']);
const CORE_ORDER = ['神器核心', '神炼核心', '异宠核心', '特工核心', '载具核心', '自选核心', '谐振芯片'];
const FRAGMENT_ORDER = ['sp特工万能碎片', 's特工碎片'];

export function yieldItemKey(name: string): string {
  return ALIASES[name] ?? name;
}

export function yieldItemRank(name: string): number {
  const key = yieldItemKey(name);
  if (key.includes('碎片')) return 4;
  if (key.includes('钥匙')) return 5;
  if (key.includes('核心') || key === '谐振芯片') return 0;
  if (key.includes('传奇')) return 1;
  if (key.includes('史诗')) return 2;
  if (/宝箱|箱子/.test(key) || GENERIC_BOXES.has(key)) return 3;
  return 6;
}

function typedRank(item: { name: string; categoryIds?: string[] }): number {
  if (item.categoryIds?.includes('core')) return 0;
  if (item.categoryIds?.includes('key')) return 5;
  return yieldItemRank(item.name);
}

function compareItems(a: { name: string; categoryIds?: string[] }, b: { name: string; categoryIds?: string[] }): number {
  const rank = typedRank(a) - typedRank(b);
  if (rank) return rank;
  const priority = yieldItemRank(a.name) === 0 ? CORE_ORDER : FRAGMENT_ORDER;
  const aIndex = priority.indexOf(yieldItemKey(a.name));
  const bIndex = priority.indexOf(yieldItemKey(b.name));
  if (aIndex >= 0 || bIndex >= 0) return (aIndex < 0 ? priority.length : aIndex) - (bIndex < 0 ? priority.length : bIndex);
  return a.name.localeCompare(b.name, 'zh-CN');
}

export function buildYieldColumns<T extends { id: string; name: string }>(
  items: T[], records: { itemId: string; amount: number }[],
): T[] {
  const groups = new Map<string, T[]>();
  const populated = new Set(records.filter((record) => record.amount !== 0).map((record) => record.itemId));
  for (const item of items) {
    if (HIDDEN.has(item.name)) continue;
    const key = yieldItemKey(item.name);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  const columns: T[] = [];
  for (const [key, group] of groups) {
    const active = group.filter((item) => populated.has(item.id));
    if (active.length > 1) {
      // Both records contain amounts: keep them visible for manual reconciliation.
      // Never sum or suppress operator-maintained values based on an alias guess.
      columns.push(...active);
    } else {
      // Keep the populated ID so existing double-click saves still target the same record.
      const chosen = active[0] ?? group.find((item) => item.name === key) ?? group[0];
      columns.push({ ...chosen, name: key });
    }
  }
  return columns.sort(compareItems);
}

export function sortYieldItems<T extends { name: string; categoryIds?: string[] }>(items: T[]): T[] {
  return [...items].sort(compareItems);
}
