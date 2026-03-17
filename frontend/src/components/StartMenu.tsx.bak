import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DIFFICULTIES, TIMER_OPTIONS } from '../lib/constants'
import { checkHealth } from '../lib/api'
import { getDifficultyLabel } from '../lib/i18n'
import type { GameConfig, GameMode, OpponentMode, PieceColor, Difficulty, Language, PlayerColorChoice } from '../lib/types'

interface StartMenuProps {
  onPlay: (config: GameConfig) => void
  language: Language
}

// Piezas flotantes decorativas
const FLOATING_PIECES = ['♔', '♕', '♗', '♘', '♙', '♚', '♛', '♝', '♞', '♟']

export default function StartMenu({ onPlay, language }: StartMenuProps) {
  const [color, setColor] = useState<PlayerColorChoice>('w')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [opponentMode, setOpponentMode] = useState<OpponentMode>('ai')
  const [useTimer, setUseTimer] = useState(false)
  const [timerMinutes, setTimerMinutes] = useState(10)
  const [gameMode, setGameMode] = useState<GameMode>('classic')
  const [serverReady, setServerReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const requiresEngine = gameMode === 'classic' && opponentMode === 'ai'
  const canPlay = requiresEngine ? serverReady : true
  const text = language === 'es'
    ? {
        subtitleQuantum: 'Modo cuántico local 2 jugadores ⚛',
        subtitleClassic: 'Clásico vs Stockfish o 2 jugadores',
        gameMode: 'Modo de juego',
        classic: 'Clásico',
        quantum: 'Cuántico',
        color: 'Tu color',
        white: 'Blancas',
        random: 'Aleatorio',
        black: 'Negras',
        matchType: 'Tipo de partida',
        vsAi: 'Vs IA',
        twoPlayers: '2 jugadores',
        localQuantumInfo: '⚛ Modo cuántico: solo 2 jugadores en el mismo tablero.',
        difficulty: 'Dificultad',
        difficultyUnused: 'En 2 jugadores la dificultad no se usa.',
        clock: 'Reloj',
        playClassic: '▶  Jugar',
        playQuantum: '⚛  Jugar Cuántico',
        connecting: 'Conectando…',
        serverUnavailable: 'Servidor no disponible',
        stockfishReady: 'Stockfish listo',
        lookingServer: 'Buscando servidor…',
        offline: 'Sin conexión',
        traditionalChess: 'Ajedrez tradicional',
        superposition: 'Superposición y medición',
      }
    : {
        subtitleQuantum: 'Local 2-player quantum mode ⚛',
        subtitleClassic: 'Classic vs Stockfish or 2 players',
        gameMode: 'Game mode',
        classic: 'Classic',
        quantum: 'Quantum',
        color: 'Your color',
        white: 'White',
        random: 'Random',
        black: 'Black',
        matchType: 'Match type',
        vsAi: 'Vs AI',
        twoPlayers: '2 players',
        localQuantumInfo: '⚛ Quantum mode: only 2 players on the same board.',
        difficulty: 'Difficulty',
        difficultyUnused: 'Difficulty is not used in 2-player mode.',
        clock: 'Clock',
        playClassic: '▶  Play',
        playQuantum: '⚛  Play Quantum',
        connecting: 'Connecting…',
        serverUnavailable: 'Server unavailable',
        stockfishReady: 'Stockfish ready',
        lookingServer: 'Looking for server…',
        offline: 'Offline',
        traditionalChess: 'Traditional chess',
        superposition: 'Superposition and measurement',
      }

  // Verificar estado del servidor
  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      setChecking(true)
      const ok = await checkHealth()
      if (!cancelled) {
        setServerReady(ok)
        setChecking(false)
        if (!ok) setTimeout(poll, 3000)
      }
    }
    poll()
    return () => { cancelled = true }
  }, [])

  const handlePlay = useCallback(() => {
    if (!canPlay) return
    const playerColor: PieceColor =
      color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : color
    const mode = gameMode === 'quantum' ? 'local' : opponentMode
    onPlay({ playerColor, difficulty, opponentMode: mode, useTimer, timerMinutes, gameMode })
  }, [color, difficulty, opponentMode, useTimer, timerMinutes, gameMode, canPlay, onPlay])

  return (
    <div className="bg-radial-orange relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* Piezas flotantes de fondo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.035]">
        {FLOATING_PIECES.map((p, i) => (
          <motion.span
            key={i}
            className="absolute text-6xl text-white"
            style={{
              left: `${8 + (i * 9) % 85}%`,
              top: `${5 + ((i * 17) % 80)}%`,
            }}
            animate={{
              y: [0, -30, 0],
              rotate: [0, i % 2 === 0 ? 10 : -10, 0],
            }}
            transition={{
              duration: 5 + (i % 3) * 2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.5,
            }}
          >
            {p}
          </motion.span>
        ))}
      </div>

      {/* Tarjeta principal */}
      <motion.div
        className="relative z-10 w-full max-w-sm rounded-2xl border border-white/[0.06] bg-surface-1/90 p-8 shadow-2xl backdrop-blur-xl lg:max-w-2xl lg:p-14"
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Logo */}
        <motion.div
          className="mb-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="start-logo mb-2 text-5xl lg:text-7xl">♛</div>
          <h1 className="start-title text-3xl font-extrabold tracking-tight text-white lg:text-5xl">
            Gambito de Dama <span className="text-accent">Cuántico</span>
          </h1>
          <p className="mt-1 text-sm text-neutral-500 lg:text-base">
            {gameMode === 'quantum' ? text.subtitleQuantum : text.subtitleClassic}
          </p>
        </motion.div>

        {/* Selector de modo de juego */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-neutral-500 lg:text-sm">
            {text.gameMode}
          </label>
          <div className="flex gap-2">
            {[
              { value: 'classic' as GameMode, label: text.classic, icon: '♛', desc: text.traditionalChess },
              { value: 'quantum' as GameMode, label: text.quantum, icon: '⚛', desc: text.superposition },
            ].map((opt) => (
              <motion.button
                key={opt.value}
                onClick={() => {
                  setGameMode(opt.value)
                  if (opt.value === 'quantum') {
                    setOpponentMode('local')
                    setColor('w')
                  }
                }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-3 text-sm transition-all duration-200 lg:py-4 lg:text-base
                  ${gameMode === opt.value
                    ? opt.value === 'quantum'
                      ? 'bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/40'
                      : 'bg-accent/15 text-accent ring-1 ring-accent/40 shadow-glow-sm'
                    : 'bg-surface-2 text-neutral-400 hover:bg-surface-3 hover:text-neutral-200'
                  }`}
              >
                <span className="text-xl lg:text-2xl">{opt.icon}</span>
                <span className="text-[10px] font-medium lg:text-xs">{opt.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Selector de color */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-neutral-500 lg:text-sm">
            {text.color}
          </label>
          <div className="flex gap-2">
            {[
              { value: 'w' as PlayerColorChoice, label: text.white, icon: '♔' },
              { value: 'random' as PlayerColorChoice, label: text.random, icon: '🎲' },
              { value: 'b' as PlayerColorChoice, label: text.black, icon: '♚' },
            ].map((opt) => (
              <motion.button
                key={opt.value}
                onClick={() => setColor(opt.value)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-3 text-sm transition-all duration-200 lg:py-4 lg:text-base
                  ${color === opt.value
                    ? 'bg-accent/15 text-accent ring-1 ring-accent/40 shadow-glow-sm'
                    : 'bg-surface-2 text-neutral-400 hover:bg-surface-3 hover:text-neutral-200'
                  }`}
              >
                <span className="text-xl lg:text-2xl">{opt.icon}</span>
                <span className="text-[10px] font-medium lg:text-xs">{opt.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Oponente (solo clásico) */}
        {gameMode === 'classic' ? (
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-neutral-500 lg:text-sm">
              {text.matchType}
            </label>
            <div className="flex gap-2">
              {[
                { value: 'ai' as OpponentMode, label: text.vsAi, icon: '🤖' },
                { value: 'local' as OpponentMode, label: text.twoPlayers, icon: '👥' },
              ].map((opt) => (
                <motion.button
                  key={opt.value}
                  onClick={() => setOpponentMode(opt.value)}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs transition-all lg:text-sm
                    ${opponentMode === opt.value
                      ? 'bg-accent/15 text-accent ring-1 ring-accent/40'
                      : 'bg-surface-2 text-neutral-400 hover:bg-surface-3 hover:text-neutral-200'
                    }`}
                >
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            className="mb-6 rounded-lg border border-purple-500/20 bg-purple-500/10 px-3 py-2 text-xs text-purple-300"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            {text.localQuantumInfo}
          </motion.div>
        )}

        {/* Selector de dificultad */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-neutral-500 lg:text-sm">
            {text.difficulty}
          </label>
          {gameMode === 'classic' && opponentMode === 'local' && (
            <p className="mb-2 text-[11px] text-neutral-500">
              {text.difficultyUnused}
            </p>
          )}
          <div className="grid grid-cols-5 gap-1.5">
            {DIFFICULTIES.map((d) => (
              <motion.button
                key={d.key}
                onClick={() => setDifficulty(d.key)}
                disabled={!requiresEngine}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                className={`flex flex-col items-center gap-1 rounded-lg py-2.5 transition-all duration-200 lg:py-3.5
                  ${difficulty === d.key && requiresEngine
                    ? 'bg-accent/15 text-accent ring-1 ring-accent/40'
                    : requiresEngine
                      ? 'bg-surface-2 text-neutral-500 hover:bg-surface-3 hover:text-neutral-300'
                      : 'cursor-not-allowed bg-surface-2 text-neutral-600'
                  }`}
              >
                {/* Barras de nivel */}
                <div className="flex gap-[2px]">
                  {[1, 2, 3, 4, 5].map((bar) => (
                    <div
                      key={bar}
                      className={`h-2.5 w-[3px] rounded-sm transition-colors
                        ${bar <= d.bars
                          ? difficulty === d.key ? 'bg-accent' : 'bg-neutral-500'
                          : 'bg-surface-4'
                        }`}
                      style={{ height: `${6 + bar * 2}px` }}
                    />
                  ))}
                </div>
                <span className="text-[9px] font-medium leading-tight lg:text-[11px]">{getDifficultyLabel(d.key, language)}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Timer toggle */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-widest text-neutral-500 lg:text-sm">
              {text.clock}
            </label>
            <button
              onClick={() => setUseTimer(!useTimer)}
              className={`relative h-5 w-9 rounded-full transition-colors duration-200
                ${useTimer ? 'bg-accent' : 'bg-surface-3'}`}
            >
              <motion.div
                className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm"
                animate={{ left: useTimer ? 18 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>

          <AnimatePresence>
            {useTimer && (
              <motion.div
                className="mt-3 flex gap-1.5"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {TIMER_OPTIONS.map((t) => (
                  <motion.button
                    key={t}
                    onClick={() => setTimerMinutes(t)}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    className={`flex-1 rounded-lg py-2 text-center text-xs font-medium transition-all
                      ${timerMinutes === t
                        ? 'bg-accent/15 text-accent ring-1 ring-accent/40'
                        : 'bg-surface-2 text-neutral-500 hover:bg-surface-3'
                      }`}
                  >
                    {t}′
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Botón de Play */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <motion.button
            onClick={handlePlay}
            disabled={!canPlay}
            whileHover={canPlay ? { scale: 1.02 } : {}}
            whileTap={canPlay ? { scale: 0.98 } : {}}
            className={`btn-shine w-full rounded-xl py-3.5 text-sm font-bold uppercase tracking-wider transition-all lg:py-4 lg:text-base
              ${canPlay
                ? 'bg-accent text-white shadow-glow hover:bg-accent-hover'
                : 'cursor-wait bg-surface-3 text-neutral-500'
              }`}
          >
            {canPlay
              ? gameMode === 'quantum' ? text.playQuantum : text.playClassic
              : checking ? text.connecting : text.serverUnavailable}
          </motion.button>
        </motion.div>

        {/* Indicador de estado del servidor */}
        {gameMode === 'classic' && (
          <motion.div
            className="mt-4 flex items-center justify-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div
              className={`h-1.5 w-1.5 rounded-full ${
                serverReady ? 'bg-green-500' : checking ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
              }`}
            />
            <span className="text-[10px] text-neutral-600">
              {serverReady ? text.stockfishReady : checking ? text.lookingServer : text.offline}
            </span>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
