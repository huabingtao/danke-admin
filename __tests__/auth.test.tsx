import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ItemsPage from '../app/items/page';

// Mock Auth Context
const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockItems = [
  { id: '1', name: 'S钥匙', type: 'KEY', description: '用于开启S级军备宝箱', stats: '{"description":"无直接战斗加成"}' },
  { id: '2', name: '宝石', type: 'CURRENCY', description: '游戏内核心代币', stats: '{"description":"游戏代币"}' },
];

describe('Items Page Role-Based Access Control (RBAC)', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockItems,
    } as any);
  });

  test('renders full CRUD operations for ADMIN role', async () => {
    // Mock user as ADMIN
    mockUseAuth.mockReturnValue({
      user: {
        username: '弹壳呱呱',
        role: 'ADMIN',
      },
      hasPermission: () => true,
    });

    render(<ItemsPage />);

    // Verify addition button is visible
    expect(screen.getByTestId('add-item-btn')).toBeInTheDocument();

    // Verify delete button is visible
    expect(await screen.findByTestId('delete-btn-1')).toBeInTheDocument();

    // Verify edit button is visible
    expect(await screen.findByTestId('edit-btn-1')).toBeInTheDocument();

    // Verify Read-Only badge is NOT visible
    expect(screen.queryByText('🔒 助理只读模式')).not.toBeInTheDocument();
  });

  test('hides write/delete operations for ASSISTANT role', async () => {
    // Mock user as ASSISTANT
    mockUseAuth.mockReturnValue({
      user: {
        username: '助理小白',
        role: 'ASSISTANT',
      },
      hasPermission: (code: string) => code !== 'item:create' && code !== 'item:delete',
    });

    render(<ItemsPage />);

    // Verify addition button is hidden
    expect(screen.queryByTestId('add-item-btn')).not.toBeInTheDocument();

    // Wait for item to appear, verify delete & edit button are hidden
    expect(await screen.findByText('S钥匙')).toBeInTheDocument();
    expect(screen.queryByTestId('delete-btn-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('edit-btn-1')).not.toBeInTheDocument();

    // Verify Read-Only badge is visible
    expect(screen.getByText('🔒 助理只读模式')).toBeInTheDocument();
  });
});

