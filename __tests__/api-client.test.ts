import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, AUTH_EXPIRED_EVENT, ApiError } from '@/lib/api-client';

describe('apiFetch', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('adds the bearer token and JSON content type for request bodies', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/items', { method: 'POST', token: 'test-token', body: JSON.stringify({ name: '宝石' }) });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:3001/items');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer test-token');
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
  });

  it('throws the Core error message on a failed response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ message: '无权限' }, { status: 403 })));

    await expect(apiFetch('/items')).rejects.toMatchObject({ message: '无权限', status: 403 });
  });

  it('dispatches the session-expired event for authenticated 401 responses', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

    await expect(apiFetch('/items', { token: 'expired-token' })).rejects.toBeInstanceOf(ApiError);

    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: AUTH_EXPIRED_EVENT }));
  });
});
