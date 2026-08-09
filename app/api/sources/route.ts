import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET() {
  const data = {
    categories: [
      { id: 'DAILY', name: '每日产出' },
      { id: 'WEEKLY', name: '每周产出' },
      { id: 'EVENT', name: '活动产出' },
    ],
    sources: [
      { id: 'src_daily_challenge', name: '每日挑战', type: 'DAILY' },
      { id: 'src_daily_sign_in', name: '每日签到', type: 'DAILY' },
      { id: 'src_weekly_chest', name: '每周宝箱', type: 'WEEKLY' },
      { id: 'src_special_event', name: '限时活动奖励', type: 'EVENT' },
    ],
  };

  return NextResponse.json(data);
}
