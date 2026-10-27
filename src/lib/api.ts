import { supabase } from './supabase'

const apiBase = String(import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

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
    throw new ApiError('Could not reach StreamX. Check your connection and try again.', 0)
  }
  const isJson = response.headers.get('content-type')?.toLowerCase().includes('application/json') ?? false
  const payload = isJson ? await response.json().catch(() => ({})) as { error?: string } & T : {} as { error?: string } & T
  if (!response.ok) {
    const message = payload.error || (isJson
      ? 'The request could not be completed.'
      : 'StreamX received an unexpected response. Check that the API URL is correct and the API service is running.')
    throw new ApiError(message, response.status)
  }
  if (!isJson) throw new ApiError('StreamX received an unexpected response. Check that the API URL is correct and the API service is running.', response.status)
  return payload
}

export function jsonBody(value: unknown) {
  return JSON.stringify(value)
}
