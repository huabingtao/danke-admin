import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { ItemClassificationDialog } from '../components/ItemClassificationDialog';
import { apiFetch } from '../lib/api-client';
import { dictionary } from './fixtures/classifications';
vi.mock('../lib/api-client', () => ({ apiFetch: vi.fn() }));

test('batch assignment reviews both systems and submits one atomic request only after confirmation', async () => {
  const save = vi.mocked(apiFetch); save.mockResolvedValue({ ok: true } as Response);
  const saved = vi.fn().mockResolvedValue(undefined); const close = vi.fn();
  render(<ItemClassificationDialog items={[{ id: 'a', name: '道具A' }, { id: 'b', name: '道具B' }]} dictionary={dictionary} token="token" onClose={close} onSaved={saved} />);
  fireEvent.click(screen.getByRole('button', { name: '设置一级分类' }));
  fireEvent.click(screen.getByRole('button', { name: '装备' }));
  fireEvent.click(screen.getByRole('button', { name: '宠物' }));
  fireEvent.click(screen.getByRole('button', { name: '下一步确认' }));
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByText('一级：装备、宠物')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '确认保存分类' }));
  await waitFor(() => expect(close).toHaveBeenCalled());
  expect(save).toHaveBeenCalledWith('/item-classifications/bulk', expect.objectContaining({ method: 'POST', token: 'token', body: JSON.stringify({ itemIds: ['a', 'b'], categoryIds: ['equipment', 'pet'] }) }));
});
test('classification save failure retains the review and permits correction', async () => {
  const save = vi.mocked(apiFetch); save.mockReset(); save.mockRejectedValue(new Error('没有权限'));
  render(<ItemClassificationDialog items={[{ id: 'a', name: '道具A' }]} dictionary={dictionary} token="token" onClose={vi.fn()} onSaved={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: '下一步确认' }));
  fireEvent.click(screen.getByRole('button', { name: '确认保存分类' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('没有权限');
  fireEvent.click(screen.getByRole('button', { name: '返回修改' }));
  expect(screen.getByRole('button', { name: '装备' })).toBeInTheDocument();
});
