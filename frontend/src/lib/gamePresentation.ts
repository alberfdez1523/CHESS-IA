import type { Language, PieceColor, PieceType } from './types'

export type GameVariant = 'classic' | 'quantum'
export type GameTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'
export type GameNoticePriority = 'low' | 'normal' | 'high'

/** View model shared by both player bars. It deliberately contains no engine state. */
export interface PlayerModel {
  label: string
  color: PieceColor
  elo?: string
  captures: PieceType[]
  materialDiff: number
  isActive: boolean
  turnLabel?: string
  time?: number | null
  isLow?: boolean
  coherence?: {
    used: number
    limit: number
    label: string
  }
}

export interface GameNoticeAction {
  label: string
  onSelect: () => void
}

/** A single actionable, screen-reader friendly game notice. */
export interface GameNotice {
  id: string
  message: string
  tone: Exclude<GameTone, 'accent'>
  priority?: GameNoticePriority
  action?: GameNoticeAction
}

export interface GameConnectionModel {
  label: string
  tone: GameTone
}

export interface GameStatusModel {
  message: string
  tone: GameTone
}

export interface GameChromeLabels {
  settings: string
  menu: string
  openInspector: string
  inspectorTitle: string
  tabs: {
    game: string
    history: string
    analysis: string
  }
}

/** Presentation-only contract consumed by GameScaffold. */
export interface GameChromeModel {
  language: Language
  variant: GameVariant
  modeLabel: string
  roomCode?: string
  connection?: GameConnectionModel
  players: {
    top: PlayerModel
    bottom: PlayerModel
  }
  status: GameStatusModel
  notices: GameNotice[]
  labels: GameChromeLabels
}
