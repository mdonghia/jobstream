"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type AutoSaveStatus = "idle" | "saving" | "saved" | "error"

interface UseAutoSaveOptions<T> {
  /** The current form data to watch for changes */
  data: T
  /** The save function to call when data changes. Should throw on error. */
  onSave: (data: T) => Promise<void>
  /** Whether auto-save is enabled (false for create forms, true for edit forms) */
  enabled: boolean
  /** Debounce delay in milliseconds (default: 1500ms) */
  debounceMs?: number
  /** How long to show the "Saved" status before returning to idle (default: 2000ms) */
  savedDurationMs?: number
}

interface UseAutoSaveReturn {
  /** Current auto-save status: "idle" | "saving" | "saved" | "error" */
  status: AutoSaveStatus
  /** Human-readable status label for display */
  statusLabel: string | null
  /** Trigger an immediate save (bypassing debounce), e.g. for the manual Save button */
  saveNow: () => Promise<void>
}

/**
 * useAutoSave -- debounces changes to form data and auto-saves after the user
 * stops editing for the configured delay.
 *
 * Only fires on EDIT forms (when `enabled` is true). Create forms should pass
 * `enabled: false` so auto-save never triggers.
 *
 * The hook compares serialized snapshots of `data` to detect real changes, so
 * it won't fire on no-op re-renders.
 */
export function useAutoSave<T>({
  data,
  onSave,
  enabled,
  debounceMs = 1500,
  savedDurationMs = 2000,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [status, setStatus] = useState<AutoSaveStatus>("idle")
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedSnapshotRef = useRef<string>("")
  const initializedRef = useRef(false)
  const onSaveRef = useRef(onSave)
  const dataRef = useRef(data)

  // Keep refs current so the debounced callback always uses the latest values
  onSaveRef.current = onSave
  dataRef.current = data

  // Serialize data for comparison. We use JSON.stringify which works for
  // plain objects, arrays, and primitives -- which covers form state.
  const serialize = useCallback((value: T): string => {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }, [])

  // Core save logic (used by both debounce and saveNow)
  const executeSave = useCallback(async () => {
    const snapshot = serialize(dataRef.current)

    // Don't save if nothing changed since last save
    if (snapshot === lastSavedSnapshotRef.current) return

    setStatus("saving")
    try {
      await onSaveRef.current(dataRef.current)
      lastSavedSnapshotRef.current = snapshot
      setStatus("saved")

      // Clear any previous "saved" timer
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => {
        setStatus("idle")
      }, savedDurationMs)
    } catch {
      setStatus("error")
      // Reset to idle after a few seconds so the user can try again
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => {
        setStatus("idle")
      }, 3000)
    }
  }, [serialize, savedDurationMs])

  // Watch for data changes and debounce saves
  useEffect(() => {
    if (!enabled) return

    const snapshot = serialize(data)

    // On first render, record the initial state but don't trigger a save.
    // This prevents saving the initial data when the form first loads.
    if (!initializedRef.current) {
      initializedRef.current = true
      lastSavedSnapshotRef.current = snapshot
      return
    }

    // If the data hasn't actually changed, skip
    if (snapshot === lastSavedSnapshotRef.current) return

    // Clear any pending debounce timer
    if (timerRef.current) clearTimeout(timerRef.current)

    // Set a new debounce timer
    timerRef.current = setTimeout(() => {
      executeSave()
    }, debounceMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [data, enabled, debounceMs, serialize, executeSave])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  // Manual save (for the fallback Save button)
  const saveNow = useCallback(async () => {
    // Cancel any pending debounce
    if (timerRef.current) clearTimeout(timerRef.current)
    await executeSave()
  }, [executeSave])

  // Human-readable label
  const statusLabel =
    status === "saving"
      ? "Saving..."
      : status === "saved"
        ? "Saved"
        : status === "error"
          ? "Save failed"
          : null

  return { status, statusLabel, saveNow }
}
