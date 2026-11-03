import { expect, test, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MatrixItemTransfer } from '../components/MatrixItemTransfer';
import { matchesClassification } from '../lib/item-classifications';
import { dictionary } from './fixtures/classifications';
const items = [
  { id: 'a', name: '多体系核心', categoryIds: ['equipment', 'pet'], resourceTypeId: 'core' },
  { id: 'b', name: '钥匙资源', categoryIds: ['agent'], resourceTypeId: 'key' },
  { id: 'c', name: '破坏之石', categoryIds: [], resourceTypeId: 'material' },
];
test('flat multi-category OR never duplicate items, and names do not affect membership', () => {
  expect(items.filter((item) => matchesClassification(item, ['equipment', 'pet'])).map((item) => item.id)).toEqual(['a']);
  expect(matchesClassification({ ...items[0], name: '任意新名称' }, ['pet'])).toBe(true);
  expect(matchesClassification(items[0], ['key'])).toBe(false);
  expect(matchesClassification(items[2], ['__unclassified__'])).toBe(true);
});
test('all raw items are selectable; filtering preserves selections and only confirmation writes', async () => {
  const save = vi.fn().mockResolvedValue(undefined);
  render(<MatrixItemTransfer items={items} selectedIds={['a']} dictionary={dictionary} onClose={vi.fn()} onSave={save} />);
  const left = screen.getByRole('region', { name: '未显示道具' });
  fireEvent.click(within(left).getByRole('button', { name: /破坏之石/ }));
  fireEvent.change(screen.getByLabelText('搜索道具'), { target: { value: '钥匙' } });
  fireEvent.click(screen.getByRole('button', { name: '移入 →' }));
  fireEvent.click(screen.getByRole('button', { name: '下一步确认' }));
  expect(screen.getByText(/新增列（1）：破坏之石/)).toBeInTheDocument();
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '确认保存显示列' }));
  expect(save).toHaveBeenCalledWith(['a', 'c']);
});
test('cancel does not save and empty selection can be explicitly saved', () => {
  const save = vi.fn().mockResolvedValue(undefined); const close = vi.fn();
  const view = render(<MatrixItemTransfer items={items} selectedIds={['a']} dictionary={dictionary} onClose={close} onSave={save} />);
  fireEvent.click(screen.getByRole('button', { name: '取消' })); expect(save).not.toHaveBeenCalled();
  view.unmount();
  render(<MatrixItemTransfer items={items} selectedIds={['a']} dictionary={dictionary} onClose={close} onSave={save} />);
  fireEvent.click(within(screen.getByRole('region', { name: '已显示道具' })).getByRole('button', { name: /多体系核心/ }));
  fireEvent.click(screen.getByRole('button', { name: '← 移出' }));
  fireEvent.click(screen.getByRole('button', { name: '下一步确认' }));
  fireEvent.click(screen.getByRole('button', { name: '确认保存显示列' }));
  expect(save).toHaveBeenCalledWith([]);
});
