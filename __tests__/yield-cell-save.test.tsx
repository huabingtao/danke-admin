import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import YieldsPage from '../app/yields/page';
import { apiFetch } from '../lib/api-client';
import { dictionary } from './fixtures/classifications';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ token: 'token', user: { id: 'owner', role: 'ADMIN' }, hasPermission: () => true }) }));
vi.mock('../lib/api-client', () => ({ apiFetch: vi.fn() }));
const request = vi.mocked(apiFetch);
const records = ['a', 'b'].map((id, index) => ({ id, itemId: 'key', sourceId: id.toUpperCase(), amount: (index + 1) * 10, year: 2026, month: 10, notes: null }));
const response = (data: unknown) => ({ ok: true, json: async () => data }) as Response;
const writes = () => request.mock.calls.filter(([, init]) => init?.method === 'POST');
const reads = () => request.mock.calls.filter(([path, init]) => path === '/yields' && !init?.method);
let submit: (body: Record<string, unknown>) => Promise<Response>;

beforeEach(() => {
  request.mockReset();
  localStorage.clear();
  window.history.replaceState(null, '', '/yields');
  submit = async (body) => response({ id: `saved-${body.sourceId}`, notes: null, ...body });
  request.mockImplementation(async (path, init) => {
    if (path === '/item-classifications') return response(dictionary);
    if (path.startsWith('/me/preferences')) return response({ selectedItemIds: null });
    if (path === '/items') return response([{ id: 'key', name: '高级钥匙', type: 'KEY', categoryIds: ['key', 'equipment'] }]);
    if (path === '/sources') return response(['A', 'B', 'C'].map((id) => ({ id, name: `来源${id}`, type: 'DAILY', category: '日常' })));
    if (path === '/yields' && init?.method === 'POST') return submit(JSON.parse(String(init.body)));
    if (path === '/yields') return response(records);
    throw new Error(`Unexpected request: ${path}`);
  });
});

async function open() {
  render(<YieldsPage />);
  await screen.findByText('来源A');
  await waitFor(() => expect(screen.getByRole('button', { name: '管理显示道具' })).toBeEnabled());
}
const cell = (source: string) => screen.getByText(`来源${source}`).closest('tr')!.querySelectorAll('td')[1];
function edit(source: string, value: string) {
  fireEvent.doubleClick(cell(source));
  const input = screen.getByRole('spinbutton', { name: `来源${source}的高级钥匙产出数量` });
  fireEvent.change(input, { target: { value } });
  return input;
}

test('updates only the saved record from the response; keeps the table mounted, scroll, filters, totals and export consistent', async () => {
  let finish!: (value: Response) => void;
  submit = () => new Promise((resolve) => { finish = resolve; });
  const write = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: write } });
  await open();
  fireEvent.change(screen.getByPlaceholderText('搜索获取途径...'), { target: { value: '来源A' } });
  const scroll = screen.getByLabelText('资源产出表格滚动区域');
  const table = screen.getByRole('table');
  scroll.scrollTop = 125; scroll.scrollLeft = 600;
  const initialReads = reads().length;
  const input = edit('A', '12.345');
  fireEvent.keyDown(input, { key: 'Enter' });
  fireEvent.blur(input);
  await waitFor(() => expect(writes()).toHaveLength(1));
  expect(cell('A')).toHaveAttribute('aria-busy', 'true');
  expect(input).toBeDisabled();
  expect(screen.getByRole('table')).toBe(table);
  await act(async () => finish(response({ ...records[0], amount: 12.34 })));
  await waitFor(() => expect(cell('A')).toHaveTextContent('12.34'));
  expect(screen.getByRole('table')).toBe(table);
  expect(scroll.scrollTop).toBe(125); expect(scroll.scrollLeft).toBe(600);
  expect(reads()).toHaveLength(initialReads);
  expect(screen.getByPlaceholderText('搜索获取途径...')).toHaveValue('来源A');
  expect(screen.getByText('合计 (Total)').closest('tr')!.querySelectorAll('td')[1]).toHaveTextContent('12.34');
  fireEvent.click(screen.getByRole('button', { name: /导出 MD 表格/ }));
  expect(write.mock.calls[0][0]).toContain('| 来源A | 12.34 |');
  expect(write.mock.calls[0][0]).not.toContain('来源B');
});

test('new records update locally without a list reload, including overview and totals', async () => {
  await open();
  fireEvent.click(screen.getByRole('checkbox', { name: '仅看有产出途径' }));
  const input = edit('C', '5');
  fireEvent.blur(input);
  await waitFor(() => expect(cell('C')).toHaveTextContent('5'));
  expect(screen.getByText('合计 (Total)').closest('tr')!.querySelectorAll('td')[1]).toHaveTextContent('35');
  expect(reads()).toHaveLength(1);
});

test('failed save retains the old value and draft, allows retry and ignores malformed acknowledgements', async () => {
  submit = async () => { throw new Error('权限不足'); };
  await open();
  let input = edit('A', '77');
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(await screen.findByRole('alert')).toHaveTextContent('权限不足');
  expect(input).toHaveValue(77);
  await waitFor(() => expect(input).toBeEnabled());
  submit = async () => response({});
  fireEvent.keyDown(input, { key: 'Enter' });
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('保存结果异常'));
  fireEvent.doubleClick(cell('B'));
  fireEvent.doubleClick(cell('A'));
  input = screen.getByRole('spinbutton');
  expect(input).toHaveValue(77);
  submit = async (body) => response({ ...records[0], ...body });
  fireEvent.keyDown(input, { key: 'Enter' });
  await waitFor(() => expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument());
  expect(cell('A')).toHaveTextContent('77');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(reads()).toHaveLength(1);
});

test('unchanged values and Escape do not submit, and cancelled drafts do not reappear', async () => {
  await open();
  let input = edit('A', '10');
  fireEvent.blur(input);
  expect(writes()).toHaveLength(0);
  input = edit('A', '88');
  fireEvent.keyDown(input, { key: 'Escape' });
  fireEvent.blur(input);
  expect(writes()).toHaveLength(0);
  input = edit('A', '10');
  expect(input).toHaveValue(10);
});

test('saving one cell never closes another editor and independently completed saves retain both values', async () => {
  const finish = new Map<string, (response: Response) => void>();
  submit = (body) => new Promise((resolve) => { finish.set(String(body.sourceId), resolve); });
  await open();
  const first = edit('A', '11');
  fireEvent.keyDown(first, { key: 'Enter' });
  const second = edit('B', '22');
  await waitFor(() => expect(finish.has('A')).toBe(true));
  await act(async () => finish.get('A')!(response({ ...records[0], amount: 11 })));
  expect(screen.getByRole('spinbutton')).toBe(second);
  expect(second).toHaveValue(22);
  fireEvent.keyDown(second, { key: 'Enter' });
  await waitFor(() => expect(finish.has('B')).toBe(true));
  await act(async () => finish.get('B')!(response({ ...records[1], amount: 22 })));
  expect(cell('A')).toHaveTextContent('11'); expect(cell('B')).toHaveTextContent('22');
  expect(reads()).toHaveLength(1);
});
