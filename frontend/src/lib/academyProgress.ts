import {
  ACADEMY_PROGRESS_VERSION,
  type AcademyProgress,
  type AcademyRecommendation,
  type AttemptEvent,
  type AttemptScoreInput,
  type CourseId,
  type LessonDefinition,
  type SkillMastery,
} from './academyTypes'
import {
  ACADEMY_LESSONS,
  ACADEMY_LESSON_BY_ID,
  ACADEMY_MODULE_BY_ID,
} from './academyContent'

export const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 30] as const

const DAY_MS = 86_400_000

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `academy-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function toStudyDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toISOString().slice(0, 10)
}

function addDays(value: string | Date, days: number): string {
  const date = typeof value === 'string' ? new Date(value) : new Date(value)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString()
}

function dayDistance(from: string, to: string): number {
  const fromMs = Date.parse(`${from}T00:00:00.000Z`)
  const toMs = Date.parse(`${to}T00:00:00.000Z`)
  return Math.round((toMs - fromMs) / DAY_MS)
}

export function createGuestId(): string {
  return `guest_${createId()}`
}

export function createAcademyProgress(
  now = new Date(),
  guestId = createGuestId(),
): AcademyProgress {
  return {
    version: ACADEMY_PROGRESS_VERSION,
    guestId,
    selectedCourse: 'classic',
    diagnosticComplete: false,
    completedLessonIds: [],
    attempts: [],
    mastery: {},
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: null,
    updatedAt: now.toISOString(),
  }
}

/**
 * Scores one attempt on a 0–100 scale. Hints deliberately cost more at the
 * end of the ladder, while inefficient extra actions have a bounded effect.
 */
export function calculateAttemptScore({
  correct,
  hintsUsed,
  actionsTaken,
  idealActions = 1,
}: AttemptScoreInput): number {
  const safeHints = clamp(Math.floor(hintsUsed), 0, 4)
  const safeIdeal = Math.max(1, Math.floor(idealActions))
  const safeActions = Math.max(safeIdeal, Math.floor(actionsTaken))
  const hintPenalties = [0, 8, 20, 35, 50]
  const efficiencyPenalty = Math.min(15, (safeActions - safeIdeal) * 5)
  const base = correct ? 100 : 35

  return Math.round(clamp(base - hintPenalties[safeHints] - efficiencyPenalty, 0, 100))
}

export interface CreateAttemptInput extends AttemptScoreInput {
  guestId: string
  lesson: LessonDefinition
  answerIndex: number
  startedAt: string
  completedAt?: string
  validatedOnline?: boolean
}

export function createAttemptEvent(input: CreateAttemptInput): AttemptEvent {
  const completedAt = input.completedAt ?? new Date().toISOString()

  return {
    id: createId(),
    guestId: input.guestId,
    lessonId: input.lesson.id,
    contentVersion: input.lesson.contentVersion,
    startedAt: input.startedAt,
    completedAt,
    answerIndex: input.answerIndex,
    correct: input.correct,
    hintsUsed: clamp(Math.floor(input.hintsUsed), 0, 4),
    actionsTaken: Math.max(1, Math.floor(input.actionsTaken)),
    score: calculateAttemptScore(input),
    validatedOnline: input.validatedOnline ?? false,
  }
}

function updateStreak(
  progress: AcademyProgress,
  completedAt: string,
): Pick<AcademyProgress, 'currentStreak' | 'longestStreak' | 'lastStudyDate'> {
  const studyDate = toStudyDate(completedAt)

  if (progress.lastStudyDate === studyDate) {
    return {
      currentStreak: progress.currentStreak,
      longestStreak: progress.longestStreak,
      lastStudyDate: studyDate,
    }
  }

  const distance = progress.lastStudyDate
    ? dayDistance(progress.lastStudyDate, studyDate)
    : Number.POSITIVE_INFINITY
  const currentStreak = distance === 1 ? progress.currentStreak + 1 : 1

  return {
    currentStreak,
    longestStreak: Math.max(progress.longestStreak, currentStreak),
    lastStudyDate: studyDate,
  }
}

function updateSkillMastery(
  previous: SkillMastery | undefined,
  skillId: string,
  event: AttemptEvent,
): SkillMastery {
  const mastery = Math.round(((previous?.mastery ?? 0) * 0.7 + event.score * 0.3) * 10) / 10
  const passedIndependently = event.correct && event.hintsUsed === 0 && event.score >= 70
  const successfulReview = event.correct && event.score >= 70
  const previousInterval = previous?.intervalIndex ?? -1
  const intervalIndex = successfulReview
    ? Math.min(REVIEW_INTERVAL_DAYS.length - 1, previousInterval + 1)
    : Math.max(0, previousInterval - 1)
  const evidence = passedIndependently ? 18 : event.correct ? 12 : 8

  return {
    skillId,
    mastery,
    confidence: clamp((previous?.confidence ?? 0) + evidence, 0, 100),
    attempts: (previous?.attempts ?? 0) + 1,
    independentPasses: (previous?.independentPasses ?? 0) + (passedIndependently ? 1 : 0),
    intervalIndex,
    lastPracticedAt: event.completedAt,
    nextReviewAt: addDays(event.completedAt, REVIEW_INTERVAL_DAYS[intervalIndex]),
  }
}

/**
 * Applies an append-only attempt event. Replaying an existing UUID is a no-op,
 * which keeps offline synchronisation idempotent.
 */
export function applyAttemptEvent(
  progress: AcademyProgress,
  event: AttemptEvent,
  lesson = ACADEMY_LESSON_BY_ID.get(event.lessonId),
): AcademyProgress {
  if (!lesson || progress.attempts.some((attempt) => attempt.id === event.id)) {
    return progress
  }

  const mastery = { ...progress.mastery }
  lesson.skillIds.forEach((skillId) => {
    mastery[skillId] = updateSkillMastery(mastery[skillId], skillId, event)
  })

  const completedLessonIds = event.correct
    ? Array.from(new Set([...progress.completedLessonIds, lesson.id]))
    : progress.completedLessonIds
  const streak = updateStreak(progress, event.completedAt)

  return {
    ...progress,
    ...streak,
    completedLessonIds,
    // A compact local history is enough for the UI; the append-only queue keeps
    // every event pending for server synchronisation.
    attempts: [...progress.attempts, event].slice(-250),
    mastery,
    updatedAt: event.completedAt,
  }
}

export function applyDiagnosticResult(
  progress: AcademyProgress,
  course: CourseId,
  scoresBySkill: Record<string, number>,
  completedAt = new Date().toISOString(),
): AcademyProgress {
  const mastery = { ...progress.mastery }

  Object.entries(scoresBySkill).forEach(([skillId, score]) => {
    if (!skillId.startsWith(`${course}.`)) return
    const cappedScore = clamp(score, 0, 60)
    mastery[skillId] = {
      skillId,
      mastery: cappedScore,
      confidence: 35,
      attempts: 0,
      independentPasses: 0,
      intervalIndex: 0,
      lastPracticedAt: completedAt,
      nextReviewAt: addDays(completedAt, REVIEW_INTERVAL_DAYS[0]),
    }
  })

  return {
    ...progress,
    selectedCourse: course,
    diagnosticComplete: true,
    mastery,
    updatedAt: completedAt,
  }
}

function previousModuleMastery(lesson: LessonDefinition, progress: AcademyProgress): SkillMastery | null {
  if (lesson.moduleOrder === 0) return null

  const previousModule = Array.from(ACADEMY_MODULE_BY_ID.values()).find(
    (module) => module.course === lesson.course && module.order === lesson.moduleOrder - 1,
  )
  if (!previousModule) return null

  return progress.mastery[previousModule.skillId] ?? null
}

export function isLessonUnlocked(lesson: LessonDefinition, progress: AcademyProgress): boolean {
  if (progress.completedLessonIds.includes(lesson.id)) return true
  if (lesson.moduleOrder === 0 && lesson.activityOrder === 0) return true

  const prerequisitesComplete = lesson.prerequisites.every((id) =>
    progress.completedLessonIds.includes(id),
  )
  if (!prerequisitesComplete) return false

  // Activities inside a module flow one after another. Moving to the next
  // module additionally requires demonstrated mastery and two clean solves.
  if (lesson.activityOrder > 0) return true

  const mastery = previousModuleMastery(lesson, progress)
  return Boolean(mastery && mastery.mastery >= 70 && mastery.independentPasses >= 2)
}

export function getDueLessons(
  progress: AcademyProgress,
  now = new Date(),
  course = progress.selectedCourse,
): LessonDefinition[] {
  const dueSkillIds = new Set(
    Object.values(progress.mastery)
      .filter((skill) => skill.nextReviewAt <= now.toISOString())
      .map((skill) => skill.skillId),
  )

  return ACADEMY_LESSONS.filter(
    (lesson) =>
      lesson.course === course
      && lesson.skillIds.some((skillId) => dueSkillIds.has(skillId))
      && progress.completedLessonIds.includes(lesson.id),
  ).sort((a, b) => {
    const aDate = Math.min(...a.skillIds.map((id) => Date.parse(progress.mastery[id]?.nextReviewAt ?? '9999')))
    const bDate = Math.min(...b.skillIds.map((id) => Date.parse(progress.mastery[id]?.nextReviewAt ?? '9999')))
    return aDate - bDate || b.activityOrder - a.activityOrder
  })
}

export function getAcademyRecommendation(
  progress: AcademyProgress,
  course = progress.selectedCourse,
  now = new Date(),
): AcademyRecommendation {
  const dueLessons = getDueLessons(progress, now, course)
  if (dueLessons.length > 0) {
    return { lesson: dueLessons[0], reason: 'review', dueReviewCount: dueLessons.length }
  }

  const courseLessons = ACADEMY_LESSONS.filter((lesson) => lesson.course === course)
  const next = courseLessons.find(
    (lesson) => !progress.completedLessonIds.includes(lesson.id) && isLessonUnlocked(lesson, progress),
  )

  if (next) {
    const hasCourseProgress = courseLessons.some((lesson) => progress.completedLessonIds.includes(lesson.id))
    return {
      lesson: next,
      reason: hasCourseProgress ? 'continue' : 'start',
      dueReviewCount: 0,
    }
  }

  return { lesson: null, reason: 'complete', dueReviewCount: 0 }
}

export function getCourseCompletion(progress: AcademyProgress, course: CourseId): number {
  const lessons = ACADEMY_LESSONS.filter((lesson) => lesson.course === course)
  const completed = lessons.filter((lesson) => progress.completedLessonIds.includes(lesson.id)).length
  return lessons.length === 0 ? 0 : Math.round((completed / lessons.length) * 100)
}

export function selectDailyLesson(date: string, course: CourseId): LessonDefinition {
  const lessons = ACADEMY_LESSONS.filter(
    (lesson) => lesson.course === course && lesson.kind === 'puzzle',
  )
  const seed = Array.from(date).reduce((hash, character) => (
    Math.imul(hash ^ character.charCodeAt(0), 16_777_619)
  ), 2_166_136_261) >>> 0

  return lessons[seed % lessons.length]
}
