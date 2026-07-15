import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ItemsPage from '../app/items/page';

// Mock Auth Context
const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('Items Page Role-Based Access Control (RBAC)', () => {
  test('renders full CRUD operations for ADMIN role', () => {
    // Mock user as ADMIN
    mockUseAuth.mockReturnValue({
      user: {
        username: '弹壳呱呱',
        role: 'ADMIN',
      },
    });

    render(<ItemsPage />);

    // Verify addition button is visible
    expect(screen.getByTestId('add-item-btn')).toBeInTheDocument();

    // Verify delete button is visible
    expect(screen.getByTestId('delete-btn-1')).toBeInTheDocument();

    // Verify Read-Only badge is NOT visible
    expect(screen.queryByText('🔒 助理只读模式')).not.toBeInTheDocument();
  });

  test('hides write/delete operations for ASSISTANT role', () => {
    // Mock user as ASSISTANT
    mockUseAuth.mockReturnValue({
      user: {
        username: '助理小白',
        role: 'ASSISTANT',
      },
    });

    render(<ItemsPage />);

    // Verify addition button is hidden
    expect(screen.queryByTestId('add-item-btn')).not.toBeInTheDocument();

    // Verify delete button is hidden
    expect(screen.queryByTestId('delete-btn-1')).not.toBeInTheDocument();

    // Verify Read-Only badge is visible
    expect(screen.getByText('🔒 助理只读模式')).toBeInTheDocument();
  });
});
