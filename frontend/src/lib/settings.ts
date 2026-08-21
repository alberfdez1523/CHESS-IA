import type { Language } from './types'

export type Theme = 'dark' | 'light' | 'system'
export type MotionPreference = 'system' | 'reduced' | 'full'
export type BoardStyle = 'editorial' | 'walnut' | 'contrast'
export type PieceStyle = 'solid' | 'outline'
export type ScreenReaderNarration = 'concise' | 'detailed'

export interface AppSettings {
  theme: Theme
  language: Language
  sfxVolume: number
  musicVolume: number
  showHints: boolean
  autoResolveMeasurements: boolean
  highContrast: boolean
  motionPreference: MotionPreference
  boardStyle: BoardStyle
  pieceStyle: PieceStyle
  screenReaderNarration: ScreenReaderNarration
  haptics: boolean
  telemetryConsent: boolean
}

const STORAGE_KEY = 'gdd-settings'

const DEFAULTS: AppSettings = {
  theme: 'dark',
  language: 'es',
  sfxVolume: 0.8,
  musicVolume: 0.3,
  showHints: true,
  autoResolveMeasurements: false,
  highContrast: false,
  motionPreference: 'system',
  boardStyle: 'editorial',
  pieceStyle: 'solid',
  screenReaderNarration: 'concise',
  haptics: false,
  telemetryConsent: false,
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return {
      theme: parsed.theme === 'light' || parsed.theme === 'system' ? parsed.theme : 'dark',
      language: parsed.language === 'en' ? 'en' : 'es',
      sfxVolume: clamp01(parsed.sfxVolume ?? DEFAULTS.sfxVolume),
      musicVolume: clamp01(parsed.musicVolume ?? DEFAULTS.musicVolume),
      showHints: parsed.showHints !== false,
      autoResolveMeasurements: parsed.autoResolveMeasurements === true,
      highContrast: parsed.highContrast === true,
      motionPreference: parsed.motionPreference === 'reduced' || parsed.motionPreference === 'full'
        ? parsed.motionPreference
        : 'system',
      boardStyle: parsed.boardStyle === 'walnut' || parsed.boardStyle === 'contrast'
        ? parsed.boardStyle
        : 'editorial',
      pieceStyle: parsed.pieceStyle === 'outline' ? 'outline' : 'solid',
      screenReaderNarration: parsed.screenReaderNarration === 'detailed' ? 'detailed' : 'concise',
      haptics: parsed.haptics === true,
      telemetryConsent: parsed.telemetryConsent === true,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettings(partial: Partial<AppSettings>): AppSettings {
  const next = { ...loadSettings(), ...partial }
  next.sfxVolume = clamp01(next.sfxVolume)
  next.musicVolume = clamp01(next.musicVolume)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.max(0, Math.min(1, value))
}
