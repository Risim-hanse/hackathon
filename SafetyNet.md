# SafetyNet.md — MediTrack Feature Specification

**PS02: MediTrack-Smart Medicine Reminder**

> Reframe: MediTrack is not a reminder app. It is a **medication safety net for the elderly and the family member who worries about them**.

Defaults we lock in:
- **Zero-backend, client-side, local-first** (privacy, no API keys, works offline).
- **Deployment: Docker + Render.**
- **Browser-native Web APIs only** (no ML libs in v1).
- **Accessibility is a first-class feature**, not a toggle afterthought.

See `docs/MEDITRACK_SYSTEM_SPEC.md` for the architecture/engineering spec. This file is the exhaustive feature spec.

---

## 1. Hard Constraints (from the brief)

| Brief phrase | What it forces | Design consequence |
|---|---|---|
| “particularly elderly people” | Low vision, tremor, memory, tech literacy | Large type, 48–56px targets, screen-reader labels, read-aloud, zero hover-only |
| “often forget” | Failure happens at the moment of action | Next-dose card, best-effort alerts, missed-dose rescue, caregiver nudge |
| “maintain consistent routines” | Adherence over time, not one-off | Honest state machine, streak, 7-day %, “most missed slot” |
| “simple web application” | No native alarms, low bandwidth, static | In-app timeline is the source of truth; browser alerts are bonus |
| “organise/manage/track” | Three distinct jobs | Don’t conflate; separate models + history |
| “accessible and user-friendly” | WCAG + plain language | Semantic HTML, keyboard, text+icon, grade 6–8 words |
| “Healthcare” | Safety, privacy, trust | Curated rules + sources, fail-safe, local-only, disclaimer |

**C1** Simplicity is cognitive, not architectural — the *primary screen* has one question: *“What do I take now?”*
**C2** The core loop works offline, with no account.
**C3** Every safety claim is traceable and fails safe on unknown (never “no interactions found”).
**C4** Simpler UI beats fancier UI; safety must never block flow.

---

## 2. Ambiguities — decide now (with our defaults)

| Ambiguity | Decision |
|---|---|
| “Twice daily” | Default 08:00 / 20:00, editable. Don’t infer intervals silently. |
| “With food” | Instruction field, not a hard constraint. No meal modeling. |
| Notifications | Best-effort (admitted in UI: “Keep this tab open”). In-app timeline is truth. |
| Caregiver | Explicit copy/print/WhatsApp summary, not silent sync. |
| Drug data | Curated high-confidence subset with sources; label “not a complete check.” |
| Age | Beers flag only, never diagnosis. |
| Late vs missed | Late after 2h, missed after 4h (defaults, configurable). |
| Time zone | Device local time; store wall-clock schedule, regenerate daily. |

---

## 3. Feature Tiers — the complete list

### Tier A — Foundational (the demo dies without these)

| # | Feature | Acceptance |
|---|---|---|
| A1 | **First-run experience** — 10-sec, large text, demo profile pre-seeded, “Add demo,” “Start blank.” | A judge can go from click to warnings in ≤10s. |
| A2 | **Add/Edit/Stop medication** — all data-model fields (see §4). | Saving is reversible. |
| A3 | **Today view (one-screen)** — Next-dose card + full timeline + empty state. All taps ≥48px. | Instant: “what’s next?” |
| A4 | **Dose state machine** — Taken / Late / Skipped (reason) / Missed. | States are derived from time + user action, never assumed. |
| A5 | **One-tap log + undo** — auto-dismiss toast (5s),undo restores previous state. | Mis-tap is recoverable. |
| A6 | **Adherence history** — per-med + total: 7-day %, streaks, misses. | Honest numbers. |
| A7 | **Local persistence** — localStorage, “last saved” timestamp. | Reload keeps data. |
| A8 | **Deploy** — static Docker on Render, mobile-ready viewport, installable manifest. | Link works for judges. |
| A9 | **Disclaimer + source links** — “Never alter/stop without consulting your doctor.” | No liability, trust built. |

### Tier B — Differentiators (the “beat the room” layer)

| # | Feature | Why it wins |
|---|---|---|
| B1 | **Brand→generic auto-resolve (~100 Indian brands).** Crocin, Dolo, Calpol → paracetamol; Ecosprin/Disprin/Loprin → aspirin; Warf/Uniwarfin → warfarin; Combiflam/Flexon → paracetamol+ibuprofen; Glycomet/Gluformin → metformin; Amlong/Amlovas → amlodipine; Telma/Telmikind → telmisartan; Alprax/Restyl → alprazolam; Pan 40/Pantocid → pantoprazole; Shelcal/Cipcal → calcium carbonate + vit d3. | Shows the moat: duplicate detection (Crocin + Dolo = ~3.3g extra). |
| B2 | **Duplicate generic detection + daily ceiling.** Sums scheduled daily exposure; compares to max (e.g. Paracetamol 4000mg/day); severe warning on breach. | Visible, computable, brand-chaos-aware. |
| B3 | **Drug-Drug interaction matrix** (curated, high-confidence, with mechanism + source): Warfarin+Aspirin (Major, bleed), Warfarin+Ibuprofen (Major), Metformin+Heavy Alcohol/Contrast (Moderate, lactic acidosis), Cipro/Tetracycline+Calcium (Moderate, chelation). | Every “common mistake” is caught. |
| B4 | **AGS Beers criteria for seniors (age ≥65).** Benzodiazepines → severe fall risk; Systemic NSAIDs → GI bleed/renal risk; First-gen antihistamines → anticholinergic burden. | Directly answers “particularly elderly.” |
| B5 | **Regimen Safety Score** (0–100, bands Green/Amber/Red, weighted formula). Every finding includes title + plain-language + mechanism + action + source + disclaimer. | One memorable number; everything shows *why*. |
| B6 | **Fail-safe language on unknown.** “No known interaction in our curated list — confirm with your pharmacist.” | Never falsely reassuring. |
| B7 | **Editing dose/time per med** — fixed times OR interval (“every 8h”). | Real recurring schedules. |
| B8 | **“Most missed slot” insight** (“3pm — 8 days”). | Makes tracking feel intelligent. |

### Tier C — Safety & Trust

| # | Feature | Why it matters |
|---|---|---|
| C1 | **Expiry tracking on bottles.** Warn: “Expires in 40 days.” | Real safety layer. |
| C2 | **Inventory/stock decrement.** “Days left = stock ÷ daily dose.” | Refill prediction. |
| C3 | **Missed-dose rescue guidance.** Statins/antihypertensives → “take as soon as remembered unless near next; never double up.” Antibiotics → “take immediately.” | Saves real mistakes. |
| C4 | **Cost: Zero backend.** No API, no keys, no DB. | Privacy + determinism + deploy safety. |

### Tier D — Caregiver & Depth

| # | Feature | Why it wins |
|---|---|---|
| D1 | **Caregiver summary** — copy / print / WhatsApp `wa.me` link. Shows: meds, today’s status, misses, refill alerts, safety warnings. | No backend; the dyad is served. |
| D2 | **“Call caregiver” `tel:` link** after a missed dose. | Zero-infrastructure escalation. |
| D3 | **Adherence trends** — streaks, “most missed slot,” weekly %. | Meaningful to caregiver. |
| D4 | **Printable doctor summary** (`@media print`): profile, med table, 7-day adherence, active alerts. One clean page. | Real-world handoff. |
| D5 | **Weekly adherence trend chart.** | Shows consistency over time. |

### Tier E — Accessibility (a visible win, not compliance)

| # | Feature | Notes |
|---|---|---|
| E1 | **Text scale toggle** — 18px standard / 22–24px large. Remembered. | Segmented toggle on home. |
| E2 | **High-contrast toggle** — 7:1 default, deep black / crisp white / amber alerts / emerald affirmations ≥7:1. |WCAG ≥7:1 requirement met. |
| E3 | **48–56px tap targets** everywhere; primary “Taken” is 56px. | Eg. symp Holds accessibility acceptance (actually size, not stretch — Tier C4, then split: C4 shows engineering commits; E is acceptance testing). |
| E4 | **Keyboard-only navigation** — Tab order, Enter activation, focus-visible rings. | No mouse dependency. |
| E5 | **Screen reader support** — `role="status"` on dose logs, skip-to-content, full aria-labels. | Passes Duplex (a11y audit). |
| E6 | **Read-aloud button** — “Read schedule” via Web Speech API: *“At 1:00 PM, take one tablet of Dolo 650 with food.”* | Audio confirmation for low-vision. |
| E7 | **Reduce-motion preference.** | Smoothness for safety-sensitive users. |
| E8 | **Color is never the only signal.** | Every status shows an icon + text. |

### Tier F — Quality-of-life (P2 stretch, ship only if deployed & stable)

| # | Feature | Why nice |
|---|---|---|
| F1 | **Voice input** (“Add paracetamol, 500 mg, twice a day”) — P2. Accuracy-dependent; add example. | Low-tech, very senior-friendly. |
| F2 | **Multi-profile (grandma + others).** | Time; ship after A–E stable. |
| F3 | **QR emergency card** (open on focus) — after A–E. | India-relevant, zero-backend. |
| F4 | **Local-language labels** (Hindi/Assamese) — data-driven. | Low risk if JSON. |
| F5 | **PWA + offline cache.** | Installable, reliable on flaky networks. |
| F6 | **JSON export/import** + “data delete” (GDPR-ish, local). | User control of data. |
| F7 | **Search meds** — live duplicate check as you type. | Nice, optional. |
| F8 | **Session/history editing.** Allow editing taken-time/note on taken meds (with audit). | Honest records. |

### Tier G — Explicitly, on purpose, but NOT

- Cloud sync / accounts / API tokens.
- Background push (admit in UI: “Keep this tab open for alerts, or install on browsers that support PWA background alerts”).
- Prescription OCR.
- LLM diagnosis.
- Live drug API (breaking determinism; no network calls after load).
- Dosage recommendations.
- Telemedicine/chat.
- Gamification (points, badges). Gentle streaks + honesty only.

---

## 4. Data Model — the 90% that makes everything work

**Medication fields**

| Field | Example |
|---|---|
| `brandName` | Crocin, Dolo 650 |
| `genericName` | paracetamol (auto-resolved from brand map) |
| `form` | tablet, capsule, syrup, injection, drops, inhaler, patch |
| `strength` | 650mg, 10mg — display only |
| `activeIngredients` | `[{ generic: "paracetamol", mgPerUnit: 650 }]` — source of truth for mg math |
| `doseAmount` + `doseUnit` | 1 tablet, 5ml, 1 capsule |
| `foodRelation` | with_meal / before_meal / after_meal / empty_stomach / bedtime / anytime |
| `frequency` | fixedTimes `["08:00","20:00"]` OR intervalHours 8 OR asNeeded |
| `PRN flag` + note | “when pain is 10/10” |
| `status` | active / paused / stopped-by-doctor |
| `prescriberName` / `reason` | e.g. “Hypertension” |
| `notes` | “Take with meals” (user) + safety rules (if curated) |
| `startDate`/`endDate` | YYYY-MM-DD |
| `inventory` | { currentCount, unit, refillThresholdDays } |
| `drugClass` | paracetamol, warfarin, alprazolam, ibuprofen |

**Dose execution states**

`scheduled → taken / late / skipped (reason: felt_fine, side_effect, forgot, nausea, doctor_advised, ran_out) / missed; snooze defers 15/30/60min`

**Grace periods (default)** — late ≥2h, missed ≥4h (configurable, shown in UI).

**Safety data packs (data/ dir, all local)**
- `brands.json` (~100 brands → generic).
- `interactions.json` (~5 high-confidence pairs with severity, mechanism, advice, source).
- `beersCriteria.json` (~3 classes: benzodiazepines, systemic NSAIDs, first-gen antihistamines).
- `missedDoseGuidance.json` (~5 classes: statins, antibiotics, buy once, etc.).
- `demoProfile.json` — “Meera, Age 68” with a trigger set (Dolo + Crocin, Warf, Alprax).

---

## 5. Acceptance Criteria (the “we beat them” bar)

**A. Safety**
- [ ] Crocin + Dolo → duplicate warning, “already scheduled for Xg/day” (green light) or severe if >4g/day.
- [ ] Warfarin + Aspirin → major warning, severity tier, “Ask pharmacist.”
- [ ] Age ≥65 + Alprazolam → Beers warning, amber/red.
- [ ] Safety score visible as a single 0–100 number on the Today screen; every alert shows 2+ reasons, sources, and the disclaimer line.

**B. Truthfulness**
- [ ] A “taken” event is append-only; you cannot mark taken twice; undo creates a “dismissed” record, not a deletion.
- [ ] “Most missed slot” is calculated from real past data, not fabricated.

**C. Craft**
- [ ] 200% zoom readable; 24px default; high-contrast toggle; keyboard-only navigation; live-region updates; “Read schedule” button.
- [ ] One action per screen region: Next card on top, Timeline below.

**D. Demo**
- [ ] From-click: open → seeded profile loads → safe warnings visible → one tap “taken” → taken shown. ≤10s.

**E. Deploy**
- [ ] Static Docker image on Render; mobile URL works; installs via PWA (Android).

---

## 6. Backlog (nice-to-have; keep as a second-pass list)

- **Backend (optional, later):** cloud sync for profiles across devices, server-side backup, password for offline access, history of prescriptions beyond local. Not in the default build.
- **Note from scaffold:** older YAML/notes mentioned “hosted on Render, backend python, local db/sqlite, OCR from Google Gen AI to create schedules, welcome screen, append-only log.” We kept the “append-only log + welcome screen” in A–D. OCR for prescriptions is P2 (F1 range; add later only if stable).

---

## 7. Where to start (gates)

```
[00:00–00:25] Data packs (brands, interactions, beers, missedDose) + TypeScript types
[00:25–00:55] Tier A: scaffold (Vite+React+TS+Tailwind), seed profile, deploy
[00:55–02:00] Tier A: add/edit form, Today view, Dose state machine, one-tap + undo
[02:00–03:00] Tier B: safety engine + Brand map + duplicate + interactions + Beers + score
[03:00–03:30] Tier B: max daily ceiling + explanations panel
[03:30–04:00] Tier A+C: refills, missed-dose guidance cards, export/print
[04:00–04:20] Tier D: caregiver WhatsApp summary, print summary, read-aloud
[04:20–04:45] Tier E: accessibility polish (font, contrast, screen reader, keyboard, read-aloud)
[04:45–05:00] Freeze, polish, quick demo rehearsal, final deploy
```

Good to go when you are. Ready to brainstorm the **tech stack** next — the spec in `docs/MEDITRACK_SYSTEM_SPEC.md` has picks (Vite + React 18/19 + TS + Tailwind v4 + custom engines, zero-backend, Render/Nginx Docker). Want to lock that, or tweak? Any stack constraints you'd add now?
