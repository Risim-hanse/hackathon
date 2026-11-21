# MediTrack SafetyNet: Medication Adherence & Clinical Decision Support System

> **Domain:** Healthcare (PS02: Smart Medicine Reminder)  
> **Frontend:** [https://risim-hanse.github.io/hackathon/](https://risim-hanse.github.io/hackathon/)  
> **Backend:** Containerized FastAPI + SQLite Service  
> **Architecture:** Client-side local-first Progressive Web Application with optional persistence mirror.

---

## 1. System Overview

MediTrack SafetyNet is a local-first medication schedule management and clinical decision support system designed for geriatric patients and caregivers. The system combines deterministic client-side safety verification, circadian schedule generation, multimodal prescription parsing, and caregiver audit reporting.

All clinical safety checks, schedule generation, and data persistence execute client-side in the browser, eliminating latency, external service dependencies, and network failure modes during evaluation.

---

## 2. Clinical Safety Engine

The safety engine operates deterministically via pure TypeScript functions using pre-compiled clinical databases (`brands.json`, `interactions.json`, `beers.json`).

### 2.1 Brand to Generic Normalization
* Resolves over 80 Indian pharmaceutical trade names to standardized generic molecules (e.g., Crocin to Paracetamol, Ecosprin to Aspirin, Warf to Warfarin, Glycomet to Metformin, Telma to Telmisartan, Alprax to Alprazolam).
* Normalizes strength units, dosage forms, and routes of administration.

### 2.2 Duplicate Active Ingredient & Daily Ceiling Analysis
* Detects therapeutic duplication across multiple concurrently active brand formulations.
* Computes cumulative daily exposure in milligrams across all scheduled doses.
* Evaluates total daily dose against established clinical thresholds:
  * Paracetamol: Cumulative daily limit of 4,000 mg (flags hepatic toxicity risk at or above 2,000 mg for elderly patients).

### 2.3 Drug-Drug Interaction (DDI) Matrix
* Identifies pairwise clinical contraindications across three severity tiers:
  * **Major:** Warfarin + Aspirin (increased systemic and gastrointestinal hemorrhage risk); Warfarin + Ibuprofen (mucosal damage and antiplatelet inhibition).
  * **Moderate:** Metformin + Iodinated Contrast / Alcohol (risk of lactic acidosis); ACE Inhibitors / ARBs + Potassium-Sparing Diuretics (risk of hyperkalemia).
  * **Minor:** Chelation and absorption reduction (e.g., Fluoroquinolones + Calcium Carbonate).
* Outputs clinical mechanism, evidence-based recommendations, and regulatory source citations (FDA, EMA, IP).

### 2.4 Beers Criteria Screening for Geriatric Patients
* Automatically cross-references active medications against the 2023 American Geriatrics Society (AGS) Beers Criteria for patients aged 65 and older:
  * Benzodiazepines (Alprazolam, Clonazepam): Flags increased risk of cognitive impairment, delirium, ataxia, and falls.
  * Systemic NSAIDs (Ibuprofen, Diclofenac): Flags increased risk of gastrointestinal bleeding, acute kidney injury, and blood pressure elevation.

### 2.5 Regimen Safety Score
* Algorithmic calculation:
  $$\text{Score} = \max(0, 100 - (35 \times N_{\text{Major}}) - (15 \times N_{\text{Moderate}}) - (10 \times N_{\text{Beers}}) - (5 \times N_{\text{Minor}}))$$
* Severity classifications:
  * **85 to 100:** Safe Regimen
  * **60 to 84:** Clinical Review Recommended
  * **0 to 59:** High-Risk Regimen

---

## 3. Medication Scheduling & State Engine

### 3.1 Temporal Cadence Models
* **Fixed Times:** Explicit wall-clock times (e.g., 08:00, 20:00).
* **Meal Anchored:** Relative circadian meal timings (Empty stomach, Before meal, With meal, After meal, Bedtime).
* **Interval:** Every N hours (e.g., every 6 hours, every 8 hours).
* **As-Needed (PRN):** Non-scheduled doses subject to 24-hour frequency limits and minimum interval enforcement.

### 3.2 Dose Execution State Machine
Every generated dose transitions through strict states:
* `scheduled`: Future or currently due dose.
* `taken`: Administered on time (within 2-hour grace window).
* `late`: Administered beyond the 2-hour grace window but within the 4-hour missed threshold.
* `missed`: Unrecorded after 4 hours from scheduled time.
* `skipped`: Explicitly declined by user with mandatory clinical reason code (Side effect, Felt fine, Forgot, Nausea, Doctor advised, Ran out).
* `snoozed`: Deferred by 15, 30, or 60 minutes.

### 3.3 Event Audit Logging & Rollback
* Append-only event store (`DoseEvent`) recording timestamp, dose identifier, action type, and optional notes.
* Instant 6-second undo mechanism allowing complete state rollback for accidental input.

---

## 4. Multimodal Document Parsing & Provenance

* **Document Ingestion:** Ingestion of prescription photographs, pharmacy invoices, and medication package labels.
* **Extraction Pipeline:** FastAPI backend endpoint (`POST /api/scan`) utilizing Gemini Flash for structured field extraction.
* **Extracted Schema:**
  * Trade name, generic molecule, dosage form, strength, frequency, and administration instructions.
  * Prescriber name, clinic identifier, dispensing pharmacy, bill date, and document invoice number.
* **Audit Trail:** Stores SHA-256 document checksum, timestamped scan records, and localized image references in client storage.

---

## 5. Geriatric Accessibility & Interface Specifications

* **Visual Contrast:** High-contrast color palette exceeding WCAG AAA 7:1 contrast ratios.
* **Typography Scaling:** Two-state typography controller providing standard 18px base text and enlarged 24px base text.
* **Target Ergonomics:** All interactive touch targets are constrained to a minimum of 48px by 48px.
* **Speech Synthesis:** Native Web Speech API integration (`SpeechSynthesis`) providing auditory schedule playback.
* **Hero Focus Layout:** Primary viewport dedicated to the immediate actionable dose to minimize cognitive load.

---

## 6. Caregiver Integration & Clinical Export

* **WhatsApp Summary Generation:** Formats current daily adherence, pending doses, inventory depletion alerts, and active safety findings into a pre-filled `wa.me` uniform resource identifier.
* **Clinical Print Summary:** Dedicated CSS print stylesheet (`@media print`) rendering a structured one-page medical consultation document via `window.print()`.
* **Missed-Dose Protocols:** Class-specific guidance rules for delayed administration (e.g., Antihypertensives, Statins, Antibiotics) with integrated telephone dialing links (`tel:`).

---

## 7. Technology Stack

* **Frontend:** React 18, TypeScript 5 (Strict), Vite 7, Tailwind CSS, Lucide React.
* **Persistence:** Client-side LocalStorage and IndexedDB (source of truth).
* **Backend:** FastAPI (Python 3.12), SQLite, Google GenAI SDK.
* **Testing:** Vitest (38 unit tests), Pytest, Chrome DevTools Protocol smoke test.
* **Deployment:** GitHub Pages (Static Frontend), Render (Dockerized API).

---

## 8. Verification & Local Development

### Frontend
```powershell
cd frontend
npm install
npm run test
npm run dev
```

### Backend
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pytest
python -m uvicorn app.main:app --reload --port 8000
```

### End-to-End Smoke Test
```powershell
node scripts/smoke.js http://localhost:5173
```
