/**
 * FROZEN CONTRACT — read-only after kickoff.
 *
 * Both the frontend and the backend mirror these shapes. If you must change a
 * field, change it here first, then update `docs/CONTRACTS.md` and tell every
 * agent. Do not add UI-only fields to domain objects.
 */

export type MedicationForm =
  | 'tablet'
  | 'capsule'
  | 'syrup'
  | 'injection'
  | 'drops'
  | 'inhaler'
  | 'patch'

export type FoodRelation =
  | 'before_meal'
  | 'with_meal'
  | 'after_meal'
  | 'empty_stomach'
  | 'bedtime'
  | 'anytime'

export type ScheduleType = 'fixedTimes' | 'everyHours' | 'asNeeded'

export interface MedicationSchedule {
  type: ScheduleType
  /** Wall-clock times in HH:mm (24h), e.g. ["08:00", "20:00"]. */
  times: string[]
  /** Required when type === 'everyHours'. */
  intervalHours?: number
}

export type MedicationStatus = 'active' | 'paused' | 'stopped'

export interface InventoryInfo {
  currentCount: number
  unit: string
  refillThresholdDays: number
}

/** What kind of document the uploaded image shows. */
export type PrescriptionSourceKind =
  | 'prescription'
  | 'pharmacy_bill'
  | 'medicine_box'
  | 'discharge_summary'
  | 'other'

/**
 * Provenance for a scanned document. The image itself lives in IndexedDB;
 * only this reference is stored in the versioned app state.
 */
export interface DocumentProvenance {
  /** IndexedDB key for the original image — never a public URL. */
  imageRef: string
  fileName: string
  mimeType: string
  /** SHA-256 of the original bytes, used to de-duplicate repeat scans. */
  sha256: string
  /** When the photo/file was captured, when the file provides it. */
  capturedAt?: string
  /** When we imported/scanned it (ISO). */
  scannedAt: string
  kind: PrescriptionSourceKind
  /** Verbatim text the scanner read, kept for audit and correction. */
  ocrText?: string
  thumbnailDataUrl?: string
}

/** A prescription or bill, with the details a caregiver needs to hand over. */
export interface Prescription {
  id: string
  status: 'draft' | 'active' | 'archived'
  /** Date written on the prescription (YYYY-MM-DD when known). */
  issuedDate?: string
  /** Date printed on the document/bill, if different from issuedDate. */
  documentDate?: string
  prescriberName?: string
  prescriberSpecialty?: string
  clinicName?: string
  prescriberPhone?: string
  pharmacyName?: string
  pharmacyPhone?: string
  pharmacyBillDate?: string
  billNumber?: string
  /** Free-text header such as "Take after food for 5 days". */
  directionsText?: string
  durationDays?: number
  refillsAuthorized?: number
  source: DocumentProvenance
  /** 0-1 confidence from the scanner. */
  confidence?: number
  notes?: string
  createdAt: string
}

/**
 * Structured per-ingredient strength. Required for ceiling math on combination
 * products (e.g. Combiflam = ibuprofen 400 + paracetamol 325).
 * `mgPerUnit` is mg per tablet / capsule / ml of the medication form.
 */
export interface ActiveIngredient {
  generic: string
  mgPerUnit: number
  drugClass?: string
}

export interface Medication {
  id: string
  brandName: string
  genericName: string
  form: MedicationForm
  /** Human-readable label, e.g. "650mg". Display only — use activeIngredients for math. */
  strength: string
  /** Structured strengths. Source of truth for duplicate/ceiling checks. */
  activeIngredients?: ActiveIngredient[]
  doseAmount: number
  /** e.g. "tablet" */
  doseUnit: string
  foodRelation: FoodRelation
  schedule: MedicationSchedule
  status: MedicationStatus
  prescriberName?: string
  reason?: string
  notes?: string
  /** YYYY-MM-DD */
  startDate?: string
  /** YYYY-MM-DD */
  endDate?: string
  inventory?: InventoryInfo
  drugClass?: string
  /** Links this medicine to the scanned prescription it came from. */
  prescriptionId?: string
  /** Verbatim line from the document, e.g. "1-0-1 × 5 days after food". */
  directionsRaw?: string
  /** Planned course length in days, when stated. */
  durationDays?: number
  quantityDispensed?: number
  refillsAuthorized?: number
  /** Oral, topical, eye drops, inhaled… defaults to the medication form. */
  route?: string
  /** Provenance inside the document, e.g. "line 3 of the prescription". */
  sourceDetail?: string
  /** 0-1 confidence from the scanner. */
  confidence?: number
  verification?: 'draft' | 'confirmed' | 'edited'
}

export type DoseStatus = 'scheduled' | 'taken' | 'late' | 'skipped' | 'missed'

export type SkipReason =
  | 'felt_fine'
  | 'side_effect'
  | 'forgot'
  | 'nausea'
  | 'doctor_advised'
  | 'ran_out'
  | 'other'

export type DoseAction =
  | 'taken'
  | 'late'
  | 'skipped'
  | 'missed'
  | 'snoozed'
  | 'undone'
  | 'edited'

/** Append-only log entry. Never delete a row; add a compensating action. */
export interface DoseEvent {
  id: string
  /** `${medicationId}_${YYYY-MM-DD}_${HH:mm}` */
  doseId: string
  medicationId: string
  /** ISO timestamp of the scheduled dose. */
  scheduledFor: string
  /** ISO timestamp when the user acted. */
  actionAt: string
  action: DoseAction
  skipReason?: SkipReason
  notes?: string
}

/** A materialised dose for a given day, produced by the scheduler. */
export interface DoseInstance {
  id: string
  medicationId: string
  scheduledFor: string
  status: DoseStatus
}

export type SafetySeverity = 'major' | 'moderate' | 'minor' | 'info'

export type SafetyCategory =
  | 'duplicate'
  | 'ceiling'
  | 'interaction'
  | 'beers'
  | 'missed_dose'
  | 'refill'

export interface SafetyFinding {
  id: string
  category: SafetyCategory
  severity: SafetySeverity
  title: string
  /** Plain-language explanation, grade 6-8 reading level. */
  plainLanguage: string
  /** Optional clinical mechanism, rendered behind a disclosure. */
  mechanism?: string
  /** What the user should do next. */
  action: string
  /** e.g. "AGS Beers Criteria 2023" */
  source?: string
  relatedMedicationIds: string[]
}

export type SafetyBand = 'safe' | 'review' | 'high_risk'

export interface SafetyReport {
  /** 0-100 heuristic score; not a clinical grade. */
  score: number
  band: SafetyBand
  findings: SafetyFinding[]
  checkedAt: string
}

export interface AdherenceSummary {
  totalDoses: number
  taken: number
  late: number
  skipped: number
  missed: number
  /** (taken + late) / (taken + late + skipped + missed) * 100 — did they take it at all. */
  adherencePercent: number
  streakDays: number
  /** e.g. "20:00" */
  mostMissedSlot?: string
}

export interface Preferences {
  largeText: boolean
  highContrast: boolean
  lateGraceMinutes: number
  missedGraceMinutes: number
  notificationsEnabled: boolean
}

export interface Profile {
  id: string
  name: string
  age?: number
  caregiverName?: string
  caregiverPhone?: string
  pharmacistPhone?: string
  preferences: Preferences
}

/** The persisted local state. `version` drives migrations. */
export interface AppState {
  profile: Profile
  medications: Medication[]
  /** Scanned prescriptions and their provenance (new in v2). */
  prescriptions: Prescription[]
  events: DoseEvent[]
  version: number
  updatedAt: string
}

/* ------------------------------ data packs ------------------------------ */

export interface BrandEntry {
  generic: string
  drugClass?: string
}

export interface BrandBook {
  _meta: { note: string; updated: string }
  brands: Record<string, BrandEntry>
}

export interface InteractionRule {
  a: string
  b: string
  severity: Exclude<SafetySeverity, 'info'>
  title: string
  mechanism: string
  action: string
  source: string
}

export interface InteractionBook {
  _meta: { note: string; updated: string }
  pairs: InteractionRule[]
}

export interface BeersRule {
  id: string
  generics: string[]
  minAge: number
  severity: Exclude<SafetySeverity, 'info'>
  title: string
  plainLanguage: string
  action: string
  source: string
}

export interface BeersBook {
  _meta: { note: string; updated: string }
  rules: BeersRule[]
}

export interface MissedDoseRule {
  drugClasses: string[]
  guidance: string
  source?: string
}

export interface MissedDoseBook {
  _meta: { note: string; updated: string }
  default: string
  rules: MissedDoseRule[]
}

/* ------------------------------- backend -------------------------------- */

export interface ApiEnvelope<T> {
  data: T
  error?: string
}

export interface SyncRequest {
  profile: Profile
  medications: Medication[]
  events: DoseEvent[]
}

export interface SyncResponse {
  ok: boolean
  syncedAt: string
}

/* -------------------------- Gemini document scan ------------------------- */

/** Gemini's read of the document header. The client adds provenance and ids. */
export interface ScannedPrescription {
  issuedDate?: string
  documentDate?: string
  prescriberName?: string
  prescriberSpecialty?: string
  clinicName?: string
  prescriberPhone?: string
  pharmacyName?: string
  pharmacyPhone?: string
  pharmacyBillDate?: string
  billNumber?: string
  directionsText?: string
  durationDays?: number
  refillsAuthorized?: number
  confidence?: number
  ocrText?: string
  kind?: PrescriptionSourceKind
}

/** A medicine draft the user must confirm before it enters the plan. */
export interface ScannedMedication {
  brandName: string
  genericName?: string
  strength?: string
  doseAmount?: number
  doseUnit?: string
  form?: MedicationForm
  foodRelation?: FoodRelation
  scheduleType?: ScheduleType
  times?: string[]
  intervalHours?: number
  durationDays?: number
  quantityDispensed?: number
  refillsAuthorized?: number
  reason?: string
  directionsRaw?: string
  sourceDetail?: string
  confidence?: number
}

export interface ScanResponse {
  prescription: ScannedPrescription
  medications: ScannedMedication[]
  /** Things the scanner could not read and the user must check. */
  warnings: string[]
  model: string
  sha256: string
}
