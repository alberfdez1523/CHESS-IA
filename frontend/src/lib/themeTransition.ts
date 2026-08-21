import { flushSync } from 'react-dom'
import type { AppSettings, Theme } from './settings'

type ResolvedTheme = Exclude<Theme, 'system'>

const THEME_META_COLORS: Record<ResolvedTheme, string> = {
  dark: '#0b0c10',
  light: '#f7f7f5',
}

const TRANSITION_MS = 220

export interface ThemeTransitionOrigin {
  x: number
  y: number
}

export interface SettingsChangeMeta {
  /** Coordenadas del clic para la “view path” del cambio de tema */
  themeOrigin?: ThemeTransitionOrigin
}

export interface ThemeTransitionOptions {
  reducedMotion?: boolean
  origin?: ThemeTransitionOrigin
}

/** Aplica clases de tema y meta theme-color sin animación */
export function applyThemeToDom(theme: Theme): void {
  const resolved = resolveTheme(theme)
  const root = document.documentElement
  root.classList.remove('theme-dark', 'theme-light')
  root.classList.add(resolved === 'dark' ? 'theme-dark' : 'theme-light')
  root.dataset.theme = resolved
  root.dataset.themePreference = theme
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_META_COLORS[resolved])
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme !== 'system') return theme
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
}

export function applyDisplaySettingsToDom(settings: AppSettings): void {
  const root = document.documentElement
  const systemReduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const reduced = settings.motionPreference === 'reduced'
    || (settings.motionPreference === 'system' && systemReduced)

  root.classList.toggle('high-contrast', settings.highContrast)
  root.dataset.motion = reduced ? 'reduced' : 'full'
  root.dataset.boardStyle = settings.boardStyle
  root.dataset.pieceStyle = settings.pieceStyle
  root.dataset.narration = settings.screenReaderNarration
}

/**
 * Cambia el tema con View Transition API: el nuevo estado se revela con clip-path
 * en ::view-transition-new(root) (desde abajo o desde el punto de clic).
 */
export function runThemeTransition(
  nextTheme: Theme,
  commitState: () => void,
  options: ThemeTransitionOptions = {},
): void {
  if (options.reducedMotion || typeof document.startViewTransition !== 'function') {
    applyThemeToDom(nextTheme)
    commitState()
    return
  }

  const transition = document.startViewTransition(() => {
    flushSync(commitState)
    applyThemeToDom(nextTheme)
  })

  void transition.ready.then(() => {
    const { origin } = options
    const keyframes = origin
      ? {
          clipPath: [
            `circle(0px at ${origin.x}px ${origin.y}px)`,
            `circle(150vmax at ${origin.x}px ${origin.y}px)`,
          ],
        }
      : {
          clipPath: ['inset(0 0 100% 0)', 'inset(0)'],
        }

    document.documentElement.animate(keyframes, {
      pseudoElement: '::view-transition-new(root)',
      duration: TRANSITION_MS,
      easing: 'ease-in-out',
      fill: 'forwards',
    })
  })
}
