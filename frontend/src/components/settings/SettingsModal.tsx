import { Download, RotateCcw, Trash2 } from 'lucide-react'
import { Button, Modal, Toggle } from '../primitives/Ui'
import type { AppStateApi } from '../../hooks/useAppState'

export function SettingsModal({
  api,
  open,
  onClose,
}: {
  api: AppStateApi
  open: boolean
  onClose: () => void
}) {
  const { state, setPreference, setCaregiver, resetAll, replayOnboarding } = api
  const preferences = state.profile.preferences

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `meditrack-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className="space-y-5">
        <div>
          <h3 className="mb-2 text-sm font-black uppercase tracking-wide">Accessibility</h3>
          <div className="space-y-2">
            <Toggle
              label="Large text"
              hint="Bigger type across the whole app"
              checked={preferences.largeText}
              onChange={(value) => setPreference('largeText', value)}
            />
            <Toggle
              label="High contrast"
              hint="Black background, bright accents"
              checked={preferences.highContrast}
              onChange={(value) => setPreference('highContrast', value)}
            />
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-black uppercase tracking-wide">Timing</h3>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="label">Late after (min)</span>
              <input
                className="input"
                type="number"
                min="0"
                value={preferences.lateGraceMinutes}
                onChange={(event) => setPreference('lateGraceMinutes', Number(event.target.value))}
              />
            </label>
            <label>
              <span className="label">Missed after (min)</span>
              <input
                className="input"
                type="number"
                min="0"
                value={preferences.missedGraceMinutes}
                onChange={(event) => setPreference('missedGraceMinutes', Number(event.target.value))}
              />
            </label>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-black uppercase tracking-wide">Caregiver</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="label">Name</span>
              <input className="input" value={state.profile.caregiverName ?? ''} onChange={(event) => setCaregiver(event.target.value, state.profile.caregiverPhone ?? '')} />
            </label>
            <label>
              <span className="label">Phone</span>
              <input className="input" value={state.profile.caregiverPhone ?? ''} onChange={(event) => setCaregiver(state.profile.caregiverName ?? '', event.target.value)} />
            </label>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-black uppercase tracking-wide">Your data</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={exportJson}>
              <Download size={18} /> Export JSON
            </Button>
            <Button variant="secondary" onClick={() => { replayOnboarding(); onClose() }}>
              <RotateCcw size={18} /> Replay welcome
            </Button>
            <Button variant="secondary" onClick={() => { resetAll(); onClose() }}>
              <RotateCcw size={18} /> Reload demo
            </Button>
            <Button variant="danger" onClick={() => { resetAll(); onClose() }}>
              <Trash2 size={18} /> Clear data
            </Button>
          </div>
          <p className="muted mt-2 text-xs">Data lives in this browser only. Export keeps a copy.</p>
        </div>
      </div>
    </Modal>
  )
}
