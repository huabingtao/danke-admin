'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface GameEvent {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  rewards: string | null;
}

interface EventForm {
  name: string;
  startDate: string;
  endDate: string;
  rewards: string;
}

const emptyForm: EventForm = { name: '', startDate: '', endDate: '', rewards: '' };

function toDateInput(value: string) {
  const date = new Date(value);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function EventsPage() {
  const { user, token, isLoading, hasPermission } = useAuth();
  const canView = user?.role === 'ADMIN' || hasPermission('events:view');
  const canCreate = user?.role === 'ADMIN' || hasPermission('event:create');
  const canDelete = user?.role === 'ADMIN' || hasPermission('event:delete');
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<GameEvent | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiFetch('/events', { token });
      const data: unknown = await response.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '读取活动列表失败');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!canView || !token) return;
    let active = true;

    apiFetch('/events', { token })
      .then((response) => response.json())
      .then((data: unknown) => {
        if (active) setEvents(Array.isArray(data) ? data : []);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : '读取活动列表失败');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [canView, token]);

  const openCreate = () => {
    setEditingEvent(null);
    setForm(emptyForm);
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (event: GameEvent) => {
    setEditingEvent(event);
    setForm({
      name: event.name,
      startDate: toDateInput(event.startDate),
      endDate: toDateInput(event.endDate),
      rewards: event.rewards ?? '',
    });
    setError('');
    setDialogOpen(true);
  };

  const saveEvent = async (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();
    if (!form.name.trim() || !form.startDate || !form.endDate) {
      setError('请填写活动名称、开始时间和结束时间。');
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      setError('活动结束时间不能早于开始时间。');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const route = editingEvent ? `/events/${encodeURIComponent(editingEvent.id)}` : '/events';
      await apiFetch(route, {
        method: editingEvent ? 'PATCH' : 'POST',
        token,
        body: JSON.stringify({
          name: form.name.trim(),
          startDate: new Date(form.startDate).toISOString(),
          endDate: new Date(form.endDate).toISOString(),
          rewards: form.rewards.trim() || null,
        }),
      });
      setDialogOpen(false);
      await loadEvents();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '保存活动失败');
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async (event: GameEvent) => {
    if (!window.confirm(`确定删除活动「${event.name}」吗？`)) return;
    setError('');
    try {
      await apiFetch(`/events/${encodeURIComponent(event.id)}`, { method: 'DELETE', token });
      await loadEvents();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '删除活动失败');
    }
  };

  if (isLoading || !user || !canView) {
    return <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">鉴权中或无权限访问。</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">限时活动库</h1>
          <p className="text-sm text-muted-foreground">维护 Core 中的活动周期与奖励摘要。</p>
        </div>
        {canCreate && (
          <Button onClick={openCreate}>
            <Plus data-icon="inline-start" /> 新建活动
          </Button>
        )}
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {loading ? (
        <p className="text-sm text-muted-foreground">正在读取活动……</p>
      ) : events.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>暂无活动记录</CardTitle>
            <CardDescription>活动数据由 Core 管理并与产出记录关联。</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <CardTitle>{event.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <CalendarDays aria-hidden="true" /> 活动周期
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">Core</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="text-sm">
                  <p>{formatDate(event.startDate)}</p>
                  <p className="text-muted-foreground">至 {formatDate(event.endDate)}</p>
                </div>
                {event.rewards && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{event.rewards}</p>}
                <div className="flex gap-2">
                  {canCreate && (
                    <Button variant="outline" size="sm" onClick={() => openEdit(event)}>
                      <Pencil data-icon="inline-start" /> 编辑
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="destructive" size="sm" onClick={() => void deleteEvent(event)}>
                      <Trash2 data-icon="inline-start" /> 删除
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEvent ? '编辑活动' : '新建活动'}</DialogTitle>
            <DialogDescription>活动信息保存在 Core；已有产出关联会保留。</DialogDescription>
          </DialogHeader>
          <form className="flex flex-col gap-4" onSubmit={saveEvent}>
            <label className="flex flex-col gap-2 text-sm">
              活动名称
              <Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              开始时间
              <Input required type="datetime-local" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              结束时间
              <Input required type="datetime-local" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              奖励摘要
              <Input
                value={form.rewards}
                onChange={(event) => setForm({ ...form, rewards: event.target.value })}
                placeholder="可填写奖励说明；不需要时留空"
              />
            </label>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button type="submit" disabled={saving}>{saving ? '保存中…' : '保存活动'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
