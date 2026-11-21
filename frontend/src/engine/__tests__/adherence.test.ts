import { describe, expect, it } from 'vitest'
import type { DoseEvent, DoseInstance, DoseStatus } from '../../shared/contracts'
import { summarizeAdherence } from '../adherence'

function at(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString()
}

function dose(
  id: string,
  date: string,
  time: string,
  status: DoseStatus = 'scheduled',
): DoseInstance {
  return {
    id,
    medicationId: 'med-a',
    scheduledFor: at(date, time),
    status,
  }
}

describe('adherence summary', () => {
  it('counts taken, late, skipped, and missed; late counts as taken', () => {
    const doses = [
      dose('d1', '2026-11-20', '08:00', 'taken'),
      dose('d2', '2026-11-20', '20:00', 'late'),
      dose('d3', '2026-11-19', '08:00', 'skipped'),
      dose('d4', '2026-11-19', '20:00', 'missed'),
    ]
    const summary = summarizeAdherence(doses, [])
    expect(summary).toMatchObject({
      totalDoses: 4,
      taken: 1,
      late: 1,
      skipped: 1,
      missed: 1,
      adherencePercent: 50,
      mostMissedSlot: '20:00',
    })
  })

  it('excludes future and not-yet-due doses', () => {
    const summary = summarizeAdherence([dose('d1', '2026-11-21', '20:00', 'scheduled')], [])
    expect(summary.totalDoses).toBe(0)
    expect(summary.adherencePercent).toBe(0)
    expect(summary.streakDays).toBe(0)
  })

  it('counts a streak of consecutive days without misses', () => {
    const doses = [
      dose('d1', '2026-11-20', '08:00', 'taken'),
      dose('d2', '2026-11-20', '20:00', 'taken'),
      dose('d3', '2026-11-19', '08:00', 'taken'),
      dose('d4', '2026-11-18', '08:00', 'taken'),
      dose('d5', '2026-11-17', '08:00', 'missed'),
    ]
    expect(summarizeAdherence(doses, []).streakDays).toBe(3)
  })

  it('stops the streak at a day with a missed dose', () => {
    const doses = [
      dose('d1', '2026-11-20', '08:00', 'missed'),
      dose('d2', '2026-11-19', '08:00', 'taken'),
    ]
    expect(summarizeAdherence(doses, []).streakDays).toBe(0)
  })

  it('applies the latest event when a dose arrives as scheduled', () => {
    const scheduled = dose('d1', '2026-11-20', '08:00', 'scheduled')
    const event: DoseEvent = {
      id: 'evt-1',
      doseId: 'd1',
      medicationId: 'med-a',
      scheduledFor: scheduled.scheduledFor,
      actionAt: at('2026-11-20', '08:04'),
      action: 'taken',
    }
    const summary = summarizeAdherence([scheduled], [event])
    expect(summary.taken).toBe(1)
    expect(summary.adherencePercent).toBe(100)
  })

  it('treats an undone dose as not yet taken', () => {
    const scheduled = dose('d1', '2026-11-20', '08:00', 'scheduled')
    const taken: DoseEvent = {
      id: 'evt-1',
      doseId: 'd1',
      medicationId: 'med-a',
      scheduledFor: scheduled.scheduledFor,
      actionAt: at('2026-11-20', '08:04'),
      action: 'taken',
    }
    const undone: DoseEvent = {
      ...taken,
      id: 'evt-2',
      actionAt: at('2026-11-20', '08:05'),
      action: 'undone',
    }
    const summary = summarizeAdherence([scheduled], [taken, undone])
    expect(summary.totalDoses).toBe(0)
  })
})
