import { describe, expect, it } from 'vitest'
import { expandGeneric, normalizeName, resolveBrand } from '../brands'
import { bandForScore, scoreFromFindings } from '../score'
import type { SafetyFinding } from '../../shared/contracts'

describe('brand resolver', () => {
  it('normalizes case and whitespace', () => {
    expect(normalizeName('  Dolo   650 ')).toBe('dolo 650')
  })

  it('resolves an Indian brand', () => {
    expect(resolveBrand('Crocin')?.generic).toBe('paracetamol')
  })

  it('returns null for unknown brands', () => {
    expect(resolveBrand('not-a-real-brand')).toBeNull()
  })

  it('expands combination generics', () => {
    expect(expandGeneric('ibuprofen + paracetamol')).toEqual(['ibuprofen', 'paracetamol'])
  })
})

describe('safety score', () => {
  it('starts at 100', () => {
    expect(scoreFromFindings([])).toEqual({ score: 100, band: 'safe' })
  })

  it('subtracts major findings', () => {
    const finding: SafetyFinding = {
      id: 'f1',
      category: 'interaction',
      severity: 'major',
      title: 't',
      plainLanguage: 'p',
      action: 'a',
      relatedMedicationIds: [],
    }
    expect(scoreFromFindings([finding]).score).toBe(65)
  })

  it('bands scores', () => {
    expect(bandForScore(90)).toBe('safe')
    expect(bandForScore(70)).toBe('review')
    expect(bandForScore(20)).toBe('high_risk')
  })
})
