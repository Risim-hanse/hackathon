import { describe, expect, it } from 'vitest'
import type { Medication, Profile } from '../../shared/contracts'
import { analyzeRegimen } from '../safety'
import { scoreFromFindings } from '../score'

const NOW = new Date('2026-11-21T10:00:00')

const profile: Profile = {
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

describe('safety edge cases', () => {
  it('returns a clean report for a single known medicine', () => {
    const report = analyzeRegimen([medication()], profile, NOW)
    expect(report.findings).toEqual([])
    expect(report.score).toBe(100)
    expect(report.band).toBe('safe')
  })

  it('detects a duplicate when a combination product shares a component', () => {
    const combo = medication({
      id: 'med-combo',
      brandName: 'Combiflam',
      genericName: 'ibuprofen + paracetamol',
      strength: '400mg + 325mg',
      activeIngredients: [
        { generic: 'ibuprofen', mgPerUnit: 400 },
        { generic: 'paracetamol', mgPerUnit: 325 },
      ],
    })
    const report = analyzeRegimen([medication(), combo], profile, NOW)
    const duplicate = report.findings.find((finding) => finding.category === 'duplicate')
    expect(duplicate?.relatedMedicationIds).toEqual(['med-a', 'med-combo'])
  })

  it('does not flag a ceiling breach exactly at the daily limit', () => {
    const med = medication({
      schedule: {
        type: 'fixedTimes',
        times: ['08:00', '12:00', '16:00', '20:00', '00:00'],
      },
      activeIngredients: [{ generic: 'paracetamol', mgPerUnit: 800 }],
    })
    const report = analyzeRegimen([med], profile, NOW)
    expect(report.findings.some((finding) => finding.category === 'ceiling')).toBe(false)
  })

  it('flags a ceiling breach above the daily limit', () => {
    const med = medication({
      schedule: {
        type: 'fixedTimes',
        times: ['08:00', '12:00', '16:00', '20:00', '23:00'],
      },
      activeIngredients: [{ generic: 'paracetamol', mgPerUnit: 900 }],
    })
    const report = analyzeRegimen([med], profile, NOW)
    const ceiling = report.findings.find((finding) => finding.category === 'ceiling')
    expect(ceiling?.severity).toBe('major')
  })

  it('fails safe with an info finding when mg is unknown', () => {
    const med = medication({ activeIngredients: undefined, strength: 'unknown' })
    const report = analyzeRegimen([med], profile, NOW)
    expect(report.findings.some((finding) => finding.severity === 'info')).toBe(true)
  })

  it('matches an interaction pair in reverse order', () => {
    const warfarin = medication({
      id: 'med-warf',
      genericName: 'warfarin',
      activeIngredients: [{ generic: 'warfarin', mgPerUnit: 2 }],
    })
    const aspirin = medication({
      id: 'med-asp',
      genericName: 'aspirin',
      activeIngredients: [{ generic: 'aspirin', mgPerUnit: 75 }],
    })
    const report = analyzeRegimen([aspirin, warfarin], profile, NOW)
    expect(report.findings.some((finding) => finding.title === 'Warfarin + Aspirin')).toBe(true)
  })

  it('never pairs a combination product with itself', () => {
    const combo = medication({
      genericName: 'warfarin + aspirin',
      activeIngredients: [
        { generic: 'warfarin', mgPerUnit: 2 },
        { generic: 'aspirin', mgPerUnit: 75 },
      ],
    })
    const report = analyzeRegimen([combo], profile, NOW)
    expect(report.findings.some((finding) => finding.category === 'interaction')).toBe(false)
  })

  it('applies Beers exactly at the minimum age', () => {
    const alprazolam = medication({
      genericName: 'alprazolam',
      activeIngredients: [{ generic: 'alprazolam', mgPerUnit: 0.25 }],
    })
    expect(
      analyzeRegimen([alprazolam], { ...profile, age: 65 }, NOW).findings.some(
        (finding) => finding.category === 'beers',
      ),
    ).toBe(true)
    expect(
      analyzeRegimen([alprazolam], { ...profile, age: 64 }, NOW).findings.some(
        (finding) => finding.category === 'beers',
      ),
    ).toBe(false)
  })

  it('uses moderate severity for zero stock and minor for low stock', () => {
    const empty = analyzeRegimen(
      [medication({ inventory: { currentCount: 0, unit: 'tablet', refillThresholdDays: 5 } })],
      profile,
      NOW,
    ).findings.find((finding) => finding.category === 'refill')
    const low = analyzeRegimen(
      [medication({ inventory: { currentCount: 3, unit: 'tablet', refillThresholdDays: 5 } })],
      profile,
      NOW,
    ).findings.find((finding) => finding.category === 'refill')
    expect(empty?.severity).toBe('moderate')
    expect(low?.severity).toBe('minor')
  })

  it('flags an unrecognised generic as an info finding', () => {
    const report = analyzeRegimen(
      [medication({ genericName: 'unknown-substance', activeIngredients: undefined })],
      profile,
      NOW,
    )
    expect(report.findings.some((finding) => finding.severity === 'info')).toBe(true)
  })

  it('sorts findings from major to info', () => {
    const report = analyzeRegimen(
      [
        medication({
          id: 'med-warf',
          genericName: 'warfarin',
          activeIngredients: [{ generic: 'warfarin', mgPerUnit: 2 }],
        }),
        medication({
          id: 'med-asp',
          genericName: 'aspirin',
          activeIngredients: [{ generic: 'aspirin', mgPerUnit: 75 }],
        }),
        medication({ id: 'med-unknown', genericName: 'unknown-x', activeIngredients: undefined }),
      ],
      profile,
      NOW,
    )
    const ranks = { major: 0, moderate: 1, minor: 2, info: 3 }
    const order = report.findings.map((finding) => ranks[finding.severity])
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })

  it('clamps the score at zero for many serious findings', () => {
    const ingredients = [
      'paracetamol',
      'aspirin',
      'warfarin',
      'ibuprofen',
      'alprazolam',
      'metformin',
    ]
    const many = ingredients.flatMap((generic, index) => [
      medication({
        id: `med-${index}-a`,
        genericName: generic,
        activeIngredients: [{ generic, mgPerUnit: 100 }],
      }),
      medication({
        id: `med-${index}-b`,
        genericName: generic,
        activeIngredients: [{ generic, mgPerUnit: 100 }],
      }),
    ])
    expect(analyzeRegimen(many, profile, NOW).score).toBe(0)
  })

  it('stamps checkedAt with the supplied instant', () => {
    expect(analyzeRegimen([], profile, NOW).checkedAt).toBe(NOW.toISOString())
  })

  it('gives every finding a title, action and explanation', () => {
    const report = analyzeRegimen(
      [
        medication({
          genericName: 'warfarin',
          activeIngredients: [{ generic: 'warfarin', mgPerUnit: 2 }],
        }),
        medication({
          id: 'med-asp',
          genericName: 'aspirin',
          activeIngredients: [{ generic: 'aspirin', mgPerUnit: 75 }],
        }),
      ],
      profile,
      NOW,
    )
    expect(report.findings.length).toBeGreaterThan(0)
    for (const finding of report.findings) {
      expect(finding.title.length).toBeGreaterThan(0)
      expect(finding.plainLanguage.length).toBeGreaterThan(0)
      expect(finding.action.length).toBeGreaterThan(0)
    }
  })

  it('score helper clamps between 0 and 100', () => {
    const finding = {
      id: 'f',
      category: 'interaction' as const,
      severity: 'major' as const,
      title: 't',
      plainLanguage: 'p',
      action: 'a',
      relatedMedicationIds: [],
    }
    expect(scoreFromFindings(Array(10).fill(finding)).score).toBe(0)
    expect(scoreFromFindings([]).score).toBe(100)
  })
})
