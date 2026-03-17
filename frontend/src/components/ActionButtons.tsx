import type { Language } from '../lib/types'

interface ActionButtonsProps {
  onUndo: () => void
  onFlip: () => void
  onResign: () => void
  canUndo: boolean
  gameOver: boolean
  language: Language
}

export default function ActionButtons({ onUndo, onFlip, onResign, canUndo, gameOver, language }: ActionButtonsProps) {
  const labels = language === 'es'
    ? { undo: 'Deshacer', flip: 'Girar', resign: 'Rendirse' }
    : { undo: 'Undo', flip: 'Flip', resign: 'Resign' }

  return (
    <div className="flex gap-4">
      <button
        onClick={onUndo}
        disabled={!canUndo || gameOver}
        className="text-[11px] font-medium text-neutral-500 transition-colors hover:text-white disabled:cursor-not-allowed disabled:text-neutral-700"
      >
        ↩ {labels.undo}
      </button>
      <button
        onClick={onFlip}
        className="text-[11px] font-medium text-neutral-500 transition-colors hover:text-white"
      >
        ⇅ {labels.flip}
      </button>
      <button
        onClick={onResign}
        disabled={gameOver}
        className="text-[11px] font-medium text-red-400/60 transition-colors hover:text-red-400 disabled:cursor-not-allowed disabled:text-neutral-700"
      >
        ⚑ {labels.resign}
      </button>
    </div>
  )
}
