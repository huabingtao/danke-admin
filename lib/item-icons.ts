import { getApiBase } from './api';
import catalog from './web-item-catalog.json';

export function resolveItemIcon(icon: string): string {
  return icon.startsWith('/uploads/') ? `${getApiBase().replace(/\/$/, '')}${icon}` : icon;
}

export function catalogItemIcon(name: string): string {
  const entry = catalog.find((item) => item.name === name);
  return resolveItemIcon(entry?.icon ?? `/icons/items/${encodeURIComponent(name)}.png`);
}

// 道具图标获取工具（优先使用数据库配置的 icon，支持 OSS 路径，若无则回退到默认文件名）
export const getItemIconUrl = (itemName: string, iconUrl?: string | null): string => {
  if (iconUrl && iconUrl.trim()) {
    return resolveItemIcon(iconUrl.trim());
  }
  return `/icons/items/${encodeURIComponent(itemName)}.png`;
};
