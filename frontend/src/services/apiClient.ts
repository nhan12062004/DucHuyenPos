import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

/**
 * API Client - thin wrapper gọi NestJS backend
 * Base URL: VITE_API_URL (mặc định /api)
 */

const _apiUrl = import.meta.env.VITE_API_URL as string | undefined;
const BASE_URL = (_apiUrl && _apiUrl.trim()) ? _apiUrl.trim() : '/api';
const REQUEST_TIMEOUT_MS = 30_000;
const PREFETCH_TTL_MS = 10_000;
const MAX_PREFETCHED_GETS = 40;
let actorUser: User | null | undefined;
const inFlightGets = new Map<string, Promise<unknown>>();
const prefetchedGets = new Map<string, { promise: Promise<unknown>; expiresAt: number }>();

function invalidatePrefetchedGets() {
  prefetchedGets.clear();
  inFlightGets.clear();
}

export function setApiActorUser(user: User | null) {
  if (actorUser?.id !== user?.id) invalidatePrefetchedGets();
  actorUser = user;
}

function getRequestKey(path: string, params?: Record<string, string | number | boolean | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params ?? {})
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([key, value]) => query.set(key, String(value)));
  return `${path}?${query.toString()}`;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function getActorHeaders() {
  const user = actorUser === undefined
    ? (await supabase.auth.getSession()).data.session?.user
    : actorUser;

  if (!user) {
    return {};
  }

  const actorName =
    (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
    user.email ||
    'Người dùng hệ thống';

  return {
    'x-actor-id': user.id,
    'x-actor-name': encodeURIComponent(actorName),
  };
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  let url = `${BASE_URL}${path}`;

  if (params) {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        sp.set(k, String(v));
      }
    });
    const qs = sp.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(await getActorHeaders()),
  };

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;

  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(408, 'Máy chủ phản hồi quá lâu. Vui lòng kiểm tra lại kết quả trước khi thao tác lại.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      (errData as any)?.message ?? `HTTP ${res.status}`,
      errData,
    );
  }

  if (res.status === 204) return undefined as unknown as T;

  return res.json() as Promise<T>;
}

function getRequest<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
  const key = getRequestKey(path, params);
  const prefetched = prefetchedGets.get(key);
  if (prefetched) {
    if (prefetched.expiresAt > Date.now()) return prefetched.promise as Promise<T>;
    prefetchedGets.delete(key);
  }

  const inFlight = inFlightGets.get(key);
  if (inFlight) return inFlight as Promise<T>;

  const pending = request<T>('GET', path, undefined, params).finally(() => {
    if (inFlightGets.get(key) === pending) inFlightGets.delete(key);
  });
  inFlightGets.set(key, pending);
  return pending;
}

function prefetchGet<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
  const key = getRequestKey(path, params);
  const existing = prefetchedGets.get(key);
  if (existing && existing.expiresAt > Date.now()) return existing.promise as Promise<T>;

  const promise = getRequest<T>(path, params);
  prefetchedGets.delete(key);
  prefetchedGets.set(key, { promise, expiresAt: Date.now() + PREFETCH_TTL_MS });

  while (prefetchedGets.size > MAX_PREFETCHED_GETS) {
    const oldestKey = prefetchedGets.keys().next().value;
    if (oldestKey) prefetchedGets.delete(oldestKey);
  }

  void promise.catch(() => {
    if (prefetchedGets.get(key)?.promise === promise) prefetchedGets.delete(key);
  });
  return promise;
}

function mutate<T>(method: string, path: string, body?: unknown): Promise<T> {
  invalidatePrefetchedGets();
  return request<T>(method, path, body).finally(invalidatePrefetchedGets);
}

export const api = {
  get: <T>(path: string, params?: Record<string, string | number | boolean | undefined>) =>
    getRequest<T>(path, params),
  prefetchGet,
  post: <T>(path: string, body: unknown) => mutate<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => mutate<T>('PUT', path, body),
  patch: <T>(path: string, body: unknown) => mutate<T>('PATCH', path, body),
  delete: <T>(path: string) => mutate<T>('DELETE', path),
};
