import type {
  AdherenceSummary,
  DoseEvent,
  DoseInstance,
  DoseStatus,
} from '../shared/contracts'
import { localDateFor, localTimeFor } from './scheduler'

function latestEventsByDose(events: DoseEvent[]): Map<string, DoseEvent> {
  const latest = new Map<string, DoseEvent>()
  for (const event of events) {
    const previous = latest.get(event.doseId)
    if (!previous || new Date(event.actionAt).getTime() >= new Date(previous.actionAt).getTime()) {
      latest.set(event.doseId, event)
    }
  }
  return latest
}

/**
 * Resolve the effective status of a materialised dose. The scheduler already
 * overlays events, so this only fills in doses that arrive as `scheduled`.
 */
function effectiveStatus(dose: DoseInstance, latest: Map<string, DoseEvent>): DoseStatus {
  const event = latest.get(dose.id)
  if (!event) return dose.status
  switch (event.action) {
    case 'taken':
      return 'taken'
    case 'late':
      return 'late'
    case 'skipped':
      return 'skipped'
    case 'missed':
      return 'missed'
    case 'snoozed':
    case 'undone':
    case 'edited':
      return dose.status
  }
}

/**
 * Summarise adherence over the doses handed in (typically the last 7 days).
 * Future and not-yet-due doses are excluded. Late doses count as taken.
 */
export function summarizeAdherence(
  doses: DoseInstance[],
  events: DoseEvent[],
): AdherenceSummary {
  const latest = latestEventsByDose(events)

  let taken = 0
  let late = 0
  let skipped = 0
  let missed = 0

  const missedBySlot = new Map<string, number>()
  const byDay = new Map<string, { missed: number; completed: number }>()

  for (const dose of doses) {
    const status = effectiveStatus(dose, latest)

    if (status === 'taken') taken += 1
    else if (status === 'late') late += 1
    else if (status === 'skipped') skipped += 1
    else if (status === 'missed') missed += 1
    else continue

    if (status === 'missed') {
      const slot = localTimeFor(dose.scheduledFor)
      missedBySlot.set(slot, (missedBySlot.get(slot) ?? 0) + 1)
    }

    const day = localDateFor(dose.scheduledFor)
    const entry = byDay.get(day) ?? { missed: 0, completed: 0 }
    entry.completed += 1
    if (status === 'missed') entry.missed += 1
    byDay.set(day, entry)
  }

  const totalDoses = taken + late + skipped + missed
  const adherencePercent =
    totalDoses === 0 ? 0 : Math.round(((taken + late) / totalDoses) * 100)

  let mostMissedSlot: string | undefined
  let mostMissedCount = 0
  for (const slot of Array.from(missedBySlot.keys()).sort()) {
    const count = missedBySlot.get(slot) ?? 0
    if (count > mostMissedCount) {
      mostMissedCount = count
      mostMissedSlot = slot
    }
  }

  return {
    totalDoses,
    taken,
    late,
    skipped,
    missed,
    adherencePercent,
    streakDays: computeStreak(byDay),
    mostMissedSlot,
  }
}

function computeStreak(byDay: Map<string, { missed: number; completed: number }>): number {
  const days = Array.from(byDay.keys()).sort()
  if (days.length === 0) return 0

  let cursor = days[days.length - 1]
  let streak = 0

  while (byDay.has(cursor)) {
    const entry = byDay.get(cursor)
    if (!entry || entry.completed === 0 || entry.missed > 0) break

    streak += 1
    cursor = previousDay(cursor)
  }

  return streak
}

function previousDay(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const instant = new Date(year, month - 1, day)
  instant.setDate(instant.getDate() - 1)
  return localDateFor(instant)
}
