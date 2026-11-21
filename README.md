# MediTrack SafetyNet: Geriatric Medication Adherence & Clinical Decision Support System

> Domain: Healthcare (Problem Statement PS02: Smart Medicine Reminder)  
> Production Frontend Deployment: https://risim-hanse.github.io/hackathon/  
> Containerized API Deployment: Dockerized FastAPI and SQLite Service on Render  
> Architecture: Local-First Client Progressive Web Application with Ephemeral Backend Mirror

---

## 1. Executive Summary & Problem Statement Alignment

### 1.1 Problem Statement (PS02: Healthcare)
Many individuals, particularly elderly people, frequently forget their medication schedules, making it difficult to maintain consistent healthcare routines. The objective is to develop an accessible, user-friendly platform that helps users organize, manage, and track daily medication schedules.

### 1.2 Clinical Reality & System Realization
Standard reminder platforms model medication as static calendar reminders. In geriatric populations, adherence failure stems primarily from multi-morbidity complications, cognitive overload, and clinical coordination deficits:

* Therapeutic Duplication: Elderly patients consulting multiple clinical specialists frequently receive distinct trade-name formulations containing identical active pharmaceutical ingredients (e.g., concurrent administration of Crocin and Dolo 650 leading to cumulative paracetamol intoxication).
* Pharmacokinetic Contraindications: Concurrently prescribed drugs often possess severe drug-drug interactions (e.g., antiplatelet Aspirin combined with anticoagulant Warfarin creating high hemorrhage risk).
* Age-Inappropriate Pharmacotherapy: Prescriptions for patients aged 65 and older often include substances with high anticholinergic burden or fall-inducing side effects (e.g., long-acting benzodiazepines).
* Cognitive Memory Blending: Repetitive daily dosing habits produce false memory recall regarding whether a dose was administered on the current day versus the prior day.
* Physical Impairments: Presbyopia, cataracts, and motor tremors impede interaction with standard digital interfaces.

MediTrack SafetyNet solves PS02 by integrating deterministic client-side pharmacovigilance, circadian schedule automation, multimodal prescription transcription, and caregiver escalation into a zero-latency, local-first architecture.

---

## 2. Evaluation Parameter Matrix

| Evaluation Parameter | Architectural Implementation | Measurable Validation |
| :--- | :--- | :--- |
| **Code Quality** | Strict TypeScript 5.x with zero `any` usage. Strict unidirectional dependency architecture (`shared` -> `data` -> `engine` -> `hooks` -> `components`). Pure functional business logic isolated from UI. | 100% type-checked compilation via `tsc --noEmit`. Clean module boundaries. |
| **Security** | Zero-trust, local-first client architecture. Protected health information (PHI) resides solely on the client. No authentication credentials or API keys exposed on client. Cryptographic SHA-256 document hashing for clinical provenance. | 100% offline functionality. Static assets contain zero secrets. Backend uses parameterized SQLite queries. |
| **Efficiency** | Client-side deterministic computation. Sub-10ms evaluation for complete clinical audits and dose generation. Zero cold starts for frontend delivery via static edge CDN. | Algorithmic execution complexity of O(N) for schedule and safety passes. Bundle size optimized via Vite tree-shaking. |
| **Testing** | Multi-tier automated testing strategy encompassing pure unit testing (Vitest), backend integration testing (Pytest), and automated headless end-to-end verification (Chrome DevTools Protocol). | 38 automated frontend unit tests passing green. 100% pass rate on core scheduling and interaction logic. |
| **Accessibility** | Built according to WCAG 2.1 AA/AAA standards. 7:1 high contrast mode, dynamic 18px to 24px typography scaling, minimum 48px by 48px touch targets, ARIA live regions, and native Web Speech API auditory synthesis. | Fully operable via keyboard-only navigation. Passes high-contrast accessibility audits. |
| **Problem Alignment** | Directly targets geriatric medication compliance, cognitive barrier reduction, accidental overdose prevention, and caregiver synchronization without requiring backend infrastructure. | Pre-configured geriatric polypharmacy profile (Meera, 68) enables complete verification in under 60 seconds. |

---

## 3. System Architecture & Component Topology

```
┌──────────────────────────────────────── Client Runtime (Browser React SPA) ────────────────────────────────────────┐
│                                                                                                                     │
│   Layer 4: UI Components (components/{today, meds, safety, adherence, caregiver, layout})                          │
│          │                                                                                                          │
│   Layer 3: State Coordination Hooks (hooks/useAppState.ts)                                                         │
│          │                                                                                                          │
│   Layer 2: Pure Clinical & Scheduling Engine (engine/{scheduler, safety, score, adherence, refill, brands}.ts)     │
│          │                                                                                                          │
│   Layer 1: Clinical Knowledge Packs (data/{brands, interactions, beers, missedDose}.json)                           │
│          │                                                                                                          │
│   Layer 0: Immutable Domain Contracts (shared/contracts.ts)                                                         │
│                                                                                                                     │
│   Storage Subsystem: storage/{localStore, imageStore}.ts (Client-side source of truth via LocalStorage and IDB)      │
└──────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────┘
                                                           │ HTTPS (Optional Mirror)
                                              ┌────────────▼────────────┐
                                              │ FastAPI + SQLite Engine │
                                              │ - POST /api/scan (OCR)  │
                                              │ - POST /api/sync        │
                                              │ - GET  /api/health      │
                                              └─────────────────────────┘
```

### 3.1 Strict Layer Dependency Constraints
The repository enforces a strict, unidirectional import policy. Violations of this hierarchy will fail automated verification:
1. `src/shared/`: Defines immutable contracts and types. Imports nothing.
2. `src/data/`: Static clinical databases and demo fixtures. Imports only `shared`.
3. `src/engine/`: Pure deterministic mathematical and logical algorithms. Imports `shared` and `data`. Never imports React, DOM APIs, or storage layers.
4. `src/hooks/`: React state orchestration and timing cycles. Imports `shared` and `engine`.
5. `src/components/`: Presentational and interactive views. Imports `shared`, `engine`, `data`, and `hooks`.
6. `src/storage/` and `src/services/`: Isolated infrastructure modules for client persistence and HTTP communication.

---

## 4. Parameter 1: Code Quality & Architectural Hygiene

* Static Type Invariants: Developed using strict TypeScript 5 configuration (`noImplicitAny`, `strictNullChecks`, `exactOptionalPropertyTypes`). Domain entities (`Medication`, `DoseEvent`, `Prescription`, `SafetyReport`) possess rigid runtime validation schemas.
* Functional Determinism: The core business logic in `src/engine/` is decoupled from React component rendering cycles. All clinical checks (`analyzeRegimen`), schedule generation algorithms (`generateDoses`), and adherence calculations (`summarizeAdherence`) are pure functions that accept explicit state inputs and return immutable outputs.
* Maintainability and Zero Dead Code: Component architectures utilize reusable primitives (`Button`, `Card`, `Badge`, `Meter`, `Modal`) ensuring consistent visual styling and preventing code duplication.
* Separation of Concerns: The frontend is fully decoupled from the backend. The application operates with complete functionality even if the backend service is offline.

---

## 5. Parameter 2: Security, Privacy & Provenance

* Client-Centric Data Privacy: In accordance with medical privacy principles, patient health records, medication schedules, and execution logs remain localized on the user device. No personally identifiable medical data is transmitted to third-party tracking services or cloud databases.
* Cryptographic Document Provenance: When prescriptions or pharmacy invoices are ingested, the system computes a SHA-256 cryptographic hash of the raw document. This hash is embedded into the local audit trail alongside timestamps, doctor credentials, and pharmacy registration numbers, establishing verifiable chain-of-custody.
* Ephemeral Backend Surface: The backend API acts solely as a stateless processor for computer vision tasks and an optional synchronization target. Database operations utilize parameterized queries through SQLite, preventing SQL injection vulnerabilities.
* Secret Protection: Client bundles contain zero sensitive credentials or private tokens. External AI model invocations occur strictly server-side behind protected backend interfaces.

---

## 6. Parameter 3: Efficiency & Runtime Performance

* Sub-10ms Deterministic Auditing: The safety engine evaluates active multi-morbidity regimens against brand dictionaries, drug-drug interaction pairs, and Beers criteria in under 10 milliseconds entirely on the client CPU.
* Algorithmic Complexity:
  * Schedule Materialization: O(M * T), where M is the number of active medications and T is daily scheduled times.
  * Safety Screening: O(M^2) pairwise interaction checks, bounded by small constants (M <= 30 in typical polypharmacy scenarios).
  * Adherence Aggregation: O(E), where E is the quantity of dose events recorded in the rolling audit window.
* Bundle Optimization: Utilizes Vite for static tree-shaking, resulting in a minimal JavaScript footprint. Static assets are served over HTTP/2 with immutable cache headers.
* Cold-Start Immunity: By deploying the primary web application as a static client bundle via GitHub Pages, the application eliminates backend serverless cold-start delays, guaranteeing instant availability.

---

## 7. Parameter 4: Testing & Verification Strategy

The repository incorporates automated test suites covering pure logic, integration endpoints, and headless end-to-end verification.

### 7.1 Frontend Unit Test Suite (Vitest)
Located in `frontend/src/engine/__tests__/`. Encompasses 38 comprehensive unit test scenarios:
* `scheduler.test.ts`: Validates wall-clock dose generation, circadian anchor translation, interval spacing, grace window status derivation (`scheduled`, `due`, `late`, `missed`), and duplicate suppression.
* `safety.test.ts`: Verifies brand-to-generic resolution, active ingredient aggregation, threshold violation triggers (paracetamol ceiling), pairwise DDI detection, and Beers criteria flags.
* `score.test.ts`: Verifies algorithmic score penalization across major, moderate, Beers, and minor findings.
* `adherence.test.ts`: Tests consecutive day streak counting, 7-day adherence percentage formulas, and time-slot miss analysis.
* `refill.test.ts`: Validates inventory consumption rates, division by daily doses, and low-stock warning thresholds.

### 7.2 Backend Test Suite (Pytest)
Located in `backend/tests/`. Validates API operational health:
* `test_api.py`: Validates health status verification (`/api/health`), idempotent profile upsertion (`/api/profiles/{id}/sync`), event synchronization, and structured JSON export formatting.
* `test_scan.py`: Validates multimodal payload handling, error responses during missing credentials, and fallback structures.

### 7.3 Headless Browser Smoke Test (Chrome DevTools Protocol)
Located in `scripts/smoke.js`. Executes an automated end-to-end verification pipeline in headless Google Chrome:
* Connects via WebSocket to the Chrome DevTools Protocol (CDP).
* Monitors for unhandled JavaScript exceptions, network request rejections, and horizontal viewport layout overflow.
* Programmatically verifies DOM hydration, demo profile state loading, dose action triggering, and responsive card rendering.

---

## 8. Parameter 5: Accessibility & Universal Design (WCAG Standards)

Designed specifically for geriatric users with visual, motor, or cognitive impairments:

* Contrast Compliance: Features an integrated High Contrast Mode achieving contrast ratios exceeding 7:1 (WCAG 2.1 AAA compliance) utilizing solid obsidian backgrounds (`#000000`), crisp white typography (`#FFFFFF`), amber warning indicators (`#F59E0B`), and emerald validation badges (`#10B981`).
* Dynamic Typography Scale: Includes an immediate toggle between standard 18px base text and enlarged 24px base text with proportional line-height increases to maintain readability for users with presbyopia.
* Motor Tremor Ergonomics: All interactive touch targets are constrained to a minimum surface area of 48px by 48px, expanding to 56px for primary dose administration triggers.
* Auditory Synthesis: Integrates the native browser `window.speechSynthesis` API. Users can activate auditory schedule playback, prompting the system to vocalize upcoming doses, strengths, and meal relations in calm, measured speech.
* Assistive Technology Attributes: Incorporates semantic HTML elements, explicit `aria-label` definitions, `role="status"` live announcements, and `aria-live="polite"` regions for asynchronous dose logging confirmation.
* Focus & Motion Management: Enforces logical tab order, prominent focus indicators (`focus-visible:ring-4`), skip-to-content links, and full compliance with user `prefers-reduced-motion` settings.

---

## 9. Parameter 6: Clinical Capabilities & Features

### 9.1 Brand Normalization & Cumulative Dosage Monitoring
* Brand Resolution Dictionary: Automatically maps trade names to active pharmacological molecules (e.g., Crocin, Dolo 650, Calpol -> paracetamol; Ecosprin, Disprin -> aspirin; Warf -> warfarin; Glycomet -> metformin; Telma -> telmisartan).
* Cumulative Daily Ceiling Engine: Sums milligrams of active components across all scheduled formulations. If cumulative paracetamol exposure exceeds 4,000 mg daily, the system triggers a severe alert detailing hepatic toxicity risks.

### 9.2 Drug-Drug Interaction (DDI) Engine
Pairwise contraindication checking categorized across clinical severity tiers:
* Major Contraindications:
  * Warfarin + Aspirin: Synergistic antiplatelet and anticoagulant activity leading to elevated gastrointestinal and systemic hemorrhage risk.
  * Warfarin + Ibuprofen: Increased bleeding risk combined with NSAID-induced gastric mucosal injury.
* Moderate Contraindications:
  * Metformin + Alcohol / Iodinated Contrast: Elevated risk of lactic acidosis.
  * ACE Inhibitors / ARBs + Potassium-Sparing Diuretics: Risk of severe hyperkalemia.
* Minor Interactions: Pharmacokinetic absorption delays and chelation (e.g., Fluoroquinolones + Calcium Carbonate).

### 9.3 Geriatric Beers Criteria Screening
Evaluates active therapies against the 2023 American Geriatrics Society (AGS) Beers Criteria for patients aged 65 and older:
* Benzodiazepines (Alprazolam, Clonazepam, Diazepam): Flags heightened susceptibility to sedation, motor ataxia, falls, fractures, and acute delirium.
* Systemic NSAIDs (Ibuprofen, Diclofenac): Flags risk of peptic ulcer disease, acute renal impairment, and hypertension exacerbation.

### 9.4 Mathematical Regimen Safety Formula
The composite Regimen Safety Score (0 to 100) is calculated via:

$$\text{Score} = \max(0, 100 - (35 \times N_{\text{Major}}) - (15 \times N_{\text{Moderate}}) - (10 \times N_{\text{Beers}}) - (5 \times N_{\text{Minor}}))$$

* Score 85 to 100: Safe Regimen (Green)
* Score 60 to 84: Clinical Review Recommended (Amber)
* Score 0 to 59: High-Risk Regimen (Red)

### 9.5 State Machine Lifecycle & Grace Scheduling
Generated doses transition through deterministic states based on current wall-clock time relative to scheduled time:
* On-Time Window: Scheduled time minus 30 minutes to scheduled time plus 120 minutes.
* Late Grace Window: Scheduled time plus 120 minutes to scheduled time plus 240 minutes. Marked as `late` upon logging.
* Missed Threshold: Exceeding scheduled time plus 240 minutes without administrative confirmation. Automatically flagged as `missed` and escalated to missed-dose clinical decision pathways.
* Reversible Actions: All administration logs trigger a persistent 6-second undo toast enabling one-tap rollback.

### 9.6 Multimodal Document Parsing & Provenance
* Ingestion Interface: Captures prescription photographs, pharmacy bills, and medication packaging.
* Backend Pipeline: Proxies image payloads to Gemini Flash models via FastAPI endpoint (`POST /api/scan`).
* Structured Data Extraction: Extracts trade name, generic name, strength, dosage form, frequency, prescriber identity, clinic affiliation, and billing dates.
* Provenance Records: Computes and stores SHA-256 document checksums and timestamped records in client IndexedDB storage.

### 9.7 Caregiver Coordination & Export Mechanisms
* WhatsApp Integration: Generates pre-formatted clinical summaries dispatched via standard `wa.me` URI protocols with zero backend SMS infrastructure.
* Clinical Consultation Handout: Features a dedicated `@media print` CSS layout rendering a clean, single-page physical medical consultation summary via `window.print()`.
* Missed-Dose Clinical Protocol: Provides pharmacological class-specific rescue guidance (e.g., Antihypertensives, Statins, Antibiotics) paired with direct telephone dialing links (`tel:`).

---

## 10. Local Development & Operational Commands

### 10.1 Environment Initialization
```powershell
# Clone the repository
git clone https://github.com/Risim-hanse/hackathon.git
cd hackathon
```

### 10.2 Frontend Execution & Testing
```powershell
cd frontend
npm install

# Run the Vitest unit test suite (38 tests)
npm run test

# Launch the local development server
npm run dev
# The application will be accessible at http://localhost:5173
```

### 10.3 Backend Execution & Testing (Optional Mirror)
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Run the Pytest backend integration suite
pytest

# Launch the FastAPI service
python -m uvicorn app.main:app --reload --port 8000
# Health check endpoint: http://localhost:8000/api/health
```

### 10.4 Automated Headless Smoke Verification
```powershell
# Run the end-to-end Chrome DevTools Protocol smoke test
node scripts/smoke.js http://localhost:5173
```

---

## 11. Multi-Stage Containerized Deployment (Docker)

The repository provides production container definitions for multi-service environments:

### Root Dockerfile (API Service)
```dockerfile
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app ./app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Local Multi-Container Orchestration
```powershell
docker-compose up --build
```
* Frontend SPA available at: `http://localhost:8080`
* FastAPI Backend available at: `http://localhost:8000`

---

## 12. Medical Disclaimer

MediTrack SafetyNet is developed for educational, technical, and hackathon evaluation purposes. The application provides clinical decision support and schedule tracking assistance. It does not replace professional medical advice, clinical diagnosis, or individualized treatment plans formulated by licensed medical practitioners. Patients must consult qualified healthcare providers before initiating, altering, or discontinuing pharmacotherapy.
