import { dictionary } from './fixtures/classifications';
import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import YieldsPage from '../app/yields/page';
import { YIELD_ROW_ORDER_STORAGE_KEY } from '../lib/yield-column-order';

const auth = vi.fn();
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth() }));
const fetchMock = vi.fn();
let items: { id: string; name: string; type: string; description: null }[];
let sources: { id: string; name: string; type: string; category: string; description: null; subcategory: null }[];
let records: { id: string; itemId: string; sourceId: string; amount: number; year: number; month: number; notes: null }[];
let downloaded: Blob[];
const mutations = () => fetchMock.mock.calls.filter(([, init]) => ['PATCH', 'DELETE'].includes(init?.method));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/yields');
  auth.mockReturnValue({ user: { role: 'ADMIN' }, token: 'test-token', hasPermission: () => true });
  items = [{ id: 'item', name: '金币', type: 'RESOURCE', description: null }];
  sources = [
    { id: 'a', name: '来源A', type: 'DAILY', category: '日常', description: null, subcategory: null },
    { id: 'b', name: '来源B', type: 'DAILY', category: '日常', description: null, subcategory: null },
  ];
  records = [
    { id: 'old', itemId: 'item', sourceId: 'a', amount: 2, year: 2026, month: 8, notes: null },
    { id: 'new', itemId: 'item', sourceId: 'a', amount: 7, year: 2026, month: 10, notes: null },
    { id: 'bnew', itemId: 'item', sourceId: 'b', amount: 1, year: 2026, month: 10, notes: null },
  ];
  downloaded = [];
  URL.createObjectURL = vi.fn((blob: Blob) => { downloaded.push(blob); return 'blob:backup'; });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  global.fetch = fetchMock;
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (url.includes('/item-classifications')) return { ok: true, json: async () => dictionary };
    if (url.includes('/me/preferences/yield-matrix')) return { ok: true, json: async () => ({ selectedItemIds: null }) };
    const method = init?.method ?? 'GET';
    const isSource = url.includes('/sources');
    const id = url.split('/').at(-1);
    if (method === 'PATCH') {
      const body = JSON.parse(String(init?.body));
      if (isSource) {
        sources = sources.map((source) => source.id === id ? { ...source, ...body } : source);
        return { ok: true, json: async () => sources.find((source) => source.id === id) };
      }
      items = items.map((item) => item.id === id ? { ...item, ...body } : item);
      return { ok: true, json: async () => items.find((item) => item.id === id) };
    }
    if (method === 'DELETE') {
      if (isSource) sources = sources.filter((source) => source.id !== id);
      else items = items.filter((item) => item.id !== id);
      return { ok: true, json: async () => ({ id }) };
    }
    return { ok: true, json: async () => url.includes('/items') ? items : isSource ? sources : records };
  });
});
afterEach(() => vi.restoreAllMocks());

async function openPage() {
  const view = render(<YieldsPage />);
  await screen.findByText('来源A');
  return view;
}

test('row drag persists across remount, preserves values and does not mutate server records', async () => {
  const view = await openPage();
  const handle = screen.getByRole('button', { name: '拖动来源B行调整顺序' });
  const target = screen.getByText('来源A').closest('tr')!;
  const transfer = { setData: vi.fn(), effectAllowed: '' };
  fireEvent.dragStart(handle, { dataTransfer: transfer });
  fireEvent.dragOver(target, { dataTransfer: transfer });
  fireEvent.drop(target, { dataTransfer: transfer });
  const ids = () => screen.getAllByRole('row').map((row) => row.getAttribute('data-source-id')).filter(Boolean);
  expect(ids()).toEqual(['b', 'a']);
  expect(screen.getByText('来源A').closest('tr')!.querySelectorAll('td')[1]).toHaveTextContent('7');
  expect(JSON.parse(localStorage.getItem(YIELD_ROW_ORDER_STORAGE_KEY)!)).toEqual(['b', 'a']);
  expect(mutations()).toHaveLength(0);
  view.unmount();
  await openPage();
  await waitFor(() => expect(ids()).toEqual(['b', 'a']));
  fireEvent.click(screen.getByRole('button', { name: '恢复默认行序' }));
  expect(ids()).toEqual(['a', 'b']);
});

for (const kind of ['行', '列'] as const) {
  test(`${kind} rename requires review, allows cancellation and only saves on final confirmation`, async () => {
    await openPage();
    const oldName = kind === '行' ? '来源A' : '金币';
    fireEvent.click(screen.getByRole('button', { name: `编辑${oldName}${kind}名称` }));
    fireEvent.change(screen.getByLabelText('名称'), { target: { value: '新名称' } });
    fireEvent.click(screen.getByRole('button', { name: '下一步确认' }));
    expect(screen.getByText(`原名称：${oldName}`)).toBeInTheDocument();
    expect(screen.getByText('新名称：新名称')).toBeInTheDocument();
    expect(mutations()).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(mutations()).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: `编辑${oldName}${kind}名称` }));
    fireEvent.change(screen.getByLabelText('名称'), { target: { value: '新名称' } });
    fireEvent.click(screen.getByRole('button', { name: '下一步确认' }));
    fireEvent.click(screen.getByRole('button', { name: '确认修改' }));
    await screen.findByText('新名称');
    expect(mutations()).toHaveLength(1);
    expect(mutations()[0][1].method).toBe('PATCH');
    expect(new Headers(mutations()[0][1].headers).get('Authorization')).toBe('Bearer test-token');
  });

  test(`${kind} delete warns about all periods and backs up before confirmed deletion`, async () => {
    await openPage();
    const name = kind === '行' ? '来源A' : '金币';
    fireEvent.click(screen.getByRole('button', { name: `删除${name}${kind}` }));
    expect(screen.getByText(/所有月份关联的产出记录/)).toBeInTheDocument();
    expect(mutations()).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(mutations()).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: `删除${name}${kind}` }));
    fireEvent.click(screen.getByRole('button', { name: '备份并确认删除' }));
    await waitFor(() => expect(mutations()).toHaveLength(1));
    expect(downloaded).toHaveLength(1);
    const backupText = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(downloaded[0]);
    });
    expect(JSON.parse(backupText).yields.map((record: { id: string }) => record.id)).toEqual(kind === '行' ? ['old', 'new'] : ['old', 'new', 'bnew']);
    // API backup read follows initial page load and occurs before the DELETE.
    const deleteIndex = fetchMock.mock.calls.findIndex(([, init]) => init?.method === 'DELETE');
    expect(fetchMock.mock.calls[deleteIndex - 1][0]).toContain('/yields');
    await waitFor(() => expect(screen.queryByText(name, { exact: true })).not.toBeInTheDocument());
  });
}

test('assistants without edit permissions cannot access rename/delete actions', async () => {
  auth.mockReturnValue({ user: { role: 'ASSISTANT' }, token: 'readonly', hasPermission: () => false });
  await openPage();
  expect(screen.queryByRole('button', { name: /编辑.*名称/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /删除.*[行列]/ })).not.toBeInTheDocument();
  fireEvent.doubleClick(screen.getByText('来源A').closest('td')!);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(mutations()).toHaveLength(0);
});


test('backup read failure prevents deletion and leaves the confirmation available', async () => {
  await openPage();
  fireEvent.click(screen.getByRole('button', { name: '删除来源A行' }));
  fetchMock.mockRejectedValueOnce(new Error('无法读取备份'));
  fireEvent.click(screen.getByRole('button', { name: '备份并确认删除' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('无法读取备份');
  expect(mutations()).toHaveLength(0);
  expect(downloaded).toHaveLength(0);
  expect(screen.getByRole('button', { name: '备份并确认删除' })).toBeEnabled();
});

test('failed rename keeps the original name and permits retry after confirmation', async () => {
  await openPage();
  fireEvent.click(screen.getByRole('button', { name: '编辑金币列名称' }));
  fireEvent.change(screen.getByLabelText('名称'), { target: { value: '资源金币' } });
  fireEvent.click(screen.getByRole('button', { name: '下一步确认' }));
  fetchMock.mockRejectedValueOnce(new Error('名称已存在'));
  fireEvent.click(screen.getByRole('button', { name: '确认修改' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('名称已存在');
  expect(items[0].name).toBe('金币');
  fireEvent.click(screen.getByRole('button', { name: '确认修改' }));
  await screen.findByText('资源金币');
});

test('column delete includes unused aliases and a partial failure can retry the remaining member', async () => {
  items = [
    { id: 'core-old', name: '特工核心', type: 'RESOURCE', description: null },
    { id: 'core-alias', name: '特工觉醒核心', type: 'RESOURCE', description: null },
  ];
  records = [{ id: 'core-yield', itemId: 'core-old', sourceId: 'a', amount: 5, year: 2026, month: 10, notes: null }];
  await openPage();
  fireEvent.click(screen.getByRole('button', { name: '删除特工核心列' }));
  expect(screen.getByText(/包含同一列的旧名称和别名/)).toBeInTheDocument();
  const implementation = fetchMock.getMockImplementation()!;
  let fail = true;
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (url.endsWith('/items/core-alias') && init?.method === 'DELETE' && fail) {
      fail = false;
      throw new Error('暂时无法删除别名');
    }
    return implementation(url, init);
  });
  fireEvent.click(screen.getByRole('button', { name: '备份并确认删除' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('暂时无法删除别名');
  fireEvent.click(screen.getByRole('button', { name: '备份并确认删除' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(mutations().filter(([url]) => String(url).endsWith('/items/core-old'))).toHaveLength(1);
  expect(mutations().filter(([url]) => String(url).endsWith('/items/core-alias'))).toHaveLength(2);
});
