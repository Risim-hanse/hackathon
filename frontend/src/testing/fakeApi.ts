import type { AppStateApi } from '../hooks/useAppState'
import { createDemoState } from '../data/demoProfile'
import {
  analyzeRegimen,
  daysOfStockLeft,
  generateDoses,
  localDateFor,
  summarizeAdherence,
} from '../engine'

/** Deterministic API-shaped object for rendering components in tests. */
export function makeApi(overrides: Partial<AppStateApi> = {}): AppStateApi {
  const now = new Date('2026-11-21T10:00:00')
  const state = createDemoState(now)
  const doses = generateDoses(
    state.medications,
    state.events,
    localDateFor(now),
    state.profile.preferences,
    now,
  )
  const weekDoses = doses
  const report = analyzeRegimen(state.medications, state.profile, now)
  const adherence = summarizeAdherence(weekDoses, state.events)

  const base = {
    state,
    prescriptions: state.prescriptions,
    mode: 'elderly',
    setMode: () => {},
    now,
    today: localDateFor(now),
    doses,
    weekDoses,
    report,
    adherence,
    refills: state.medications.map((medication) => ({
      medication,
      daysLeft: daysOfStockLeft(medication),
    })),
    snoozes: {},
    toast: null,
    setToast: () => {},
    emptyState: false,
    logDose: () => 'evt-test',
    undo: () => {},
    snooze: () => {},
    saveMedication: () => {},
    addPrescription: () => {},
    archivePrescription: () => {},
    stopMedication: () => {},
    setPreference: () => {},
    setCaregiver: () => {},
    loadDemo: () => {},
    resetAll: () => {},
    completeOnboarding: () => {},
    replayOnboarding: () => {},
  }

  return { ...base, ...overrides } as unknown as AppStateApi
}
