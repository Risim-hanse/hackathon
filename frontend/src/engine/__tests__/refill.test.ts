import { describe, expect, it } from 'vitest'
import type { Medication } from '../../shared/contracts'
import { daysOfStockLeft } from '../refill'
import { scheduledDosesPerDay } from '../scheduler'

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
    schedule: { type: 'fixedTimes', times: ['08:00', '20:00'] },
    status: 'active',
    inventory: { currentCount: 10, unit: 'tablet', refillThresholdDays: 5 },
    ...overrides,
  }
}

describe('refill maths', () => {
  it('divides stock by daily use', () => {
    expect(scheduledDosesPerDay(medication())).toBe(2)
    expect(daysOfStockLeft(medication())).toBe(5)
  })

  it('accounts for dose amount', () => {
    expect(daysOfStockLeft(medication({ doseAmount: 2 }))).toBe(2)
  })

  it('handles every-hours schedules', () => {
    const everyEight = medication({
      schedule: { type: 'everyHours', times: ['08:00'], intervalHours: 8 },
    })
    expect(scheduledDosesPerDay(everyEight)).toBe(3)
    expect(daysOfStockLeft(everyEight)).toBe(3)
  })

  it('returns null without inventory or a predictable schedule', () => {
    expect(daysOfStockLeft(medication({ inventory: undefined }))).toBeNull()
    expect(
      daysOfStockLeft(medication({ schedule: { type: 'asNeeded', times: [] } })),
    ).toBeNull()
  })

  it('never returns a negative count', () => {
    expect(
      daysOfStockLeft(
        medication({ inventory: { currentCount: -5, unit: 'tablet', refillThresholdDays: 5 } }),
      ),
    ).toBe(0)
  })
})
