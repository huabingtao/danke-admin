import { beforeEach, expect, test, vi } from 'vitest';
import { apiFetch, ApiError } from '../lib/api-client';
import { importWebItems } from '../lib/import-web-items';

vi.mock('../lib/web-item-catalog.json', () => ({ default: [
  { name: '金币', icon: '/uploads/item-icons/a.png' },
  { name: '钻石', icon: '/uploads/item-icons/b.png' },
  { name: '钥匙', icon: '/uploads/item-icons/c.png' },
] }));
vi.mock('../lib/api-client', () => ({ apiFetch: vi.fn(), ApiError: class extends Error { constructor(message: string, public status: number) { super(message); } } }));
const request = vi.mocked(apiFetch);
const response = (data: unknown) => ({ json: async () => data }) as Response;
beforeEach(() => vi.clearAllMocks());

test('preserves custom icons, updates defaults and creates missing names using authenticated API', async () => {
  request.mockResolvedValueOnce(response([
    { id: '1', name: '金币', icon: 'https://custom.example/gold.png' },
    { id: '2', name: '钻石', icon: '/icons/items/钻石.png' },
  ])).mockResolvedValueOnce(response({ id: '2', name: '钻石' })).mockResolvedValueOnce(response({ id: '3', name: '钥匙' }));
  const result = await importWebItems('test-token');
  expect(result.skipped).toBe(1);
  expect(result.created).toEqual([{ id: '3', name: '钥匙' }]);
  expect(result.updated[0].previousIcon).toBe('/icons/items/钻石.png');
  expect(request).toHaveBeenNthCalledWith(2, '/items/2', expect.objectContaining({ method: 'PATCH', token: 'test-token' }));
  expect(request).toHaveBeenNthCalledWith(3, '/items', expect.objectContaining({ method: 'POST', token: 'test-token' }));
});

test('repeated import skips already served icons without writes', async () => {
  request.mockResolvedValueOnce(response(['金币', '钻石', '钥匙'].map((name, i) => ({ id: String(i), name, icon: '/uploads/item-icons/done.png' }))));
  expect((await importWebItems('test-token')).skipped).toBe(3);
  expect(request).toHaveBeenCalledTimes(1);
});

test('stops on permission failure and reports partial progress', async () => {
  request.mockResolvedValueOnce(response([])).mockResolvedValueOnce(response({ id: '1', name: '金币' })).mockRejectedValueOnce(new ApiError('禁止', 403));
  const result = await importWebItems('test-token');
  expect(result.created).toHaveLength(1);
  expect(result.failed).toHaveLength(1);
  expect(request).toHaveBeenCalledTimes(3);
});

test('known aliases use the existing canonical item instead of recreating duplicates', async () => {
  request.mockResolvedValueOnce(response([
    { id: '1', name: '金币正式名称', aliases: ['金币'], icon: '/uploads/item-icons/gold.png' },
    { id: '2', name: '钻石', icon: '/uploads/item-icons/diamond.png' },
    { id: '3', name: '钥匙', icon: '/uploads/item-icons/key.png' },
  ]));
  const result = await importWebItems('test-token');
  expect(result.skipped).toBe(3);expect(result.created).toHaveLength(0);expect(request).toHaveBeenCalledTimes(1);
});
