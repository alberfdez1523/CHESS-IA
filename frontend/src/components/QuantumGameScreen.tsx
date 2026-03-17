import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import QuantumBoard from './QuantumBoard'
import PlayerBar from './PlayerBar'
import MoveHistory from './MoveHistory'
import EvalBar from './EvalBar'
import ActionButtons from './ActionButtons'
import MusicPlayer from './MusicPlayer'
import PromotionModal from './PromotionModal'
import GameOverModal from './GameOverModal'
import QuantumMeasurementRoulette from './QuantumMeasurementRoulette'
import { useQuantumChess } from '../hooks/useQuantumChess'
import { useSoundFX } from '../hooks/useSoundFX'
import { useAmbientMusic } from '../hooks/useAmbientMusic'
import { useTimer } from '../hooks/useTimer'
import { DIFFICULTIES } from '../lib/constants'
import { getPlayerLabel } from '../lib/i18n'
import type { GameConfig, Language, PieceColor, QMoveMode } from '../lib/types'

interface QuantumGameScreenProps {
  config: GameConfig
  onNewGame: () => void
  language: Language
}

export default function QuantumGameScreen({ config, onNewGame, language }: QuantumGameScreenProps) {
  const sounds = useSoundFX()
  const music = useAmbientMusic()
  const game = useQuantumChess(config, sounds, language)

  const timer = useTimer({
    enabled: config.useTimer,
    minutes: config.timerMinutes,
    turn: game.turn,
    gameStarted: true,
    gameOver: game.gameOver,
  })

  useEffect(() => {
    if (timer.timedOut && !game.gameOverInfo) {
      game.handleTimedOut(timer.timedOut)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.timedOut])

  const topColor: PieceColor = game.boardFlipped ? 'w' : 'b'
  const bottomColor: PieceColor = game.boardFlipped ? 'b' : 'w'

  const classicHistory = useMemo(() => {
    return game.history.map((m) => ({
      color: m.color,
      from: m.from,
      to: m.to,
      piece: m.pieceType,
      captured: m.captured?.type,
      promotion: undefined,
      san: `${m.to}`,
      flags: '',
      description: m.description,
    }))
  }, [game.history])

  const topBar = useMemo(() => ({
    label: getPlayerLabel(topColor, language),
    elo: '',
    color: topColor,
    isActive: game.turn === topColor && !game.gameOver,
    captures: [] as any[],
    materialDiff: 0,
    time: config.useTimer ? (topColor === 'w' ? timer.whiteTime : timer.blackTime) : null,
    isLow: config.useTimer ? (topColor === 'w' ? timer.whiteTime : timer.blackTime) < 60 : false,
  }), [topColor, config, game, timer, language])

  const bottomBar = useMemo(() => ({
    label: getPlayerLabel(bottomColor, language),
    elo: '',
    color: bottomColor,
    isActive: game.turn === bottomColor && !game.gameOver,
    captures: [] as any[],
    materialDiff: 0,
    time: config.useTimer ? (bottomColor === 'w' ? timer.whiteTime : timer.blackTime) : null,
    isLow: config.useTimer ? (bottomColor === 'w' ? timer.whiteTime : timer.blackTime) < 60 : false,
  }), [bottomColor, config, game, timer, language])

  const modeLabels: Record<QMoveMode, { icon: string; label: string; desc: string }> = language === 'es'
    ? {
        classical: { icon: '♟', label: 'Clásico', desc: 'Movimiento normal.' },
        quantum: { icon: '⚛', label: 'Cuántico', desc: 'Divide la pieza en 2 destinos.' },
        merge: { icon: '⊕', label: 'Fusión', desc: 'Une dos estados en uno.' },
      }
    : {
        classical: { icon: '♟', label: 'Classic', desc: 'Normal move.' },
        quantum: { icon: '⚛', label: 'Quantum', desc: 'Split piece into 2 targets.' },
        merge: { icon: '⊕', label: 'Merge', desc: 'Combine two states into one.' },
      }

  const text = language === 'es'
    ? {
        badge: 'Cuántico · 2 jugadores',
        menu: '← Menú',
        moveTypes: 'Tipo de jugada',
        classicalCastle: (side: 'k' | 'q') => `♜ Enroque ${side === 'k' ? 'corto' : 'largo'}`,
        castle: (side: 'k' | 'q') => `⚛ Enroque ${side === 'k' ? 'corto' : 'largo'} cuántico`,
      }
    : {
        badge: 'Quantum · 2 players',
        menu: '← Menu',
        moveTypes: 'Move type',
        classicalCastle: (side: 'k' | 'q') => `♜ ${side === 'k' ? 'Kingside' : 'Queenside'} castling`,
        castle: (side: 'k' | 'q') => `⚛ Quantum ${side === 'k' ? 'kingside' : 'queenside'} castling`,
      }

  const modeButtons: QMoveMode[] = ['classical', 'quantum', 'merge']

  const modeColor = (mode: QMoveMode, active: boolean) => {
    if (!active) return 'border-surface-4 bg-surface-2 text-neutral-500 hover:bg-surface-3 hover:text-neutral-300'
    if (mode === 'quantum') return 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'
    if (mode === 'merge') return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
    return 'border-accent/30 bg-accent/10 text-accent'
  }

  return (
    <div className="bg-atm-quantum flex min-h-screen flex-col bg-surface-0">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-surface-4 px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <span className="font-serif text-lg text-indigo-400">⚛</span>
          <span className="hidden font-serif text-sm text-white sm:inline">GdD</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
            {text.badge}
          </span>
        </div>
        <button
          onClick={onNewGame}
          className="rounded px-3 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:bg-surface-2 hover:text-white"
        >
          {text.menu}
        </button>
      </header>

      {/* Main */}
      <div className="flex flex-1 items-start justify-center gap-0 px-4 py-4 lg:py-8">

        {/* Left panel — move mode selector (desktop) */}
        <motion.div
          className="hidden w-56 flex-col border-r border-surface-4 pr-4 lg:flex xl:w-64"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-500">
            {text.moveTypes}
          </p>
          <div className="space-y-2">
            {modeButtons.map((mode) => {
              const info = modeLabels[mode]
              const active = game.moveMode === mode
              const enabled = game.availableMoveModes.includes(mode)
              return (
                <button
                  key={mode}
                  onClick={() => game.chooseMoveMode(mode)}
                  disabled={!enabled || game.gameOver}
                  className={`w-full rounded border px-3.5 py-3 text-left text-xs transition-colors
                    ${active ? modeColor(mode, true) : enabled && !game.gameOver ? modeColor(mode, false) : 'cursor-not-allowed border-surface-4 bg-surface-1 text-neutral-700'}`}
                >
                  <span className="mr-2 text-sm">{info.icon}</span>
                  <span className="font-semibold">{info.label}</span>
                  <span className="mt-0.5 block text-[11px] text-neutral-500">{info.desc}</span>
                </button>
              )
            })}
          </div>

          {/* Status */}
          <div className="mt-4 flex items-center gap-2 text-[11px] text-neutral-500">
            <div
              className={`h-1.5 w-1.5 rounded-full ${
                game.status.type === 'player' ? 'bg-indigo-400'
                  : game.status.type === 'over' ? 'bg-red-400'
                  : 'bg-neutral-600'
              }`}
            />
            <span>{game.status.text}</span>
          </div>
        </motion.div>

        {/* Board column */}
        <motion.div
          className="flex flex-col lg:px-6"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <PlayerBar {...topBar} />

          <QuantumBoard
            board={game.board}
            selectedPiece={game.selectedPiece}
            legalTargets={game.legalTargets}
            mergeTargets={game.mergeTargets}
            moveMode={game.moveMode}
            firstQuantumTarget={game.firstQuantumTarget}
            lastMove={game.lastMove}
            boardFlipped={game.boardFlipped}
            isThinking={game.isThinking}
            playerColor={game.controlColor}
            onSquareClick={game.handleSquareClick}
            onDrop={game.handleDrop}
          />

          <PlayerBar {...bottomBar} />

          {/* Mobile mode selector + status */}
          <div className="flex items-center justify-between gap-2 py-2 lg:hidden">
            <div className="flex items-center gap-2">
              <div
                className={`h-1.5 w-1.5 rounded-full ${
                  game.status.type === 'player' ? 'bg-indigo-400'
                    : game.status.type === 'over' ? 'bg-red-400'
                    : 'bg-neutral-600'
                }`}
              />
              <span className="text-[11px] text-neutral-500">{game.status.text}</span>
            </div>
            {!game.gameOver && (
              <div className="flex items-center gap-1 rounded border border-surface-4 p-0.5">
                {modeButtons.map((mode) => {
                  const info = modeLabels[mode]
                  const active = game.moveMode === mode
                  const enabled = game.availableMoveModes.includes(mode)
                  return (
                    <button
                      key={mode}
                      onClick={() => game.chooseMoveMode(mode)}
                      disabled={!enabled}
                      className={`rounded px-2 py-1 text-[10px] font-semibold transition-colors
                        ${active ? modeColor(mode, true) : enabled ? 'text-neutral-500 hover:bg-surface-2' : 'cursor-not-allowed text-neutral-700'}`}
                    >
                      {info.icon} {info.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Castle buttons */}
          {(game.classicalCastleOptions.length > 0 || game.quantumCastleOptions.length > 0) && !game.gameOver && !game.isThinking && (
            <div className="flex flex-col gap-2" style={{ width: 'var(--board-size)' }}>
              {game.classicalCastleOptions.length > 0 && (
                <div className="flex gap-2">
                  {game.classicalCastleOptions.map((side) => (
                    <button
                      key={`classic-${side}`}
                      onClick={() => game.doClassicalCastle(side)}
                      className="flex-1 rounded border border-accent/25 bg-accent/5 px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/15"
                    >
                      {text.classicalCastle(side)}
                    </button>
                  ))}
                </div>
              )}
              {game.quantumCastleOptions.length > 0 && (
                <div className="flex gap-2">
                  {game.quantumCastleOptions.map((side) => (
                    <button
                      key={`quantum-${side}`}
                      onClick={() => game.doQuantumCastle(side)}
                      className="flex-1 rounded border border-indigo-500/25 bg-indigo-500/5 px-3 py-2 text-xs font-medium text-indigo-400 transition-colors hover:bg-indigo-500/15"
                    >
                      {text.castle(side)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Mobile panels */}
          <div className="mt-2 flex w-full flex-col gap-2 lg:hidden" style={{ width: 'var(--board-size)' }}>
            <EvalBar chances={game.chances} playerColor={config.playerColor} language={language} />
            <MoveHistory history={classicHistory} language={language} />
          </div>
        </motion.div>

        {/* Right sidebar (desktop) */}
        <motion.div
          className="hidden w-72 flex-col border-l border-surface-4 lg:flex xl:w-80"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="p-4">
            <EvalBar chances={game.chances} playerColor={config.playerColor} language={language} />
          </div>
          <div className="rule" />
          <div className="flex-1 overflow-hidden p-4">
            <MoveHistory history={classicHistory} language={language} />
          </div>
          <div className="rule" />
          <div className="p-4">
            <ActionButtons
              onUndo={() => {}}
              onFlip={game.flip}
              onResign={game.resign}
              canUndo={false}
              gameOver={game.gameOver}
              language={language}
            />
          </div>
          <div className="rule" />
          <div className="p-4">
            <MusicPlayer
              playing={music.playing}
              volume={music.volume}
              onToggle={music.toggle}
              onVolumeChange={music.setVolume}
              language={language}
            />
          </div>
        </motion.div>
      </div>

      {/* Mobile bottom bar */}
      <div className="flex items-center gap-2 border-t border-surface-4 px-4 py-2.5 lg:hidden">
        <div className="flex flex-1">
          <ActionButtons
            onUndo={() => {}}
            onFlip={game.flip}
            onResign={game.resign}
            canUndo={false}
            gameOver={game.gameOver}
            language={language}
          />
        </div>
        <button
          onClick={music.toggle}
          className={`flex h-8 w-8 items-center justify-center rounded text-sm transition-colors
            ${music.playing ? 'bg-indigo-500/15 text-indigo-400' : 'text-neutral-600 hover:text-neutral-400'}`}
        >
          {music.playing ? '⏸' : '♫'}
        </button>
      </div>

      <PromotionModal
        visible={!!game.promotionPending}
        color={config.playerColor}
        onSelect={game.handlePromotion}
        language={language}
      />
      <GameOverModal
        info={game.gameOverInfo}
        onNewGame={onNewGame}
        onDismiss={game.dismissGameOver}
        language={language}
      />
      <QuantumMeasurementRoulette
        visible={!!game.measurementEvent}
        measurement={game.measurementEvent}
        onClose={game.dismissMeasurement}
        language={language}
      />
    </div>
  )
}
