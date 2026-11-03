import { getApiBase } from './api';

export const AUTH_EXPIRED_EVENT = 'danke-admin:auth-expired';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiRequestInit extends RequestInit {
  token?: string | null;
}

function responseMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const message = (payload as { message?: unknown }).message;
  if (typeof message === 'string' && message.trim()) return message;
  if (Array.isArray(message)) return message.filter((part) => typeof part === 'string').join('；') || fallback;
  return fallback;
}

export async function apiFetch(path: string, init: ApiRequestInit = {}): Promise<Response> {
  const { token, headers: inputHeaders, ...requestInit } = init;
  const headers = new Headers(inputHeaders);
  const isFormData = typeof FormData !== 'undefined' && requestInit.body instanceof FormData;
  if (!headers.has('Content-Type') && requestInit.body && !isFormData) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const base = getApiBase().replace(/\/$/, '');
  const route = path.startsWith('/') ? path : `/${path}`;
  const response = await fetch(`${base}${route}`, { ...requestInit, headers });
  const authenticatedRequest = Boolean(token) || headers.has('Authorization');

  if (response.status === 401 && authenticatedRequest && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }

  if (!response.ok) {
    const payload = await response.clone().json().catch(() => undefined);
    throw new ApiError(responseMessage(payload, `Core API 请求失败 (${response.status})`), response.status);
  }

  return response;
}
