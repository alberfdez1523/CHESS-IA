import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { FILES, RANKS } from '../lib/constants'

export interface BoardSquareView {
  square: string
  row: number
  col: number
  isLight: boolean
}

interface BoardNavigationOptions {
  flipped: boolean
  idPrefix: string
  onActivate: (square: string) => void
}

/** Shared orientation, coordinates and roving-tabindex keyboard navigation. */
export function useBoardNavigation({ flipped, idPrefix, onActivate }: BoardNavigationOptions) {
  const [focusedSquare, setFocusedSquare] = useState('e4')
  const activateRef = useRef(onActivate)
  activateRef.current = onActivate

  const squares = useMemo<BoardSquareView[]>(() => {
    const result: BoardSquareView[] = []
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const fileIndex = flipped ? 7 - col : col
        const rankIndex = flipped ? row : 7 - row
        result.push({
          square: `${FILES[fileIndex]}${RANKS[rankIndex]}`,
          row,
          col,
          isLight: (fileIndex + rankIndex) % 2 !== 0,
        })
      }
    }
    return result
  }, [flipped])

  const squareIndex = useMemo(() => {
    const index = new Map<string, { row: number; col: number }>()
    squares.forEach(({ square, row, col }) => index.set(square, { row, col }))
    return index
  }, [squares])

  const moveFocus = useCallback((square: string) => {
    setFocusedSquare(square)
    document.getElementById(`${idPrefix}-${square}`)?.focus()
  }, [idPrefix])

  const handleKeyDown = useCallback((event: KeyboardEvent, square: string) => {
    const position = squareIndex.get(square)
    if (!position) return
    const delta: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    }
    const direction = delta[event.key]
    if (direction) {
      event.preventDefault()
      const target = squares.find(({ row, col }) => row === position.row + direction[0] && col === position.col + direction[1])
      if (target) moveFocus(target.square)
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      activateRef.current(square)
    }
  }, [moveFocus, squareIndex, squares])

  return { focusedSquare, setFocusedSquare, squares, squareIndex, handleKeyDown }
}
