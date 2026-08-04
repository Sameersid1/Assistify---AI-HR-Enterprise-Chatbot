/**
 * API client — the single place the frontend talks to the backend.
 *
 * Handles: base URL, JSON, bearer token, the { success, data } envelope,
 * and one automatic access-token refresh on a 401.
 *
 * Nothing else in the app should call fetch() directly.
 */

import type { ApiEnvelope, AuthTokens } from './types'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5050/api/v1'

const ACCESS_KEY = 'assistify.accessToken'
const REFRESH_KEY = 'assistify.refreshToken'

/* ── token storage ─────────────────────────────────────────────── */

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY)
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY)
  },
  set({ accessToken, refreshToken }: AuthTokens) {
    localStorage.setItem(ACCESS_KEY, accessToken)
    localStorage.setItem(REFRESH_KEY, refreshToken)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    // legacy key from the mock-auth build
    localStorage.removeItem('assistify-user')
  },
}

/* ── error type ────────────────────────────────────────────────── */

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/* ── core request ──────────────────────────────────────────────── */

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Skip the Authorization header (login, refresh, activate). */
  public?: boolean
  /** Internal — prevents infinite refresh loops. */
  _retried?: boolean
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, public: isPublic = false } = opts

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (!isPublic && tokenStore.access) {
    headers.Authorization = `Bearer ${tokenStore.access}`
  }

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(
      'NETWORK_ERROR',
      'Could not reach the server. Is the API running on port 5050?',
      0,
    )
  }

  // Access token expired → refresh once, then replay the original request.
  if (res.status === 401 && !isPublic && !opts._retried && tokenStore.refresh) {
    const refreshed = await tryRefresh()
    if (refreshed) return request<T>(path, { ...opts, _retried: true })
    tokenStore.clear()
    throw new ApiError('UNAUTHENTICATED', 'Your session has expired. Please sign in again.', 401)
  }

  let payload: ApiEnvelope<T>
  try {
    payload = (await res.json()) as ApiEnvelope<T>
  } catch {
    throw new ApiError('BAD_RESPONSE', `Unexpected response from server (${res.status}).`, res.status)
  }

  if (!payload.success) {
    throw new ApiError(payload.error.code, payload.error.message, res.status)
  }
  return payload.data
}

/** Refresh the access token. Returns false if the refresh token is dead. */
async function tryRefresh(): Promise<boolean> {
  const refreshToken = tokenStore.refresh
  if (!refreshToken) return false
  try {
    const tokens = await request<AuthTokens>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      public: true,
    })
    tokenStore.set(tokens)
    return true
  } catch {
    return false
  }
}

/* ── verbs ─────────────────────────────────────────────────────── */

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  /** Unauthenticated calls — login, refresh, invitation validation, activation. */
  publicPost: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body, public: true }),
  publicGet: <T>(path: string) => request<T>(path, { public: true }),
}

/** Is the backend reachable? Used by the health indicator. */
export async function pingHealth(): Promise<boolean> {
  try {
    await api.publicGet('/health')
    return true
  } catch {
    return false
  }
}
