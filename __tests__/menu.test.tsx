import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import MenusPage from '../app/menus/page';

// Mock Auth Context
const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock next/navigation
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Menus Page Role-Based Access Control (RBAC) & Render', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('redirects ASSISTANT role to home page', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        username: '助理小白',
        role: 'ASSISTANT',
      },
      isLoading: false,
    });

    render(<MenusPage />);

    // Verify router redirect is called
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  test('renders Menus page for ADMIN role and fetches list', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        username: '弹壳呱呱',
        role: 'ADMIN',
      },
      isLoading: false,
    });

    // Mock API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: '1', name: '每日产出', path: '/yields?type=DAILY', sort: 1 },
        { id: '2', name: '每周产出', path: '/yields?type=WEEKLY', sort: 2 },
      ],
    });

    render(<MenusPage />);

    // Verify title and add button are rendered
    expect(screen.getByText('导航菜单管理')).toBeInTheDocument();
    expect(screen.getByText('+ 新增导航菜单')).toBeInTheDocument();

    // Verify fetch is called
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Verify loaded menu rows
    await waitFor(() => {
      expect(screen.getByText('每日产出')).toBeInTheDocument();
      expect(screen.getByText('每周产出')).toBeInTheDocument();
    });
  });
});
