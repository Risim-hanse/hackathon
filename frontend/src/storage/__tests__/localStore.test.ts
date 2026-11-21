import { beforeEach, describe, expect, it } from 'vitest'
import type { AppState } from '../../shared/contracts'
import { STORAGE_KEY, STORAGE_VERSION } from '../../shared/constants'
import { createDemoState } from '../../data/demoProfile'
import { clearState, loadState, saveState } from '../localStore'

const store = new Map<string, string>()

function installLocalStorage() {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, String(value)),
      removeItem: (key: string) => store.delete(key),
    },
  })
}

beforeEach(() => {
  store.clear()
  installLocalStorage()
})

describe('localStore', () => {
  it('returns null when nothing is stored', () => {
    expect(loadState()).toBeNull()
  })

  it('saves a versioned state and can load it back', () => {
    const state = createDemoState(new Date('2026-11-21T10:00:00'))
    const saved = saveState(state)
    expect(saved.version).toBe(STORAGE_VERSION)
    expect(saved.updatedAt).toBeTruthy()
    expect(loadState()?.profile.id).toBe(state.profile.id)
  })

  it('writes to the documented storage key', () => {
    saveState(createDemoState(new Date('2026-11-21T10:00:00')))
    expect(store.has(STORAGE_KEY)).toBe(true)
  })

  it('migrates a v1 state by adding prescriptions', () => {
    const legacy = createDemoState(new Date('2026-11-21T10:00:00'))
    delete (legacy as Partial<AppState>).prescriptions
    store.set(STORAGE_KEY, JSON.stringify({ ...legacy, version: 1 }))
    const loaded = loadState()
    expect(loaded?.version).toBe(STORAGE_VERSION)
    expect(loaded?.prescriptions).toEqual([])
  })

  it('rejects a future storage version', () => {
    const state = createDemoState(new Date('2026-11-21T10:00:00'))
    store.set(STORAGE_KEY, JSON.stringify({ ...state, version: 999 }))
    expect(loadState()).toBeNull()
  })

  it('rejects malformed JSON', () => {
    store.set(STORAGE_KEY, '{not json')
    expect(loadState()).toBeNull()
  })

  it('clearState removes the stored value', () => {
    saveState(createDemoState(new Date('2026-11-21T10:00:00')))
    clearState()
    expect(loadState()).toBeNull()
  })

  it('does not crash when localStorage is unavailable', () => {
    Reflect.deleteProperty(globalThis, 'localStorage')
    expect(loadState()).toBeNull()
    expect(() => saveState(createDemoState(new Date('2026-11-21T10:00:00')))).not.toThrow()
    expect(() => clearState()).not.toThrow()
  })
})
