import { supabase } from './supabase'

export function normalizeApiBase(value?: string) {
  const base = String(value || '/api').trim().replace(/\/+$/, '')
  if (!base || base === '/api' || base.endsWith('/api')) return base || '/api'
  return `${base}/api`
}

const apiBase = normalizeApiBase(import.meta.env.VITE_API_URL)
const unexpectedResponseMessage = 'The API returned a web page instead of JSON. Set the frontend VITE_API_URL to your deployed API address ending in /api, confirm the API is running, then rebuild and redeploy the frontend.'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function getAccessToken() {
  if (!supabase) return undefined
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new ApiError('Your sign-in session could not be read. Sign in again.', 401)
  let session = data.session
  if (!session) return undefined

  if (session.expires_at && session.expires_at <= Math.floor(Date.now() / 1000) + 30) {
    const refreshed = await supabase.auth.refreshSession()
    if (refreshed.error || !refreshed.data.session) {
      throw new ApiError('Your sign-in session could not be refreshed. Sign in again.', 401)
    }
    session = refreshed.data.session
  }
  return session.access_token
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken()
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')

  let response: Response
  try {
    response = await fetch(`${apiBase}${path}`, { ...init, headers })
  } catch {
    throw new ApiError('Could not reach the StreamX API. Check VITE_API_URL, confirm the API service is running, and allow this site in the API FRONTEND_ORIGIN setting.', 0)
  }
  const isJson = response.headers.get('content-type')?.toLowerCase().includes('application/json') ?? false
  const payload = isJson ? await response.json().catch(() => ({})) as { error?: string } & T : {} as { error?: string } & T
  if (!response.ok) {
    const message = payload.error || (isJson
      ? 'The request could not be completed.'
      : unexpectedResponseMessage)
    throw new ApiError(message, response.status)
  }
  if (!isJson) throw new ApiError(unexpectedResponseMessage, response.status)
  return payload
}

export function jsonBody(value: unknown) {
  return JSON.stringify(value)
}
