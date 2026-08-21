import type {
  CoherenceLimit,
  Difficulty,
  GameMode,
  OpponentMode,
  PlayerColorChoice,
  RulesetId,
} from './types'

export interface GameSetupPreferences {
  gameMode: GameMode
  opponentMode: OpponentMode
  color: PlayerColorChoice
  difficulty: Difficulty
  useTimer: boolean
  timerMinutes: number
  rulesetId: RulesetId
  maxCoherence: CoherenceLimit
}

const STORAGE_KEY = 'gdd-last-game-setup-v2'

export const DEFAULT_GAME_SETUP: GameSetupPreferences = {
  gameMode: 'quantum',
  opponentMode: 'ai',
  color: 'w',
  difficulty: 'medium',
  useTimer: false,
  timerMinutes: 10,
  rulesetId: 'quantum-standard',
  maxCoherence: 4,
}

export function loadGameSetup(): GameSetupPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_GAME_SETUP }
    const stored = JSON.parse(raw) as Partial<GameSetupPreferences>
    return {
      gameMode: stored.gameMode === 'classic' ? 'classic' : 'quantum',
      opponentMode: stored.opponentMode === 'local' || stored.opponentMode === 'online' ? stored.opponentMode : 'ai',
      color: stored.color === 'b' || stored.color === 'random' ? stored.color : 'w',
      difficulty: isDifficulty(stored.difficulty) ? stored.difficulty : 'medium',
      useTimer: stored.useTimer === true,
      timerMinutes: typeof stored.timerMinutes === 'number' && stored.timerMinutes > 0 ? stored.timerMinutes : 10,
      rulesetId: stored.gameMode === 'classic'
        ? 'classic'
        : stored.rulesetId === 'quantum-coherence' ? 'quantum-coherence' : 'quantum-standard',
      maxCoherence: stored.maxCoherence === 2 || stored.maxCoherence === 6 ? stored.maxCoherence : 4,
    }
  } catch {
    return { ...DEFAULT_GAME_SETUP }
  }
}

export function saveGameSetup(setup: GameSetupPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(setup))
  } catch {
    // Storage is an enhancement; private browsing must not block play.
  }
}

function isDifficulty(value: unknown): value is Difficulty {
  return value === 'beginner' || value === 'easy' || value === 'medium' || value === 'hard' || value === 'master'
}
