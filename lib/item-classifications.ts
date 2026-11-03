export interface ClassificationOption { id: string; name: string; sortOrder?: number; icon?: string | null }
export interface ClassificationDictionary { categories: ClassificationOption[]; views?: ResourceView[] }
export interface ClassifiedItem {
  id: string; name: string; icon?: string | null; aliases?: string[]; aliasIds?: string[]; categoryIds?: string[]; categories?: ClassificationOption[];
}
export function matchesClassification(item: ClassifiedItem, categories: string[]) {
  const ids = item.categoryIds ?? item.categories?.map((category) => category.id) ?? [];
  return !categories.length || categories.some((id) => id === '__unclassified__' ? !ids.length : ids.includes(id));
}
export function classificationLabel(item: ClassifiedItem, dictionary: ClassificationDictionary) {
  return dictionary.categories.filter((category) => item.categoryIds?.includes(category.id)).map((category) => category.name).join('、') || '未分类';
}
export interface ResourceView { id: string; name: string; categoryIds: string[]; icon?: string | null }
export const ALL_RESOURCE_VIEW: ResourceView = { id: 'all', name: '全部', categoryIds: [] };
export function resourceViews(dictionary: ClassificationDictionary): ResourceView[] { return dictionary.views?.length ? dictionary.views : [ALL_RESOURCE_VIEW]; }
export function matchesResourceView(item: ClassifiedItem, view: ResourceView) { return matchesClassification(item, view.categoryIds); }
