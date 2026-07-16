import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import YieldsPage from '../app/yields/page';

// Mock next/navigation searchParams
const mockGet = vi.fn();
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: mockGet,
  }),
}));

// Mock Auth Context
const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Yields Page Categorization & Tab Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { username: '弹壳呱呱', role: 'ADMIN' },
      token: 'mock-token',
      hasPermission: () => true,
    });
  });

  test('loads dynamic categories, items, and filters columns by active subcategory tab', async () => {
    // 1. Mock URL query parameter `category=广告`
    mockGet.mockImplementation((key: string) => {
      if (key === 'category') return '广告';
      return null;
    });

    // 2. Setup mock fetch data for menus, items, sources, and yields
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/menus')) {
        return {
          ok: true,
          json: async () => [
            { id: 'm1', name: '广告', path: '/yields?category=广告', sort: 1 },
            { id: 'm2', name: '日常挑战', path: '/yields?category=日常挑战', sort: 2 },
          ],
        };
      }
      if (url.includes('/items')) {
        return {
          ok: true,
          json: async () => [
            { id: 'item_gems', name: '宝石', type: 'CURRENCY' },
            { id: 'item_keys', name: 'S钥匙', type: 'KEY' },
          ],
        };
      }
      if (url.includes('/sources')) {
        return {
          ok: true,
          json: async () => [
            { id: 's1', name: '每日广告', type: 'AD', category: '广告', subcategory: '每日' },
            { id: 's2', name: '每周广告', type: 'AD', category: '广告', subcategory: '每周' },
            { id: 's3', name: '日常挑战通关', type: 'DAILY_CHALLENGE', category: '日常挑战', subcategory: null },
          ],
        };
      }
      if (url.includes('/yields')) {
        return {
          ok: true,
          json: async () => [
            { id: 'y1', itemId: 'item_gems', sourceId: 's1', amount: 300, year: 2026, month: 7 },
            { id: 'y2', itemId: 'item_gems', sourceId: 's2', amount: 100, year: 2026, month: 7 },
          ],
        };
      }
      return { ok: false, json: async () => [] };
    });

    render(<YieldsPage />);

    // 3. Verify loading states clear and elements render by waiting for the dynamic columns to load
    await waitFor(() => {
      expect(screen.getByText('每日广告')).toBeInTheDocument();
    });

    // Verify subcategory tabs exist for '广告'
    expect(screen.getByText('每日')).toBeInTheDocument();
    expect(screen.getByText('每周')).toBeInTheDocument();

    // Verify '每周广告' column is initially NOT visible
    expect(screen.queryByText('每周广告')).not.toBeInTheDocument();

    // Verify initial values render correctly
    expect(screen.getAllByText('300').length).toBe(2);

    // 4. Click '每周' tab
    const weeklyTab = screen.getByText('每周');
    fireEvent.click(weeklyTab);

    // Verify '每周广告' column is now visible, and '每日广告' is hidden
    await waitFor(() => {
      expect(screen.getByText('每周广告')).toBeInTheDocument();
    });
    expect(screen.queryByText('每日广告')).not.toBeInTheDocument();

    // Verify Weekly value '100' is displayed
    expect(screen.getAllByText('100').length).toBe(2);
  });

  test('groups three mines under "矿洞挑战" tab and applies 3-choose-1 exclusion logic', async () => {
    // 1. Mock URL query parameter `category=每日活动`
    mockGet.mockImplementation((key: string) => {
      if (key === 'category') return '每日活动';
      return null;
    });

    // 2. Setup mock fetch data
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/menus')) {
        return {
          ok: true,
          json: async () => [
            { id: 'm1', name: '每日活动', path: '/yields?category=每日活动', sort: 1 },
          ],
        };
      }
      if (url.includes('/items')) {
        return {
          ok: true,
          json: async () => [
            { id: 'item_gems', name: '宝石', type: 'CURRENCY' },
          ],
        };
      }
      if (url.includes('/sources')) {
        return {
          ok: true,
          json: async () => [
            { id: 's_cookie', name: '饼干矿洞', type: 'DAILY_EVENT', category: '每日活动', subcategory: '矿洞挑战' },
            { id: 's_essence', name: '精华矿洞', type: 'DAILY_EVENT', category: '每日活动', subcategory: '矿洞挑战' },
            { id: 's_gold', name: '黄金矿洞', type: 'DAILY_EVENT', category: '每日活动', subcategory: '矿洞挑战' },
          ],
        };
      }
      if (url.includes('/yields')) {
        return {
          ok: true,
          json: async () => [
            // Gem has 200 in cookie mine, 0 in the others
            { id: 'y1', itemId: 'item_gems', sourceId: 's_cookie', amount: 200, year: 2026, month: 7 },
          ],
        };
      }
      return { ok: false, json: async () => [] };
    });

    render(<YieldsPage />);

    // 3. Wait for columns to load (indicating '矿洞挑战' subcategory is loaded)
    await waitFor(() => {
      expect(screen.getByText('饼干矿洞')).toBeInTheDocument();
    });

    expect(screen.getByText('精华矿洞')).toBeInTheDocument();
    expect(screen.getByText('黄金矿洞')).toBeInTheDocument();

    // 4. Verify that cookie mine has editable value "200"
    expect(screen.getAllByText('200').length).toBe(2);

    // 5. Verify that essence mine and gold mine cells render lock icons 🔒 because cookie mine has value > 0
    const locks = screen.getAllByText('🔒');
    expect(locks.length).toBe(2);

    // Verify cell values for locked cells contain "0" and the lock icon
    locks.forEach(lock => {
      const cell = lock.closest('td');
      expect(cell?.textContent).toContain('0');
    });

    // 6. Verify that double-clicking a locked cell (e.g. essence mine) does NOT trigger input field
    const essenceCell = locks[0].closest('td');
    expect(essenceCell).not.toBeNull();
    
    if (essenceCell) {
      fireEvent.doubleClick(essenceCell);
      const input = essenceCell.querySelector('input');
      expect(input).toBeNull(); // Input field should not render (locked)
    }

    // 7. Verify that double-clicking the unlocked cell (cookie mine) DOES trigger input field
    const cookieCell = screen.getAllByText('200')[0].closest('td');
    expect(cookieCell).not.toBeNull();

    if (cookieCell) {
      fireEvent.doubleClick(cookieCell);
      const input = cookieCell.querySelector('input');
      expect(input).not.toBeNull(); // Input field should render (unlocked)
    }
  });
});
