const categories = [
 { id: 'core', name: '核心' }, { id: 'equipment', name: '装备' }, { id: 'agent', name: '特工' },
 { id: 'pet', name: '宠物' }, { id: 'tech', name: '配件' }, { id: 'collection', name: '收藏品' },
 { id: 'vehicle', name: '载具' }, { id: 'key', name: '钥匙' }, { id: 'general', name: '其他' }, { id: 'event', name: '活动货币' },
];
export const dictionary = {
 categories,
 views: [{ id: 'all', name: '全部', categoryIds: [] }, ...categories.map((category) => ({ id: category.id === 'core' ? 'cores' : category.id === 'key' ? 'keys' : category.id, name: category.name, categoryIds: [category.id] }))],
};
