import { describe, expect, it } from 'vitest'
import { ACADEMY_CONTENT, ACADEMY_LESSONS, getModuleLessons } from './academyContent'
import {
  applyAttemptEvent,
  applyDiagnosticResult,
  calculateAttemptScore,
  createAcademyProgress,
  createAttemptEvent,
  getAcademyRecommendation,
  getCourseCompletion,
  isLessonUnlocked,
  selectDailyLesson,
} from './academyProgress'
import type { AcademyProgress, LessonDefinition } from './academyTypes'

const START = '2026-08-11T10:00:00.000Z'

function solve(
  progress: AcademyProgress,
  lesson: LessonDefinition,
  options: { correct?: boolean; hints?: number; completedAt?: string } = {},
): AcademyProgress {
  const correct = options.correct ?? true
  const event = createAttemptEvent({
    guestId: progress.guestId,
    lesson,
    answerIndex: correct ? lesson.challenge.correctIndex : (lesson.challenge.correctIndex + 1) % 3,
    correct,
    hintsUsed: options.hints ?? 0,
    actionsTaken: 1,
    startedAt: START,
    completedAt: options.completedAt ?? START,
  })
  return applyAttemptEvent(progress, event, lesson)
}

describe('academy content', () => {
  it('ships two complete bilingual routes with 64 validated activities', () => {
    expect(ACADEMY_CONTENT.modules).toHaveLength(16)
    expect(ACADEMY_CONTENT.lessons).toHaveLength(64)
    expect(ACADEMY_CONTENT.modules.filter((module) => module.course === 'classic')).toHaveLength(8)
    expect(ACADEMY_CONTENT.modules.filter((module) => module.course === 'quantum')).toHaveLength(8)
    expect(new Set(ACADEMY_CONTENT.lessons.map((lesson) => lesson.id)).size).toBe(64)

    for (const lesson of ACADEMY_CONTENT.lessons) {
      expect(lesson.title.es).not.toBe('')
      expect(lesson.title.en).not.toBe('')
      expect(lesson.hintLadder).toHaveLength(4)
    }
  })
})

describe('academy progression', () => {
  it('scores correctness, hints and efficiency on a bounded scale', () => {
    expect(calculateAttemptScore({ correct: true, hintsUsed: 0, actionsTaken: 1 })).toBe(100)
    expect(calculateAttemptScore({ correct: true, hintsUsed: 4, actionsTaken: 5 })).toBe(35)
    expect(calculateAttemptScore({ correct: false, hintsUsed: 4, actionsTaken: 9 })).toBe(0)
  })

  it('updates mastery with the specified 70/30 formula and deduplicates UUIDs', () => {
    const lesson = ACADEMY_LESSONS[0]
    const initial = createAcademyProgress(new Date(START), 'guest_test')
    const event = createAttemptEvent({
      guestId: initial.guestId,
      lesson,
      answerIndex: lesson.challenge.correctIndex,
      correct: true,
      hintsUsed: 0,
      actionsTaken: 1,
      startedAt: START,
      completedAt: START,
    })
    const once = applyAttemptEvent(initial, event, lesson)
    const twice = applyAttemptEvent(once, event, lesson)

    expect(once.mastery['classic.board'].mastery).toBe(30)
    expect(once.mastery['classic.board'].independentPasses).toBe(1)
    expect(twice).toBe(once)
  })

  it('unlocks a new module only after mastery and independent resolutions', () => {
    let progress = createAcademyProgress(new Date(START), 'guest_test')
    const firstModule = getModuleLessons('classic-board')
    const nextModuleLesson = getModuleLessons('classic-rules')[0]

    expect(isLessonUnlocked(firstModule[0], progress)).toBe(true)
    expect(isLessonUnlocked(firstModule[1], progress)).toBe(false)

    for (const lesson of firstModule) progress = solve(progress, lesson)

    expect(progress.mastery['classic.board'].mastery).toBeCloseTo(76, 0)
    expect(progress.mastery['classic.board'].independentPasses).toBe(4)
    expect(isLessonUnlocked(nextModuleLesson, progress)).toBe(true)
  })

  it('caps diagnosis at 60 and keeps a later proof necessary', () => {
    const initial = createAcademyProgress(new Date(START), 'guest_test')
    const diagnosed = applyDiagnosticResult(initial, 'classic', {
      'classic.board': 98,
      'classic.rules': 42,
      'quantum.split': 90,
    }, START)

    expect(diagnosed.mastery['classic.board'].mastery).toBe(60)
    expect(diagnosed.mastery['classic.rules'].mastery).toBe(42)
    expect(diagnosed.mastery['quantum.split']).toBeUndefined()
    expect(diagnosed.mastery['classic.board'].independentPasses).toBe(0)
  })

  it('schedules 1/3 day reviews, backs up after failure and keeps streaks', () => {
    const lesson = ACADEMY_LESSONS[0]
    let progress = createAcademyProgress(new Date(START), 'guest_test')
    progress = solve(progress, lesson, { completedAt: START })
    expect(progress.mastery['classic.board'].nextReviewAt).toBe('2026-08-12T10:00:00.000Z')
    expect(progress.currentStreak).toBe(1)

    progress = solve(progress, lesson, { completedAt: '2026-08-12T10:00:00.000Z' })
    expect(progress.mastery['classic.board'].nextReviewAt).toBe('2026-08-15T10:00:00.000Z')
    expect(progress.currentStreak).toBe(2)

    progress = solve(progress, lesson, {
      correct: false,
      completedAt: '2026-08-13T10:00:00.000Z',
    })
    expect(progress.mastery['classic.board'].nextReviewAt).toBe('2026-08-14T10:00:00.000Z')
    expect(progress.currentStreak).toBe(3)
  })

  it('recommends due review first and derives stable daily challenges', () => {
    const lesson = ACADEMY_LESSONS[0]
    let progress = createAcademyProgress(new Date(START), 'guest_test')
    progress = solve(progress, lesson)

    const recommendation = getAcademyRecommendation(progress, 'classic', new Date('2026-08-12T11:00:00.000Z'))
    expect(recommendation.reason).toBe('review')
    expect(recommendation.lesson?.id).toBe(lesson.id)
    expect(selectDailyLesson('2026-08-11', 'quantum').id).toBe(selectDailyLesson('2026-08-11', 'quantum').id)
    expect(selectDailyLesson('2026-08-11', 'quantum').kind).toBe('puzzle')
  })

  it('reports route completion without relocking completed content', () => {
    let progress = createAcademyProgress(new Date(START), 'guest_test')
    const lesson = ACADEMY_LESSONS[0]
    progress = solve(progress, lesson)
    const weakened = {
      ...progress,
      mastery: {
        ...progress.mastery,
        'classic.board': { ...progress.mastery['classic.board'], mastery: 10 },
      },
    }

    expect(isLessonUnlocked(lesson, weakened)).toBe(true)
    expect(getCourseCompletion(progress, 'classic')).toBe(3)
  })
})

