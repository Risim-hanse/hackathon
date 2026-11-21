export const APP_NAME = 'MediTrack SafetyNet'

export const STORAGE_KEY = 'meditrack.safetynet.v1'
export const STORAGE_VERSION = 1

/** Defaults from SafetyNet.md. Overridable per profile. */
export const DEFAULT_GRACE = {
  lateMinutes: 120,
  missedMinutes: 240,
} as const

/** Commonly cited adult ceilings (mg/day). Educational only. */
export const MAX_DAILY_MG: Record<string, number> = {
  paracetamol: 4000,
}

/** Points subtracted from the 0-100 heuristic safety score. */
export const SCORE_WEIGHTS = {
  major: 35,
  moderate: 15,
  minor: 5,
  beers: 10,
  duplicate: 20,
} as const

export const SAFETY_DISCLAIMER =
  'This is an educational safety aid, not medical advice. Never start, stop, or change a medicine without consulting your doctor or pharmacist.'

export const SAFETY_BANDS = {
  safe: 85,
  review: 60,
} as const
