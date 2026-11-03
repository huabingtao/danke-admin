import { resolveItemIcon } from './item-icons';
import type { ClassifiedItem } from './item-classifications';
export function classifiedIcon(item: ClassifiedItem) {
  return resolveItemIcon(item.icon?.trim() || `/icons/items/${encodeURIComponent(item.name)}.png`);
}
