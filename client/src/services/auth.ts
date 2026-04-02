import type { AuthTokens } from '../types'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error((json as { error: string }).error ?? 'Request failed')
  return json as T
}

export async function requestNonce(pubkey: string): Promise<string> {
  const data = await post<{ nonce: string }>('/auth/nonce', { pubkey })
  return data.nonce
}

export async function verifySignature(
  pubkey: string,
  nonce: string,
  signature: string
): Promise<AuthTokens> {
  return post<AuthTokens>('/auth/verify', { pubkey, nonce, signature })
}

export async function refreshTokens(refresh_token: string): Promise<AuthTokens> {
  return post<AuthTokens>('/auth/refresh', { refresh_token })
}
