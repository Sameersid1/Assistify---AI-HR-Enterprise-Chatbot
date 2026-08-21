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

/**
 * Exported so AuthContext can watch for another tab replacing the session.
 *
 * localStorage is shared across every tab on this origin, so signing in as a
 * second person anywhere overwrites the token here too — while this tab carries
 * on rendering the first person from React state. Requests then go out as
 * whoever logged in last, and the mismatch is invisible until something writes
 * data under the wrong name.
 */
export const TOKEN_STORAGE_KEYS = [ACCESS_KEY, REFRESH_KEY] as const

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
    // A fetch() rejection means the request never got a response: the API is
    // down, or the browser blocked it on CORS. Name the URL we actually tried —
    // hardcoding "port 5050" sends people debugging localhost while deployed.
    throw new ApiError(
      'NETWORK_ERROR',
      import.meta.env.DEV
        ? `Could not reach the API at ${BASE_URL}. Is the server running?`
        : 'Could not reach the server. It may be starting up — try again in a moment.',
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

/* ── server-sent events ────────────────────────────────────────── */

/**
 * POST a body and read back a stream of server-sent events.
 *
 * Not EventSource: that only does GET and cannot carry an Authorization
 * header, and this API is bearer-token authenticated. So it is fetch plus a
 * reader, parsing the `data:` frames by hand — which is the whole of SSE that
 * we use.
 *
 * It lives here rather than in the page so the base URL, the bearer token and
 * the one-shot 401 refresh keep working the same way they do for every other
 * call.
 */
async function stream(
  path: string,
  body: unknown,
  onEvent: (event: unknown) => void,
  signal?: AbortSignal,
  _retried = false,
): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (tokenStore.access) headers.Authorization = `Bearer ${tokenStore.access}`

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    })
  } catch (err) {
    // An abort is the user hitting stop, not a failure — let the caller ignore it.
    if ((err as Error)?.name === 'AbortError') return
    throw new ApiError(
      'NETWORK_ERROR',
      import.meta.env.DEV
        ? `Could not reach the API at ${BASE_URL}. Is the server running?`
        : 'Could not reach the server. It may be starting up — try again in a moment.',
      0,
    )
  }

  if (res.status === 401 && !_retried && tokenStore.refresh) {
    const refreshed = await tryRefresh()
    if (refreshed) return stream(path, body, onEvent, signal, true)
    tokenStore.clear()
    throw new ApiError('UNAUTHENTICATED', 'Your session has expired. Please sign in again.', 401)
  }

  // A failure before the stream opened still arrives as ordinary JSON — the
  // server only switches to SSE once it knows the request is good.
  if (!res.ok || !res.headers.get('content-type')?.includes('text/event-stream')) {
    try {
      const payload = (await res.json()) as ApiEnvelope<unknown>
      if (!payload.success) throw new ApiError(payload.error.code, payload.error.message, res.status)
    } catch (err) {
      if (err instanceof ApiError) throw err
    }
    throw new ApiError('BAD_RESPONSE', `Unexpected response from server (${res.status}).`, res.status)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new ApiError('BAD_RESPONSE', 'The server sent an empty stream.', res.status)

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // Frames are separated by a blank line. Anything after the last one is a
      // partial frame — keep it in the buffer until the rest arrives.
      const frames = buffer.split('\n\n')
      buffer = frames.pop() ?? ''

      for (const frame of frames) {
        const data = frame
          .split('\n')
          .filter((l) => l.startsWith('data:'))
          .map((l) => l.slice(5).trim())
          .join('')
        if (!data) continue
        try {
          onEvent(JSON.parse(data))
        } catch {
          // A frame we cannot parse is not worth killing the answer over.
        }
      }
    }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return
    throw err
  }
}

/* ── verbs ─────────────────────────────────────────────────────── */

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown, opts?: { public?: boolean }) =>
    request<T>(path, { method: 'POST', body, ...opts }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  stream,

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
