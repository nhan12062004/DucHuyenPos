import { supabase } from '../lib/supabase';

/**
 * API Client - thin wrapper gọi NestJS backend
 * Base URL: VITE_API_URL (mặc định /api)
 */

const _apiUrl = import.meta.env.VITE_API_URL as string | undefined;
const BASE_URL = (_apiUrl && _apiUrl.trim()) ? _apiUrl.trim() : '/api';

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
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;

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

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

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

export const api = {
  get: <T>(path: string, params?: Record<string, string | number | boolean | undefined>) =>
    request<T>('GET', path, undefined, params),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
