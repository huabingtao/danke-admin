import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import YieldsPage from '../app/yields/page';
import { dictionary } from './fixtures/classifications';
const request = vi.fn();
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner', role: 'ADMIN' }, token: 'token', hasPermission: () => true }) }));
let prefs: Record<string, string[] | null>;
const items = [
  { id: 'agent-core', name: '特工核心', categoryIds: ['core', 'agent', 'pet'], resourceTypeId: 'core' },
  { id: 'gear-core', name: '神器核心', categoryIds: ['core', 'equipment'], resourceTypeId: 'core' },
  { id: 'key', name: '高级钥匙', categoryIds: ['equipment'], resourceTypeId: 'key' },
];
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); window.history.replaceState(null, '', '/yields'); prefs = { all: [] };
  global.fetch = request;
  request.mockImplementation(async (url: string, init?: RequestInit) => {
    let data: unknown = [];
    if (url.includes('/item-classifications')) data = dictionary;
    else if (url.endsWith('/items')) data = items;
    else if (url.endsWith('/sources')) data = ['A', 'B', 'C'].map((id) => ({ id, name: `来源${id}`, type: 'DAILY', category: '日常' }));
    else if (url.endsWith('/yields')) data = [
      { id: 'a', itemId: 'agent-core', sourceId: 'A', amount: 10, year: 2026, month: 10 },
      { id: 'b', itemId: 'agent-core', sourceId: 'B', amount: 20, year: 2026, month: 10 },
      { id: 'c', itemId: 'gear-core', sourceId: 'A', amount: 5, year: 2026, month: 10 },
      { id: 'd', itemId: 'key', sourceId: 'C', amount: 8, year: 2026, month: 10 },
    ];
    else if (url.includes('/me/preferences/')) {
      let view = new URL(url).searchParams.get('viewId') ?? 'all';
      if (init?.method === 'PUT') { const body = JSON.parse(String(init.body)); view = body.viewId; prefs[view] = body.selectedItemIds; }
      data = { selectedItemIds: prefs[view] ?? null };
    }
    return { ok: true, json: async () => data };
  });
});
afterEach(() => { window.history.replaceState(null, '', '/yields'); vi.restoreAllMocks(); });
async function selectView(name: string) {
  fireEvent.click(within(screen.getByRole('group', { name: '游戏资源维度' })).getByRole('button', { name }));
  await waitFor(() => expect(screen.getByRole('button', { name: '管理显示道具' })).toBeEnabled());
}
test('hiding all columns in all does not hide them in agent or cores; search totals and export match visible sources', async () => {
  const write = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: write } });
  render(<YieldsPage />);
  await screen.findByText('请通过管理显示道具选择资源');
  await selectView('特工');
  expect(screen.getAllByText('特工核心', { exact: true })).toHaveLength(1);
  expect(screen.queryByText('神器核心', { exact: true })).not.toBeInTheDocument();
  expect(screen.queryByText('来源C')).not.toBeInTheDocument();
  const totalRow = () => screen.getByText('合计 (Total)').closest('tr')!;
  expect(totalRow().querySelectorAll('td')[1]).toHaveTextContent('30');
  fireEvent.change(screen.getByPlaceholderText('搜索获取途径...'), { target: { value: '来源A' } });
  expect(totalRow().querySelectorAll('td')[1]).toHaveTextContent('10');
  fireEvent.click(screen.getByRole('button', { name: /导出 MD 表格/ }));
  expect(write.mock.calls[0][0]).toContain('来源A'); expect(write.mock.calls[0][0]).not.toContain('来源B');
  expect(write.mock.calls[0][0]).toContain('**10**');
  await selectView('核心');
  expect(screen.getByPlaceholderText('搜索获取途径...')).toHaveValue('');
  expect(screen.getByText('来源B')).toBeInTheDocument();
  expect(screen.getByText('神器核心', { exact: true })).toBeInTheDocument();
  expect(screen.queryByText('高级钥匙', { exact: true })).not.toBeInTheDocument();
  expect(request.mock.calls.some(([, init]) => ['PATCH', 'DELETE', 'POST'].includes(init?.method))).toBe(false);
});
test('saved agent empty preference does not affect pet view and deep links open the requested view', async () => {
  window.history.replaceState(null, '', '/yields?view=agent');
  render(<YieldsPage />);
  await waitFor(() => expect(screen.getByRole('button', { name: '管理显示道具' })).toBeEnabled());
  await screen.findByText('特工核心', { exact: true });
  await waitFor(() => expect(within(screen.getByRole('group', { name: '游戏资源维度' })).getByRole('button', { name: '特工' })).toHaveAttribute('aria-pressed', 'true'));
  await waitFor(() => expect(screen.getByRole('button', { name: '管理显示道具' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: '管理显示道具' }));
  fireEvent.click(within(screen.getByRole('region', { name: '已显示道具' })).getByRole('button', { name: /特工核心/ }));
  fireEvent.click(screen.getByRole('button', { name: '← 移出' }));
  fireEvent.click(screen.getByRole('button', { name: '下一步确认' }));
  fireEvent.click(screen.getByRole('button', { name: '确认保存显示列' }));
  await waitFor(() => expect(prefs.agent).toEqual([]));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await selectView('宠物'); expect(screen.getByText('特工核心', { exact: true })).toBeInTheDocument();
  await selectView('特工'); await screen.findByText('请通过管理显示道具选择资源');
});
