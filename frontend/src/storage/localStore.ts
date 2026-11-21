import type { AppState } from '../shared/contracts'
import { STORAGE_KEY, STORAGE_VERSION } from '../shared/constants'

/**
 * The ONLY module allowed to touch localStorage.
 * Owner: Integration/Lead. UI code uses hooks, never this directly.
 */
export function loadState(): AppState | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AppState
    if (parsed.version !== STORAGE_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

export function saveState(state: AppState): AppState {
  const next: AppState = {
    ...state,
    version: STORAGE_VERSION,
    updatedAt: new Date().toISOString(),
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }
  return next
}

export function clearState(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY)
  }
}
