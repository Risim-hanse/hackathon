import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  AppState,
  DoseEvent,
  DoseInstance,
  Medication,
  Preferences,
  Prescription,
  SkipReason,
} from '../shared/contracts'
import { createDemoState } from '../data/demoProfile'
import {
  analyzeRegimen,
  daysOfStockLeft,
  generateDoses,
  localDateFor,
  summarizeAdherence,
} from '../engine'
import { clearState, loadState, saveState } from '../storage/localStore'

export type Mode = 'elderly' | 'caregiver'

function initialState(): AppState {
  return loadState() ?? createDemoState()
}

export function useAppState() {
  const [state, setState] = useState<AppState>(initialState)
  const [mode, setMode] = useState<Mode>('elderly')
  const [snoozes, setSnoozes] = useState<Record<string, number>>({})
  const [toast, setToast] = useState<{ message: string; undoId?: string } | null>(null)

  const now = useMemo(() => new Date(), [])
  const today = localDateFor(now)

  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    document.documentElement.dataset.mode = mode
    document.documentElement.dataset.largeText = String(state.profile.preferences.largeText)
    document.documentElement.dataset.contrast = String(state.profile.preferences.highContrast)
  }, [mode, state.profile.preferences.largeText, state.profile.preferences.highContrast])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 6000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const doses = useMemo(
    () => generateDoses(state.medications, state.events, today, state.profile.preferences, now),
    [state.medications, state.events, state.profile.preferences, today, now],
  )

  const weekDoses = useMemo(() => {
    const all: DoseInstance[] = []
    for (let offset = 6; offset >= 0; offset -= 1) {
      const day = new Date(now)
      day.setDate(day.getDate() - offset)
      all.push(
        ...generateDoses(
          state.medications,
          state.events,
          localDateFor(day),
          state.profile.preferences,
          now,
        ),
      )
    }
    return all
  }, [state.medications, state.events, state.profile.preferences, now])

  const report = useMemo(
    () => analyzeRegimen(state.medications, state.profile, now),
    [state.medications, state.profile, now],
  )
  const adherence = useMemo(
    () => summarizeAdherence(weekDoses, state.events),
    [weekDoses, state.events],
  )

  const appendEvent = useCallback((event: DoseEvent) => {
    setState((current) => ({ ...current, events: [...current.events, event] }))
  }, [])

  const logDose = useCallback(
    (dose: DoseInstance, action: DoseEvent['action'], skipReason?: SkipReason) => {
      const event: DoseEvent = {
        id: `evt-${dose.id}-${action}-${Date.now()}`,
        doseId: dose.id,
        medicationId: dose.medicationId,
        scheduledFor: dose.scheduledFor,
        actionAt: new Date().toISOString(),
        action,
        skipReason,
      }
      appendEvent(event)
      const label = dose.medicationId
        ? state.medications.find((medication) => medication.id === dose.medicationId)?.brandName ?? ''
        : ''
      const message =
        action === 'taken'
          ? `${label} marked as taken.`
          : action === 'skipped'
            ? `${label} skipped.`
            : 'Reminder updated.'
      setToast({ message, undoId: event.id })
      return event.id
    },
    [appendEvent, state.medications],
  )

  const undo = useCallback(
    (eventId: string) => {
      const original = state.events.find((event) => event.id === eventId)
      if (!original) return
      appendEvent({
        ...original,
        id: `evt-undo-${eventId}-${Date.now()}`,
        action: 'undone',
        actionAt: new Date().toISOString(),
      })
      setToast({ message: 'Change undone.' })
    },
    [appendEvent, state.events],
  )

  const snooze = useCallback((doseId: string, minutes: number) => {
    setSnoozes((current) => ({ ...current, [doseId]: Date.now() + minutes * 60_000 }))
    setToast({ message: `Reminder snoozed for ${minutes} minutes.` })
  }, [])

  const saveMedication = useCallback((medication: Medication) => {
    setState((current) => {
      const exists = current.medications.some((item) => item.id === medication.id)
      return {
        ...current,
        medications: exists
          ? current.medications.map((item) => (item.id === medication.id ? medication : item))
          : [...current.medications, medication],
      }
    })
    setToast({ message: 'Medicine saved.' })
  }, [])

  const addPrescription = useCallback((prescription: Prescription, medications: Medication[]) => {
    setState((current) => ({
      ...current,
      prescriptions: [prescription, ...current.prescriptions],
      medications: [
        ...current.medications,
        ...medications.map((medication) => ({ ...medication, prescriptionId: prescription.id })),
      ],
    }))
    setToast({ message: 'Prescription added to the plan.' })
  }, [])

  const archivePrescription = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      prescriptions: current.prescriptions.map((item) =>
        item.id === id ? { ...item, status: 'archived' } : item,
      ),
    }))
  }, [])

  const stopMedication = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      medications: current.medications.map((medication) =>
        medication.id === id ? { ...medication, status: 'stopped' } : medication,
      ),
    }))
    setToast({ message: 'Medicine stopped.' })
  }, [])

  const setPreference = useCallback(<K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setState((current) => ({
      ...current,
      profile: {
        ...current.profile,
        preferences: { ...current.profile.preferences, [key]: value },
      },
    }))
  }, [])

  const setCaregiver = useCallback((name: string, phone: string) => {
    setState((current) => ({
      ...current,
      profile: { ...current.profile, caregiverName: name, caregiverPhone: phone },
    }))
  }, [])

  const loadDemo = useCallback(() => {
    setState(createDemoState())
    setToast({ message: 'Demo profile loaded.' })
  }, [])

  const resetAll = useCallback(() => {
    clearState()
    setState(createDemoState())
    setToast({ message: 'Reset to the demo profile.' })
  }, [])

  const emptyState = state.medications.length === 0 && state.events.length === 0

  return {
    state,
    prescriptions: state.prescriptions,
    mode,
    setMode,
    now,
    today,
    doses,
    weekDoses,
    report,
    adherence,
    refills: state.medications.map((medication) => ({
      medication,
      daysLeft: daysOfStockLeft(medication),
    })),
    snoozes,
    toast,
    setToast,
    emptyState,
    logDose,
    undo,
    snooze,
    saveMedication,
    addPrescription,
    archivePrescription,
    stopMedication,
    setPreference,
    setCaregiver,
    loadDemo,
    resetAll,
  }
}

export type AppStateApi = ReturnType<typeof useAppState>
