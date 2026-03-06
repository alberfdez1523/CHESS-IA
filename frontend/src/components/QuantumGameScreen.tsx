// ─── Pantalla de juego del modo Ajedrez Cuántico ───

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
import type { GameConfig, PieceColor, QMoveMode } from '../lib/types'

interface QuantumGameScreenProps {
  config: GameConfig
  onNewGame: () => void
}

const MODE_LABELS: Record<QMoveMode, { icon: string; label: string; color: string }> = {
  classical: { icon: '♟', label: 'Clásico', color: 'bg-accent/15 text-accent ring-accent/40' },
  quantum: { icon: '⚛', label: 'Cuántico', color: 'bg-purple-500/15 text-purple-400 ring-purple-500/40' },
  merge: { icon: '🔗', label: 'Fusión', color: 'bg-cyan-500/15 text-cyan-400 ring-cyan-500/40' },
}

export default function QuantumGameScreen({ config, onNewGame }: QuantumGameScreenProps) {
  const sounds = useSoundFX()
  const music = useAmbientMusic()
  const game = useQuantumChess(config, sounds)

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

  const diffMeta = DIFFICULTIES.find((d) => d.key === config.difficulty)
  const topColor: PieceColor = game.boardFlipped ? 'w' : 'b'
  const bottomColor: PieceColor = game.boardFlipped ? 'b' : 'w'

  // Adaptar historial cuántico al formato de MoveHistory
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

  const topBar = useMemo(() => {
    return {
      label: topColor === 'w' ? 'Jugador Blancas' : 'Jugador Negras',
      elo: '',
      color: topColor,
      isActive: game.turn === topColor && !game.gameOver,
      captures: [] as any[],
      materialDiff: 0,
      time: config.useTimer ? (topColor === 'w' ? timer.whiteTime : timer.blackTime) : null,
      isLow: config.useTimer ? (topColor === 'w' ? timer.whiteTime : timer.blackTime) < 60 : false,
    }
  }, [topColor, config, game, timer])

  const bottomBar = useMemo(() => {
    return {
      label: bottomColor === 'w' ? 'Jugador Blancas' : 'Jugador Negras',
      elo: '',
      color: bottomColor,
      isActive: game.turn === bottomColor && !game.gameOver,
      captures: [] as any[],
      materialDiff: 0,
      time: config.useTimer ? (bottomColor === 'w' ? timer.whiteTime : timer.blackTime) : null,
      isLow: config.useTimer ? (bottomColor === 'w' ? timer.whiteTime : timer.blackTime) < 60 : false,
    }
  }, [bottomColor, config, game, timer])

  const modeButtons: QMoveMode[] = ['classical', 'quantum', 'merge']

  return (
    <div className="bg-radial-quantum flex min-h-screen flex-col bg-surface-0">
      {/* Header */}
      <motion.header
        className="flex items-center justify-between border-b border-purple-500/10 px-4 py-3"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">⚛</span>
          <span className="text-sm font-bold text-white">
            Gambito de Dama <span className="text-purple-400">Cuántico</span>
          </span>
          <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
            Modo Cuántico · 2 jugadores
          </span>
        </div>
        <motion.button
          onClick={onNewGame}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-medium text-neutral-400 lg:px-5 lg:py-2.5 lg:text-sm
            transition-colors hover:bg-surface-3 hover:text-white"
        >
          ← Menú
        </motion.button>
      </motion.header>

      {/* Contenido principal */}
      <div className="flex flex-1 items-start justify-center gap-6 px-4 py-4 pb-2 lg:gap-8 lg:py-8">
        {/* Panel izquierdo (desktop) */}
        <motion.div
          className="hidden w-64 flex-col gap-4 lg:flex"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
        >
          <div className="rounded-2xl border border-purple-500/20 bg-surface-1/85 p-4 shadow-glow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-lg">⚛</span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-purple-300">Tipos de jugada</p>
                <p className="text-[11px] text-neutral-500">Elige cómo actuará la pieza seleccionada.</p>
              </div>
            </div>

            <div className="space-y-3">
              {modeButtons.map((mode) => {
                const info = MODE_LABELS[mode]
                const active = game.moveMode === mode
                const enabled = game.availableMoveModes.includes(mode)
                return (
                  <motion.button
                    key={mode}
                    onClick={() => game.chooseMoveMode(mode)}
                    whileHover={enabled ? { scale: 1.02, x: 2 } : {}}
                    whileTap={enabled ? { scale: 0.98 } : {}}
                    disabled={!enabled || game.gameOver}
                    className={`w-full rounded-2xl px-4 py-4 text-left ring-1 transition-all ${
                      active
                        ? `${info.color} shadow-glow-sm`
                        : enabled && !game.gameOver
                          ? 'bg-surface-2 text-neutral-200 ring-white/10 hover:bg-surface-3 hover:ring-white/20'
                          : 'cursor-not-allowed bg-surface-2/60 text-neutral-600 ring-white/5'
                    }`}
                    title={info.label}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black/20 text-2xl ring-1 ring-white/10">
                        {info.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold leading-none">{info.label}</div>
                        <div className="mt-1 text-[11px] leading-tight text-neutral-400">
                          {mode === 'classical' && 'Movimiento normal, sin dividir la pieza.'}
                          {mode === 'quantum' && 'La pieza entra en superposición y se divide en dos destinos.'}
                          {mode === 'merge' && 'Une dos estados de la misma pieza en una sola casilla.'}
                        </div>
                      </div>
                    </div>
                  </motion.button>
                )
              })}
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-surface-2/70 px-3 py-2 text-[11px] text-neutral-400">
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    game.status.type === 'player'
                      ? 'bg-purple-400'
                      : game.status.type === 'over'
                        ? 'bg-red-400'
                        : 'bg-neutral-600'
                  }`}
                />
                <span>{game.status.text}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Columna del tablero */}
        <motion.div
          className="flex flex-col gap-2 lg:gap-3"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <PlayerBar
            label={topBar.label}
            elo={topBar.elo}
            color={topBar.color}
            isActive={topBar.isActive}
            captures={topBar.captures}
            materialDiff={topBar.materialDiff}
            time={topBar.time}
            isLow={topBar.isLow}
          />

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

          <PlayerBar
            label={bottomBar.label}
            elo={bottomBar.elo}
            color={bottomBar.color}
            isActive={bottomBar.isActive}
            captures={bottomBar.captures}
            materialDiff={bottomBar.materialDiff}
            time={bottomBar.time}
            isLow={bottomBar.isLow}
          />

          {/* Controles de modo cuántico */}
          <motion.div
            className="flex items-center justify-between gap-2 py-1 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center gap-2">
              <div
                className={`h-1.5 w-1.5 rounded-full ${
                  game.status.type === 'player'
                    ? 'bg-purple-400'
                      : game.status.type === 'over'
                        ? 'bg-red-400'
                        : 'bg-neutral-600'
                }`}
              />
              <span className="text-xs text-neutral-500">{game.status.text}</span>
            </div>

            {/* Selector de modo de movimiento */}
            {!game.gameOver && (
              <div className="flex items-center gap-1 rounded-lg bg-surface-1/70 p-1 ring-1 ring-white/5">
                {modeButtons.map((mode) => {
                  const info = MODE_LABELS[mode]
                  const active = game.moveMode === mode
                  const enabled = game.availableMoveModes.includes(mode)
                  return (
                    <motion.button
                      key={mode}
                      onClick={() => game.chooseMoveMode(mode)}
                      whileHover={enabled ? { scale: 1.03 } : {}}
                      whileTap={enabled ? { scale: 0.97 } : {}}
                      disabled={!enabled}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-medium ring-1 transition-all ${
                        active
                          ? info.color
                          : enabled
                            ? 'bg-surface-2 text-neutral-300 ring-white/10 hover:bg-surface-3'
                            : 'cursor-not-allowed bg-surface-2/60 text-neutral-600 ring-white/5'
                      }`}
                      title={info.label}
                    >
                      <span className="mr-1">{info.icon}</span>
                      {info.label}
                    </motion.button>
                  )
                })}
              </div>
            )}
          </motion.div>

          {/* Enroque cuántico */}
          {game.quantumCastleOptions.length > 0 &&
            !game.gameOver &&
            !game.isThinking && (
            <motion.div
              className="flex gap-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {game.quantumCastleOptions.map((side) => (
                <motion.button
                  key={side}
                  onClick={() => game.doQuantumCastle(side)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 rounded-lg bg-purple-500/10 px-3 py-2 text-xs font-medium text-purple-400 ring-1 ring-purple-500/30 transition-colors hover:bg-purple-500/20"
                >
                  ⚛ Enroque {side === 'k' ? 'corto' : 'largo'} cuántico
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* Panel móvil */}
          <motion.div
            className="mt-1 flex w-full flex-col gap-2 lg:hidden"
            style={{ width: 'var(--board-size)' }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <EvalBar chances={game.chances} playerColor={config.playerColor} />
            <details className="rounded-xl border border-purple-500/20 bg-surface-1/85 px-3 py-2 text-[11px] text-neutral-400">
              <summary className="cursor-pointer text-xs font-semibold text-purple-300">
                Reglas del Modo Cuántico
              </summary>
              <div className="mt-2 space-y-1">
                <p>• Movimiento clásico: normal.</p>
                <p>• Movimiento cuántico: divide una pieza en 2 casillas.</p>
                <p>• Fusión: reúne las mitades en una casilla.</p>
                <p>• Enroque cuántico: rey y torre entrelazados.</p>
                <p>• Efecto túnel: atraviesa estados cuánticos.</p>
              </div>
            </details>
            <details className="rounded-xl border border-white/10 bg-surface-1/85 px-3 py-2 text-[11px] text-neutral-400">
              <summary className="cursor-pointer text-xs font-semibold text-neutral-300">
                Casuísticas de Captura
              </summary>
              <div className="mt-2 space-y-2">
                <p>• Clásica {'->'} Clásica: no hay ruleta; la captura ocurre como en ajedrez normal.</p>
                <p>• Clásica {'->'} Cuántica: se mide la pieza objetivo.</p>
                <p className="pl-2">Si sale viva, estaba ahí y es capturada. Si sale muerta, no estaba ahí y colapsa en su otra casilla.</p>
                <p>• Cuántica {'->'} Clásica: se mide la pieza atacante.</p>
                <p className="pl-2">Si sale viva, la captura continúa. Si sale muerta, la atacante no estaba en esa casilla y la jugada falla.</p>
                <p>• Cuántica {'->'} Cuántica: primero se mide la atacante; si sobrevive, después se mide la objetivo.</p>
                <p className="pl-2">La ruleta siempre indica qué pieza se está midiendo y qué pasa si el resultado es vivo o muerto.</p>
              </div>
            </details>
            <MoveHistory history={classicHistory} />
          </motion.div>
        </motion.div>

        {/* Panel lateral (desktop) */}
        <motion.div
          className="hidden w-80 flex-col gap-4 xl:w-96 lg:flex"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <EvalBar chances={game.chances} playerColor={config.playerColor} />

          {/* Info del modo cuántico */}
          <div className="rounded-xl border border-purple-500/10 bg-surface-1/80 p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm">⚛</span>
              <span className="text-xs font-semibold text-purple-400">Reglas Ajedrez Cuántico</span>
            </div>
            <div className="space-y-1 text-[10px] text-neutral-500">
              <p>1. <strong className="text-neutral-300">Movimiento clásico:</strong> como ajedrez normal.</p>
              <p>2. <strong className="text-purple-300">Movimiento cuántico:</strong> una pieza (no peón) se divide en 2 casillas (50/50).</p>
              <p>3. <strong className="text-cyan-300">Fusión:</strong> dos estados de la misma pieza se unen en una sola casilla.</p>
              <p>4. <strong className="text-yellow-300">Medición:</strong> al capturar entre clásico/cuántico se decide por probabilidad.</p>
              <p>5. <strong className="text-purple-300">Enroque cuántico:</strong> rey y torre quedan entrelazados.</p>
              <p>6. <strong className="text-neutral-300">Efecto túnel:</strong> piezas pueden atravesar estados cuánticos.</p>
            </div>
            <div className="mt-3 rounded-lg border border-white/10 bg-surface-2/60 p-2 text-[10px] text-neutral-400">
              <p className="mb-1 text-[11px] font-semibold text-neutral-300">Casuísticas de captura</p>
              <p>• Clásica {'->'} Clásica: captura normal, sin medición.</p>
              <p>• Clásica {'->'} Cuántica: se mide la pieza objetivo.</p>
              <p className="pl-2">Si sale viva, estaba realmente ahí y es capturada. Si sale muerta, la casilla estaba vacía y el objetivo colapsa en su otra casilla.</p>
              <p>• Cuántica {'->'} Clásica: se mide la atacante.</p>
              <p className="pl-2">Si sale viva, la atacante se vuelve 100% real en esa casilla y captura. Si sale muerta, la jugada falla y la atacante colapsa fuera de esa casilla.</p>
              <p>• Cuántica {'->'} Cuántica: primero se mide atacante; si existe, luego se mide objetivo.</p>
              <p className="pl-2">La ruleta explica en cada paso qué pieza se está comprobando y qué efecto tiene un resultado vivo o muerto.</p>
            </div>
          </div>

          <MoveHistory history={classicHistory} />
          <ActionButtons
            onUndo={() => {}}
            onFlip={game.flip}
            onResign={game.resign}
            canUndo={false}
            gameOver={game.gameOver}
          />
          <MusicPlayer
            playing={music.playing}
            volume={music.volume}
            onToggle={music.toggle}
            onVolumeChange={music.setVolume}
          />
        </motion.div>
      </div>

      {/* Acciones rápidas móvil */}
      <motion.div
        className="mx-3 mb-3 mt-2 flex items-center gap-2 rounded-xl border border-purple-500/10 bg-surface-1/80 px-3 py-2 backdrop-blur-sm lg:hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex flex-1 gap-1.5">
          <ActionButtons
            onUndo={() => {}}
            onFlip={game.flip}
            onResign={game.resign}
            canUndo={false}
            gameOver={game.gameOver}
          />
        </div>
        <motion.button
          onClick={music.toggle}
          whileTap={{ scale: 0.9 }}
          className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-colors
            ${music.playing ? 'bg-purple-500 text-white' : 'bg-surface-2 text-neutral-500'}`}
        >
          {music.playing ? '⏸' : '♫'}
        </motion.button>
      </motion.div>

      {/* Modales */}
      <PromotionModal
        visible={!!game.promotionPending}
        color={config.playerColor}
        onSelect={game.handlePromotion}
      />
      <GameOverModal
        info={game.gameOverInfo}
        onNewGame={onNewGame}
        onDismiss={game.dismissGameOver}
      />
      <QuantumMeasurementRoulette
        visible={!!game.measurementEvent}
        measurement={game.measurementEvent}
        onClose={game.dismissMeasurement}
      />
    </div>
  )
}
