import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RemindersPage from '../app/reminders/page';

const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockRules = [
  {
    id: '1',
    name: '公会远征周日催打提醒',
    category: 'GUILD',
    ruleType: 'ROUTINE',
    routineType: 'WEEKLY',
    weeklyDay: 0,
    dailyTime: '20:00',
    cronExpression: '0 20 * * 0',
    humanSchedule: '每周日 20:00',
    targetGroup: '弹壳特攻队玩家交流群',
    webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key',
    isAtAll: true,
    enabled: true,
    message: '⚔️【公会远征 · 催打提醒】',
  },
  {
    id: '2',
    name: '周年庆彩虹矿山限时活动',
    category: 'EVENT',
    ruleType: 'CYCLE',
    eventStartDate: '2026-08-25',
    playDays: 5,
    hasRedeemDay: true,
    remindTime: '21:00',
    humanSchedule: '玩法截止: 2026-08-29 21:00 | 兑换截止: 2026-08-30 21:00',
    targetGroup: '弹壳特攻队玩家交流群',
    webhookUrl: null,
    isAtAll: false,
    enabled: true,
    message: '🌈【彩虹矿山活动提醒】',
  },
];

describe('RemindersPage Dynamic Event & Routine Visual Management', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('/reminders/logs')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockRules),
      });
    }));
  });

  test('renders full management UI and mode badges for ADMIN role', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        username: '弹壳呱呱',
        role: 'ADMIN',
      },
      hasPermission: () => true,
    });

    render(<RemindersPage />);

    expect(screen.getByText('提醒规则')).toBeInTheDocument();
    expect(screen.getByTestId('add-rule-btn')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('循环')).toBeInTheDocument();
    });
  });

  test('hides add, trigger, and delete buttons for ASSISTANT role', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        username: '助理小白',
        role: 'ASSISTANT',
      },
      hasPermission: (code: string) => code !== 'reminders:manage',
    });

    render(<RemindersPage />);

    expect(screen.getByText('提醒规则')).toBeInTheDocument();
    expect(screen.queryByTestId('add-rule-btn')).not.toBeInTheDocument();
    expect(screen.getByText('🔒 助理只读模式')).toBeInTheDocument();
  });

  test('switches category tabs cleanly', async () => {
    mockUseAuth.mockReturnValue({
      user: { username: '弹壳呱呱', role: 'ADMIN' },
      hasPermission: () => true,
    });

    render(<RemindersPage />);

    await waitFor(() => {
      expect(screen.getByText('公会远征周日催打提醒')).toBeInTheDocument();
    });

    const categorySelect = screen.getByRole('combobox');
    fireEvent.change(categorySelect, { target: { value: 'START_END' } });

    expect(screen.getByText('公会远征周日催打提醒')).toBeInTheDocument();
  });
});
