'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export interface MatrixDefinitionAction {
  kind: 'row' | 'column';
  mode: 'rename' | 'delete';
  id: string;
  name: string;
  initialName?: string;
  members: { id: string; name: string }[];
}

export function MatrixDefinitionDialog({ action, onClose, onConfirm }: {
  action: MatrixDefinitionAction;
  onClose: () => void;
  onConfirm: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(action.initialName ?? action.name);
  const [review, setReview] = useState(action.mode === 'delete' || action.initialName !== undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const noun = action.kind === 'row' ? '来源行' : '道具列';
  async function submit() {
    if (busy) return;
    if (action.mode === 'rename' && (!name.trim() || name.trim() === action.name)) {
      setError('请输入与原名称不同的有效名称');
      return;
    }
    if (!review) { setReview(true); setError(''); return; }
    setBusy(true);
    setError('');
    try { await onConfirm(name.trim()); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '操作失败，请重试'); }
    finally { setBusy(false); }
  }
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>{action.mode === 'delete' ? `确认删除${noun}` : review ? `确认修改${noun}名称` : `编辑${noun}名称`}</DialogTitle>
          <DialogDescription>
            {action.mode === 'delete'
              ? '这会删除正式来源或道具定义，以及所有月份关联的产出记录。删除前会下载相关记录备份，请保留文件。'
              : '修改会同步到 Core，影响后台其他页面；已有数值和关联关系保留。'}
          </DialogDescription>
        </DialogHeader>
        {action.mode === 'rename' ? review ? (
          <div className="flex flex-col gap-2">
            <p>原名称：{action.name}</p><p>新名称：{name.trim()}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label htmlFor="matrix-definition-name">名称</label>
            <Input id="matrix-definition-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p>将删除：{action.members.map((member) => member.name).join('、')}</p>
            {action.members.length > 1 && <p>包含同一列的旧名称和别名记录，避免删除后重复列再次出现。</p>}
          </div>
        )}
        {error && <p role="alert" className="text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>取消</Button>
          {review && action.mode === 'rename' && <Button variant="outline" disabled={busy} onClick={() => setReview(false)}>返回修改</Button>}
          <Button variant={action.mode === 'delete' ? 'destructive' : 'default'} disabled={busy} onClick={submit}>
            {busy ? '正在处理…' : action.mode === 'delete' ? '备份并确认删除' : review ? '确认修改' : '下一步确认'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
