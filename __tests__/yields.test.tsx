import { dictionary } from './fixtures/classifications';
import { YIELD_COLUMN_ORDER_STORAGE_KEY, YIELD_ROW_ORDER_STORAGE_KEY, YIELD_VALUE_SORT_STORAGE_KEY } from '../lib/yield-column-order';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import YieldsPage from '../app/yields/page';
import { getItemIconUrl } from '../lib/item-icons';

// Mock Auth Context
const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = ((url: string, init?: RequestInit) => {
  if (String(url).includes('/item-classifications')) return Promise.resolve({ ok: true, json: async () => dictionary });
  if (String(url).includes('/me/preferences/yield-matrix')) return Promise.resolve({ ok: true, json: async () => ({ selectedItemIds: null }) });
  return mockFetch(url, init);
}) as typeof fetch;

describe('Yields Page Enhancements & Interactivity', () => {
  const mockItems = [
    { id: 'item_crystal', name: '觉醒水晶', categoryIds: ['agent'], resourceTypeId: 'material', type: 'CURRENCY', description: null },
    { id: 'item_keys', name: '高级钥匙', categoryIds: ['equipment', 'key'], resourceTypeId: 'key', type: 'KEY', description: null },
  ];

  const mockSources = [
    { id: 's_guangao', name: '广告', type: 'DAILY', category: '广告收益', subcategory: null, description: null },
    { id: 's_gonghui', name: '工会探索', type: 'WEEKLY', category: '工会系统', subcategory: null, description: null },
    { id: 's_richang', name: '日常挑战', type: 'DAILY', category: '日常挑战', subcategory: null, description: null },
  ];

  const mockYields = [
    { id: 'y1', itemId: 'item_crystal', sourceId: 's_gonghui', amount: 50, year: 2026, month: 8, notes: null },
    { id: 'y2', itemId: 'item_crystal', sourceId: 's_richang', amount: 200, year: 2026, month: 8, notes: null },
    { id: 'y3', itemId: 'item_crystal', sourceId: 's_guangao', amount: 10, year: 2026, month: 8, notes: null },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  window.history.replaceState(null, '', '/yields');
    localStorage.removeItem(YIELD_COLUMN_ORDER_STORAGE_KEY);
    localStorage.removeItem(YIELD_ROW_ORDER_STORAGE_KEY);
    localStorage.removeItem(YIELD_VALUE_SORT_STORAGE_KEY);
    mockUseAuth.mockReturnValue({
      user: { username: '弹壳呱呱', role: 'ADMIN' },
      token: 'mock-token',
      hasPermission: () => true,
    });

    mockFetch.mockImplementation(async (url: string, options?: any) => {
      if (url.includes('/items')) {
        return { ok: true, json: async () => mockItems };
      }
      if (url.includes('/sources') && (!options || options.method === 'GET' || !options.method)) {
        return { ok: true, json: async () => mockSources };
      }
      if (url.includes('/sources/') && options?.method === 'PATCH') {
        const body = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({ id: 's_guangao', name: body.name }),
        };
      }
      if (url.includes('/yields')) {
        return { ok: true, json: async () => mockYields };
      }
      return { ok: false, json: async () => [] };
    });
  });

  test('shows current snapshot without date controls or descriptive header text', async () => {
    render(<YieldsPage />);
    await screen.findByText('工会探索');
    expect(screen.getByRole('heading', { name: '基础资源获取大表' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByText(/全矩阵统计/)).not.toBeInTheDocument();
    expect(mockFetch.mock.calls.filter(([url]) => String(url).includes('/yields')).every(([url]) => !String(url).includes('?'))).toBe(true);
    expect(screen.getByAltText('S级军备钥匙')).toHaveAttribute('src', expect.stringContaining('/uploads/item-icons/'));
    expect(screen.getByAltText('武器核心')).toHaveAttribute('src', expect.stringContaining('/uploads/item-icons/'));
  });

  test('value sorting orders columns and export together, supports dragging and persists the selected direction', async () => {
    const valuedItems = [
      ...mockItems.map((item, index) => ({ ...item, gemValuation: { manuallyModified: false, prices: [{ id: 'default', label: '单价', value: index === 0 ? 15200 : 300 }] } })),
      { id: 'unknown', name: '未估值资源', type: 'RESOURCE', description: null },
    ];
    mockFetch.mockImplementation(async (url: string) => ({ ok: true, json: async () => url.includes('/items') ? valuedItems : url.includes('/sources') ? mockSources : mockYields }));
    const writeText = vi.fn().mockResolvedValue(undefined);
    const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    try {
      const view = render(<YieldsPage />);
      await screen.findByText('工会探索');
      const ids = () => screen.getAllByRole('columnheader').map((header) => header.getAttribute('data-column-id')).filter(Boolean);
      expect(ids()).toEqual(['item_crystal', 'item_keys', 'unknown']);
      fireEvent.click(screen.getByRole('button', { name: '价值：高 → 低' }));
      expect(ids()).toEqual(['item_keys', 'item_crystal', 'unknown']);
      fireEvent.click(screen.getByRole('button', { name: /导出 MD 表格/ }));
      expect(writeText.mock.calls[0][0].indexOf('高级钥匙')).toBeLessThan(writeText.mock.calls[0][0].indexOf('觉醒水晶'));
      const row = screen.getByText('工会探索').closest('tr')!;
      expect(row.querySelectorAll('td')[2]).toHaveTextContent('50');
      fireEvent.keyDown(screen.getByRole('button', { name: '拖动高级钥匙列调整顺序' }), { key: 'ArrowRight', altKey: true });
      expect(ids()).toEqual(['item_crystal', 'item_keys', 'unknown']);
      expect(screen.getByRole('button', { name: '按价值降序' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: '按价值降序' }));
      fireEvent.click(screen.getByRole('button', { name: '价值：高 → 低' }));
      view.unmount();
      render(<YieldsPage />);
      await screen.findByText('工会探索');
      await waitFor(() => expect(screen.getByRole('button', { name: '价值：低 → 高' })).toBeInTheDocument());
      expect(ids()).toEqual(['item_keys', 'item_crystal', 'unknown']);
      expect(mockFetch.mock.calls.every(([, init]) => !init?.method || init.method === 'GET')).toBe(true);
    } finally {
      if (original) Object.defineProperty(navigator, 'clipboard', original);
      else Reflect.deleteProperty(navigator, 'clipboard');
    }
  });

  test('saves edits to the latest existing snapshot instead of the calendar month', async () => {
    render(<YieldsPage />);
    await screen.findByText('工会探索');
    const row = screen.getByText('工会探索').closest('tr')!;
    fireEvent.doubleClick(row.querySelectorAll('td')[1]);
    const input = row.querySelector('input')!;
    fireEvent.change(input, { target: { value: '77' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => {
      const request = mockFetch.mock.calls.find(([url, init]) => String(url).endsWith('/yields') && init?.method === 'POST');
      expect(request).toBeDefined();
      expect(JSON.parse(request![1].body)).toMatchObject({ year: 2026, month: 8, amount: 77 });
    });
  });

  test('highlights only the selected category and removes the bottom instruction row', async () => {
    render(<YieldsPage />);
    await screen.findByText('工会探索');
    const all = screen.getByRole('button', { name: '全部' });
    const keys = screen.getByRole('button', { name: /^钥匙$/ });
    expect(all).toHaveAttribute('aria-pressed', 'true');
    expect(all).toHaveAttribute('data-variant', 'selected');
    fireEvent.click(keys);
    expect(keys).toHaveAttribute('aria-pressed', 'true');
    expect(keys).toHaveAttribute('data-variant', 'selected');
    expect(all).toHaveAttribute('aria-pressed', 'false');
    expect(all).toHaveAttribute('data-variant', 'outline');
    expect(screen.queryByText(/矩阵规模/)).not.toBeInTheDocument();
    expect(screen.queryByText(/提示：表格支持/)).not.toBeInTheDocument();
    expect(screen.queryByText('觉醒水晶')).not.toBeInTheDocument();
    expect(screen.getByText('高级钥匙')).toBeInTheDocument();
    fireEvent.click(all);
    expect(screen.getByText('觉醒水晶')).toBeInTheDocument();
  });

  test('omits the five removed columns from the matrix and Markdown without deleting data', async () => {
    const removed = ['史诗宠物', '史诗宠物宝箱', '随机传奇收藏品宝箱', '体力_能量', '传奇载具碎片'];
    mockFetch.mockImplementation(async (url: string) => ({ ok: true, json: async () =>
      url.includes('/items') ? [...mockItems, ...removed.map((name, index) => ({ id: `removed-${index}`, name, type: 'RESOURCE' }))]
        : url.includes('/sources') ? mockSources : mockYields,
    }));
    const writeText = vi.fn().mockResolvedValue(undefined);
    const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    try {
      render(<YieldsPage />);
      await screen.findByText('工会探索');
      for (const name of removed) expect(screen.queryByText(name, { exact: true })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /导出 MD 表格/ }));
      expect(writeText).toHaveBeenCalledTimes(1);
      for (const name of removed) expect(writeText.mock.calls[0][0]).not.toContain(name);
      expect(writeText.mock.calls[0][0]).toContain('觉醒水晶');
      expect(mockFetch.mock.calls.every(([, init]) => !init?.method || init.method === 'GET')).toBe(true);
    } finally {
      if (original) Object.defineProperty(navigator, 'clipboard', original);
      else Reflect.deleteProperty(navigator, 'clipboard');
    }
  });

  test('deduped canonical header still edits the original populated alias record', async () => {
    const aliasItems = [
      { id: 'core-old', name: '特工核心', type: 'RESOURCE', description: null },
      { id: 'core-alias', name: '特工觉醒核心', type: 'RESOURCE', description: null },
    ];
    const aliasYields = [{ id: 'core-yield', itemId: 'core-alias', sourceId: 's_gonghui', amount: 5, year: 2026, month: 8, notes: null }];
    mockFetch.mockImplementation(async (url: string) => ({ ok: true, json: async () =>
      url.includes('/items') ? aliasItems : url.includes('/sources') ? mockSources : aliasYields,
    }));
    render(<YieldsPage />);
    await screen.findByText('工会探索');
    expect(screen.getAllByText('特工核心')).toHaveLength(1);
    expect(screen.queryByText('特工觉醒核心')).not.toBeInTheDocument();
    const row = screen.getByText('工会探索').closest('tr')!;
    fireEvent.doubleClick(row.querySelectorAll('td')[1]);
    const input = row.querySelector('input')!;
    expect(input.value).toBe('5');
    fireEvent.change(input, { target: { value: '8' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => {
      const request = mockFetch.mock.calls.find(([url, init]) => String(url).endsWith('/yields') && init?.method === 'POST');
      expect(request).toBeDefined();
      expect(JSON.parse(request![1].body)).toMatchObject({ itemId: 'core-alias', amount: 8 });
    });
  });

  test('drags columns, preserves row values and export order, and restores saved order after remount', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    try {
      const view = render(<YieldsPage />);
      await screen.findByText('工会探索');
      const order = () => screen.getAllByRole('columnheader').map((header) => header.getAttribute('data-column-id')).filter(Boolean);
      expect(order()).toEqual(['item_keys', 'item_crystal']);
      const handle = screen.getByRole('button', { name: '拖动觉醒水晶列调整顺序' });
      const target = screen.getByRole('button', { name: '拖动高级钥匙列调整顺序' }).closest('th')!;
      const transfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
      fireEvent.click(handle);
      expect(screen.getByText(/A-Z/)).toBeInTheDocument();
      fireEvent.dragStart(handle, { dataTransfer: transfer });
      fireEvent.dragOver(target, { dataTransfer: transfer, clientX: 200 });
      fireEvent.drop(target, { dataTransfer: transfer });
      expect(order()).toEqual(['item_crystal', 'item_keys']);
      expect(JSON.parse(localStorage.getItem(YIELD_COLUMN_ORDER_STORAGE_KEY)!)).toEqual(['item_crystal', 'item_keys']);
      const row = screen.getByText('工会探索').closest('tr')!;
      expect(row.querySelectorAll('td')[1]).toHaveTextContent('50');
      fireEvent.click(screen.getByRole('button', { name: /导出 MD 表格/ }));
      expect(writeText.mock.calls[0][0].indexOf('觉醒水晶')).toBeLessThan(writeText.mock.calls[0][0].indexOf('高级钥匙'));
      fireEvent.click(screen.getByRole('button', { name: /^钥匙$/ }));
      expect(order()).toEqual(['item_keys']);
      fireEvent.click(screen.getByRole('button', { name: '全部' }));
      expect(order()).toEqual(['item_crystal', 'item_keys']);
      view.unmount();
      render(<YieldsPage />);
      await screen.findByText('工会探索');
      await waitFor(() => expect(order()).toEqual(['item_crystal', 'item_keys']));
      fireEvent.click(screen.getByRole('button', { name: '恢复默认列序' }));
      expect(order()).toEqual(['item_keys', 'item_crystal']);
      expect(localStorage.getItem(YIELD_COLUMN_ORDER_STORAGE_KEY)).toBeNull();
      expect(mockFetch.mock.calls.every(([, init]) => !init?.method || init.method === 'GET')).toBe(true);
    } finally {
      if (original) Object.defineProperty(navigator, 'clipboard', original);
      else Reflect.deleteProperty(navigator, 'clipboard');
    }
  });

  test('supports keyboard column moves even when browser storage cannot be written', async () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage disabled'); });
    try {
      render(<YieldsPage />);
      await screen.findByText('工会探索');
      fireEvent.keyDown(screen.getByRole('button', { name: '拖动觉醒水晶列调整顺序' }), { key: 'ArrowLeft', altKey: true });
      const headers = screen.getAllByRole('columnheader').map((header) => header.getAttribute('data-column-id')).filter(Boolean);
      expect(headers).toEqual(['item_crystal', 'item_keys']);
    } finally { spy.mockRestore(); }
  });

  test('getItemIconUrl generates correct path for item icons', () => {
    expect(getItemIconUrl('觉醒水晶')).toBe('/icons/items/%E8%A7%89%E9%86%92%E6%B0%B4%E6%99%B6.png');
    expect(getItemIconUrl('高级钥匙')).toBe('/icons/items/%E9%AB%98%E7%BA%A7%E9%92%A5%E5%8C%99.png');
  });

  test('does NOT display 派对/连锁礼包 in the sources table', async () => {
    render(<YieldsPage />);

    await waitFor(() => {
      expect(screen.getByText('工会探索')).toBeInTheDocument();
    });

    expect(screen.queryByText('派对/连锁礼包')).not.toBeInTheDocument();
  });

  test('renders item icons in table headers', async () => {
    render(<YieldsPage />);

    await waitFor(() => {
      expect(screen.getByText('觉醒水晶')).toBeInTheDocument();
    });

    const crystalImg = screen.getByAltText('觉醒水晶');
    expect(crystalImg).toBeInTheDocument();
    expect(crystalImg).toHaveAttribute('src', getItemIconUrl('觉醒水晶'));
  });

  test('supports double-clicking source name to edit and persist to database via PATCH /sources/:id', async () => {
    render(<YieldsPage />);

    await waitFor(() => {
      expect(screen.getByText('广告')).toBeInTheDocument();
    });

    fireEvent.doubleClick(screen.getByText('广告').closest('td')!);
    const input = screen.getByLabelText('名称');
    fireEvent.change(input, { target: { value: '超值广告福利' } });
    fireEvent.blur(input);
    expect(screen.getByRole('button', { name: '下一步确认' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '下一步确认' }));
    expect(mockFetch.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: '确认修改' }));

    // 4. Verify PATCH API was called with the updated source name and authorization header
    await waitFor(() => {
      const request = mockFetch.mock.calls.find(([url]) => String(url).includes('/sources/s_guangao'));
      expect(request).toBeDefined();
      const [url, init] = request as [string, RequestInit];
      const headers = new Headers(init.headers);
      expect(url).toContain('/sources/s_guangao');
      expect(init.method).toBe('PATCH');
      expect(headers.get('Content-Type')).toBe('application/json');
      expect(headers.get('Authorization')).toBe('Bearer mock-token');
      expect(init.body).toBe(JSON.stringify({ name: '超值广告福利' }));
    });
  });

  test('sorts sources by Chinese Pinyin first letter by default and toggles A-Z / Z-A', async () => {
    render(<YieldsPage />);

    await waitFor(() => {
      expect(screen.getByText('工会探索')).toBeInTheDocument();
    });

    // Pinyin order:
    // 工会探索 (G) -> 广告 (G) -> 日常挑战 (R)
    // Verify initial A-Z indicator
    expect(screen.getByText(/A-Z/)).toBeInTheDocument();

    // Click "获取途径 / 来源" header to toggle to Z-A
    const sourceHeader = screen.getByTitle(/点击切换途径名称拼音首字母排序/);
    fireEvent.click(sourceHeader);

    // After toggle, indicator should change to Z-A
    await waitFor(() => {
      expect(screen.getByText(/Z-A/)).toBeInTheDocument();
    });
  });

  test('allows sorting sources by resource column quantity when clicking header', async () => {
    render(<YieldsPage />);

    await waitFor(() => {
      expect(screen.getByText('觉醒水晶')).toBeInTheDocument();
    });

    // Click '觉醒水晶' header to sort by quantity descending
    const crystalHeader = screen.getByTitle(/点击按【觉醒水晶】产出数量排序/);
    fireEvent.click(crystalHeader);

    // Verify indicator shows sort active (from多到少)
    await waitFor(() => {
      expect(crystalHeader.getAttribute('title')).toContain('数量从多到少');
    });

    // Rows should be ordered by amount descending: 日常挑战(200) -> 工会探索(50) -> 广告(10)
    const rows = screen.getAllByRole('row');
    // First data row should have 日常挑战
    expect(rows[1].textContent).toContain('日常挑战');
  });
});
