import { useState } from 'react'
import { AppShell, type Tab } from './components/layout/AppShell'
import { Onboarding, type OnboardingPath, type OnboardingSetup } from './components/onboarding/Onboarding'
import { TodayView } from './components/today/TodayView'
import { MedicationsView } from './components/meds/MedicationsView'
import { SafetyView } from './components/safety/SafetyView'
import { AdherenceView } from './components/adherence/AdherenceView'
import { ScanPrescriptionModal } from './components/meds/ScanPrescriptionModal'
import { ShareModal } from './components/caregiver/ShareModal'
import { SettingsModal } from './components/settings/SettingsModal'
import { useAppState } from './hooks/useAppState'
import { shareSummary } from './utils/format'

export default function App() {
  const api = useAppState()
  const [tab, setTab] = useState<Tab>('today')
  const [shareOpen, setShareOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [addIntent, setAddIntent] = useState(0)

  const handlePath = (path: OnboardingPath, setup?: OnboardingSetup) => {
    if (setup) {
      api.setCaregiver(setup.caregiverName, setup.caregiverPhone)
      api.setMode(setup.mode)
    }
    if (path === 'demo') {
      api.loadDemo()
      api.setMode('elderly')
      api.completeOnboarding()
      setTab('today')
      return
    }
    api.completeOnboarding()
    if (path === 'scan') setScanOpen(true)
    if (path === 'add') {
      setTab('meds')
      setAddIntent((count) => count + 1)
    }
  }

  const scanModal = (
    <ScanPrescriptionModal
      api={api}
      open={scanOpen}
      onClose={() => setScanOpen(false)}
      onSaved={() => setTab('meds')}
    />
  )

  if (!api.state.onboardingCompleted) {
    return (
      <>
        <Onboarding api={api} onPath={handlePath} />
        {scanModal}
      </>
    )
  }

  return (
    <>
      <AppShell
        api={api}
        tab={tab}
        setTab={setTab}
        onShare={() => setShareOpen(true)}
        onSettings={() => setSettingsOpen(true)}
      >
        {tab === 'today' && <TodayView api={api} setTab={setTab} onScan={() => setScanOpen(true)} />}
        {tab === 'meds' && (
          <MedicationsView api={api} onScan={() => setScanOpen(true)} addIntent={addIntent} />
        )}
        {tab === 'safety' && <SafetyView api={api} />}
        {tab === 'adherence' && <AdherenceView api={api} />}
      </AppShell>

      {scanModal}
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
