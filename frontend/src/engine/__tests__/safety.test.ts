import { describe, expect, it } from 'vitest'
import type { Medication, Profile } from '../../shared/contracts'
import { analyzeRegimen } from '../safety'
import { demoMedications, demoProfile } from '../../data/demoProfile'

const now = new Date('2026-11-21T10:00:00')

const adult: Profile = {
  id: 'p1',
  name: 'Test',
  age: 68,
  preferences: {
    largeText: false,
    highContrast: false,
    lateGraceMinutes: 120,
    missedGraceMinutes: 240,
    notificationsEnabled: false,
  },
}

function medication(overrides: Partial<Medication> = {}): Medication {
  return {
    id: 'med-a',
    brandName: 'Test Med',
    genericName: 'paracetamol',
    form: 'tablet',
    strength: '500mg',
    activeIngredients: [{ generic: 'paracetamol', mgPerUnit: 500 }],
    doseAmount: 1,
    doseUnit: 'tablet',
    foodRelation: 'anytime',
    schedule: { type: 'fixedTimes', times: ['08:00'] },
    status: 'active',
    ...overrides,
  }
}

describe('safety engine: demo regimen', () => {
  const report = analyzeRegimen(demoMedications, demoProfile, now)
  const categories = report.findings.map((finding) => finding.category)

  it('flags the paracetamol duplicate', () => {
    expect(categories).toContain('duplicate')
    const duplicate = report.findings.find((finding) => finding.category === 'duplicate')
    expect(duplicate?.title).toContain('paracetamol')
    expect(duplicate?.relatedMedicationIds).toEqual(
      expect.arrayContaining(['med-dolo', 'med-crocin']),
    )
  })

  it('flags the warfarin + aspirin major interaction', () => {
    const interaction = report.findings.find((finding) => finding.category === 'interaction')
    expect(interaction?.severity).toBe('major')
    expect(interaction?.title).toMatch(/warfarin/i)
    expect(interaction?.source).toBeTruthy()
    expect(interaction?.action).toBeTruthy()
  })

  it('flags the Beers Criteria benzodiazepine', () => {
    const beers = report.findings.find((finding) => finding.category === 'beers')
    expect(beers?.title).toMatch(/benzodiazepine/i)
    expect(beers?.source).toContain('Beers')
  })

  it('flags low stock for Dolo and scores the regimen as high risk', () => {
    expect(report.findings.some((finding) => finding.category === 'refill')).toBe(true)
    expect(report.score).toBeLessThan(60)
    expect(report.band).toBe('high_risk')
    expect(report.checkedAt).toBe(now.toISOString())
  })

  it('never claims the regimen is safe', () => {
    for (const finding of report.findings) {
      expect(finding.plainLanguage).toBeTruthy()
      expect(finding.action).toBeTruthy()
      expect(finding.title.toLowerCase()).not.toContain('you are safe')
    }
  })
})

describe('safety engine: rules', () => {
  it('says nothing when a single medicine has no known issue', () => {
    const report = analyzeRegimen([medication()], adult, now)
    expect(report.findings).toEqual([])
    expect(report.score).toBe(100)
    expect(report.band).toBe('safe')
  })

  it('detects a daily ceiling breach from structured ingredients', () => {
    const report = analyzeRegimen(
      [
        medication({
          schedule: {
            type: 'fixedTimes',
            times: ['08:00', '11:00', '14:00', '17:00', '20:00'],
          },
          activeIngredients: [{ generic: 'paracetamol', mgPerUnit: 1000 }],
        }),
      ],
      adult,
      now,
    )
    const ceiling = report.findings.find((finding) => finding.category === 'ceiling')
    expect(ceiling?.severity).toBe('major')
    expect(ceiling?.plainLanguage).toContain('5000mg')
  })

  it('expands combination products for interaction checks', () => {
    const warfarin = medication({
      id: 'med-warf',
      brandName: 'Warf 2mg',
      genericName: 'warfarin',
      strength: '2mg',
      activeIngredients: [{ generic: 'warfarin', mgPerUnit: 2 }],
    })
    const combiflam = medication({
      id: 'med-combiflam',
      brandName: 'Combiflam',
      genericName: 'ibuprofen + paracetamol',
      strength: '400mg + 325mg',
      activeIngredients: [
        { generic: 'ibuprofen', mgPerUnit: 400 },
        { generic: 'paracetamol', mgPerUnit: 325 },
      ],
    })

    const report = analyzeRegimen([warfarin, combiflam], adult, now)
    const titles = report.findings.map((finding) => finding.title)
    expect(titles).toContain('Warfarin + Ibuprofen')
  })

  it('does not flag a combination product against itself', () => {
    const report = analyzeRegimen(
      [
        medication({
          genericName: 'ibuprofen + paracetamol',
          activeIngredients: [
            { generic: 'ibuprofen', mgPerUnit: 400 },
            { generic: 'paracetamol', mgPerUnit: 325 },
          ],
        }),
      ],
      { ...adult, age: 40 },
      now,
    )
    expect(report.findings.some((finding) => finding.category === 'interaction')).toBe(false)
  })

  it('applies Beers only at the rule age', () => {
    const alprazolam = medication({
      brandName: 'Alprax',
      genericName: 'alprazolam',
      activeIngredients: [{ generic: 'alprazolam', mgPerUnit: 0.25 }],
    })
    expect(
      analyzeRegimen([alprazolam], { ...adult, age: 40 }, now).findings.some(
        (finding) => finding.category === 'beers',
      ),
    ).toBe(false)
    expect(
      analyzeRegimen([alprazolam], adult, now).findings.some(
        (finding) => finding.category === 'beers',
      ),
    ).toBe(true)
  })

  it('fails safe on an unknown generic', () => {
    const report = analyzeRegimen(
      [medication({ genericName: 'mystery-molecule', activeIngredients: undefined })],
      adult,
      now,
    )
    const info = report.findings.find((finding) => finding.severity === 'info')
    expect(info?.title).toMatch(/not in our curated list/i)
    expect(info?.action).toBeTruthy()
  })
})
