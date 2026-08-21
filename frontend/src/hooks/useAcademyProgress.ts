import { useCallback, useEffect, useRef, useState } from 'react'
import { ACADEMY_CONTENT, getCourseModules } from '../lib/academyContent'
import {
  applyAttemptEvent,
  applyDiagnosticResult,
  createAcademyProgress,
  createAttemptEvent,
} from '../lib/academyProgress'
import {
  cacheAcademyContent,
  clearAcademyData,
  enqueueAttempt,
  exportAcademyData,
  loadAcademyProgress,
  saveAcademyProgress,
} from '../lib/academyStore'
import { syncAcademyProgress, type AcademySyncState } from '../lib/academySync'
import type {
  AcademyProgress,
  AttemptEvent,
  CourseId,
  LessonDefinition,
} from '../lib/academyTypes'
import { FEATURES } from '../lib/featureFlags'

export interface SubmitAcademyAttemptInput {
  lesson: LessonDefinition
  answerIndex: number
  hintsUsed: number
  actionsTaken: number
  startedAt: string
}

export interface AcademyProgressController {
  progress: AcademyProgress
  loading: boolean
  submitAttempt: (input: SubmitAcademyAttemptInput) => AttemptEvent
  selectCourse: (course: CourseId) => void
  completeDiagnostic: (course: CourseId, percentage: number) => void
  exportData: () => Promise<string>
  resetProgress: () => Promise<void>
  syncState: AcademySyncState
  syncNow: () => Promise<void>
}

export function useAcademyProgress(): AcademyProgressController {
  const [progress, setProgress] = useState<AcademyProgress>(() => createAcademyProgress())
  const [loading, setLoading] = useState(true)
  const [syncState, setSyncState] = useState<AcademySyncState>('idle')
  const progressRef = useRef(progress)
  const syncingRef = useRef(false)

  useEffect(() => {
    let active = true
    void Promise.all([
      loadAcademyProgress(),
      cacheAcademyContent(ACADEMY_CONTENT.version, ACADEMY_CONTENT),
    ]).then(([loaded]) => {
      if (!active) return
      progressRef.current = loaded
      setProgress(loaded)
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [])

  const commit = useCallback((next: AcademyProgress) => {
    progressRef.current = next
    setProgress(next)
    void saveAcademyProgress(next)
  }, [])

  const syncNow = useCallback(async () => {
    if (!FEATURES.accountSync) {
      setSyncState('idle')
      return
    }
    if (syncingRef.current) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncState('offline')
      return
    }
    syncingRef.current = true
    setSyncState('syncing')
    try {
      const synced = await syncAcademyProgress(progressRef.current)
      if (synced) commit(synced)
      const { syncPendingFinishedReplays } = await import('../lib/replaySync')
      await syncPendingFinishedReplays()
      setSyncState('synced')
    } catch {
      setSyncState('error')
    } finally {
      syncingRef.current = false
    }
  }, [commit])

  useEffect(() => {
    if (loading || !FEATURES.accountSync) return undefined
    void syncNow()
    const handleOnline = () => { void syncNow() }
    const handleOffline = () => setSyncState('offline')
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [loading, syncNow])

  const submitAttempt = useCallback((input: SubmitAcademyAttemptInput) => {
    const current = progressRef.current
    const event = createAttemptEvent({
      ...input,
      guestId: current.guestId,
      correct: input.answerIndex === input.lesson.challenge.correctIndex,
    })
    const next = applyAttemptEvent(current, event, input.lesson)
    commit(next)
    void enqueueAttempt(event).then(() => {
      if (FEATURES.accountSync) void syncNow()
    })
    void import('../lib/telemetry')
      .then(({ trackAcademyAttempt }) => trackAcademyAttempt(event, input.lesson))
      .catch(() => {
        // Optional telemetry can never affect functional progress.
      })
    return event
  }, [commit, syncNow])

  const selectCourse = useCallback((course: CourseId) => {
    if (progressRef.current.selectedCourse === course) return
    commit({
      ...progressRef.current,
      selectedCourse: course,
      updatedAt: new Date().toISOString(),
    })
  }, [commit])

  const completeDiagnostic = useCallback((course: CourseId, percentage: number) => {
    const scores = Object.fromEntries(
      getCourseModules(course).map((module) => [module.skillId, percentage]),
    )
    commit(applyDiagnosticResult(progressRef.current, course, scores))
  }, [commit])

  const resetProgress = useCallback(async () => {
    const [{ clearFinishedReplays }, fresh] = await Promise.all([
      import('../lib/replayStore'),
      clearAcademyData(),
    ])
    await clearFinishedReplays()
    progressRef.current = fresh
    setProgress(fresh)
  }, [])

  const exportData = useCallback(async () => {
    const [academyJson, { listFinishedReplays }] = await Promise.all([
      exportAcademyData(),
      import('../lib/replayStore'),
    ])
    const academy = JSON.parse(academyJson) as Record<string, unknown>
    const finishedReplays = await listFinishedReplays()
    return JSON.stringify({ ...academy, finishedReplays }, null, 2)
  }, [])

  return {
    progress,
    loading,
    submitAttempt,
    selectCourse,
    completeDiagnostic,
    exportData,
    resetProgress,
    syncState,
    syncNow,
  }
}
