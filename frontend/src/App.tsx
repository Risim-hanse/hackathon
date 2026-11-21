import { useState } from 'react'
import { AppShell, type Tab } from './components/layout/AppShell'
import { TodayView } from './components/today/TodayView'
import { MedicationsView } from './components/meds/MedicationsView'
import { SafetyView } from './components/safety/SafetyView'
import { AdherenceView } from './components/adherence/AdherenceView'
import { ShareModal } from './components/caregiver/ShareModal'
import { SettingsModal } from './components/settings/SettingsModal'
import { useAppState } from './hooks/useAppState'
import { shareSummary } from './utils/format'

export default function App() {
  const api = useAppState()
  const [tab, setTab] = useState<Tab>('today')
  const [shareOpen, setShareOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <>
      <AppShell
        api={api}
        tab={tab}
        setTab={setTab}
        onShare={() => setShareOpen(true)}
        onSettings={() => setSettingsOpen(true)}
      >
        {tab === 'today' && <TodayView api={api} setTab={setTab} />}
        {tab === 'meds' && <MedicationsView api={api} />}
        {tab === 'safety' && <SafetyView api={api} />}
        {tab === 'adherence' && <AdherenceView api={api} />}
      </AppShell>

      <ShareModal api={api} open={shareOpen} onClose={() => setShareOpen(false)} />
      <SettingsModal api={api} open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <div className="print-only mx-auto max-w-2xl p-6">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
          {shareSummary({
            profile: api.state.profile,
            medications: api.state.medications,
            events: api.state.events,
            doses: api.doses,
            report: api.report,
            adherence: api.adherence,
            now: api.now,
          })}
        </pre>
      </div>
    </>
  )
}
