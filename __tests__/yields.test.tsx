import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import YieldsPage, { getItemIconUrl } from '../app/yields/page';

// Mock Auth Context
const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Yields Page Enhancements & Interactivity', () => {
  const mockItems = [
    { id: 'item_crystal', name: '觉醒水晶', type: 'CURRENCY', description: null },
    { id: 'item_keys', name: '高级钥匙', type: 'KEY', description: null },
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

    // 1. Double click on the cell containing '广告'
    const sourceText = screen.getByText('广告');
    const sourceCell = sourceText.closest('td');
    expect(sourceCell).not.toBeNull();

    fireEvent.doubleClick(sourceCell!);

    // 2. An input should now appear in the cell
    const input = sourceCell!.querySelector('input');
    expect(input).not.toBeNull();
    expect(input?.value).toBe('广告');

    // 3. Type new name and press Enter to save
    fireEvent.change(input!, { target: { value: '超值广告福利' } });
    fireEvent.keyDown(input!, { key: 'Enter' });

    // 4. Verify PATCH API was called with the updated source name and authorization header
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/sources/s_guangao'),
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token',
          }),
          body: JSON.stringify({ name: '超值广告福利' }),
        })
      );
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
