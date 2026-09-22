import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ItemsPage, { getItemDisplayIcon, PRESET_ITEM_ICONS } from '../app/items/page';

// Mock AuthContext
const mockUseAuth = vi.fn();
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock api helper
vi.mock('@/lib/api', () => ({
  getApiBase: () => 'http://localhost:3000',
}));

describe('ItemsPage & Item Icon Configuration Workflow Tests', () => {
  const mockItems = [
    {
      id: 'item-1',
      name: 's杰出装备',
      icon: '/icons/items/s杰出装备.png',
      type: 'EQUIPMENT',
    },
    {
      id: 'item-2',
      name: '觉醒水晶',
      icon: null,
      type: 'RESOURCE',
    },
    {
      id: 'item-3',
      name: '自定义OSS道具',
      icon: 'https://my-cos.myqcloud.com/icons/custom.png',
      type: 'SPECIAL',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'admin-1', role: 'ADMIN', username: 'admin' },
      token: 'fake-jwt-token',
      hasPermission: () => true,
    });

    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      const method = (options?.method || 'GET').toUpperCase();
      if (url.endsWith('/items') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: async () => mockItems,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
      });
    });
  });

  it('getItemDisplayIcon correctly returns configured icon or falls back to standard path', () => {
    expect(getItemDisplayIcon({ name: 's杰出装备', icon: '/icons/items/s杰出装备.png' })).toBe(
      '/icons/items/s杰出装备.png'
    );
    expect(getItemDisplayIcon({ name: '觉醒水晶', icon: null })).toBe(
      '/icons/items/%E8%A7%89%E9%86%92%E6%B0%B4%E6%99%B6.png'
    );
    expect(
      getItemDisplayIcon({ name: '自定义道具', icon: 'https://my-cos.myqcloud.com/icons/custom.png' })
    ).toBe('https://my-cos.myqcloud.com/icons/custom.png');
  });

  it('renders item list with thumbnail column and compact action buttons on a single row', async () => {
    render(<ItemsPage />);

    // Wait for items to load
    await waitFor(() => {
      expect(screen.getByText('s杰出装备')).toBeInTheDocument();
      expect(screen.getByText('觉醒水晶')).toBeInTheDocument();
    });

    // Check table headers
    expect(screen.getByText('图标')).toBeInTheDocument();
    expect(screen.getByText('道具名称')).toBeInTheDocument();
    expect(screen.getByText('操作')).toBeInTheDocument();

    // Verify thumbnail images exist
    const thumbnails = screen.getAllByTitle('点击查看大图');
    expect(thumbnails.length).toBe(3);

    // Verify compact single row action buttons
    const editBtns = screen.getAllByTitle('编辑道具');
    const deleteBtns = screen.getAllByTitle('删除道具');
    expect(editBtns.length).toBe(3);
    expect(deleteBtns.length).toBe(3);
  });

  it('clicking thumbnail opens lightbox (查看大图 modal) and closes cleanly', async () => {
    render(<ItemsPage />);

    await waitFor(() => {
      expect(screen.getByText('s杰出装备')).toBeInTheDocument();
    });

    const thumbnails = screen.getAllByTitle('点击查看大图');
    fireEvent.click(thumbnails[0]);

    // Lightbox modal should appear
    expect(screen.getByText('关闭预览')).toBeInTheDocument();
    expect(screen.getByText('/icons/items/s杰出装备.png')).toBeInTheDocument();

    // Close preview
    fireEvent.click(screen.getByText('关闭预览'));
    expect(screen.queryByText('关闭预览')).not.toBeInTheDocument();
  });

  it('clicking edit opens modal with visual icon picker and allows selecting from icon gallery', async () => {
    render(<ItemsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('s杰出装备').length).toBeGreaterThanOrEqual(1);
    });

    const editBtn = screen.getByTestId('edit-btn-item-1');
    fireEvent.click(editBtn);

    // Modal title
    expect(screen.getByText('编辑道具及图标')).toBeInTheDocument();

    // Check header and total count
    expect(screen.getByText('选择道具图标 *')).toBeInTheDocument();
    expect(screen.getByText(`共 ${PRESET_ITEM_ICONS.length} 款可选`)).toBeInTheDocument();

    // Currently selected icon text display
    expect(screen.getByText('当前选中图标')).toBeInTheDocument();
    expect(screen.getAllByText('s杰出装备').length).toBeGreaterThanOrEqual(2);

    // Click on a preset icon to update selection (e.g. 自选核心)
    const presetItemBtn = screen.getByTitle('自选核心');
    fireEvent.click(presetItemBtn);

    // Currently selected icon text should update to 自选核心
    expect(screen.getAllByText('自选核心').length).toBeGreaterThanOrEqual(2);

    // Submit save
    const saveBtn = screen.getByText('确认保存');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/items/item-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            name: 's杰出装备',
            icon: '/icons/items/自选核心.png',
          }),
        })
      );
    });
  });

  it('clicking delete triggers safety secondary confirmation modal (二次防误删确认框)', async () => {
    render(<ItemsPage />);

    await waitFor(() => {
      expect(screen.getByText('s杰出装备')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTestId('delete-btn-item-1');
    fireEvent.click(deleteBtn);

    // Secondary confirmation modal should pop up
    expect(screen.getByText('确认删除道具？')).toBeInTheDocument();
    expect(screen.getByText('级联清理风险提示：')).toBeInTheDocument();
    expect(
      screen.getByText('删除该道具后，数据库中所有月份绑定的该道具产出数据也将同步级联清理，该操作不可撤销！')
    ).toBeInTheDocument();

    // Click cancel
    const cancelBtn = screen.getByText('取消');
    fireEvent.click(cancelBtn);

    // Modal closes without calling DELETE
    expect(screen.queryByText('确认删除道具？')).not.toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalledWith(
      'http://localhost:3000/items/item-1',
      expect.objectContaining({ method: 'DELETE' })
    );

    // Click delete again and confirm
    fireEvent.click(deleteBtn);
    expect(screen.getByText('确认删除道具？')).toBeInTheDocument();

    const confirmDeleteBtn = screen.getByText('确认删除');
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/items/item-1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});
