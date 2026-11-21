import { describe, expect, it } from 'vitest'
import type { BeersBook, BrandBook, InteractionBook, MissedDoseBook } from '../../shared/contracts'
import brandData from '../brands.json'
import interactionData from '../interactions.json'
import beersData from '../beers.json'
import missedData from '../missedDose.json'
import { expandGeneric, getBrandBook, resolveBrand } from '../../engine'
import { createDemoEvents, createDemoState, createEmptyState, demoMedications, demoProfile } from '../demoProfile'
import { STORAGE_VERSION } from '../../shared/constants'

const brands = brandData as unknown as BrandBook
const interactions = interactionData as unknown as InteractionBook
const beers = beersData as unknown as BeersBook
const missed = missedData as unknown as MissedDoseBook

describe('data packs', () => {
  it('brand book has metadata and lowercase keys', () => {
    expect(brands._meta.note.length).toBeGreaterThan(10)
    for (const key of Object.keys(brands.brands)) {
      expect(key).toBe(key.toLowerCase())
      expect(brands.brands[key].generic.length).toBeGreaterThan(0)
    }
  })

  it('resolves common Indian brands and expands combinations', () => {
    expect(resolveBrand('CROCIN')?.generic).toBe('paracetamol')
    expect(resolveBrand('Dolo 650')?.generic).toBe('paracetamol')
    expect(resolveBrand('Combiflam')?.generic).toBe('ibuprofen + paracetamol')
    expect(expandGeneric('ibuprofen + paracetamol')).toEqual(['ibuprofen', 'paracetamol'])
  })

  it('returns null for unknown brands', () => {
    expect(resolveBrand('definitely-not-a-brand')).toBeNull()
    expect(resolveBrand('')).toBeNull()
  })

  it('getBrandBook returns the same book used by the resolver', () => {
    expect(getBrandBook()).toBe(brands)
  })

  it('every interaction rule has severity, mechanism, action and source', () => {
    expect(interactions.pairs.length).toBeGreaterThan(0)
    for (const pair of interactions.pairs) {
      expect(pair.a).not.toBe(pair.b)
      expect(['major', 'moderate', 'minor']).toContain(pair.severity)
      expect(pair.mechanism.length).toBeGreaterThan(10)
      expect(pair.action.length).toBeGreaterThan(10)
      expect(pair.source.length).toBeGreaterThan(5)
    }
  })

  it('every Beers rule targets older adults and has a source', () => {
    expect(beers.rules.length).toBeGreaterThan(0)
    for (const rule of beers.rules) {
      expect(rule.minAge).toBeGreaterThanOrEqual(65)
      expect(rule.generics.length).toBeGreaterThan(0)
      expect(rule.source).toContain('Beers')
    }
  })

  it('missed-dose guidance has a default and sourced rules', () => {
    expect(missed.default.length).toBeGreaterThan(20)
    expect(missed.rules.length).toBeGreaterThan(0)
    for (const rule of missed.rules) {
      expect(rule.drugClasses.length).toBeGreaterThan(0)
      expect(rule.guidance.length).toBeGreaterThan(10)
      expect(rule.source).toBeTruthy()
    }
  })

  it('demo profile has a caregiver and five distinct medicines', () => {
    expect(demoProfile.age).toBe(68)
    expect(demoProfile.caregiverName).toBeTruthy()
    expect(demoMedications).toHaveLength(5)
    expect(new Set(demoMedications.map((medication) => medication.id)).size).toBe(5)
  })

  it('every demo medicine has structured ingredients', () => {
    for (const medication of demoMedications) {
      expect(medication.activeIngredients?.length).toBeGreaterThan(0)
      for (const ingredient of medication.activeIngredients ?? []) {
        expect(ingredient.mgPerUnit).toBeGreaterThan(0)
      }
    }
  })

  it('demo state includes prescriptions, version and a sample flag', () => {
    const state = createDemoState(new Date('2026-11-21T10:00:00'))
    expect(state.prescriptions).toEqual([])
    expect(state.version).toBe(STORAGE_VERSION)
    expect(state.isDemo).toBe(true)
    expect(state.onboardingCompleted).toBe(true)
  })

  it('demo events are deterministic and unique', () => {
    const now = new Date('2026-11-21T10:00:00')
    const first = createDemoEvents(now)
    const second = createDemoEvents(now)
    expect(first).toEqual(second)
    expect(new Set(first.map((event) => event.id)).size).toBe(first.length)
  })

  it('demo events include a missed and a skipped dose', () => {
    const events = createDemoEvents(new Date('2026-11-21T10:00:00'))
    expect(events.some((event) => event.action === 'missed')).toBe(true)
    expect(events.some((event) => event.action === 'skipped')).toBe(true)
  })

  it('empty state is clean and needs onboarding', () => {
    const state = createEmptyState(new Date('2026-11-21T10:00:00'))
    expect(state.medications).toEqual([])
    expect(state.events).toEqual([])
    expect(state.prescriptions).toEqual([])
    expect(state.onboardingCompleted).toBe(false)
    expect(state.isDemo).toBe(false)
  })
})
