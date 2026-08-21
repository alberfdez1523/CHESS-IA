import { z } from 'zod'

export const ACADEMY_CONTENT_VERSION = '2026.1'
export const ACADEMY_PROGRESS_VERSION = 1 as const

export const courseIdSchema = z.enum(['classic', 'quantum'])
export type CourseId = z.infer<typeof courseIdSchema>

export const activityKindSchema = z.enum(['lesson', 'guided', 'puzzle', 'exam'])
export type ActivityKind = z.infer<typeof activityKindSchema>

export const localizedTextSchema = z.object({
  es: z.string().min(1),
  en: z.string().min(1),
})
export type LocalizedText = z.infer<typeof localizedTextSchema>

export const academyModuleSchema = z.object({
  id: z.string().min(1),
  course: courseIdSchema,
  order: z.number().int().min(0),
  skillId: z.string().min(1),
  title: localizedTextSchema,
  summary: localizedTextSchema,
  accent: z.enum(['classic', 'quantum', 'merge', 'neutral']),
})
export type AcademyModule = z.infer<typeof academyModuleSchema>

export const lessonChallengeSchema = z.object({
  prompt: localizedTextSchema,
  options: z.array(localizedTextSchema).min(2).max(4),
  correctIndex: z.number().int().min(0),
  explanation: localizedTextSchema,
})

export const lessonDefinitionSchema = z.object({
  id: z.string().min(1),
  contentVersion: z.string().min(1),
  course: courseIdSchema,
  moduleId: z.string().min(1),
  moduleOrder: z.number().int().min(0),
  activityOrder: z.number().int().min(0).max(3),
  kind: activityKindSchema,
  difficulty: z.number().int().min(1).max(5),
  estimatedMinutes: z.number().int().min(1).max(30),
  skillIds: z.array(z.string().min(1)).min(1),
  prerequisites: z.array(z.string().min(1)),
  title: localizedTextSchema,
  summary: localizedTextSchema,
  concept: localizedTextSchema,
  hintLadder: z.array(localizedTextSchema).length(4),
  challenge: lessonChallengeSchema.superRefine((challenge, context) => {
    if (challenge.correctIndex >= challenge.options.length) {
      context.addIssue({
        code: 'custom',
        message: 'correctIndex must reference an existing option',
        path: ['correctIndex'],
      })
    }
  }),
})
export type LessonDefinition = z.infer<typeof lessonDefinitionSchema>

export const academyContentSchema = z.object({
  version: z.string().min(1),
  modules: z.array(academyModuleSchema).length(16),
  lessons: z.array(lessonDefinitionSchema).length(64),
})
export type AcademyContent = z.infer<typeof academyContentSchema>

export interface AttemptEvent {
  id: string
  guestId: string
  lessonId: string
  contentVersion: string
  startedAt: string
  completedAt: string
  answerIndex: number
  correct: boolean
  hintsUsed: number
  actionsTaken: number
  score: number
  validatedOnline: boolean
}

export interface SkillMastery {
  skillId: string
  mastery: number
  confidence: number
  attempts: number
  independentPasses: number
  intervalIndex: number
  lastPracticedAt: string
  nextReviewAt: string
}

export interface AcademyProgress {
  version: typeof ACADEMY_PROGRESS_VERSION
  guestId: string
  selectedCourse: CourseId
  diagnosticComplete: boolean
  completedLessonIds: string[]
  attempts: AttemptEvent[]
  mastery: Record<string, SkillMastery>
  currentStreak: number
  longestStreak: number
  lastStudyDate: string | null
  updatedAt: string
}

export interface AcademyRecommendation {
  lesson: LessonDefinition | null
  reason: 'review' | 'continue' | 'start' | 'complete'
  dueReviewCount: number
}

export interface AttemptScoreInput {
  correct: boolean
  hintsUsed: number
  actionsTaken: number
  idealActions?: number
}

export function textFor(value: LocalizedText, language: 'es' | 'en'): string {
  return value[language]
}
