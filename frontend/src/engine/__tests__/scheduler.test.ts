import { describe, expect, it } from 'vitest'
import type { DoseEvent, Medication, Preferences } from '../../shared/contracts'
import { generateDoses, scheduledDosesPerDay, timesForDate } from '../scheduler'

const preferences: Preferences = {
  largeText: false,
  highContrast: false,
  lateGraceMinutes: 120,
  missedGraceMinutes: 240,
  notificationsEnabled: false,
}

const DATE = '2026-11-21'

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
    ...overrides,
  }
}

function instant(time: string): Date {
  return new Date(`${DATE}T${time}:00`)
}

function event(overrides: Partial<DoseEvent> = {}): DoseEvent {
  return {
    id: 'evt-1',
    doseId: `med-a_${DATE}_08:00`,
    medicationId: 'med-a',
    scheduledFor: instant('08:00').toISOString(),
    actionAt: instant('08:05').toISOString(),
    action: 'taken',
    ...overrides,
  }
}

describe('scheduler: materialisation', () => {
  it('creates one dose per fixed time, sorted', () => {
    const doses = generateDoses([medication()], [], DATE, preferences, instant('07:00'))
    expect(doses.map((dose) => dose.id)).toEqual([
      `med-a_${DATE}_08:00`,
      `med-a_${DATE}_20:00`,
    ])
    expect(doses.every((dose) => dose.status === 'scheduled')).toBe(true)
  })

  it('excludes paused, stopped, and as-needed medications', () => {
    const now = instant('10:00')
    expect(generateDoses([medication({ status: 'paused' })], [], DATE, preferences, now)).toEqual([])
    expect(generateDoses([medication({ status: 'stopped' })], [], DATE, preferences, now)).toEqual([])
    expect(
      generateDoses(
        [medication({ schedule: { type: 'asNeeded', times: [] } })],
        [],
        DATE,
        preferences,
        now,
      ),
    ).toEqual([])
  })

  it('respects start and end dates inclusively', () => {
    expect(timesForDate(medication({ startDate: '2026-11-22' }), DATE)).toEqual([])
    expect(timesForDate(medication({ endDate: '2026-11-20' }), DATE)).toEqual([])
    expect(timesForDate(medication({ startDate: DATE, endDate: DATE }), DATE)).toHaveLength(2)
  })

  it('expands every-hours schedules from the anchor', () => {
    const everyEight = medication({
      startDate: DATE,
      schedule: { type: 'everyHours', times: ['08:00'], intervalHours: 8 },
    })
    expect(timesForDate(everyEight, DATE)).toEqual(['08:00', '16:00'])
    expect(scheduledDosesPerDay(everyEight)).toBe(3)
  })
})

describe('scheduler: status derivation', () => {
  it('is scheduled before the late window', () => {
    const [dose] = generateDoses([medication()], [], DATE, preferences, instant('09:00'))
    expect(dose.status).toBe('scheduled')
  })

  it('is late after the late window but before the missed window', () => {
    const [dose] = generateDoses([medication()], [], DATE, preferences, instant('10:30'))
    expect(dose.status).toBe('late')
  })

  it('is missed after the missed window', () => {
    const [dose] = generateDoses([medication()], [], DATE, preferences, instant('13:00'))
    expect(dose.status).toBe('missed')
  })

  it('uses the latest event, and late logging becomes late', () => {
    const lateEvent = event({
      actionAt: instant('10:30').toISOString(),
      action: 'taken',
    })
    const [dose] = generateDoses([medication()], [lateEvent], DATE, preferences, instant('11:00'))
    expect(dose.status).toBe('late')
  })

  it('supports skip and undo without deleting history', () => {
    const skipped = event({ id: 'evt-skip', action: 'skipped' })
    expect(
      generateDoses([medication()], [skipped], DATE, preferences, instant('09:00'))[0].status,
    ).toBe('skipped')

    const undone = event({
      id: 'evt-undo',
      action: 'undone',
      actionAt: instant('08:06').toISOString(),
    })
    expect(
      generateDoses([medication()], [event(), undone], DATE, preferences, instant('09:00'))[0]
        .status,
    ).toBe('scheduled')
  })
})
