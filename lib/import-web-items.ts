import { apiFetch, ApiError } from './api-client';
import catalog from './web-item-catalog.json';

interface ExistingItem { id: string; name: string; icon?: string | null; aliases?: string[] }

// Each successful mutation is returned for review/rollback; repeated imports are idempotent.
export async function importWebItems(token: string) {
  const existing: ExistingItem[] = await (await apiFetch('/items', { token })).json();
  const byName = new Map(existing.flatMap((item) => [item.name, ...(item.aliases ?? [])].map((name) => [name, item] as const)));
  const result = {
    created: [] as { id: string; name: string }[],
    updated: [] as { id: string; name: string; previousIcon: string | null }[],
    skipped: 0,
    failed: [] as { name: string; message: string }[],
  };
  for (const entry of catalog) {
    const current = byName.get(entry.name);
    // Preserve operator-maintained custom URLs. Only replace known legacy defaults.
    if (current?.icon && !current.icon.startsWith('/icons/items/')) {
      result.skipped++;
      continue;
    }
    try {
      const response = await apiFetch(current ? `/items/${encodeURIComponent(current.id)}` : '/items', {
        method: current ? 'PATCH' : 'POST', token,
        body: JSON.stringify(current ? { icon: entry.icon } : { name: entry.name, icon: entry.icon, type: 'RESOURCE' }),
      });
      const saved: ExistingItem = await response.json();
      if (current) result.updated.push({ id: saved.id, name: saved.name, previousIcon: current.icon ?? null });
      else result.created.push({ id: saved.id, name: saved.name });
    } catch (error) {
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        result.failed.push({ name: entry.name, message: '认证过期或没有导入权限，已停止；已成功项可在重试时跳过' });
        break;
      }
      result.failed.push({ name: entry.name, message: error instanceof Error ? error.message : '导入失败' });
    }
  }
  return result;
}
