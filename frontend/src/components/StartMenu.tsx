import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { checkHealth } from '../lib/api'
import { DIFFICULTIES, TIMER_OPTIONS } from '../lib/constants'
import { gameAutosave, type GameAutosave, type GameAutosaveSummary } from '../lib/gameAutosave'
import { loadGameSetup, saveGameSetup } from '../lib/gameSetup'
import { getDifficultyLabel } from '../lib/i18n'
import type {
  Difficulty,
  GameConfig,
  GameMode,
  Language,
  OpponentMode,
  PieceColor,
  PlayerColorChoice,
} from '../lib/types'
import GameIcon, { type GameIconName } from './GameIcon'
import OnlineBetaNotice from './OnlineBetaNotice'
import QuantumLogo from './QuantumLogo'

interface StartMenuProps {
  onPlay: (config: GameConfig) => void
  onContinue: (autosave: GameAutosave) => void
  onOpenOnlineLobby: (prefs: {
    gameMode: GameMode
    color: PlayerColorChoice
    useTimer: boolean
    timerMinutes: number
    difficulty: Difficulty
  }) => void
  onRules: () => void
  onQuantumTutorial: () => void
  language: Language
  onOpenSettings: () => void
}

export default function StartMenu({
  onPlay,
  onContinue,
  onOpenOnlineLobby,
  onRules,
  onQuantumTutorial,
  language,
  onOpenSettings,
}: StartMenuProps) {
  const initial = useMemo(() => loadGameSetup(), [])
  const [gameMode, setGameMode] = useState<GameMode>(initial.gameMode)
  const [opponentMode, setOpponentMode] = useState<OpponentMode>(initial.opponentMode)
  const [color, setColor] = useState<PlayerColorChoice>(initial.color)
  const [difficulty, setDifficulty] = useState<Difficulty>(initial.difficulty)
  const [useTimer, setUseTimer] = useState(initial.useTimer)
  const [timerMinutes, setTimerMinutes] = useState(initial.timerMinutes)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [serverReady, setServerReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const [autosaveSummary, setAutosaveSummary] = useState<GameAutosaveSummary | null>(() => gameAutosave.getSummary())
  const reduceMotion = useReducedMotion()

  const isQuantum = gameMode === 'quantum'
  const isOnline = opponentMode === 'online'
  const requiresStockfish = gameMode === 'classic' && opponentMode === 'ai'
  const canStart = !requiresStockfish || serverReady

  const copy = language === 'es'
    ? {
        appName: 'Gambito de Dama Cuántico',
        title: 'Juega el tablero que todavía no existe.',
        quantum: 'Jugar cuántico',
        quantumDetail: 'Split, fusión y medición',
        classic: 'Clásico',
        classicDetail: 'Reglas FIDE y Stockfish',
        online: 'En línea',
        onlineDetail: 'Sala privada · beta casual',
        academy: 'Academia',
        academyDetail: 'Siete misiones jugables',
        setupEyebrow: 'Nueva partida',
        setupTitle: isQuantum ? 'Configura la partida' : 'Prepara el tablero',
        setupIntro: 'Elige primero a tu rival. El resto ya tiene una configuración recomendada.',
        rival: 'Rival',
        ai: isQuantum ? 'IA cuántica' : 'Stockfish',
        local: 'Dos jugadores',
        onlineRival: 'Rival en línea',
        personalize: 'Personalizar',
        closePersonalize: 'Ocultar opciones',
        pieces: 'Tu color',
        white: 'Blancas',
        random: 'Aleatorio',
        black: 'Negras',
        difficulty: 'Dificultad',
        clock: 'Reloj',
        noClock: 'Sin reloj',
        summary: 'Resumen',
        start: isOnline ? 'Abrir sala' : isQuantum ? 'Iniciar partida cuántica' : 'Iniciar partida clásica',
        checking: 'Comprobando Stockfish…',
        unavailable: 'Stockfish no responde',
        offlineDetail: 'Puedes reintentar, jugar local o cambiar a la IA cuántica heurística.',
        retry: 'Reintentar',
        playLocal: 'Jugar local',
        quantumAi: 'Usar IA cuántica',
        ready: 'Stockfish disponible',
        continue: 'Continuar partida',
        continueDetail: 'Partida local guardada en este dispositivo',
        moves: 'jugadas',
        rules: 'Referencia de reglas',
        settings: 'Ajustes',
        beta: 'beta casual',
      }
    : {
        appName: 'Gambito de Dama Cuántico',
        title: 'Play the board that does not exist yet.',
        quantum: 'Play quantum',
        quantumDetail: 'Split, merge and measure',
        classic: 'Classic',
        classicDetail: 'FIDE rules and Stockfish',
        online: 'Online',
        onlineDetail: 'Private room · casual beta',
        academy: 'Academy',
        academyDetail: 'Seven playable missions',
        setupEyebrow: 'New game',
        setupTitle: isQuantum ? 'Configure the game' : 'Prepare the board',
        setupIntro: 'Choose your opponent first. Everything else starts with sensible defaults.',
        rival: 'Opponent',
        ai: isQuantum ? 'Quantum AI' : 'Stockfish',
        local: 'Two players',
        onlineRival: 'Online opponent',
        personalize: 'Customize',
        closePersonalize: 'Hide options',
        pieces: 'Your color',
        white: 'White',
        random: 'Random',
        black: 'Black',
        difficulty: 'Difficulty',
        clock: 'Clock',
        noClock: 'No clock',
        summary: 'Summary',
        start: isOnline ? 'Open room' : isQuantum ? 'Start quantum game' : 'Start classic game',
        checking: 'Checking Stockfish…',
        unavailable: 'Stockfish is not responding',
        offlineDetail: 'Retry, play locally, or switch to the heuristic quantum AI.',
        retry: 'Retry',
        playLocal: 'Play locally',
        quantumAi: 'Use quantum AI',
        ready: 'Stockfish available',
        continue: 'Continue game',
        continueDetail: 'Local game saved on this device',
        moves: 'moves',
        rules: 'Rules reference',
        settings: 'Settings',
        beta: 'casual beta',
      }

  const pollHealth = useCallback(async () => {
    setChecking(true)
    const ok = await checkHealth()
    setServerReady(ok)
    setChecking(false)
  }, [])

  useEffect(() => {
    void pollHealth()
  }, [pollHealth])

  const selectMode = useCallback((mode: GameMode, opponent?: OpponentMode) => {
    setGameMode(mode)
    if (opponent) setOpponentMode(opponent)
    if (mode === 'quantum' && difficulty === 'master') setDifficulty('medium')
  }, [difficulty])

  const setup = useMemo(() => ({
    gameMode,
    opponentMode,
    color,
    difficulty,
    useTimer,
    timerMinutes,
  }), [color, difficulty, gameMode, opponentMode, timerMinutes, useTimer])

  const handleStart = useCallback(() => {
    if (!canStart) return
    saveGameSetup(setup)
    if (opponentMode === 'online') {
      onOpenOnlineLobby({ gameMode, color, useTimer, timerMinutes, difficulty })
      return
    }
    const playerColor: PieceColor = color === 'random'
      ? (Math.random() < 0.5 ? 'w' : 'b')
      : color
    onPlay({ playerColor, difficulty, opponentMode, useTimer, timerMinutes, gameMode })
  }, [canStart, color, difficulty, gameMode, onOpenOnlineLobby, onPlay, opponentMode, setup, timerMinutes, useTimer])

  const handleContinue = useCallback(() => {
    const autosave = gameAutosave.load()
    if (!autosave) {
      setAutosaveSummary(null)
      return
    }
    onContinue(autosave)
  }, [onContinue])

  const duration = reduceMotion ? 0.01 : 0.2

  return (
    <main
      className="min-h-screen bg-surface-0 text-ink"
      data-game-variant={gameMode}
    >
      <div className="mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[minmax(0,1.08fr)_minmax(430px,0.92fr)]">
        <section className="relative flex min-h-[44vh] flex-col justify-between overflow-hidden border-b border-line px-5 py-6 sm:px-8 lg:min-h-screen lg:border-b-0 lg:border-r lg:px-14 lg:py-12">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="absolute -right-48 top-1/4 h-[34rem] w-[34rem] rounded-full bg-quantum/[0.08] blur-3xl" />
            <div className="absolute bottom-0 left-1/4 h-px w-2/3 bg-gradient-to-r from-transparent via-quantum/40 to-transparent" />
          </div>

          <header className="relative z-10 flex items-center justify-between gap-4">
            <QuantumLogo className="h-10 w-[4.25rem] shrink-0 sm:h-11 sm:w-[4.7rem]" title={copy.appName} />
            <button
              type="button"
              onClick={onOpenSettings}
              className="grid min-h-11 min-w-11 shrink-0 place-items-center border border-transparent text-ink-secondary transition-colors hover:border-line hover:bg-surface-1 hover:text-ink"
              aria-label={copy.settings}
            >
              <GameIcon name="settings" className="h-5 w-5" />
            </button>
          </header>

          <div className="relative z-10 flex flex-1 flex-col justify-center gap-8 py-8 lg:gap-10 lg:py-6">
            <div className="mx-auto flex w-full max-w-[36rem] flex-col items-center gap-4 text-center sm:gap-5">
              <QuantumLogo
                className="h-16 w-[6.8rem] shrink-0 sm:h-20 sm:w-[8.5rem] lg:h-24 lg:w-[10.2rem]"
                title={copy.appName}
              />
              <h1 className="max-w-[14ch] font-sans text-[2.1rem] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[2.5rem] sm:leading-[1.02] lg:text-[3rem] xl:text-[3.5rem]">
                {copy.appName}
              </h1>
              <p className="max-w-[34ch] text-base leading-7 text-ink-secondary sm:text-lg">
                {copy.title}
              </p>
            </div>

            <nav className="grid gap-px border border-line bg-line sm:grid-cols-2" aria-label={language === 'es' ? 'Centro de juego' : 'Game hub'}>
              <HubAction
                icon="atom"
                title={copy.quantum}
                detail={copy.quantumDetail}
                active={gameMode === 'quantum' && opponentMode !== 'online'}
                quantum
                testId="start-mode-quantum"
                onClick={() => selectMode('quantum', 'ai')}
              />
              <HubAction
                icon="classic"
                title={copy.classic}
                detail={copy.classicDetail}
                active={gameMode === 'classic' && opponentMode !== 'online'}
                testId="start-mode-classic"
                onClick={() => selectMode('classic', 'ai')}
              />
              <HubAction
                icon="globe"
                title={copy.online}
                detail={copy.onlineDetail}
                active={opponentMode === 'online'}
                testId="start-hub-online"
                onClick={() => setOpponentMode('online')}
              />
              <HubAction
                icon="book"
                title={copy.academy}
                detail={copy.academyDetail}
                testId="start-quantum-tutorial"
                onClick={onQuantumTutorial}
              />
            </nav>
          </div>
        </section>

        <section className="flex min-h-[56vh] items-center bg-surface-1 px-5 py-10 sm:px-8 lg:min-h-screen lg:px-12 xl:px-16">
          <div className="mx-auto w-full max-w-[34rem]">
            <p className="text-xs font-semibold tracking-[0.14em] text-ink-muted">{copy.setupEyebrow}</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">{copy.setupTitle}</h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-ink-secondary">{copy.setupIntro}</p>

            {autosaveSummary && (
              <button
                type="button"
                onClick={handleContinue}
                className="group mt-7 flex min-h-[76px] w-full items-center gap-4 border border-quantum/45 bg-quantum/[0.06] p-4 text-left transition-colors hover:border-quantum hover:bg-quantum/[0.1]"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center border border-quantum/35 text-quantum">
                  <GameIcon name="history" className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">{copy.continue}</span>
                  <span className="mt-1 block text-xs text-ink-secondary">
                    {autosaveSummary.type === 'quantum' ? copy.quantum : copy.classic} · {autosaveSummary.moveCount} {copy.moves}
                  </span>
                </span>
                <GameIcon name="chevron" className="h-5 w-5 text-quantum transition-transform group-hover:translate-x-1" />
              </button>
            )}

            <fieldset className="mt-8">
              <legend className="mb-3 text-xs font-semibold text-ink-secondary">{copy.rival}</legend>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={copy.rival}>
                <OptionButton
                  active={opponentMode === 'ai'}
                  label={copy.ai}
                  icon="bot"
                  testId="start-opponent-ai"
                  onClick={() => setOpponentMode('ai')}
                />
                <OptionButton
                  active={opponentMode === 'local'}
                  label={copy.local}
                  icon="users"
                  testId="start-opponent-local"
                  onClick={() => setOpponentMode('local')}
                />
                <OptionButton
                  active={opponentMode === 'online'}
                  label={copy.onlineRival}
                  icon="globe"
                  testId="start-opponent-online"
                  onClick={() => setOpponentMode('online')}
                />
              </div>
            </fieldset>

            {opponentMode === 'online' && (
              <div className="mt-3"><OnlineBetaNotice language={language} variant="compact" /></div>
            )}

            <button
              type="button"
              onClick={() => setCustomizeOpen((value) => !value)}
              className="mt-5 flex min-h-11 w-full items-center justify-between border-y border-line py-3 text-sm font-semibold text-ink transition-colors hover:text-quantum"
              aria-expanded={customizeOpen}
              aria-controls="game-customization"
            >
              <span>{customizeOpen ? copy.closePersonalize : copy.personalize}</span>
              <GameIcon name="chevron" className={`h-4 w-4 transition-transform ${customizeOpen ? 'rotate-90' : ''}`} />
            </button>

            <AnimatePresence initial={false}>
              {customizeOpen && (
                <motion.div
                  id="game-customization"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration }}
                  className="overflow-hidden"
                >
                  <div className="space-y-6 py-6">
                    <ChoiceGroup
                      legend={copy.pieces}
                      value={color}
                      options={[
                        { value: 'w', label: `♔ ${copy.white}`, ariaLabel: copy.white },
                        { value: 'random', label: copy.random },
                        { value: 'b', label: `♚ ${copy.black}`, ariaLabel: copy.black },
                      ]}
                      onChange={(value) => setColor(value as PlayerColorChoice)}
                    />

                    {opponentMode === 'ai' && (
                      <fieldset>
                        <legend className="mb-3 text-xs font-semibold text-ink-secondary">{copy.difficulty}</legend>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" role="radiogroup" aria-label={copy.difficulty}>
                          {DIFFICULTIES.map((item) => (
                            <button
                              key={item.key}
                              type="button"
                              data-testid={`start-difficulty-${item.key}`}
                              role="radio"
                              aria-checked={difficulty === item.key}
                              onClick={() => setDifficulty(item.key)}
                              className={`min-h-11 border px-2 py-2 text-xs font-semibold transition-colors ${
                                difficulty === item.key
                                  ? isQuantum ? 'border-quantum bg-quantum/10 text-quantum' : 'border-accent bg-accent/10 text-accent'
                                  : 'border-line bg-surface-0 text-ink-secondary hover:text-ink'
                              }`}
                            >
                              {getDifficultyLabel(item.key, language)}
                            </button>
                          ))}
                        </div>
                      </fieldset>
                    )}

                    <fieldset>
                      <legend className="mb-3 text-xs font-semibold text-ink-secondary">{copy.clock}</legend>
                      <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label={copy.clock}>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={!useTimer}
                          onClick={() => setUseTimer(false)}
                          className={`min-h-11 border px-2 text-xs font-semibold transition-colors ${!useTimer ? 'border-ink bg-ink text-surface-0' : 'border-line bg-surface-0 text-ink-secondary'}`}
                        >
                          {copy.noClock}
                        </button>
                        {TIMER_OPTIONS.map((minutes) => (
                          <button
                            key={minutes}
                            type="button"
                            role="radio"
                            aria-checked={useTimer && timerMinutes === minutes}
                            onClick={() => { setUseTimer(true); setTimerMinutes(minutes) }}
                            className={`min-h-11 border px-2 font-mono text-xs font-semibold transition-colors ${useTimer && timerMinutes === minutes ? 'border-ink bg-ink text-surface-0' : 'border-line bg-surface-0 text-ink-secondary'}`}
                          >
                            {minutes} min
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-6 border border-line bg-surface-0 p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-semibold text-ink-muted">{copy.summary}</span>
                <span className="text-right text-sm font-medium text-ink">
                  {isQuantum ? copy.quantum : copy.classic} · {opponentMode === 'ai' ? copy.ai : opponentMode === 'local' ? copy.local : copy.online}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-4 border-t border-line pt-3 text-xs text-ink-secondary">
                <span>{color === 'w' ? copy.white : color === 'b' ? copy.black : copy.random}</span>
                <span className="font-mono">{useTimer ? `${timerMinutes}:00` : copy.noClock}</span>
              </div>
            </div>

            {requiresStockfish && !serverReady && !checking && (
              <div className="mt-4 border-l-2 border-amber-400 bg-amber-400/[0.07] p-4" role="alert">
                <p className="font-semibold text-ink">{copy.unavailable}</p>
                <p className="mt-1 text-sm leading-5 text-ink-secondary">{copy.offlineDetail}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <SmallAction icon="retry" label={copy.retry} onClick={() => void pollHealth()} />
                  <SmallAction icon="users" label={copy.playLocal} onClick={() => setOpponentMode('local')} />
                  <SmallAction icon="atom" label={copy.quantumAi} onClick={() => selectMode('quantum', 'ai')} />
                </div>
              </div>
            )}

            <button
              type="button"
              data-testid="start-play"
              onClick={handleStart}
              disabled={!canStart}
              className={`mt-5 flex min-h-[56px] w-full items-center justify-between border px-5 text-sm font-semibold transition-colors ${
                canStart
                  ? isQuantum
                    ? 'border-quantum bg-quantum text-on-quantum hover:bg-quantum-light'
                    : 'border-accent bg-accent text-surface-0 hover:bg-accent-hover'
                  : 'cursor-wait border-line bg-surface-2 text-ink-muted'
              }`}
            >
              <span>{checking && requiresStockfish ? copy.checking : copy.start}</span>
              <GameIcon name={isOnline ? 'globe' : isQuantum ? 'atom' : 'play'} className="h-5 w-5" />
            </button>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-secondary">
              <button type="button" data-testid="start-rules" onClick={onRules} className="min-h-11 hover:text-ink">{copy.rules}</button>
              <div className="flex items-center gap-4">
                {gameMode === 'classic' && (
                  <span className="flex items-center gap-2" role="status">
                    <span className={`h-1.5 w-1.5 rounded-full ${serverReady ? 'bg-emerald-400' : checking ? 'animate-pulse bg-amber-400' : 'bg-red-400'}`} />
                    {serverReady ? copy.ready : checking ? copy.checking : copy.unavailable}
                  </span>
                )}
                {isOnline && <span className="text-quantum">{copy.beta}</span>}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function HubAction({
  icon,
  title,
  detail,
  active = false,
  quantum = false,
  testId,
  onClick,
}: {
  icon: GameIconName
  title: string
  detail: string
  active?: boolean
  quantum?: boolean
  testId?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      aria-pressed={active}
      className={`group flex min-h-[92px] items-center gap-4 bg-surface-0 p-4 text-left transition-colors hover:bg-surface-2 ${active ? quantum ? 'text-quantum' : 'text-accent' : 'text-ink'}`}
    >
      <span className={`grid h-11 w-11 shrink-0 place-items-center border ${active ? 'border-current' : 'border-line text-ink-secondary'}`}>
        <GameIcon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="mt-1 block text-xs text-ink-secondary">{detail}</span>
      </span>
      <GameIcon name="chevron" className="h-4 w-4 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
    </button>
  )
}

function OptionButton({
  active,
  label,
  icon,
  testId,
  onClick,
}: {
  active: boolean
  label: string
  icon: GameIconName
  testId: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`flex min-h-[72px] flex-col items-center justify-center gap-2 border px-2 py-3 text-center text-xs font-semibold transition-colors ${active ? 'border-quantum bg-quantum/[0.08] text-quantum' : 'border-line bg-surface-0 text-ink-secondary hover:text-ink'}`}
    >
      <GameIcon name={icon} className="h-5 w-5" />
      <span>{label}</span>
    </button>
  )
}

function ChoiceGroup({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string
  value: string
  options: Array<{ value: string; label: ReactNode; ariaLabel?: string }>
  onChange: (value: string) => void
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-xs font-semibold text-ink-secondary">{legend}</legend>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={legend}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            aria-label={option.ariaLabel}
            onClick={() => onChange(option.value)}
            className={`min-h-11 border px-3 text-sm font-semibold transition-colors ${value === option.value ? 'border-ink bg-ink text-surface-0' : 'border-line bg-surface-0 text-ink-secondary hover:text-ink'}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function SmallAction({ icon, label, onClick }: { icon: GameIconName; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-2 border border-line bg-surface-0 px-3 text-xs font-semibold text-ink transition-colors hover:border-ink"
    >
      <GameIcon name={icon} />
      {label}
    </button>
  )
}
