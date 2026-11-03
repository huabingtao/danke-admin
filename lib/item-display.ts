import webItemCatalog from './web-item-catalog.json';
import { resolveItemIcon } from './item-icons';

// 常用资源优先保留，后接从 Web 导入的真实道具图标。
const LEGACY_ITEM_ICONS = [
  's杰出装备',
  '史诗配件',
  '杰出配件',
  '史诗宠物',
  '杰出宠物',
  '觉醒水晶',
  'sp特工万能碎片',
  's特工碎片',
  '传奇载具碎片',
  '史诗收藏品',
  '杰出收藏品',
  '高级收藏之心',
  '传奇收藏品',
  '载具零件钥匙',
  's级军备钥匙',
  '收藏品宝箱钥匙',
  '配件宝箱钥匙',
  '高级钥匙',
  '普通钥匙',
  '宠物钥匙',
  '高级宠物箱钥匙',
  '神器核心',
  '异宠核心',
  '谐振芯片',
  '特工核心',
  '自选核心',
  '其他钥匙',

];
export const PRESET_ITEM_ICONS = [...new Set([...LEGACY_ITEM_ICONS, ...webItemCatalog.map((item) => item.name)])];

// 图标解析辅助：优先使用配置的 icon（支持本地相对路径或腾讯云 OSS 链接），无配置时回退到默认文件名规则
export const getItemDisplayIcon = (item: { name: string; icon?: string | null }): string => {
  if (item.icon && item.icon.trim()) {
    return resolveItemIcon(item.icon.trim());
  }
  return `/icons/items/${encodeURIComponent(item.name)}.png`;
};
