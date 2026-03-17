import { motion } from 'framer-motion'
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
  const buttons = [
    { icon: '↩', label: labels.undo, action: onUndo, disabled: !canUndo || gameOver },
    { icon: '⇅', label: labels.flip, action: onFlip, disabled: false },
    { icon: '⚑', label: labels.resign, action: onResign, disabled: gameOver },
  ]

  return (
    <div className="flex gap-2">
      {buttons.map((btn) => (
        <motion.button
          key={btn.label}
          onClick={btn.action}
          disabled={btn.disabled}
          whileHover={btn.disabled ? {} : { scale: 1.05 }}
          whileTap={btn.disabled ? {} : { scale: 0.95 }}
          className={`flex flex-1 flex-col items-center gap-1 rounded-lg px-3 py-2.5
            transition-colors duration-150
            ${btn.disabled
              ? 'cursor-not-allowed bg-surface-2 text-neutral-600'
              : 'bg-surface-3 text-neutral-300 hover:bg-surface-4 hover:text-white'
            }`}
          title={btn.label}
        >
          <span className="text-lg leading-none">{btn.icon}</span>
          <span className="text-[10px] font-medium uppercase tracking-wider">{btn.label}</span>
        </motion.button>
      ))}
    </div>
  )
}
