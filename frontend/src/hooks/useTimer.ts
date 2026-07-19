import { useState, useEffect, useCallback, useRef } from 'react'
import type { PieceColor } from '../lib/types'

// ─── Reloj de ajedrez ───

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface UseTimerProps {
  enabled: boolean
  minutes: number
  turn: PieceColor
  gameStarted: boolean
  gameOver: boolean
  /** Pausa ambos relojes durante estados bloqueantes como una medición cuántica. */
  paused?: boolean
}

export interface TimerSnapshot {
  whiteTime: number
  blackTime: number
}

export function useTimer({ enabled, minutes, turn, gameStarted, gameOver, paused = false }: UseTimerProps) {
  const initialSeconds = minutes * 60
  const [whiteTime, setWhiteTime] = useState(initialSeconds)
  const [blackTime, setBlackTime] = useState(initialSeconds)
  const [timedOut, setTimedOut] = useState<PieceColor | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Reiniciar al cambiar config
  useEffect(() => {
    setWhiteTime(minutes * 60)
    setBlackTime(minutes * 60)
    setTimedOut(null)
  }, [minutes])

  useEffect(() => {
    if (!enabled || !gameStarted || gameOver || timedOut || paused) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    intervalRef.current = setInterval(() => {
      if (turn === 'w') {
        setWhiteTime(prev => {
          if (prev <= 1) {
            setTimedOut('w')
            return 0
          }
          return prev - 1
        })
      } else {
        setBlackTime(prev => {
          if (prev <= 1) {
            setTimedOut('b')
            return 0
          }
          return prev - 1
        })
      }
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [enabled, gameStarted, gameOver, paused, turn, timedOut])

  const reset = useCallback(() => {
    setWhiteTime(minutes * 60)
    setBlackTime(minutes * 60)
    setTimedOut(null)
  }, [minutes])

  const restore = useCallback(({ whiteTime: white, blackTime: black }: TimerSnapshot) => {
    const nextWhite = Math.max(0, Math.floor(white))
    const nextBlack = Math.max(0, Math.floor(black))
    setWhiteTime(nextWhite)
    setBlackTime(nextBlack)
    setTimedOut(nextWhite === 0 ? 'w' : nextBlack === 0 ? 'b' : null)
  }, [])

  return { whiteTime, blackTime, timedOut, reset, restore }
}
