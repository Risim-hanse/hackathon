import { describe, expect, it } from 'vitest'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { AppShell } from '../layout/AppShell'
import { Onboarding } from '../onboarding/Onboarding'
import { TodayView } from '../today/TodayView'
import { MedicationsView } from '../meds/MedicationsView'
import { SafetyView } from '../safety/SafetyView'
import { AdherenceView } from '../adherence/AdherenceView'
import { ShareModal } from '../caregiver/ShareModal'
import { SettingsModal } from '../settings/SettingsModal'
import { makeApi } from '../../testing/fakeApi'

const render = (node: ReactElement) => renderToStaticMarkup(node)

describe('UI rendering', () => {
  it('AppShell renders brand, navigation and mode toggle', () => {
    const html = render(
      <AppShell api={makeApi()} tab="today" setTab={() => {}} onShare={() => {}} onSettings={() => {}}>
        <p>child</p>
      </AppShell>,
    )
    expect(html).toContain('MediTrack SafetyNet')
    expect(html).toContain('Elderly')
    expect(html).toContain('Caregiver')
    expect(html).toContain('Sample data')
    expect(html).toContain('child')
  })

  it('AppShell hides the sample badge for a personal plan', () => {
    const api = makeApi()
    const html = render(
      <AppShell api={{ ...api, state: { ...api.state, isDemo: false } }} tab="today" setTab={() => {}} onShare={() => {}} onSettings={() => {}}>
        <p>child</p>
      </AppShell>,
    )
    expect(html).not.toContain('Sample data')
  })

  it('Onboarding presents all three paths', () => {
    const html = render(<Onboarding api={makeApi()} onPath={() => {}} />)
    expect(html).toContain('Scan a prescription')
    expect(html).toContain('Add a medicine')
    expect(html).toContain('Explore the demo')
    expect(html).toContain('How it works')
  })

  it('Today view renders the greeting and next-dose hero in elderly mode', () => {
    const html = render(<TodayView api={makeApi()} setTab={() => {}} onScan={() => {}} />)
    expect(html).toContain('Good morning, Meera')
    expect(html).toContain('Next dose')
    expect(html).toContain('Today&#x27;s schedule')
  })

  it('Today view renders the caregiver dashboard', () => {
    const api = makeApi({ mode: 'caregiver' })
    const html = render(<TodayView api={api} setTab={() => {}} onScan={() => {}} />)
    expect(html).toContain('Caregiver view')
    expect(html).toContain('Doses logged')
    expect(html).toContain('Safety score')
  })

  it('Today view has a clean empty state', () => {
    const api = makeApi()
    const html = render(
      <TodayView
        api={{
          ...api,
          state: { ...api.state, medications: [], events: [] },
          doses: [],
          emptyState: true,
        }}
        setTab={() => {}}
        onScan={() => {}}
      />,
    )
    expect(html).toContain('No medicines yet')
    expect(html).toContain('Scan prescription')
  })

  it('Medicines view exposes search and view toggle', () => {
    const html = render(<MedicationsView api={makeApi()} onScan={() => {}} />)
    expect(html).toContain('Search medicines')
    expect(html).toContain('By source')
    expect(html).toContain('Prescriptions &amp; sources')
  })

  it('Medicines view shows provenance for a scanned medicine', () => {
    const api = makeApi()
    const prescription = {
      id: 'rx-1',
      status: 'active' as const,
      issuedDate: '2026-11-20',
      prescriberName: 'Dr. Anita Rao',
      pharmacyName: 'City Pharmacy',
      createdAt: new Date().toISOString(),
      source: {
        imageRef: 'img-1',
        fileName: 'rx.png',
        mimeType: 'image/png',
        sha256: 'abc123',
        scannedAt: new Date().toISOString(),
        kind: 'prescription' as const,
      },
    }
    const meds = api.state.medications.map((medication, index) =>
      index === 0 ? { ...medication, prescriptionId: prescription.id } : medication,
    )
    const html = render(
      <MedicationsView
        api={{
          ...api,
          mode: 'caregiver',
          state: { ...api.state, medications: meds, prescriptions: [prescription] },
          prescriptions: [prescription],
        }}
        onScan={() => {}}
      />,
    )
    expect(html).toContain('Dr. Anita Rao')
    expect(html).toContain('City Pharmacy')
    expect(html).toContain('Added manually')
  })

  it('Safety view renders the score ring and findings', () => {
    const html = render(<SafetyView api={makeApi()} />)
    expect(html).toContain('data-testid="safety-score"')
    expect(html).toContain('30')
    expect(html).toContain('data-testid="finding-card"')
    expect(html).toContain('High-risk combination found')
  })

  it('Adherence view renders the week strip and legend', () => {
    const html = render(<AdherenceView api={makeApi()} />)
    expect(html).toContain('Last 7 days')
    expect(html).toContain('Your week')
    expect(html).toContain('Most missed')
    expect(html).toContain('Taken')
  })

  it('Share modal generates a plain-text summary', () => {
    const html = render(<ShareModal api={makeApi()} open onClose={() => {}} />)
    expect(html).toContain('Share today&#x27;s summary')
    expect(html).toContain('daily summary')
    expect(html).toContain('WhatsApp')
  })

  it('Settings modal shows accessibility and data controls', () => {
    const html = render(<SettingsModal api={makeApi()} open onClose={() => {}} />)
    expect(html).toContain('Large text')
    expect(html).toContain('High contrast')
    expect(html).toContain('Export JSON')
    expect(html).toContain('Replay welcome')
  })
})
