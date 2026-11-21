# MediTrack — Smart Medicine Reminder & Safety Net
## System Architecture, Clinical Safety Engine & Implementation Specification

> **Hackathon Edition (PS02 — Healthcare Domain)**  
> **Target Audience:** Elderly individuals (60+ years), chronic care patients, and family caregivers.  
> **Key Architecture Philosophy:** 100% Client-Side, Local-First, Zero-Backend, Zero-Account, High-Privacy, Strict Accessibility.  
> **Deployment Target:** Dockerized SPA on Render / Static Edge CDN.

---

## 1. Executive Summary & Product Vision

### 1.1 The Real-World Problem
Elderly patients with chronic conditions (hypertension, diabetes, osteoarthritis, cardiac disease) don't miss doses simply because they lack an alarm clock. They face three compounding cognitive and physical barriers:
1. **Polypharmacy Confusion:** Taking 5–8 medications prescribed by multiple specialists, leading to unintentional duplicate dosing (e.g., taking Crocin and Dolo together).
2. **Physical & Cognitive Friction:** Impaired vision, tremors, inability to read small fonts, complex multi-step navigation, and confusing medical jargon.
3. **The "Moment of Failure" Paralysis:** When a dose is missed by 3 hours, patients don't know whether to double up, skip, or take it late, often causing severe adverse drug events.

### 1.2 Our Solution & Competitive Moat
MediTrack is an **accessible, zero-friction medication management and clinical safety shield**. Rather than being a generic CRUD calendar, MediTrack features:
- **Instant Pre-Seeded Profiles:** Zero-typing first run for 10-second judge evaluations.
- **Client-Side Clinical Safety Engine:** Real-time duplicate generic detection, maximum daily dose ceilings, curated drug-drug interaction matrix, and Beers Criteria flags for seniors.
- **Append-Only Truthful Logging:** Reversible one-tap dose logging with audit history and undo toasts.
- **Zero-Infrastructure Caregiver Escalation:** WhatsApp summary generation (`wa.me`), one-page printable doctor summaries (`@media print`), and pharmacist hotlines (`tel:`).
- **Senior-First Accessibility:** 7:1 contrast mode, 18px/24px dynamic text scale, ≥48px touch targets, and native Web Speech API schedule read-aloud.

---

## 2. Technical Stack & Architectural Invariants

| Layer | Choice | Details & Rationale |
| :--- | :--- | :--- |
| **Runtime & Bundler** | Vite 7 + Node.js 24 | Lightning-fast HMR, sub-second builds, optimal tree-shaking. |
| **Language** | TypeScript 5.x (Strict) | Absolute type safety across the medication and event domain models. |
| **UI Framework** | React 18 / 19 | Declarative UI, concurrent-safe pure rendering, native state primitives. |
| **Styling** | Tailwind CSS v4 / v3 | Utility-first styling with accessible CSS custom properties for contrast and sizing. |
| **State Management** | React `useState` + Custom `useLocalStorage` | Zero third-party state bloat. Pure local persistence with auto-save timestamps. |
| **Time Engine** | Custom Pure Functions | Pure deterministic functions (`generateDoses`, `formatTime`, `isLate`, `isMissed`). Vitest testable. |
| **Audio Engine** | Web Speech API (`speechSynthesis`) | Browser-native schedule narration. Zero external audio dependencies. |
| **Export & Sharing** | Blob API + `wa.me` + `@media print` | Client-side JSON backup/restore, WhatsApp message formatting, and clean PDF/paper print styles. |
| **Deployment** | Multi-Stage Docker (Nginx Alpine) | Containerized static deployment ready for Render, Railway, or static CDN. |

---

## 3. Core Domain Data Models

```typescript
/**
 * Forms of medication supported
 */
export type MedicationForm = 
  | 'tablet' 
  | 'capsule' 
  | 'syrup' 
  | 'injection' 
  | 'drops' 
  | 'inhaler' 
  | 'patch';

/**
 * Food timing relation
 */
export type FoodRelation = 
  | 'before_meal' 
  | 'after_meal' 
  | 'with_meal' 
  | 'empty_stomach' 
  | 'bedtime' 
  | 'anytime';

/**
 * Schedule definition
 */
export interface MedicationSchedule {
  type: 'fixedTimes' | 'everyHours' | 'asNeeded';
  /** Wall-clock times in HH:mm 24-hour format (e.g. ['08:00', '20:00']) */
  times: string[];
  /** For 'everyHours' schedules (e.g. 6, 8, 12) */
  intervalHours?: number;
}

/**
 * Inventory tracking
 */
export interface InventoryInfo {
  currentCount: number;
  unit: string;
  refillThresholdDays: number;
}

/**
 * The core Medication Entity
 */
export interface Medication {
  id: string;
  brandName: string;
  genericName: string;
  strength: string; // e.g. "650mg", "10mg"
  form: MedicationForm;
  doseAmount: number; // e.g. 1
  doseUnit: string; // e.g. "tablet"
  foodRelation: FoodRelation;
  schedule: MedicationSchedule;
  status: 'active' | 'paused' | 'stopped';
  prescriberName?: string;
  reason?: string; // e.g. "Hypertension"
  notes?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  inventory?: InventoryInfo;
  drugClass?: string;
}

/**
 * Dose Execution States
 */
export type DoseStatus = 'scheduled' | 'taken' | 'late' | 'skipped' | 'missed';

export type SkipReason = 
  | 'felt_fine' 
  | 'side_effect' 
  | 'forgot' 
  | 'nausea' 
  | 'doctor_advised' 
  | 'ran_out' 
  | 'other';

/**
 * Append-Only Dose Event Record
 */
export interface DoseEvent {
  id: string;
  doseId: string; // format: `${medId}_${date}_${time}`
  medicationId: string;
  scheduledTime: string; // ISO or YYYY-MM-DDTHH:mm
  actionTime: string;    // ISO timestamp when logged
  eventType: 'taken' | 'late' | 'skipped' | 'missed' | 'snoozed' | 'undone' | 'edited';
  skipReason?: SkipReason;
  notes?: string;
}

/**
 * User Profile & Preferences
 */
export interface UserProfile {
  name: string;
  age: number;
  caregiverName?: string;
  caregiverPhone?: string;
  pharmacistPhone?: string;
  isLargeText: boolean;
  isHighContrast: boolean;
  lateGraceMinutes: number;   // default: 120 (2h)
  missedGraceMinutes: number; // default: 240 (4h)
}
```

---

## 4. Dose State Machine & Scheduling Logic

### 4.1 State Machine Lifecycle
```
                 ┌────────────────────────────────┐
                 │           scheduled            │
                 └──────┬──────────┬──────────┬───┘
                        │          │          │
         (Within Grace) │   (Past Grace)      │ (User Skip)
                        ▼          ▼          ▼
                      taken       late     skipped ──► [Record Reason]
                        │          │          │
                        └──────────┴──────────┘
                                   │
                                   ▼
                            (Undo within 5s)
                                   │
                                   ▼
                              scheduled
```

### 4.2 Grace Periods & Status Derivation
- **Scheduled:** Dose time is in the future, or in the past by less than `lateGraceMinutes` (default: 2 hours).
- **Late:** Dose time is overdue between `lateGraceMinutes` (2h) and `missedGraceMinutes` (4h). If marked taken now, it is logged with event type `late`.
- **Missed:** Overdue by more than `missedGraceMinutes` (4h). Does not silently vanish; remains highlighted in the missed dose triage card.
- **Snooze:** Defers reminder evaluation by 15, 30, or 60 minutes without altering the underlying prescription schedule.

---

## 5. Clinical Safety & Interaction Engine

The safety engine runs **entirely in-browser** using pre-compiled, peer-reviewed clinical knowledge bases.

### 5.1 Indian Brand-to-Generic Normalization Dictionary (`brands.json`)
A curated database of ~100 primary Indian brands:
- `Crocin`, `Dolo 650`, `Calpol`, `Pacimol` $\rightarrow$ `paracetamol` (Analgesic/Antipyretic)
- `Ecosprin`, `Disprin`, `Loprin` $\rightarrow$ `aspirin` (Antiplatelet)
- `Warf`, `Uniwarfin` $\rightarrow$ `warfarin` (Anticoagulant)
- `Combiflam`, `Flexon` $\rightarrow$ `paracetamol + ibuprofen` (NSAID combo)
- `Glycomet`, `Gluformin` $\rightarrow$ `metformin` (Biguanide)
- `Amlong`, `Amlovas` $\rightarrow$ `amlodipine` (CCB)
- `Telma`, `Telmikind` $\rightarrow$ `telmisartan` (ARB)
- `Alprax`, `Restyl` $\rightarrow$ `alprazolam` (Benzodiazepine)
- `Pan 40`, `Pantocid` $\rightarrow$ `pantoprazole` (PPI)
- `Shelcal`, `Cipcal` $\rightarrow$ `calcium carbonate + vit d3`

### 5.2 Deterministic Safety Checks

#### 1. Duplicate Generic Detection & Daily Ceiling Analysis
- Evaluates active medications for matching generic components.
- Sums scheduled daily exposure (e.g., $3 \times 650\text{mg Dolo} + 2 \times 500\text{mg Crocin} = 2950\text{mg}$).
- Compares total against maximum safe daily limits (e.g. Paracetamol: $4000\text{mg/day}$).
- **Severe Alert:** Triggers immediate hepatotoxicity warning if cumulative dose exceeds ceiling or if duplicate brands are co-prescribed.

#### 2. Drug-Drug Interaction Matrix (`interactions.json`)
Pairwise clinical rule verification:
- **Major:** `warfarin` + `aspirin` $\rightarrow$ Severe gastrointestinal & systemic hemorrhage risk.
- **Major:** `warfarin` + `ibuprofen` $\rightarrow$ Antiplatelet inhibition + mucosal ulceration risk.
- **Moderate:** `metformin` + `contrast_agent` / heavy alcohol $\rightarrow$ Lactic acidosis risk.
- **Moderate:** `ace_inhibitor` / `arb` + `potassium_sparing_diuretic` $\rightarrow$ Hyperkalemia risk.
- **Moderate:** `ciprofloxacin` / `tetracycline` + `calcium` (Shelcal) $\rightarrow$ Chelation & reduced antibiotic absorption.

#### 3. AGS Beers Criteria for Seniors (Age $\ge$ 65)
Flags potentially inappropriate medications for elderly patients:
- **Benzodiazepines (`alprazolam`, `clonazepam`, `lorazepam`):** Severe risk of ataxia, falls, fractures, and cognitive worsening.
- **Systemic NSAIDs (`ibuprofen`, `diclofenac`):** High risk of GI bleed, acute renal failure, and blood pressure destabilization.
- **First-Gen Antihistamines (`chlorpheniramine`, `diphenhydramine`):** Severe anticholinergic burden, dry mouth, urinary retention, delirium.

#### 4. Regimen Safety Score (0–100)
Calculated algorithmically:
$$\text{Score} = \max(0, 100 - (35 \times N_{\text{Major}}) - (15 \times N_{\text{Moderate}}) - (10 \times N_{\text{Beers}}) - (5 \times N_{\text{Minor}}))$$
- **85–100: Safe Band (Green)**
- **60–84: Review Recommended (Amber)**
- **0–59: High Risk Alert (Red)**

Every safety finding includes:
- Clear title and plain-language explanation.
- Clinical mechanism and specific actionable steps.
- Citation of source (FDA, EMA, Indian Pharmacopoeia, AGS Beers).
- Mandatory disclaimer: *"Never alter or stop medication without consulting your doctor or pharmacist."*

---

## 6. Accessibility & Senior-Centric UX (Tier E)

1. **Text Scalability:**
   - Standard Mode: 18px base font, 1.5 line height.
   - Large Mode: 22–24px base font, high legibility.
2. **Contrast Modes:**
   - Standard Accessible Theme: Clean, modern slate palette exceeding WCAG AA.
   - High Contrast Mode: Deep black backgrounds (`#000000`), crisp white text (`#FFFFFF`), high-visibility amber alerts (`#F59E0B`), and emerald affirmations (`#10B981`) achieving $\ge 7:1$ contrast ratio.
3. **Physical Touch Ergonomics:**
   - Every primary interactive button is at least **48px $\times$ 48px** (up to 56px for primary "Taken" actions).
   - Generous finger-friendly padding and zero hover-dependent disclosures.
4. **Assistive Technology & Voice:**
   - Full keyboard navigation with visible focus rings (`focus-visible:ring-4`).
   - `aria-live="polite"` status announcements whenever a dose is logged, undone, or alerted.
   - **"Read Schedule" Button:** Uses native `window.speechSynthesis` to vocalize upcoming doses in a calm, clear voice: *"At 1:00 PM, take one tablet of Dolo 650 with food."*
5. **Pre-Seeded Demo Profile (The 10-Second Judge Hook):**
   - 1-Click button: **"Load Demo Profile: Meera (Age 68)"**.
   - Instantly populates:
     - Dolo 650 (Paracetamol)
     - Crocin 500 (Duplicate Paracetamol trigger!)
     - Ecosprin 75 (Aspirin)
     - Warf 2mg (Warfarin — Major interaction trigger!)
     - Alprax 0.25mg (Alprazolam — Beers Criteria trigger!)
   - Allows judges to immediately observe the interactive today view, the safety engine warnings, adherence metrics, and read-aloud functionality without typing.

---

## 7. Caregiver Safety Net & Outputs

### 7.1 WhatsApp Daily Summary (`wa.me`)
Generates a pre-filled, cleanly formatted WhatsApp text message with zero backend:
```
📋 MediTrack Daily Summary for Meera (Age 68)
Date: 21 Nov 2026 | Safety Score: 50/100 (Review Needed)

✅ Taken Today:
• Dolo 650mg — 08:00 AM (Taken)

⏳ Pending / Upcoming:
• Ecosprin 75mg — 01:00 PM (With Food)
• Warf 2mg — 08:00 PM (After Food)

⚠️ Safety Warnings:
• Duplicate Paracetamol: Crocin + Dolo (Total: 2.3g/day)
• Major Drug Conflict: Warfarin + Aspirin (Bleeding Risk)

Shared via MediTrack.
```

### 7.2 Printable Doctor Summary (`@media print`)
- Clean, high-density, professional single-page medical summary.
- Strips out UI buttons, banners, and dark backgrounds.
- Formats patient profile, complete medication table, 7-day adherence breakdown, and active clinical alerts.

### 7.3 Missed-Dose Rescue Guidance
Contextual action cards when a dose is missed:
- Statin / Antihypertensive: *"Take as soon as remembered unless near next dose. Never double up."*
- Antibiotics: *"Take immediately. Do not skip doses."*
- 1-Tap `tel:` link to quickly call the family caregiver or neighborhood pharmacist.

---

## 8. Directory Structure & Project Layout

```
meditrack/
├── index.html                   # HTML5 Entrypoint with Accessibility Meta
├── package.json                 # Dependencies & Scripts (Vite, React, Vitest)
├── tsconfig.json                # TypeScript Strict Configuration
├── tailwind.config.js           # Tailwind CSS with Contrast & Size Tokens
├── vite.config.ts               # Vite Configuration
├── Dockerfile                   # Multi-Stage Build (Node -> Nginx Alpine)
├── nginx.conf                   # Nginx SPA Routing & Cache Headers
├── docs/
│   └── MEDITRACK_SYSTEM_SPEC.md # This System Specification
├── src/
│   ├── main.tsx                 # Application Bootstrap
│   ├── App.tsx                  # Root Shell & State Coordination
│   ├── types/
│   │   └── index.ts             # Domain & Clinical Type Definitions
│   ├── data/
│   │   ├── brands.ts            # Indian Brand Normalization Map (~100 brands)
│   │   ├── interactions.ts      # Clinical Drug-Drug Interaction Rules
│   │   ├── beersCriteria.ts     # AGS Beers Criteria Inappropriate Drugs
│   │   └── demoProfile.ts       # 1-Click Pre-Seeded Profiles (Meera 68, Blank)
│   ├── engine/
│   │   ├── scheduler.ts         # Time, Doses Generation, Grace Calculations
│   │   ├── safetyEngine.ts      # Duplicate, Ceiling, Interaction & Beers Checkers
│   │   └── speech.ts            # Web Speech API Synthesis Helper
│   ├── hooks/
│   │   ├── useLocalStorage.ts   # Resilient Local Storage Sync Hook
│   │   └── useMedications.ts    # Medication & Event Log Orchestrator
│   ├── components/
│   │   ├── Header.tsx           # Logo, Senior Mode Toggles, Read Aloud
│   │   ├── TodayHeroCard.tsx    # Next-Dose Primary Focus Card
│   │   ├── TodayTimeline.tsx    # Chronological Dose Timeline (Log/Undo)
│   │   ├── SafetyBanner.tsx     # Regimen Score & Expandable Safety Cards
│   │   ├── MedicationModal.tsx  # Accessible Add/Edit Medication Form
│   │   ├── MissedDoseModal.tsx  # Clinical Guidance & Emergency Hotline
│   │   ├── CaregiverModal.tsx   # WhatsApp Share & Print Generator
│   │   └── Toast.tsx            # Accessible Undo Notification (5s)
│   └── styles/
│       └── index.css            # Tailwind Directives & High-Contrast Overrides
```

---

## 9. Phased Execution Trajectory (~5 Hours)

```
[00:00 - 00:45] Scaffold Vite + React + TS + Tailwind + Walking Skeleton + GitHub Push
[00:45 - 01:15] Deploy Docker/Nginx on Render / Vercel (Continuous Deployment Live!)
[01:15 - 02:30] Build Core Engines: Time/Scheduler + Clinical Safety Rules + Brand Map
[02:30 - 03:45] Assemble UI: Today Hero Card, Timeline, One-Tap Log, Undo Toast, Voice
[03:45 - 04:30] Add Caregiver Features: WhatsApp Generator, Print View, Missed-Dose Modal
[04:30 - 05:00] End-to-End Verification: Pre-seeded Demo, Axe Accessibility Audit, Freeze
```

---

*This specification serves as the single source of truth for the implementation of MediTrack.*
