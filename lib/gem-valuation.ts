import type { ClassifiedItem } from './item-classifications';
export interface GemPrice { id: string; label: string; value: number; referenceValue?: number }
export interface GemValuation {
  prices: GemPrice[];
  sourceUrl?: string;
  capturedAt?: string;
  updatedAt?: string;
  manuallyModified: boolean;
  translationPending?: boolean;
  referenceNames?: string[];
  eventNames?: string[];
}
export interface ValuedItem extends ClassifiedItem { gemValuation?: GemValuation | null }
export const formatGems = (value: number) => value.toLocaleString('zh-CN', { maximumFractionDigits: 12 });

export const gemPriceLabel = (price: Pick<GemPrice, 'id' | 'label'>) => price.id === 'default' || price.label === '默认单价' ? '单价' : price.label;
