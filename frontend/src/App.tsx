import { useMemo, useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { createDemoEvents, demoMedications, demoProfile } from './data/demoProfile'
import {
  analyzeRegimen,
  daysOfStockLeft,
  generateDoses,
  localDateFor,
  summarizeAdherence,
} from './engine'
import type { DoseStatus, SafetyBand, SafetySeverity } from './shared/contracts'

const DOSE_LABEL: Record<DoseStatus, string> = {
  scheduled: 'Scheduled',
  taken: 'Taken',
  late: 'Late',
  skipped: 'Skipped',
  missed: 'Missed',
}

const DOSE_ICON: Record<DoseStatus, string> = {
  scheduled: '○',
  taken: '✓',
  late: '!',
  skipped: '–',
  missed: '×',
}

const BAND_COPY: Record<SafetyBand, string> = {
  safe: 'No known issues in our curated list',
  review: 'Review recommended',
  high_risk: 'High-risk combination found',
}

const SEVERITY_LABEL: Record<SafetySeverity, string> = {
  major: 'Major',
  moderate: 'Moderate',
  minor: 'Minor',
  info: 'For information',
}

const SEVERITY_CLASS: Record<SafetySeverity, string> = {
  major: 'border-red-300 bg-red-50 text-red-900',
  moderate: 'border-amber-300 bg-amber-50 text-amber-900',
  minor: 'border-sky-300 bg-sky-50 text-sky-900',
  info: 'border-slate-300 bg-slate-50 text-slate-800',
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function App() {
  const [now] = useState(() => new Date())

  const events = useMemo(() => createDemoEvents(now), [now])
  const today = localDateFor(now)

  const doses = useMemo(
    () => generateDoses(demoMedications, events, today, demoProfile.preferences, now),
    [events, today, now],
  )

  const weekDoses = useMemo(() => {
    const all = []
    for (let offset = 6; offset >= 0; offset -= 1) {
      const day = new Date(now)
      day.setDate(day.getDate() - offset)
      all.push(
        ...generateDoses(
          demoMedications,
          events,
          localDateFor(day),
          demoProfile.preferences,
          now,
        ),
      )
    }
    return all
  }, [events, now])

  const report = useMemo(
    () => analyzeRegimen(demoMedications, demoProfile, now),
    [now],
  )
  const adherence = useMemo(() => summarizeAdherence(weekDoses, events), [weekDoses, events])

  const medById = useMemo(
    () => new Map(demoMedications.map((medication) => [medication.id, medication])),
    [],
  )

  const refills = demoMedications
    .map((medication) => ({ medication, daysLeft: daysOfStockLeft(medication) }))
    .filter((entry) => entry.daysLeft !== null)

  return (
    <AppShell>
      <section aria-labelledby="today-title" className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Demo preview · {demoProfile.name}, {demoProfile.age}
          </p>
          <h2 id="today-title" className="mt-2 text-3xl font-bold">
            Today&apos;s medicines
          </h2>
          <p className="mt-2 text-lg text-slate-700">
            The engine computes every status locally. Nothing here needs a backend.
          </p>

          <ul className="mt-5 divide-y divide-slate-200">
            {doses.map((dose) => {
              const medication = medById.get(dose.medicationId)
              return (
                <li key={dose.id} className="flex flex-wrap items-center gap-3 py-4">
                  <span
                    aria-hidden="true"
                    className="grid h-10 w-10 place-items-center rounded-full border-2 border-slate-300 text-lg font-bold"
                  >
                    {DOSE_ICON[dose.status]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-semibold">
                      {medication?.brandName ?? dose.medicationId}
                    </p>
                    <p className="text-base text-slate-600">
                      {formatTime(dose.scheduledFor)} · {medication?.foodRelation.replace('_', ' ')}
                    </p>
                  </div>
                  <span className="rounded-full border-2 border-slate-300 px-3 py-1 text-base font-semibold">
                    {DOSE_LABEL[dose.status]}
                  </span>
                </li>
              )
            })}
            {doses.length === 0 && (
              <li className="py-4 text-lg text-slate-700">No doses left today.</li>
            )}
          </ul>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold">Regimen check</h2>
          <p className="mt-3 flex items-end gap-2">
            <span className="text-6xl font-bold">{report.score}</span>
            <span className="pb-2 text-lg text-slate-600">/ 100</span>
          </p>
          <p className="mt-1 text-lg font-semibold">{BAND_COPY[report.band]}</p>
          <p className="mt-2 text-sm text-slate-500">
            {report.findings.length} finding{report.findings.length === 1 ? '' : 's'} in the
            curated list
          </p>

          <dl className="mt-5 grid grid-cols-2 gap-3 text-base">
            <div className="rounded-2xl bg-slate-50 p-3">
              <dt className="text-slate-600">7-day adherence</dt>
              <dd className="text-2xl font-bold">{adherence.adherencePercent}%</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <dt className="text-slate-600">Current streak</dt>
              <dd className="text-2xl font-bold">{adherence.streakDays} days</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <dt className="text-slate-600">Missed</dt>
              <dd className="text-2xl font-bold">{adherence.missed}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <dt className="text-slate-600">Most missed</dt>
              <dd className="text-2xl font-bold">{adherence.mostMissedSlot ?? '—'}</dd>
            </div>
          </dl>

          <h3 className="mt-6 text-lg font-semibold">Refill watch</h3>
          <ul className="mt-2 space-y-1 text-base text-slate-700">
            {refills.map(({ medication, daysLeft }) => (
              <li key={medication.id} className="flex justify-between gap-3">
                <span>{medication.brandName}</span>
                <span className={daysLeft !== null && daysLeft <= 5 ? 'font-bold text-amber-800' : ''}>
                  {daysLeft} day{daysLeft === 1 ? '' : 's'} left
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="findings-title" className="mt-8">
        <h2 id="findings-title" className="text-2xl font-bold">
          What the safety engine found
        </h2>
        <p className="mt-2 max-w-3xl text-lg text-slate-700">
          Curated rules, not a complete interaction checker. Every card explains the issue, the
          next step, and where the rule comes from.
        </p>

        <ul className="mt-4 space-y-4">
          {report.findings.map((finding) => (
            <li
              key={finding.id}
              className={`rounded-2xl border-2 p-5 ${SEVERITY_CLASS[finding.severity]}`}
            >
              <p className="text-sm font-bold uppercase tracking-wide">
                {SEVERITY_LABEL[finding.severity]} · {finding.category.replace('_', ' ')}
              </p>
              <h3 className="mt-1 text-xl font-bold">{finding.title}</h3>
              <p className="mt-2 text-lg">{finding.plainLanguage}</p>
              <p className="mt-2 text-base font-semibold">Next step: {finding.action}</p>
              {finding.mechanism && (
                <details className="mt-2 text-base">
                  <summary className="cursor-pointer font-semibold">Why this happens</summary>
                  <p className="mt-1">{finding.mechanism}</p>
                </details>
              )}
              {finding.source && (
                <p className="mt-2 text-sm opacity-80">Source: {finding.source}</p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="proof-title" className="mt-8 rounded-3xl bg-ink p-6 text-white">
        <h2 id="proof-title" className="text-2xl font-bold">
          What this preview proves
        </h2>
        <ul className="mt-3 grid gap-3 text-lg md:grid-cols-3">
          <li>Deterministic statuses from the append-only event log.</li>
          <li>Duplicate, ceiling, interaction, Beers, and refill checks in one pass.</li>
          <li>No network, no account, no API key on the critical path.</li>
        </ul>
      </section>
    </AppShell>
  )
}
