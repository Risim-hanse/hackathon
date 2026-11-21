import type { AppState, DoseEvent, Medication, Profile } from '../shared/contracts'
import { STORAGE_VERSION } from '../shared/constants'

export const demoProfile: Profile = {
  id: 'demo-meera',
  name: 'Meera',
  age: 68,
  caregiverName: 'Anita (daughter)',
  caregiverPhone: '+919000000000',
  pharmacistPhone: '+919000000001',
  preferences: {
    largeText: false,
    highContrast: false,
    lateGraceMinutes: 120,
    missedGraceMinutes: 240,
    notificationsEnabled: false,
  },
}

export const demoMedications: Medication[] = [
  {
    id: 'med-dolo',
    brandName: 'Dolo 650',
    genericName: 'paracetamol',
    form: 'tablet',
    strength: '650mg',
    activeIngredients: [{ generic: 'paracetamol', mgPerUnit: 650, drugClass: 'analgesic' }],
    doseAmount: 1,
    doseUnit: 'tablet',
    foodRelation: 'after_meal',
    schedule: { type: 'fixedTimes', times: ['08:00'] },
    status: 'active',
    reason: 'Pain and fever',
    inventory: { currentCount: 4, unit: 'tablet', refillThresholdDays: 5 },
    drugClass: 'analgesic',
  },
  {
    id: 'med-crocin',
    brandName: 'Crocin 500',
    genericName: 'paracetamol',
    form: 'tablet',
    strength: '500mg',
    activeIngredients: [{ generic: 'paracetamol', mgPerUnit: 500, drugClass: 'analgesic' }],
    doseAmount: 1,
    doseUnit: 'tablet',
    foodRelation: 'after_meal',
    schedule: { type: 'fixedTimes', times: ['14:00'] },
    status: 'active',
    reason: 'Pain',
    inventory: { currentCount: 12, unit: 'tablet', refillThresholdDays: 5 },
    drugClass: 'analgesic',
  },
  {
    id: 'med-ecosprin',
    brandName: 'Ecosprin 75',
    genericName: 'aspirin',
    form: 'tablet',
    strength: '75mg',
    activeIngredients: [{ generic: 'aspirin', mgPerUnit: 75, drugClass: 'antiplatelet' }],
    doseAmount: 1,
    doseUnit: 'tablet',
    foodRelation: 'after_meal',
    schedule: { type: 'fixedTimes', times: ['13:00'] },
    status: 'active',
    reason: 'Heart protection',
    inventory: { currentCount: 20, unit: 'tablet', refillThresholdDays: 5 },
    drugClass: 'antiplatelet',
  },
  {
    id: 'med-warf',
    brandName: 'Warf 2mg',
    genericName: 'warfarin',
    form: 'tablet',
    strength: '2mg',
    activeIngredients: [{ generic: 'warfarin', mgPerUnit: 2, drugClass: 'anticoagulant' }],
    doseAmount: 1,
    doseUnit: 'tablet',
    foodRelation: 'anytime',
    schedule: { type: 'fixedTimes', times: ['20:00'] },
    status: 'active',
    reason: 'Blood clot prevention',
    inventory: { currentCount: 10, unit: 'tablet', refillThresholdDays: 5 },
    drugClass: 'anticoagulant',
  },
  {
    id: 'med-alprax',
    brandName: 'Alprax 0.25mg',
    genericName: 'alprazolam',
    form: 'tablet',
    strength: '0.25mg',
    activeIngredients: [{ generic: 'alprazolam', mgPerUnit: 0.25, drugClass: 'benzodiazepine' }],
    doseAmount: 1,
    doseUnit: 'tablet',
    foodRelation: 'bedtime',
    schedule: { type: 'fixedTimes', times: ['21:00'] },
    status: 'active',
    reason: 'Sleep',
    inventory: { currentCount: 6, unit: 'tablet', refillThresholdDays: 5 },
    drugClass: 'benzodiazepine',
  },
]

function localDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function daysAgo(now: Date, n: number): Date {
  const d = new Date(now)
  d.setDate(d.getDate() - n)
  return d
}

/**
 * Deterministic 7-day history for the demo: mostly taken, one missed warfarin
 * dose, one skipped sleep medicine. Today's events are left to the live UI.
 */
export function createDemoEvents(now = new Date()): DoseEvent[] {
  const events: DoseEvent[] = []
  for (let i = 7; i >= 1; i -= 1) {
    const date = localDate(daysAgo(now, i))
    for (const med of demoMedications) {
      const time = med.schedule.times[0] ?? '08:00'
      const doseId = `${med.id}_${date}_${time}`
      const scheduled = new Date(`${date}T${time}:00`)
      const scheduledFor = scheduled.toISOString()

      let action: DoseEvent['action'] = 'taken'
      let skipReason: DoseEvent['skipReason']
      if (med.id === 'med-warf' && i === 3) action = 'missed'
      if (med.id === 'med-alprax' && i === 5) {
        action = 'skipped'
        skipReason = 'felt_fine'
      }

      events.push({
        id: `evt-${doseId}`,
        doseId,
        medicationId: med.id,
        scheduledFor,
        actionAt: new Date(scheduled.getTime() + (action === 'taken' ? 5 : 60) * 60_000).toISOString(),
        action,
        skipReason,
      })
    }
  }

  // Seed today's already-due doses as taken so the demo looks live at any hour.
  // Later doses stay unlogged for the user to act on.
  const today = localDate(now)
  for (const med of demoMedications) {
    if (med.schedule.type !== 'fixedTimes') continue
    for (const time of med.schedule.times) {
      const scheduled = new Date(`${today}T${time}:00`)
      if (scheduled.getTime() + 5 * 60_000 > now.getTime()) continue
      const doseId = `${med.id}_${today}_${time}`
      events.push({
        id: `evt-${doseId}`,
        doseId,
        medicationId: med.id,
        scheduledFor: scheduled.toISOString(),
        actionAt: new Date(scheduled.getTime() + 5 * 60_000).toISOString(),
        action: 'taken',
      })
    }
  }

  return events
}

export function createDemoState(now = new Date()): AppState {
  return {
    profile: demoProfile,
    medications: demoMedications,
    prescriptions: [],
    events: createDemoEvents(now),
    version: STORAGE_VERSION,
    updatedAt: now.toISOString(),
  }
}
