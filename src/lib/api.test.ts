import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiRequest, normalizeApiBase } from './api'

const auth = vi.hoisted(() => ({ getSession: vi.fn(), refreshSession: vi.fn() }))
vi.mock('./supabase', () => ({ supabase: { auth } }))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})

describe('apiRequest', () => {
  it('explains when the API path returns an HTML error page', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Cannot POST /api/uploads', {
      status: 404,
      headers: { 'content-type': 'text/html' },
    })))

    await expect(apiRequest('/uploads', { method: 'POST', body: '{}' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'The API returned a web page instead of JSON. Set the frontend VITE_API_URL to your deployed API address ending in /api, confirm the API is running, then rebuild and redeploy the frontend.',
    })
  })

  it('normalizes API host values with or without the /api suffix', () => {
    expect(normalizeApiBase(undefined)).toBe('/api')
    expect(normalizeApiBase('https://api.example.com')).toBe('https://api.example.com/api')
    expect(normalizeApiBase('https://api.example.com/api/')).toBe('https://api.example.com/api')
  })

  it('refreshes a nearly expired access token before calling the API', async () => {
    auth.getSession.mockResolvedValue({ data: { session: { access_token: 'old-token', expires_at: Math.floor(Date.now() / 1000) + 10 } }, error: null })
    auth.refreshSession.mockResolvedValue({ data: { session: { access_token: 'fresh-token' } }, error: null })
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"ok":true}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiRequest<{ ok: boolean }>('/uploads')).resolves.toEqual({ ok: true })
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer fresh-token')
  })

  it('asks the user to sign in when session refresh fails', async () => {
    auth.getSession.mockResolvedValue({ data: { session: { access_token: 'expired-token', expires_at: Math.floor(Date.now() / 1000) - 10 } }, error: null })
    auth.refreshSession.mockResolvedValue({ data: { session: null }, error: new Error('refresh rejected') })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiRequest('/uploads')).rejects.toMatchObject({
      status: 401,
      message: 'Your sign-in session could not be refreshed. Sign in again.',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
