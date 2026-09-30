import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RemindersPage from '../app/reminders/page';
import { computeRuleStatus, getTodayStr } from '../lib/reminder-status';

const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockRules = [
  {
    id: '1',
    name: '公会探索',
    category: 'START_END',
    ruleType: 'CYCLE',
    startDate: '2026-09-01',
    durationDays: 7,
    cycleDays: 7,
    hasRedeemDay: false,
    digestTemplate: '离本轮【{name}】结束还剩 {days} 天',
    redeemTemplate: null,
    routineTemplate: null,
    digestNote: null,
    humanSchedule: '首期 2026-09-01 · 持续 7 天 · 周期循环',
    enabled: true,
  },
  {
    id: '2',
    name: '区域行动',
    category: 'START_END',
    ruleType: 'CYCLE',
    startDate: '2026-08-28',
    durationDays: 7,
    cycleDays: 8,
    hasRedeemDay: true,
    digestTemplate: '离本轮【{name}】结束还剩 {days} 天',
    redeemTemplate: '今天是【{name}】专属兑换日，抓紧兑换！',
    routineTemplate: null,
    digestNote: '注意备好体力',
    humanSchedule: '首期 2026-08-28 · 持续 7 天 (+1天兑换) · 周期循环',
    enabled: true,
  },
  {
    id: '3',
    name: '公会远征打卡',
    category: 'GUILD',
    ruleType: 'ROUTINE',
    routineType: 'WEEKLY',
    weeklyDay: 0,
    startDate: null,
    durationDays: null,
    cycleDays: null,
    hasRedeemDay: false,
    digestTemplate: '离本周【{name}】打卡还剩 {days} 天',
    redeemTemplate: null,
    routineTemplate: '今天是【{name}】打卡日',
    digestNote: null,
    humanSchedule: '每周日打卡提醒',
    enabled: true,
  },
];

describe('computeRuleStatus Dynamic Countdown & Status Tests', () => {
  test('accurately calculates remaining days based on entered startDate and target date', () => {
    // Case 1: Start 2026-09-01, Target 2026-09-04 -> diff 3 days -> 7 - 3 = 4 days left
    const result1 = computeRuleStatus(
      {
        name: '公会探索',
        ruleType: 'CYCLE',
        startDate: '2026-09-01',
        durationDays: 7,
        cycleDays: 7,
        hasRedeemDay: false,
        digestTemplate: '离本轮【{name}】结束还剩 {days} 天',
      },
      new Date(2026, 8, 4) // 2026-09-04
    );
    expect(result1.status).toBe('ACTIVE');
    expect(result1.daysRemaining).toBe(4);
    expect(result1.text).toBe('离本轮【公会探索】结束还剩 4 天');

    // Case 2: Start 2026-09-01, Target 2026-09-05 -> diff 4 days -> 7 - 4 = 3 days left
    const result2 = computeRuleStatus(
      {
        name: '公会探索',
        ruleType: 'CYCLE',
        startDate: '2026-09-01',
        durationDays: 7,
        cycleDays: 7,
        hasRedeemDay: false,
        digestTemplate: '离本轮【{name}】结束还剩 {days} 天',
      },
      new Date(2026, 8, 5) // 2026-09-05
    );
    expect(result2.status).toBe('ACTIVE');
    expect(result2.daysRemaining).toBe(3);
    expect(result2.text).toBe('离本轮【公会探索】结束还剩 3 天');

    // Case 3: Start today (2026-09-04), Target 2026-09-04 -> diff 0 days -> 7 days left
    const result3 = computeRuleStatus(
      {
        name: '公会探索',
        ruleType: 'CYCLE',
        startDate: '2026-09-04',
        durationDays: 7,
        cycleDays: 7,
        hasRedeemDay: false,
        digestTemplate: '离本轮【{name}】结束还剩 {days} 天',
      },
      new Date(2026, 8, 4)
    );
    expect(result3.status).toBe('ACTIVE');
    expect(result3.daysRemaining).toBe(7);
    expect(result3.text).toBe('离本轮【公会探索】结束还剩 7 天');
  });

  test('triggers redeem day and renders custom redeem text on redeem day', () => {
    // Start date: 2026-08-28, duration: 7 days.
    // Day 0..6 (Aug 28..Sep 3) are active. Sep 4 is Day 7 -> Redeem Day!
    const result = computeRuleStatus(
      {
        name: '区域行动',
        ruleType: 'CYCLE',
        startDate: '2026-08-28',
        durationDays: 7,
        cycleDays: 8,
        hasRedeemDay: true,
        digestTemplate: '离本轮【{name}】结束还剩 {days} 天',
        redeemTemplate: '今天是【{name}】专属兑换日，抓紧兑换！',
      },
      new Date(2026, 8, 4) // 2026-09-04 (Day 7)
    );

    expect(result.status).toBe('REDEEM');
    expect(result.isRedeemDay).toBe(true);
    expect(result.text).toBe('今天是【区域行动】专属兑换日，抓紧兑换！');
  });

  test('getTodayStr returns valid YYYY-MM-DD string', () => {
    const today = getTodayStr();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('RemindersPage UI & Form Workflow Tests', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRules),
        });
      })
    );
  });

  test('renders full management UI and dynamically calculated countdowns for ADMIN role', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        username: '弹壳呱呱',
        role: 'ADMIN',
      },
      hasPermission: () => true,
    });

    render(<RemindersPage />);

    expect(screen.getByText('活动提醒与倒计时规则')).toBeInTheDocument();
    expect(screen.getByTestId('add-rule-btn')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('公会探索')).toBeInTheDocument();
      expect(screen.getByText('区域行动')).toBeInTheDocument();
    });
  });

  test('hides add button for ASSISTANT role and shows read-only badge', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        username: '助理小白',
        role: 'ASSISTANT',
      },
      hasPermission: (code: string) => code !== 'reminders:manage',
    });

    render(<RemindersPage />);

    expect(screen.getByText('活动提醒与倒计时规则')).toBeInTheDocument();
    expect(screen.queryByTestId('add-rule-btn')).not.toBeInTheDocument();
    expect(screen.getByText('🔒 助理只读模式')).toBeInTheDocument();
  });

  test('modal opens with default date as today and unified duration days', async () => {
    mockUseAuth.mockReturnValue({
      user: { username: '弹壳呱呱', role: 'ADMIN' },
      hasPermission: () => true,
    });

    render(<RemindersPage />);

    await waitFor(() => {
      expect(screen.getByText('公会探索')).toBeInTheDocument();
    });

    // Click "+ 新增提醒规则"
    fireEvent.click(screen.getByTestId('add-rule-btn'));

    expect(screen.getByText('✨ 新增提醒规则')).toBeInTheDocument();
    expect(screen.getByText('完整周期（含兑换日，天）*')).toBeInTheDocument();
    expect(screen.queryByText('完整循环周期天数')).not.toBeInTheDocument();

    // Verify category select does NOT contain REDEEM_DEADLINE
    expect(screen.queryByText('兑换截止提醒')).not.toBeInTheDocument();

    // Verify redeem checkbox toggles the user-customizable prompt box
    const redeemCheckbox = screen.getByLabelText('最后一天仅兑换（已包含在完整周期内，不可游玩）');
    expect(screen.queryByText('🎁 专属兑换日文案（用户自定义）')).not.toBeInTheDocument();

    fireEvent.click(redeemCheckbox);
    expect(screen.getByText('🎁 专属兑换日文案（用户自定义）')).toBeInTheDocument();
  });

  test('renders new columns layout and does not render removed columns or type badges', async () => {
    mockUseAuth.mockReturnValue({
      user: { username: '弹壳呱呱', role: 'ADMIN' },
      hasPermission: () => true,
    });

    render(<RemindersPage />);

    await waitFor(() => {
      expect(screen.getByText('公会探索')).toBeInTheDocument();
    });

    // Check table headers
    expect(screen.getByText('规则名称')).toBeInTheDocument();
    expect(screen.getByText('分类')).toBeInTheDocument();
    expect(screen.getByText('倒计时天数')).toBeInTheDocument();
    expect(screen.getByText('附加备注')).toBeInTheDocument();
    expect(screen.getByText('状态')).toBeInTheDocument();
    expect(screen.getByText('操作')).toBeInTheDocument();

    // Verify removed columns are NOT in the table
    expect(screen.queryByText('调度周期 / 规则说明')).not.toBeInTheDocument();
    expect(screen.queryByText('每日提醒文案与模板效果')).not.toBeInTheDocument();

    // Verify type badge [循环活动] / [常规定时] is NOT rendered in rule rows
    expect(screen.queryByText('循环活动')).not.toBeInTheDocument();
    expect(screen.queryByText('常规定时')).not.toBeInTheDocument();

    // Verify sort interaction
    const countdownHeader = screen.getByText('倒计时天数');
    fireEvent.click(countdownHeader); // trigger sort
    expect(screen.getByText('公会探索')).toBeInTheDocument();
  });
});

describe('29-day complete cycle regression', () => {
  const rule = { name: '逃离行动', ruleType: 'CYCLE', startDate: '2026-08-12',
    durationDays: 28, cycleDays: 29, hasRedeemDay: true };
  test.each([
    [2026, 8, 30, 'ACTIVE', 9, 8],
    [2026, 9, 7, 'ACTIVE', 2, 1],
    [2026, 9, 8, 'REDEEM', 1, 0],
    [2026, 9, 9, 'ACTIVE', 29, 28],
  ])('preview at %i-%i-%i counts the final exchange day', (y, m, d, status, total, playable) => {
    const result = computeRuleStatus(rule, new Date(y as number, m as number, d as number));
    expect(result).toMatchObject({status, daysRemaining: total, playableDaysRemaining: playable});
    if (status === 'REDEEM') expect(result.text).toContain('不可游玩');
  });

  test('does not wrap dates before the first cycle', () => {
    expect(computeRuleStatus(rule, new Date(2026, 7, 11)).status).toBe('UPCOMING');
  });

  test('saving 29 total days sends 28 playable days and a 29-day cycle', async () => {
    mockUseAuth.mockReturnValue({user:{role:'ADMIN'}, hasPermission:()=>true, token:'test'});
    const fetchMock = vi.fn().mockResolvedValue({ok:true,json:async()=>mockRules});
    vi.stubGlobal('fetch', fetchMock);
    render(<RemindersPage />);
    await screen.findByText('公会探索');
    fireEvent.click(screen.getByTestId('add-rule-btn'));
    const form = screen.getByRole('button', {name:'创建规则'}).closest('form')!;
    const nameInput = form.querySelector('input[type="text"]')!;
    fireEvent.change(nameInput, {target:{value:'逃离行动'}});
    fireEvent.change(screen.getByLabelText('完整周期（含兑换日，天）*'), {target:{value:'29'}});
    fireEvent.click(screen.getByLabelText('最后一天仅兑换（已包含在完整周期内，不可游玩）'));
    expect(screen.getByText('每轮共 29 天：前 28 天可游玩，第 29 天仅兑换。倒计时包含兑换日。')).toBeInTheDocument();
    fireEvent.submit(form);
    await waitFor(() => expect(fetchMock.mock.calls.some(([,init]) => init?.method === 'POST')).toBe(true));
    const [,request] = fetchMock.mock.calls.find(([,init]) => init?.method === 'POST')!;
    expect(JSON.parse(request.body)).toMatchObject({durationDays:28,cycleDays:29,hasRedeemDay:true});
  });

  test('editing an existing 28+1 rule shows 29 and preserves its saved duration', async () => {
    mockUseAuth.mockReturnValue({user:{role:'ADMIN'}, hasPermission:()=>true, token:'test'});
    const saved = {...mockRules[0],...rule,id:'escape'};
    const fetchMock = vi.fn().mockResolvedValue({ok:true,json:async()=>[saved]});
    vi.stubGlobal('fetch', fetchMock);
    render(<RemindersPage />);
    await screen.findByText('逃离行动');
    fireEvent.click(screen.getByRole('button',{name:'编辑'}));
    expect(screen.getByLabelText('完整周期（含兑换日，天）*')).toHaveValue(29);
    fireEvent.submit(screen.getByRole('button',{name:'保存修改'}).closest('form')!);
    await waitFor(() => expect(fetchMock.mock.calls.some(([,init]) => init?.method === 'PATCH')).toBe(true));
    const [,request] = fetchMock.mock.calls.find(([,init]) => init?.method === 'PATCH')!;
    expect(JSON.parse(request.body)).toMatchObject({durationDays:28,cycleDays:29,hasRedeemDay:true});
  });
  test('rejects a redemption period with no playable day', async () => {
    mockUseAuth.mockReturnValue({user:{role:'ADMIN'}, hasPermission:()=>true, token:'test'});
    const fetchMock = vi.fn().mockResolvedValue({ok:true,json:async()=>mockRules});
    vi.stubGlobal('fetch', fetchMock);
    render(<RemindersPage />);
    await screen.findByText('公会探索');
    fireEvent.click(screen.getByTestId('add-rule-btn'));
    const form = screen.getByRole('button', {name:'创建规则'}).closest('form')!;
    fireEvent.change(form.querySelector('input[type="text"]')!, {target:{value:'逃离行动'}});
    fireEvent.click(screen.getByLabelText('最后一天仅兑换（已包含在完整周期内，不可游玩）'));
    fireEvent.change(screen.getByLabelText('完整周期（含兑换日，天）*'), {target:{value:'1'}});
    fireEvent.submit(form);
    expect(fetchMock.mock.calls.some(([,init]) => init?.method === 'POST')).toBe(false);
    expect(screen.getByLabelText('完整周期（含兑换日，天）*')).toBeInvalid();
  });

});
