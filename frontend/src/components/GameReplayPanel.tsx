import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Chess } from 'chess.js'
import { motion, useReducedMotion } from 'framer-motion'
import type { Language, MoveInfo, PieceColor, PieceType, QState } from '../lib/types'
import { QuantumChessEngine } from '../lib/quantumEngine'
import { getPieceName } from '../lib/i18n'
import { useModalA11y } from '../hooks/useModalA11y'
import Board from './Board'
import QuantumBoard from './QuantumBoard'
import GameIcon from './GameIcon'

type ReplayProps = {
  language: Language
  playerColor: PieceColor
  onClose: () => void
} & (
  | { variant: 'classic'; history: MoveInfo[] }
  | { variant: 'quantum'; snapshots: QState[] }
)

interface ClassicFrame {
  fen: string
  lastMove: { from: string; to: string } | null
}

function buildClassicFrames(history: MoveInfo[]): ClassicFrame[] {
  const game = new Chess()
  const frames: ClassicFrame[] = [{ fen: game.fen(), lastMove: null }]
  history.forEach((move) => {
    try {
      game.move({ from: move.from, to: move.to, promotion: move.promotion ?? 'q' })
      frames.push({ fen: game.fen(), lastMove: { from: move.from, to: move.to } })
    } catch {
      // A damaged historical record must not block the rest of the post-game UI.
    }
  })
  return frames
}

export default function GameReplayPanel(props: ReplayProps) {
  const { language, playerColor, onClose, variant } = props
  const es = language === 'es'
  const reduceMotion = useReducedMotion()
  const classicFrames = useMemo(
    () => variant === 'classic' ? buildClassicFrames(props.history) : [],
    [props, variant],
  )
  const frames = variant === 'classic' ? classicFrames : props.snapshots
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const maxIndex = Math.max(0, frames.length - 1)
  const { containerRef, onBackdropClick } = useModalA11y(true, onClose, true)

  useEffect(() => {
    setIndex((value) => Math.min(value, maxIndex))
  }, [maxIndex])

  useEffect(() => {
    if (!playing) return
    if (index >= maxIndex) {
      setPlaying(false)
      return
    }
    const id = window.setTimeout(() => setIndex((value) => Math.min(maxIndex, value + 1)), reduceMotion ? 120 : 900)
    return () => window.clearTimeout(id)
  }, [index, maxIndex, playing, reduceMotion])

  const go = (next: number) => {
    setPlaying(false)
    setIndex(Math.max(0, Math.min(maxIndex, next)))
  }

  const boardStyle = {
    '--board-size': 'min(calc(100vw - 2rem), calc(100dvh - 16rem), 36rem)',
  } as CSSProperties

  const moveLabel = variant === 'classic'
    ? props.history[index - 1]?.san ?? (es ? 'Posición inicial' : 'Initial position')
    : props.snapshots[index]?.history[index - 1]?.description ?? (es ? 'Estado inicial' : 'Initial state')

  const measurements = variant === 'quantum' && index > 0
    ? props.snapshots[index]?.history[index - 1]?.measurements
      ?? (props.snapshots[index]?.history[index - 1]?.measurement
        ? [props.snapshots[index].history[index - 1].measurement!]
        : [])
    : []

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onBackdropClick}
      role="presentation"
    >
      <motion.section
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="replay-title"
        className="flex max-h-[96dvh] w-full max-w-5xl flex-col overflow-hidden border border-line bg-surface-1 shadow-board sm:max-h-[94dvh]"
        initial={reduceMotion ? false : { y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 12, opacity: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex min-h-14 items-center justify-between border-b border-line px-4 sm:px-6">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] text-ink-muted">{es ? 'Postpartida' : 'Post-game'}</p>
            <h2 id="replay-title" className="font-serif text-xl text-ink">{es ? 'Repetición de la partida' : 'Game replay'}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid min-h-11 min-w-11 place-items-center text-ink-secondary hover:text-ink" aria-label={es ? 'Cerrar repetición' : 'Close replay'}>
            <GameIcon name="close" className="h-5 w-5" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="flex min-h-0 items-center justify-center overflow-hidden p-3 sm:p-5" style={boardStyle}>
            {variant === 'classic' ? (
              <ClassicReplayBoard
                frame={classicFrames[index] ?? classicFrames[0]}
                language={language}
                flipped={playerColor === 'b'}
              />
            ) : (
              <QuantumReplayBoard
                state={props.snapshots[index] ?? props.snapshots[0]}
                language={language}
                flipped={playerColor === 'b'}
              />
            )}
          </div>

          <aside className="border-t border-line bg-surface-0 p-4 lg:border-l lg:border-t-0 lg:p-5">
            <p className="font-mono text-xs text-quantum">{index} / {maxIndex}</p>
            <p className="mt-3 min-h-12 text-sm leading-6 text-ink">{moveLabel}</p>

            {measurements.length > 0 && (
              <div className="mt-4 border-l-2 border-quantum bg-quantum/[0.06] p-3">
                <p className="text-xs font-semibold text-quantum">{es ? 'Traza de medición' : 'Measurement trace'}</p>
                <ol className="mt-2 space-y-2">
                  {measurements.map((event) => (
                    <li key={`${event.step}-${event.target}`} className="flex items-center justify-between gap-3 text-xs text-ink-secondary">
                      <span>{event.step}. {event.target === 'attacker' ? (es ? 'Atacante' : 'Attacker') : (es ? 'Defensor' : 'Defender')}</span>
                      <span className="font-mono text-ink">{event.result === 'alive' ? (es ? 'existe' : 'exists') : (es ? 'ausente' : 'absent')} · {Math.round(event.probability * 100)}%</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </aside>
        </div>

        <footer className="border-t border-line bg-surface-1 px-4 py-3 sm:px-6">
          <input
            type="range"
            min={0}
            max={maxIndex}
            value={index}
            onChange={(event) => go(Number(event.target.value))}
            className="h-6 w-full accent-quantum"
            aria-label={es ? 'Posición de la repetición' : 'Replay position'}
          />
          <div className="mt-2 flex items-center justify-center gap-2">
            <ReplayButton icon="chevron" label={es ? 'Anterior' : 'Previous'} disabled={index === 0} onClick={() => go(index - 1)} iconClass="rotate-180" />
            <ReplayButton icon={playing ? 'pause' : 'play'} label={playing ? (es ? 'Pausar' : 'Pause') : (es ? 'Reproducir' : 'Play')} disabled={maxIndex === 0} onClick={() => { if (index >= maxIndex) setIndex(0); setPlaying((value) => !value) }} primary />
            <ReplayButton icon="chevron" label={es ? 'Siguiente' : 'Next'} disabled={index >= maxIndex} onClick={() => go(index + 1)} />
          </div>
        </footer>
      </motion.section>
    </motion.div>
  )
}

function ClassicReplayBoard({ frame, language, flipped }: { frame?: ClassicFrame; language: Language; flipped: boolean }) {
  const game = useMemo(() => new Chess(frame?.fen), [frame?.fen])
  const turn = game.turn() as PieceColor
  const passiveColor: PieceColor = turn === 'w' ? 'b' : 'w'
  const getPiece = (square: string) => {
    const piece = game.get(square)
    return piece ? { type: piece.type as PieceType, color: piece.color as PieceColor } : null
  }
  return (
    <Board
      fen={frame?.fen ?? new Chess().fen()}
      selectedSquare={null}
      legalSquares={new Set()}
      lastMove={frame?.lastMove ?? null}
      boardFlipped={flipped}
      isThinking
      playerColor={passiveColor}
      checkSquare={null}
      getPiece={getPiece}
      onSquareClick={() => {}}
      onDrop={() => {}}
      language={language}
    />
  )
}

function QuantumReplayBoard({ state, language, flipped }: { state?: QState; language: Language; flipped: boolean }) {
  const engine = useMemo(() => {
    const replayEngine = new QuantumChessEngine()
    if (state) replayEngine.loadState(state)
    return replayEngine
  }, [state])
  const turn = engine.state.turn
  const passiveColor: PieceColor = turn === 'w' ? 'b' : 'w'
  return (
    <QuantumBoard
      board={engine.getBoard()}
      selectedPiece={null}
      legalTargets={new Set()}
      mergeTargets={new Set()}
      moveMode="classical"
      firstQuantumTarget={null}
      lastMove={state?.history.length ? {
        from: state.history[state.history.length - 1].from,
        to: state.history[state.history.length - 1].to,
      } : null}
      boardFlipped={flipped}
      isThinking
      playerColor={passiveColor}
      turnColor={turn}
      onSquareClick={() => {}}
      onDrop={() => {}}
      language={language}
      entanglements={state?.entanglements ?? []}
      statusText={state?.history.length
        ? `${getPieceName(state.history[state.history.length - 1].pieceType, language)} ${state.history[state.history.length - 1].to}`
        : undefined}
    />
  )
}

function ReplayButton({
  icon,
  iconClass = '',
  label,
  disabled,
  onClick,
  primary = false,
}: {
  icon: 'chevron' | 'play' | 'pause'
  iconClass?: string
  label: string
  disabled: boolean
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 border px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${primary ? 'border-quantum bg-quantum text-on-quantum' : 'border-line bg-surface-0 text-ink'}`}
      aria-label={label}
    >
      <GameIcon name={icon} className={iconClass} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
