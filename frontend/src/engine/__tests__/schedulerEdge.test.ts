import { describe, expect, it } from 'vitest'
import type { DoseEvent, Medication, Preferences } from '../../shared/contracts'
import {
  formatHm,
  generateDoses,
  localDateFor,
  localInstant,
  localTimeFor,
  parseHm,
  timesForDate,
} from '../scheduler'

const preferences: Preferences = {
  largeText: false,
  highContrast: false,
  lateGraceMinutes: 120,
  missedGraceMinutes: 240,
  notificationsEnabled: false,
}

const DAY = '2026-11-21'

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
    foodRelation: 'after_meal',
    schedule: { type: 'fixedTimes', times: ['08:00', '20:00'] },
    status: 'active',
    ...overrides,
  }
}

function at(time: string): Date {
  return new Date(`${DAY}T${time}:00`)
}

function event(overrides: Partial<DoseEvent> = {}): DoseEvent {
  return {
    id: 'evt-1',
    doseId: `med-a_${DAY}_08:00`,
    medicationId: 'med-a',
    scheduledFor: at('08:00').toISOString(),
    actionAt: at('08:05').toISOString(),
    action: 'taken',
    ...overrides,
  }
}

describe('scheduler edge cases', () => {
  it('expands every-hours schedules across midnight from the start date', () => {
    const med = medication({
      startDate: '2026-11-20',
      schedule: { type: 'everyHours', times: ['20:00'], intervalHours: 8 },
    })
    expect(timesForDate(med, DAY)).toEqual(['04:00', '12:00', '20:00'])
  })

  it('returns no times when the date is after endDate', () => {
    expect(timesForDate(medication({ endDate: '2026-11-20' }), DAY)).toEqual([])
  })

  it('returns no times for a paused medication', () => {
    expect(timesForDate(medication({ status: 'paused' }), DAY)).toEqual([])
  })

  it('excludes as-needed medications entirely', () => {
    const med = medication({ schedule: { type: 'asNeeded', times: [] } })
    expect(generateDoses([med], [], DAY, preferences, at('10:00'))).toEqual([])
  })

  it('deduplicates repeated times on one medication', () => {
    const med = medication({ schedule: { type: 'fixedTimes', times: ['08:00', '08:00'] } })
    expect(generateDoses([med], [], DAY, preferences, at('07:00'))).toHaveLength(1)
  })

  it('keeps two medications at the same time as distinct doses', () => {
    const second = medication({ id: 'med-b', brandName: 'Other' })
    const doses = generateDoses([medication(), second], [], DAY, preferences, at('07:00'))
    expect(doses).toHaveLength(4)
    expect(new Set(doses.map((dose) => dose.id)).size).toBe(4)
  })

  it('lets a later event win when action timestamps tie', () => {
    const taken = event({ id: 'first', actionAt: at('08:05').toISOString() })
    const skipped = event({ id: 'second', action: 'skipped', actionAt: at('08:05').toISOString() })
    const [dose] = generateDoses([medication()], [taken, skipped], DAY, preferences, at('09:00'))
    expect(dose.status).toBe('skipped')
  })

  it('treats snoozed as a clock-derived status', () => {
    const snoozed = event({ action: 'snoozed', actionAt: at('08:20').toISOString() })
    const [dose] = generateDoses([medication()], [snoozed], DAY, preferences, at('10:30'))
    expect(dose.status).toBe('late')
  })

  it('treats edited as a clock-derived status', () => {
    const edited = event({ action: 'edited', actionAt: at('08:20').toISOString() })
    const [dose] = generateDoses([medication()], [edited], DAY, preferences, at('09:00'))
    expect(dose.status).toBe('scheduled')
  })

  it('keeps an on-time taken event as taken', () => {
    const [dose] = generateDoses([medication()], [event()], DAY, preferences, at('09:00'))
    expect(dose.status).toBe('taken')
  })

  it('reclassifies a late taken event as late', () => {
    const late = event({ actionAt: at('10:30').toISOString() })
    const [dose] = generateDoses([medication()], [late], DAY, preferences, at('11:00'))
    expect(dose.status).toBe('late')
  })

  it('uses an explicit missed event', () => {
    const missed = event({ action: 'missed' })
    const [dose] = generateDoses([medication()], [missed], DAY, preferences, at('09:00'))
    expect(dose.status).toBe('missed')
  })

  it('sorts doses chronologically', () => {
    const doses = generateDoses([medication()], [], DAY, preferences, at('07:00'))
    expect(doses.map((dose) => dose.id)).toEqual([
      `med-a_${DAY}_08:00`,
      `med-a_${DAY}_20:00`,
    ])
  })

  it('validates and formats wall-clock times', () => {
    expect(parseHm('08:05')).toEqual({ hours: 8, minutes: 5 })
    expect(parseHm('24:00')).toBeNull()
    expect(parseHm('08:60')).toBeNull()
    expect(parseHm('nonsense')).toBeNull()
    expect(formatHm(at('20:00'))).toBe('20:00')
  })

  it('round-trips local dates and times', () => {
    const instant = localInstant(DAY, '14:30')
    expect(localDateFor(instant)).toBe(DAY)
    expect(localTimeFor(instant.toISOString())).toBe('14:30')
  })
})
