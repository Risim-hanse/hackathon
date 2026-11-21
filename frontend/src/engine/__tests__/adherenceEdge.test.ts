import { describe, expect, it } from 'vitest'
import type { DoseEvent, DoseInstance, DoseStatus } from '../../shared/contracts'
import { summarizeAdherence } from '../adherence'

function dose(id: string, date: string, time: string, status: DoseStatus): DoseInstance {
  return { id, medicationId: 'med-a', scheduledFor: new Date(`${date}T${time}:00`).toISOString(), status }
}

function event(doseId: string, action: DoseEvent['action'], at: string): DoseEvent {
  return {
    id: `evt-${doseId}-${action}`,
    doseId,
    medicationId: 'med-a',
    scheduledFor: new Date('2026-11-20T08:00:00').toISOString(),
    actionAt: at,
    action,
  }
}

describe('adherence edge cases', () => {
  it('returns zeroes for an empty input', () => {
    expect(summarizeAdherence([], [])).toEqual({
      totalDoses: 0,
      taken: 0,
      late: 0,
      skipped: 0,
      missed: 0,
      adherencePercent: 0,
      streakDays: 0,
      mostMissedSlot: undefined,
    })
  })

  it('counts late as taken but reports it separately', () => {
    const doses = [
      dose('a', '2026-11-20', '08:00', 'taken'),
      dose('b', '2026-11-20', '20:00', 'late'),
      dose('c', '2026-11-19', '08:00', 'skipped'),
      dose('d', '2026-11-19', '20:00', 'missed'),
    ]
    const summary = summarizeAdherence(doses, [])
    expect(summary.taken).toBe(1)
    expect(summary.late).toBe(1)
    expect(summary.adherencePercent).toBe(50)
  })

  it('rounds the adherence percentage', () => {
    const doses = Array.from({ length: 7 }, (_, index) =>
      dose(`d${index}`, '2026-11-20', `${String(8 + index).padStart(2, '0')}:00`, index === 0 ? 'missed' : 'taken'),
    )
    expect(summarizeAdherence(doses, []).adherencePercent).toBe(86)
  })

  it('breaks most-missed ties by earliest time slot', () => {
    const doses = [
      dose('a', '2026-11-20', '20:00', 'missed'),
      dose('b', '2026-11-19', '08:00', 'missed'),
    ]
    expect(summarizeAdherence(doses, []).mostMissedSlot).toBe('08:00')
  })

  it('stops a streak at the first missed day', () => {
    const doses = [
      dose('a', '2026-11-20', '08:00', 'taken'),
      dose('b', '2026-11-19', '08:00', 'missed'),
      dose('c', '2026-11-18', '08:00', 'taken'),
    ]
    expect(summarizeAdherence(doses, []).streakDays).toBe(1)
  })

  it('does not count a gap day with no doses as part of the streak', () => {
    const doses = [
      dose('a', '2026-11-20', '08:00', 'taken'),
      dose('b', '2026-11-18', '08:00', 'taken'),
    ]
    expect(summarizeAdherence(doses, []).streakDays).toBe(1)
  })

  it('applies the latest event overlay to a scheduled dose', () => {
    const scheduled = dose('a', '2026-11-20', '08:00', 'scheduled')
    const taken = event('a', 'taken', '2026-11-20T08:10:00.000Z')
    const skipped = event('a', 'skipped', '2026-11-20T08:11:00.000Z')
    expect(summarizeAdherence([scheduled], [taken, skipped]).skipped).toBe(1)
  })

  it('ignores snoozed and edited events', () => {
    const scheduled = dose('a', '2026-11-20', '08:00', 'scheduled')
    const snoozed = event('a', 'snoozed', '2026-11-20T08:10:00.000Z')
    const edited = event('a', 'edited', '2026-11-20T08:11:00.000Z')
    const summary = summarizeAdherence([scheduled], [snoozed, edited])
    expect(summary.totalDoses).toBe(0)
    expect(summary.taken).toBe(0)
  })

  it('counts a missed event overlay as missed', () => {
    const scheduled = dose('a', '2026-11-20', '08:00', 'scheduled')
    const missed = event('a', 'missed', '2026-11-20T09:00:00.000Z')
    const summary = summarizeAdherence([scheduled], [missed])
    expect(summary.missed).toBe(1)
    expect(summary.mostMissedSlot).toBe('08:00')
  })
})
