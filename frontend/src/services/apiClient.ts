import type { ApiEnvelope, AppState, SyncResponse } from '../shared/contracts'

/**
 * The ONLY module that talks to the backend.
 * Owner: Integration/Lead. Every function is best-effort and never throws:
 * the app must work with the backend down.
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
    if (!response.ok) return null
    const body = (await response.json()) as ApiEnvelope<T>
    return body.data
  } catch {
    return null
  }
}

export async function ping(): Promise<boolean> {
  const data = await request<{ ok: boolean }>('/api/health')
  return Boolean(data?.ok)
}

export async function syncState(state: AppState): Promise<SyncResponse | null> {
  return request<SyncResponse>(`/api/profiles/${encodeURIComponent(state.profile.id)}/sync`, {
    method: 'POST',
    body: JSON.stringify({
      profile: state.profile,
      medications: state.medications,
      events: state.events,
    }),
  })
}
