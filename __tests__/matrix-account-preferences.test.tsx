import { beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import YieldsPage from '../app/yields/page';
import { dictionary } from './fixtures/classifications';
const auth = vi.fn();
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth() }));
const request = vi.fn();
let preferences: Record<string, string[] | null>;
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/yields');
  preferences = { a: [], b: ['core'] };
  auth.mockReturnValue({ user: { id: 'a', role: 'ADMIN' }, token: 'a', hasPermission: () => true });
  global.fetch = request;
  request.mockImplementation(async (url: string, init?: RequestInit) => {
    let data: unknown = [];
    if (url.includes('/item-classifications')) data = dictionary;
    else if (url.endsWith('/items')) data = [
      { id: 'core', name: '测试核心', categoryIds: ['equipment', 'pet'], resourceTypeId: 'core', type: 'RESOURCE' },
      { id: 'key', name: '测试钥匙', categoryIds: ['equipment'], resourceTypeId: 'key', type: 'KEY' },
    ];
    else if (url.includes('/sources')) data = [{ id: 'source', name: '测试来源', type: 'DAILY', category: '日常' }];
    else if (url.endsWith('/yields')) data = [
      { id: 'yield', itemId: 'core', sourceId: 'source', amount: 10, year: 2026, month: 10 },
      { id: 'key-yield', itemId: 'key', sourceId: 'source', amount: 1, year: 2026, month: 10 },
    ];
    else if (url.includes('/me/preferences/')) {
      const owner = new Headers(init?.headers).get('Authorization')?.replace('Bearer ', '') ?? 'a';
      if (init?.method === 'PUT') preferences[owner] = JSON.parse(String(init.body)).selectedItemIds;
      data = { selectedItemIds: preferences[owner] };
    }
    return { ok: true, json: async () => data };
  });
});

test('saved empty selection is respected; transfer changes only the authenticated preference and survives a fresh render', async () => {
  const view = render(<YieldsPage />);
  await screen.findByText('请通过管理显示道具选择资源');
  await waitFor(() => expect(screen.getByRole('button', { name: '管理显示道具' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: '管理显示道具' }));
  const left = screen.getByRole('region', { name: '未显示道具' });
  fireEvent.click(within(left).getByRole('button', { name: /测试钥匙/ }));
  fireEvent.click(screen.getByRole('button', { name: '移入 →' }));
  fireEvent.click(screen.getByRole('button', { name: '下一步确认' }));
  fireEvent.click(screen.getByRole('button', { name: '确认保存显示列' }));
  await waitFor(() => expect(preferences.a).toEqual(['key']));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.queryByText('测试核心', { exact: true })).not.toBeInTheDocument();
  expect(request.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
  view.unmount();
  render(<YieldsPage />);
  await screen.findByText('测试来源');
  await waitFor(() => expect(screen.getByText('测试钥匙', { exact: true })).toBeInTheDocument());
});

test('account change loads its own preference and multi-system core is counted once', async () => {
  const view = render(<YieldsPage />);
  await screen.findByText('请通过管理显示道具选择资源');
  auth.mockReturnValue({ user: { id: 'b', role: 'ADMIN' }, token: 'b', hasPermission: () => true });
  view.rerender(<YieldsPage />);
  await waitFor(() => expect(screen.getByText('测试核心', { exact: true })).toBeInTheDocument());
  await waitFor(() => expect(screen.queryByText('测试钥匙', { exact: true })).not.toBeInTheDocument());
  fireEvent.click(within(screen.getByRole('group', { name: '游戏资源维度' })).getByRole('button', { name: '宠物' }));
  await waitFor(() => expect(screen.getByRole('button', { name: '管理显示道具' })).toBeEnabled());
  expect(screen.getAllByText('测试核心', { exact: true })).toHaveLength(1);
  expect(screen.getByText('测试来源').closest('tr')!.querySelectorAll('td')[1]).toHaveTextContent('10');
  expect(preferences.a).toEqual([]);
});

test('preference fetch failure does not overwrite saved settings with defaults', async () => {
  const implementation = request.getMockImplementation()!;
  request.mockImplementation((url: string, init?: RequestInit) => url.includes('/me/preferences/') ? Promise.reject(new Error('配置读取失败')) : implementation(url, init));
  render(<YieldsPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('配置读取失败');
  expect(screen.getByRole('button', { name: '管理显示道具' })).toBeDisabled();
  expect(request.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(false);
});
