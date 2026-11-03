'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { importWebItems } from '@/lib/import-web-items';

export function WebItemImport({ token, onComplete }: { token: string; onComplete: (message: string, failed: boolean) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  async function runImport() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await importWebItems(token);
      // Keep the exact IDs and prior icon values available for manual rollback.
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `web-item-import-${Date.now()}.json`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      await onComplete(`新增 ${result.created.length}，更新图标 ${result.updated.length}，跳过 ${result.skipped}，失败 ${result.failed.length}`, result.failed.length > 0);
    } catch (error) {
      await onComplete(error instanceof Error ? error.message : '导入失败', true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button variant="outline" disabled={busy} onClick={runImport}>
      <Download data-icon="inline-start" />
      {busy ? '正在导入道具…' : '导入 Web 道具'}
    </Button>
  );
}
