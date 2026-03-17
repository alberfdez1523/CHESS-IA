import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import Board from './Board'
import PlayerBar from './PlayerBar'
import MoveHistory from './MoveHistory'
import EvalBar from './EvalBar'
import ActionButtons from './ActionButtons'
import MusicPlayer from './MusicPlayer'
import PromotionModal from './PromotionModal'
import GameOverModal from './GameOverModal'
import { useChessGame } from '../hooks/useChessGame'
import { useSoundFX } from '../hooks/useSoundFX'
import { useAmbientMusic } from '../hooks/useAmbientMusic'
import { useTimer } from '../hooks/useTimer'
import { DIFFICULTIES } from '../lib/constants'
import { getDifficultyLabel, getPlayerLabel } from '../lib/i18n'
import type { GameConfig, Language } from '../lib/types'

interface GameScreenProps {
  config: GameConfig
  onNewGame: () => void
  language: Language
}

export default function GameScreen({ config, onNewGame, language }: GameScreenProps) {
  const sounds = useSoundFX()
  const music = useAmbientMusic()
  const game = useChessGame(config, sounds, language)

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
  const isAIMode = config.opponentMode === 'ai'
  const aiColor = config.playerColor === 'w' ? 'b' : 'w'
  const topColor = game.boardFlipped ? config.playerColor : aiColor
  const bottomColor = game.boardFlipped ? aiColor : config.playerColor

  const topBar = useMemo(() => {
    const isAI = isAIMode && topColor !== config.playerColor
    const localLabel = getPlayerLabel(topColor, language)
    return {
      label: isAIMode ? (isAI ? 'Stockfish' : language === 'es' ? 'Tú' : 'You') : localLabel,
      elo: isAI ? diffMeta?.elo || '' : '',
      color: topColor,
      captures: isAI ? game.captures.ai : game.captures.player,
      materialDiff: isAI ? -game.materialDiff : game.materialDiff,
      isActive: game.turn === topColor && !game.gameOver,
      time: config.useTimer ? (topColor === 'w' ? timer.whiteTime : timer.blackTime) : null,
      isLow: config.useTimer ? (topColor === 'w' ? timer.whiteTime : timer.blackTime) < 60 : false,
    }
  }, [topColor, config, diffMeta, game, timer, isAIMode, language])

  const bottomBar = useMemo(() => {
    const isAI = isAIMode && bottomColor !== config.playerColor
    const localLabel = getPlayerLabel(bottomColor, language)
    return {
      label: isAIMode ? (isAI ? 'Stockfish' : language === 'es' ? 'Tú' : 'You') : localLabel,
      elo: isAI ? diffMeta?.elo || '' : '',
      color: bottomColor,
      captures: isAI ? game.captures.ai : game.captures.player,
      materialDiff: isAI ? -game.materialDiff : game.materialDiff,
      isActive: game.turn === bottomColor && !game.gameOver,
      time: config.useTimer ? (bottomColor === 'w' ? timer.whiteTime : timer.blackTime) : null,
      isLow: config.useTimer ? (bottomColor === 'w' ? timer.whiteTime : timer.blackTime) < 60 : false,
    }
  }, [bottomColor, config, diffMeta, game, timer, isAIMode, language])

  const text = language === 'es'
    ? {
        modeBadge: isAIMode ? `Clásico · ${diffMeta?.label}` : 'Clásico · 2 jugadores',
        menu: '← Menú',
        castle: (side: 'k' | 'q') => `♜ Enroque ${side === 'k' ? 'corto' : 'largo'}`,
      }
    : {
        modeBadge: isAIMode ? `Classic · ${diffMeta ? getDifficultyLabel(config.difficulty, language) : ''}` : 'Classic · 2 players',
        menu: '← Menu',
        castle: (side: 'k' | 'q') => `♜ ${side === 'k' ? 'Kingside' : 'Queenside'} castling`,
      }

  return (
    <div className="bg-atm-gold flex min-h-screen flex-col bg-surface-0">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-surface-4 px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <span className="font-serif text-lg text-accent">♛</span>
          <span className="hidden font-serif text-sm text-white sm:inline">GdD</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
            {text.modeBadge}
          </span>
        </div>
        <button
          onClick={onNewGame}
          className="rounded px-3 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:bg-surface-2 hover:text-white"
        >
          {text.menu}
        </button>
      </header>

      {/* Main content */}
      <div className="flex flex-1 items-start justify-center gap-0 px-4 py-4 lg:py-8">
        {/* Board column */}
        <motion.div
          className="flex flex-col"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <PlayerBar {...topBar} />

          <Board
            fen={game.fen}
            selectedSquare={game.selectedSquare}
            legalSquares={game.legalSquares}
            lastMove={game.lastMove}
            boardFlipped={game.boardFlipped}
            isThinking={game.isThinking}
            playerColor={game.controlColor}
            checkSquare={game.checkSquare}
            getPiece={game.getPiece}
            onSquareClick={game.handleSquareClick}
            onDrop={game.handleDrop}
          />

          <PlayerBar {...bottomBar} />

          {/* Status */}
          <div className="flex items-center justify-center gap-2 py-2">
            <div
              className={`h-1.5 w-1.5 rounded-full ${
                game.status.type === 'player' ? 'bg-accent'
                  : game.status.type === 'thinking' ? 'bg-yellow-500 animate-pulse'
                  : game.status.type === 'over' ? 'bg-red-400'
                  : 'bg-neutral-600'
              }`}
            />
            <span className="text-[11px] text-neutral-500">{game.status.text}</span>
          </div>

          {/* Castle buttons */}
          {game.classicalCastleOptions.length > 0 && !game.gameOver && !game.isThinking && (
            <div className="flex gap-2" style={{ width: 'var(--board-size)' }}>
              {game.classicalCastleOptions.map((side) => (
                <button
                  key={`classic-${side}`}
                  onClick={() => game.doClassicalCastle(side)}
                  className="flex-1 rounded border border-accent/25 bg-accent/5 px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/15"
                >
                  {text.castle(side)}
                </button>
              ))}
            </div>
          )}

          {/* Mobile panels */}
          <div className="mt-2 flex w-full flex-col gap-2 lg:hidden" style={{ width: 'var(--board-size)' }}>
            <EvalBar chances={game.chances} playerColor={config.playerColor} language={language} />
            <MoveHistory history={game.history} language={language} />
          </div>
        </motion.div>

        {/* Desktop sidebar */}
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
            <MoveHistory history={game.history} language={language} />
          </div>
          <div className="rule" />
          <div className="p-4">
            <ActionButtons
              onUndo={game.undo}
              onFlip={game.flip}
              onResign={game.resign}
              canUndo={game.history.length >= 2 && !game.isThinking}
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
            onUndo={game.undo}
            onFlip={game.flip}
            onResign={game.resign}
            canUndo={game.history.length >= 2 && !game.isThinking}
            gameOver={game.gameOver}
            language={language}
          />
        </div>
        <button
          onClick={music.toggle}
          className={`flex h-8 w-8 items-center justify-center rounded text-sm transition-colors
            ${music.playing ? 'bg-accent/15 text-accent' : 'text-neutral-600 hover:text-neutral-400'}`}
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
    </div>
  )
}
