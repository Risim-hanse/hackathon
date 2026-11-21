# MediTrack SafetyNet: Smart Medicine Reminder & Clinical Safety Shield

> **Hackathon Track: PS02 (Healthcare Domain)**  
> **Live App (Frontend):** [https://risim-hanse.github.io/hackathon/](https://risim-hanse.github.io/hackathon/)  
> **Backend API (Render):** Dockerized FastAPI service with Gemini document OCR support  
> **Philosophy:** Local-first, zero-backend dependency on the critical path, privacy-preserving, and accessible.

---

## 1. Problem Statement & The Real-World Crisis

### The Hackathon Prompt (PS02)
> Many individuals, particularly elderly people, often forget their medication schedules, making it difficult to maintain consistent healthcare routines. Develop a simple web application that helps users organise, manage and track their daily medication schedules through an accessible and user-friendly platform.

### The Problem Reframing: Beyond The "Dumb Alarm Clock"
Most medication reminder apps fail because they treat pills like calendar events. They assume patients miss doses simply because they lack an alarm clock.

In reality, elderly patients face much more dangerous clinical and cognitive hurdles:

1. **Polypharmacy Chaos:** An elderly patient visits a cardiologist, an orthopedist, and a family doctor. Each prescribes medications without knowing what the others gave. Taking Dolo 650 alongside Combiflam leads to dangerous cumulative paracetamol overdose. Taking Warfarin alongside Aspirin causes severe gastrointestinal bleeding risk.
2. **Habitual Memory Blending:** Because taking morning pills has been a daily routine for a decade, yesterday's memory blends into today. Seniors frequently ask themselves: *"Did I take my blood pressure tablet at 8:00 AM today, or was that yesterday?"* Guessing wrong leads to either missed therapy or dangerous double-dosing.
3. **Physical and Sensory Barriers:** Tiny buttons, gray-on-white text, and medical jargon (such as OD, BD, TDS, PC) alienate elderly users who struggle with cataracts, tremors, and arthritis.
4. **The Moment-of-Failure Panic:** When a dose is missed by 3 hours, patients do not know whether to take it immediately, skip it, or double up at night.

**MediTrack SafetyNet is not an alarm clock. It is an active clinical safety shield and cognitive buffer.**

---

## 2. Core Architecture & Philosophy

```
┌───────────────────────────────── Browser (React SPA) ─────────────────────────────────┐
│                                                                                       │
│   components/ ──► hooks/ ──► engine/ (Pure TypeScript) ──► data/*.json                │
│        │                        │                                                     │
│        │                        └── scheduler, safety, score, adherence               │
│        │                                                                              │
│   integration (App.tsx) ──► storage/localStore (Client Source of Truth)               │
│        │                                                                              │
│        └──► services/apiClient ── best-effort, never blocks ──┐                       │
└───────────────────────────────────────────────────────────────┼───────────────────────┘
                                                                │ HTTPS
                                                   ┌────────────▼────────────┐
                                                   │ FastAPI + SQLite Mirror │
                                                   │ (Optional, Ephemeral)   │
                                                   └─────────────────────────┘
```

1. **Frontend is the Product and Source of Truth:** The React SPA runs 100% locally in the user's browser. It works offline, has zero cold-start latency, and protects patient privacy.
2. **Deterministic Clinical Engine in Pure TypeScript:** All drug interaction checks, duplicate generic calculations, and scheduling logic execute client-side in under 10ms with zero network calls.
3. **Backend is an Optional Mirror:** The FastAPI and SQLite backend provides durable event backup, export options, and Gemini prescription OCR. If the backend is asleep or unreachable, the entire frontend still functions smoothly.
4. **Zero-Friction Hackathon Evaluation:** Features a pre-seeded demo profile (Meera, 68) that instantly demonstrates polypharmacy detection, drug conflicts, and voice narration with zero typing required.

---

## 3. Key Feature Highlights

### A. The Clinical Safety Shield
* **Indian Brand to Generic Resolver:** Normalizes over 80 common Indian pharmaceutical brands (such as Crocin, Dolo, Ecosprin, Warf, Glycomet, Telma, Amlong, Alprax, Combiflam, and Shelcal) into their active molecules.
* **Duplicate Generic & Daily Ceiling Monitor:** Sums total active milligrams across all brands. If a patient takes multiple paracetamol-containing products exceeding 4,000 mg per day, the engine triggers a severe hepatotoxicity warning.
* **Curated Drug-Drug Interaction Matrix:** Flags clinical collisions with severity tiers (Major, Moderate, Minor), detailed mechanisms, actionable steps, and medical citations (for example, Warfarin + Aspirin bleeding hazards).
* **AGS Beers Criteria 2023 Senior Filter:** Flags medications that are potentially inappropriate for patients aged 65 and older (such as benzodiazepines like Alprazolam for fall risks, and systemic NSAIDs for ulceration and kidney stress).
* **Transparent Regimen Safety Score:** Computes a composite 0 to 100 safety score categorized into Safe (85-100), Review Recommended (60-84), and High Risk (below 60).

### B. Senior-First Cognitive Ergonomics (Tier E Accessibility)
* **Single Next-Dose Hero Focus:** The main screen displays one clear primary card showing the immediate next dose anchored to meals (such as *"Dolo 650: Take after lunch"*).
* **Circadian 4-Bucket Day View:** Automatically categorizes doses into Morning, Afternoon, Evening, and Bedtime sections.
* **One-Tap Actions with 6-Second Undo:** Large buttons for Taken, Late, Skip (with structured reason selection), and Snooze (15, 30, or 60 minutes). An undo toast allows one-tap reversal for accidental touches.
* **7:1 High Contrast & 24px Large Text Modes:** Instant toggle for high-contrast viewing and large typography adhering to WCAG standards.
* **Web Speech Audio Narration:** Uses the native browser SpeechSynthesis API to vocalize today's schedule out loud in clear, calm speech.
* **Large Touch Targets:** Interactive targets are sized to at least 48px by 48px to accommodate tremors and joint stiffness.

### C. Multimodal Gemini Prescription Scanner
* **Camera & Image Ingestion:** Upload or photograph doctor prescriptions, pharmacy bills, and medication packages.
* **Structured Information Extraction:** Uses Gemini Flash models via FastAPI to extract drug names, strengths, forms, frequencies, and instructions.
* **Provenance Tracking:** Preserves the original image thumbnail, prescriber name, clinic, pharmacy, bill date, and SHA-256 document hash for complete clinical lineage.

### D. Zero-Backend Caregiver Safety Net
* **WhatsApp Summary Dispatch:** Generates pre-formatted daily adherence reports with a single tap using `wa.me` links, requiring zero SMS gateways or cloud accounts.
* **One-Page Printable Doctor Summary:** Clean print stylesheet accessible via `window.print()` that formats medications, 7-day adherence statistics, and active clinical alerts for physical doctor visits.
* **Clinical Missed-Dose Protocols:** Class-specific instructions for missed doses (such as blood pressure tablets, statins, or antibiotics) coupled with direct telephone links (`tel:`) to caregivers and pharmacists.

---

## 4. Dual Experience Modes

MediTrack provides two tailored experience modes accessible directly from the header:

| Feature | Elderly Mode | Caregiver Mode |
| :--- | :--- | :--- |
| **Primary Focus** | Maximum simplicity: Next-dose card and giant action buttons | Complete oversight: Document provenance, audit logs, and adherence metrics |
| **Typography & Sizing** | Default 20px-24px high-contrast view | Standard dashboard density with detailed clinical metadata |
| **Audio Read-Aloud** | Prominently available on every dose card | Optional verification tool |
| **Document Lineage** | Displays simple source labels | Displays full clinic names, pharmacy phone numbers, and cryptographic image hashes |

---

## 5. Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18 + TypeScript 5 (Strict) | Declarative, pure component tree with zero UI bloat |
| **Build Tooling** | Vite 7 | Sub-second hot module replacement and optimized production builds |
| **Styling** | Tailwind CSS + Custom CSS Variables | Dynamic high-contrast tokens, scalable typography, and print rules |
| **Icons** | Lucide React | Lightweight, accessible SVG iconography |
| **Local Persistence** | Custom LocalStorage Store | Client-side source of truth with schema versioning and image caching |
| **Backend API** | FastAPI (Python 3.12) + SQLite | Ephemeral persistence mirror, data export, and scan proxy |
| **AI Vision Scanner** | Google GenAI SDK (Gemini Flash) | Secure backend multimodal extraction for prescriptions and pharmacy bills |
| **Testing** | Vitest (Frontend) + Pytest (Backend) | 38 client engine unit tests covering safety, scoring, and scheduling |
| **Deployment** | GitHub Pages (Frontend) + Render Docker (API) | Highly available static edge delivery combined with containerized backend services |

---

## 6. Project Directory Structure

```
hackathon/
├── Dockerfile                      # Root Dockerfile for containerized Render API deployment
├── docker-compose.yml              # Local multi-service orchestration
├── render.yaml                     # Render deployment blueprint
├── docs/                           # Architectural blueprints and contract specifications
│   ├── ARCHITECTURE.md             # System architecture and layer boundaries
│   ├── CONTRACTS.md                # Shared domain schemas and interface contracts
│   ├── ENGINE_API.md               # Pure TypeScript engine documentation
│   └── PROJECT_TODOS.md            # Execution tracker and milestone roadmap
├── backend/                        # Optional FastAPI persistence mirror
│   ├── app/
│   │   ├── main.py                 # FastAPI application entrypoint and CORS setup
│   │   ├── routes.py               # Profile sync, health check, and export routes
│   │   ├── scan.py                 # Gemini multimodal prescription extraction
│   │   ├── schemas.py              # Pydantic validation contracts
│   │   └── settings.py             # Environment configuration
│   ├── requirements.txt            # Python dependencies
│   └── tests/                      # Pytest API test suite
├── frontend/                       # Client-side React 18 application
│   ├── index.html                  # HTML5 entrypoint with accessibility headers
│   ├── src/
│   │   ├── main.tsx                # React application bootstrapper
│   │   ├── App.tsx                 # Root layout and tab coordinator
│   │   ├── shared/                 # Shared data contracts and constants
│   │   ├── data/                   # Curated Indian brands, interactions, and Beers JSON
│   │   ├── engine/                 # Pure TypeScript clinical engine and scheduler
│   │   │   ├── scheduler.ts        # Dose expansion, grace periods, and status math
│   │   │   ├── safety.ts           # Duplicate generic and interaction evaluators
│   │   │   ├── score.ts            # Regimen safety score calculator (0 to 100)
│   │   │   └── adherence.ts        # 7-day adherence and streak calculations
│   │   ├── storage/                # LocalStorage engine and IndexedDB image storage
│   │   ├── hooks/                  # React state coordination hooks
│   │   └── components/             # Accessible UI views
│   │       ├── today/              # Hero card and circadian timeline
│   │       ├── meds/               # Medication management and scanner modal
│   │       ├── safety/             # Regimen safety score and alert cards
│   │       ├── adherence/          # 7-day adherence charts and missed-slot insights
│   │       └── caregiver/          # WhatsApp share generator and print view
└── scripts/                        # Verification and smoke test utilities
    ├── smoke.js                    # Headless Chrome DevTools Protocol test suite
    └── check.ps1                   # Local health and linting check script
```

---

## 7. Quickstart & Local Development

### Prerequisites
* Node.js v20 or later
* Python 3.11 or later
* PowerShell or Bash

### 1. Run the Frontend Locally
```powershell
cd frontend
npm install
npm run dev
```
The application will launch immediately at `http://localhost:5173`.

### 2. Run the Backend API (Optional)
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```
Health check endpoint: `http://localhost:8000/api/health`.

### 3. Run the Automated Test Suites
Run the 38 frontend unit tests:
```powershell
cd frontend
npm run test
```

Run the backend test suite:
```powershell
cd backend
pytest
```

Run the end-to-end headless Chrome smoke test:
```powershell
node scripts/smoke.js http://localhost:5173
```

---

## 8. Hackathon 2-Minute Judging Walkthrough Script

Follow these steps to evaluate the application end-to-end:

1. **Open the live application:** Visit [https://risim-hanse.github.io/hackathon/](https://risim-hanse.github.io/hackathon/).
2. **Load the demo profile:** On the welcome screen, click **"Load demo (Meera, 68)"**. The app instantly populates a realistic polypharmacy regimen consisting of Dolo 650, Crocin 500, Ecosprin 75, Warf 2mg, and Alprax 0.25mg.
3. **Experience the Today screen:** Notice the single **Next-Dose Hero Card** at the top. Click **"I TOOK THIS"**. An undo notification appears at the bottom allowing instant reversal.
4. **Inspect the Clinical Safety tab:** Click the **Safety** tab. Notice the **Safety Score of 50/100 (Review Needed)**:
   * **Severe Warning:** Crocin + Dolo = Duplicate Paracetamol intake totaling 2.3g per day.
   * **Major Interaction:** Warfarin + Aspirin (Ecosprin) bleeding hazard with clinical citation.
   * **Beers Criteria Warning:** Alprazolam flagged for fall risk and ataxia in patients over age 65.
5. **Test Senior Accessibility:** In the top header, toggle **Large Text** (switches to 24px typography), toggle **High Contrast** (enables 7:1 AAA contrast), and click **Read Aloud** to hear the browser speak upcoming doses.
6. **Test Caregiver Sharing:** In the header, click **Share**. Review the pre-formatted WhatsApp report (`wa.me`) and test **Print summary** to preview the clean one-page clinical doctor handout.
7. **Test Prescription OCR:** In the Medicines tab, click **Scan prescription** to test document ingestion and review the structured extraction preview.

---

## 9. License & Medical Disclaimer

This project was built for educational and hackathon demonstration purposes. MediTrack SafetyNet is designed to assist patients and family caregivers with organization and general drug awareness. It does not replace professional medical advice, clinical diagnosis, or individualized treatment plans from licensed healthcare providers. Patients should always confirm medication changes with their prescribing physician or pharmacist.
