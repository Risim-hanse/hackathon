import type {
  DoseEvent,
  DoseStatus,
  FoodRelation,
  Profile,
  SafetyReport,
  AdherenceSummary,
} from '../shared/contracts'
import type { Medication } from '../shared/contracts'

export const FOOD_LABEL: Record<FoodRelation, string> = {
  before_meal: 'Before food',
  with_meal: 'With food',
  after_meal: 'After food',
  empty_stomach: 'Empty stomach',
  bedtime: 'Bedtime',
  anytime: 'Anytime',
}

export const STATUS_LABEL: Record<DoseStatus, string> = {
  scheduled: 'Scheduled',
  taken: 'Taken',
  late: 'Late',
  skipped: 'Skipped',
  missed: 'Missed',
}

export function friendlyTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function greeting(now: Date): string {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function longDate(now: Date): string {
  return now.toLocaleDateString([], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function daysLeftLabel(days: number | null): string {
  if (days === null) return 'No refill tracking'
  if (days <= 0) return 'Refill now'
  return `${days} day${days === 1 ? '' : 's'} left`
}

export function shareSummary(args: {
  profile: Profile
  medications: Medication[]
  doses: Array<{ id: string; medicationId: string; scheduledFor: string; status: DoseStatus }>
  report: SafetyReport
  adherence: AdherenceSummary
  events: DoseEvent[]
  now: Date
}): string {
  const { profile, medications, doses, report, adherence, now } = args
  const medName = (id: string) => medications.find((medication) => medication.id === id)?.brandName ?? id

  const lines = [
    `MediTrack SafetyNet — ${profile.name}'s daily summary`,
    `${longDate(now)}`,
    '',
    'Today',
    ...doses.map(
      (dose) => `• ${friendlyTime(dose.scheduledFor)}  ${medName(dose.medicationId)} — ${STATUS_LABEL[dose.status]}`,
    ),
    '',
    `Safety check: ${report.score}/100 — ${report.band === 'high_risk' ? 'high risk' : report.band === 'review' ? 'review recommended' : 'no known issues in our curated list'}`,
    ...report.findings.map((finding) => `• ${finding.title}: ${finding.action}`),
    '',
    `7-day adherence: ${adherence.adherencePercent}% · Streak: ${adherence.streakDays} days`,
    'Refills',
    ...medications
      .filter((medication) => medication.inventory)
      .map((medication) => `• ${medication.brandName}`),
    '',
    'Educational aid, not medical advice. Confirm changes with your doctor or pharmacist.',
  ]
  return lines.join('\n')
}
