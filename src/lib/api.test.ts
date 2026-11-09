import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiRequest, normalizeApiBase, resolveApiBase } from './api'

const currentUser = vi.hoisted(() => ({ getIdToken: vi.fn() }))
vi.mock('./firebase', () => ({ auth: { currentUser } }))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})

describe('apiRequest', () => {
  it('explains when the API path returns an HTML error page', async () => {
    currentUser.getIdToken.mockResolvedValue('test-token')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Cannot POST /api/uploads', {
      status: 404,
      headers: { 'content-type': 'text/html' },
    })))

    const error = await apiRequest('/uploads', { method: 'POST', body: '{}' }).catch((cause: unknown) => cause)
    expect(error).toMatchObject({ name: 'ApiError', status: 404 })
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain('VITE_API_URL')
    expect((error as Error).message).toContain('http://localhost/api/uploads')
  })

  it('normalizes API host values with or without the /api suffix', () => {
    expect(normalizeApiBase(undefined)).toBe('/api')
    expect(normalizeApiBase('https://api.example.com')).toBe('https://api.example.com/api')
    expect(normalizeApiBase('https://api.example.com/api/')).toBe('https://api.example.com/api')
  })

  it('does not silently point a production build at the frontend origin when the API URL is missing', () => {
    expect(resolveApiBase(undefined, true)).toBe('')
    expect(resolveApiBase(undefined, false)).toBe('/api')
  })

  it('attaches bearer token before calling the API', async () => {
    currentUser.getIdToken.mockResolvedValue('fresh-firebase-token')
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"ok":true}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiRequest<{ ok: boolean }>('/uploads')).resolves.toEqual({ ok: true })
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer fresh-firebase-token')
  })

  it('asks the user to sign in when getting the ID token fails', async () => {
    currentUser.getIdToken.mockRejectedValue(new Error('token expired'))
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiRequest('/uploads')).rejects.toMatchObject({
      status: 401,
      message: 'Your sign-in session could not be read. Sign in again.',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
