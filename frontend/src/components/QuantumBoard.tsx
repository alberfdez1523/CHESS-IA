// ─── Tablero de Ajedrez Cuántico ───

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Piece from './Piece'
import { FILES, RANKS } from '../lib/constants'
import type { PieceColor, PieceType, QBoardCell, QMoveMode } from '../lib/types'

interface QuantumBoardProps {
  board: Record<string, QBoardCell[]>
  selectedPiece: { id: string; square: string } | null
  legalTargets: Set<string>
  mergeTargets: Set<string>
  moveMode: QMoveMode
  firstQuantumTarget: string | null
  lastMove: { from: string; to: string } | null
  boardFlipped: boolean
  isThinking: boolean
  playerColor: PieceColor
  onSquareClick: (sq: string) => void
  onDrop: (from: string, to: string) => void
}

export default function QuantumBoard({
  board,
  selectedPiece,
  legalTargets,
  mergeTargets,
  moveMode,
  firstQuantumTarget,
  lastMove,
  boardFlipped,
  isThinking,
  playerColor,
  onSquareClick,
  onDrop,
}: QuantumBoardProps) {
  const [dragSource, setDragSource] = useState<string | null>(null)

  const squares = useMemo(() => {
    const result: { square: string; row: number; col: number; isLight: boolean }[] = []
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const fileIdx = boardFlipped ? 7 - c : c
        const rankIdx = boardFlipped ? r : 7 - r
        const square = `${FILES[fileIdx]}${RANKS[rankIdx]}`
        const isLight = (fileIdx + rankIdx) % 2 !== 0
        result.push({ square, row: r, col: c, isLight })
      }
    }
    return result
  }, [boardFlipped])

  const handleDragStart = useCallback((sq: string) => setDragSource(sq), [])
  const handleDragEnd = useCallback(() => setDragSource(null), [])

  return (
    <div
      className="relative select-none overflow-hidden rounded-lg shadow-2xl ring-1 ring-white/5"
      style={{ width: 'var(--board-size)', height: 'var(--board-size)' }}
      onDragEnd={handleDragEnd}
    >
      <div className="grid h-full w-full grid-cols-8 grid-rows-8">
        {squares.map(({ square, row, col, isLight }) => {
          const cells = board[square] || []
          const isSelected = selectedPiece?.square === square
          const isLegal = legalTargets.has(square)
          const isMergeTarget = moveMode === 'merge' && mergeTargets.has(square)
          const isFirstQt = firstQuantumTarget === square
          const isLastFrom = lastMove?.from === square
          const isLastTo = lastMove?.to === square
          const isDragSource = square === dragSource

          const hasCapturableEnemy = isLegal && cells.some(c => c.color !== playerColor)

          // ¿Se puede arrastrar la pieza aquí?
          const myCell = cells.find(c => c.color === playerColor)
          const turnColor = board ? playerColor : 'w' // simplificado
          const canDrag = !isThinking && !!myCell && myCell.color === turnColor

          const showFile = row === 7
          const showRank = col === 0
          const coordColor = isLight ? 'text-[#B58863]' : 'text-[#F0D9B5]'

          return (
            <div
              key={square}
              className={`relative flex items-center justify-center
                ${isLight ? 'sq-light' : 'sq-dark'}
                ${isSelected ? 'sq-quantum-selected' : ''}
                ${isLastFrom ? 'sq-last-from' : ''}
                ${isLastTo ? 'sq-last-to' : ''}
                ${isFirstQt ? 'sq-quantum-first' : ''}
              `}
              onClick={() => onSquareClick(square)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                if (dragSource) {
                  onDrop(dragSource, square)
                  setDragSource(null)
                }
              }}
            >
              {/* Renderizar piezas (posiblemente múltiples por superposición) */}
              <AnimatePresence mode="popLayout">
                {cells.map((cell, idx) => {
                  if (isDragSource && cell.pieceId === selectedPiece?.id) return null

                  const isQuantum = cell.probability < 1
                  const opacity = cell.probability
                  const zIdx = Math.round(cell.probability * 10)

                  return (
                    <motion.div
                      key={`${square}-${cell.pieceId}`}
                      className={`absolute inset-0 flex items-center justify-center ${isQuantum ? 'quantum-piece-glow' : ''}`}
                      style={{
                        opacity: Math.max(0.2, opacity),
                        zIndex: zIdx,
                        // Si hay múltiples piezas, desplazar ligeramente
                        transform: cells.length > 1 ? `translate(${idx * 3 - 2}px, ${idx * -3 + 2}px)` : undefined,
                      }}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: Math.max(0.2, opacity) }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                    >
                      <Piece
                        type={cell.type}
                        color={cell.color}
                        draggable={canDrag && cell.pieceId === myCell?.pieceId}
                        onDragStart={() => handleDragStart(square)}
                        animate={false}
                      />
                      {/* Indicador de probabilidad */}
                      {isQuantum && (
                        <span className="quantum-prob-badge">
                          {Math.round(cell.probability * 100)}%
                        </span>
                      )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              {/* Indicador de movimiento legal clásico */}
              {isLegal && !hasCapturableEnemy && cells.length === 0 && moveMode === 'classical' && (
                <motion.div
                  className="legal-dot"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                />
              )}
              {isLegal && hasCapturableEnemy && moveMode === 'classical' && (
                <motion.div
                  className="legal-ring absolute inset-0 m-auto"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                />
              )}

              {/* Indicador de movimiento cuántico */}
              {isLegal && moveMode === 'quantum' && !isFirstQt && (
                <motion.div
                  className="quantum-dot"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                />
              )}

              {/* Indicador de fusión */}
              {isMergeTarget && (
                <motion.div
                  className="merge-dot"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                />
              )}

              {/* Indicador de movimiento legal (genérico para casillas no vacías en quantum) */}
              {isLegal && cells.length === 0 && moveMode !== 'classical' && moveMode !== 'merge' && !isFirstQt && (
                <motion.div
                  className="quantum-dot"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                />
              )}

              {/* Coordenadas */}
              {showFile && (
                <span className={`board-coord coord-file ${coordColor}`}>
                  {boardFlipped ? FILES[7 - col] : FILES[col]}
                </span>
              )}
              {showRank && (
                <span className={`board-coord coord-rank ${coordColor}`}>
                  {boardFlipped ? RANKS[row] : RANKS[7 - row]}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Overlay de pensando */}
      <AnimatePresence>
        {isThinking && (
          <motion.div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="rounded-full bg-surface-0/80 px-4 py-2 text-xs font-medium text-purple-400 backdrop-blur-sm"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              ⚛ Calculando multiverso…
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
