import type { DoseEvent, DoseInstance, Medication, Preferences } from '../shared/contracts'

/* ----------------------------- time helpers ----------------------------- */

export function parseHm(value: string): { hours: number; minutes: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return { hours, minutes }
}

export function formatHm(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/** Local calendar date (YYYY-MM-DD) for an instant. */
export function localDateFor(instant: Date | string): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Wall-clock HH:mm for an instant, in the local timezone. */
export function localTimeFor(instant: Date | string): string {
  return formatHm(typeof instant === 'string' ? new Date(instant) : instant)
}

/** Build a local Date from a calendar date and HH:mm. */
export function localInstant(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`)
}

/* ------------------------------ schedules ------------------------------- */

/**
 * Scheduled doses per day. `asNeeded` returns 0 because it cannot be counted.
 */
export function scheduledDosesPerDay(medication: Medication): number {
  const { schedule } = medication
  if (schedule.type === 'asNeeded') return 0
  if (schedule.type === 'fixedTimes') return schedule.times.length
  const interval = schedule.intervalHours ?? 0
  if (interval <= 0) return 0
  return Math.max(1, Math.floor(24 / interval))
}

function isWithinDateRange(medication: Medication, date: string): boolean {
  if (medication.startDate && date < medication.startDate) return false
  if (medication.endDate && date > medication.endDate) return false
  return true
}

/** All wall-clock times a medication is due on a given local date. */
export function timesForDate(medication: Medication, date: string): string[] {
  if (medication.status !== 'active') return []
  if (!isWithinDateRange(medication, date)) return []

  const { schedule } = medication

  if (schedule.type === 'asNeeded') return []

  if (schedule.type === 'fixedTimes') {
    return schedule.times.filter((time) => parseHm(time) !== null)
  }

  const interval = schedule.intervalHours ?? 0
  if (interval <= 0) return []

  const anchorDate = medication.startDate ?? date
  const anchorTime = parseHm(schedule.times[0] ?? '08:00') ? schedule.times[0] : '08:00'
  const anchor = localInstant(anchorDate, anchorTime).getTime()
  const dayStart = localInstant(date, '00:00').getTime()
  const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1
  const step = interval * 60 * 60 * 1000

  if (anchor > dayEnd) return []

  let cursor = anchor
  if (cursor < dayStart) {
    cursor += Math.ceil((dayStart - cursor) / step) * step
  }

  const times: string[] = []
  while (cursor <= dayEnd) {
    times.push(formatHm(new Date(cursor)))
    cursor += step
  }
  return times
}

/* ------------------------------- statuses ------------------------------- */

function latestEventsByDose(events: DoseEvent[]): Map<string, DoseEvent> {
  const latest = new Map<string, DoseEvent>()
  for (const event of events) {
    const previous = latest.get(event.doseId)
    if (!previous) {
      latest.set(event.doseId, event)
      continue
    }
    const previousAt = new Date(previous.actionAt).getTime()
    const nextAt = new Date(event.actionAt).getTime()
    if (nextAt >= previousAt) latest.set(event.doseId, event)
  }
  return latest
}

function statusFromClock(
  scheduledFor: Date,
  now: Date,
  preferences: Preferences,
): DoseInstance['status'] {
  const elapsedMinutes = (now.getTime() - scheduledFor.getTime()) / 60_000
  if (elapsedMinutes >= preferences.missedGraceMinutes) return 'missed'
  if (elapsedMinutes >= preferences.lateGraceMinutes) return 'late'
  return 'scheduled'
}

function statusFromEvent(
  event: DoseEvent,
  scheduledFor: Date,
  preferences: Preferences,
  now: Date,
): DoseInstance['status'] {
  switch (event.action) {
    case 'taken': {
      const spentMinutes = (new Date(event.actionAt).getTime() - scheduledFor.getTime()) / 60_000
      return spentMinutes >= preferences.lateGraceMinutes ? 'late' : 'taken'
    }
    case 'late':
      return 'late'
    case 'skipped':
      return 'skipped'
    case 'missed':
      return 'missed'
    case 'snoozed':
    case 'undone':
    case 'edited':
      // These actions defer or correct; the clock decides the current status.
      return statusFromClock(scheduledFor, now, preferences)
  }
}

/* ------------------------------- scheduler ------------------------------ */

/**
 * Materialise the doses for one local calendar day and derive their status.
 *
 * - Only `active` medications inside their start/end range produce doses.
 * - `asNeeded` medications never produce scheduled doses.
 * - The latest event per dose id wins; the log itself is never mutated.
 * - Status is derived from the profile grace windows when no event decides it.
 */
export function generateDoses(
  medications: Medication[],
  events: DoseEvent[],
  date: string,
  preferences: Preferences,
  now: Date,
): DoseInstance[] {
  const latest = latestEventsByDose(events)
  const doses = buildDoses(medications, date, latest, preferences, now)
  return doses.sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))
}

function buildDoses(
  medications: Medication[],
  date: string,
  latest: Map<string, DoseEvent>,
  preferences: Preferences,
  now: Date,
) {
  const doses: DoseInstance[] = []
  const seen = new Set<string>()

  for (const medication of medications) {
    for (const time of timesForDate(medication, date)) {
      const id = `${medication.id}_${date}_${time}`
      if (seen.has(id)) continue
      seen.add(id)

      const scheduledFor = localInstant(date, time)
      const event = latest.get(id)
      const status = event
        ? statusFromEvent(event, scheduledFor, preferences, now)
        : statusFromClock(scheduledFor, now, preferences)

      doses.push({
        id,
        medicationId: medication.id,
        scheduledFor: scheduledFor.toISOString(),
        status,
      })
    }
  }

  return doses
}

/**
 * Status of a single dose, useful when the UI needs to re-evaluate one row.
 * Returns `null` when the dose id does not belong to an active medication.
 */
export function doseStatusAt(
  medication: Medication,
  events: DoseEvent[],
  doseId: string,
  date: string,
  time: string,
  preferences: Preferences,
  now: Date,
): DoseInstance['status'] | null {
  if (medication.status !== 'active' || !isWithinDateRange(medication, date)) return null
  if (!timesForDate(medication, date).includes(time)) return null

  const scheduledFor = localInstant(date, time)
  const event = latestEventsByDose(events).get(doseId)
  return event
    ? statusFromEvent(event, scheduledFor, preferences, now)
    : statusFromClock(scheduledFor, now, preferences)
}
