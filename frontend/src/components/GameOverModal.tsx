import { motion, AnimatePresence } from 'framer-motion'
import { translateGameOverInfo } from '../lib/i18n'
import type { GameOverInfo, Language } from '../lib/types'

interface GameOverModalProps {
  info: GameOverInfo | null
  onNewGame: () => void
  onDismiss: () => void
  language: Language
}

const RESULT_COLOR: Record<string, string> = {
  win: 'text-accent',
  lose: 'text-red-400',
  draw: 'text-neutral-400',
}

export default function GameOverModal({ info, onNewGame, onDismiss, language }: GameOverModalProps) {
  const translatedInfo = info ? translateGameOverInfo(info, language) : null

  return (
    <AnimatePresence>
      {translatedInfo && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="mx-4 w-full max-w-xs rounded-lg border border-surface-4 bg-surface-1 p-10 text-center"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className={`font-serif text-4xl ${RESULT_COLOR[translatedInfo.result]}`}>
              {translatedInfo.title}
            </h2>
            <p className="mt-3 text-sm text-neutral-500">{translatedInfo.message}</p>

            <div className="rule my-8" />

            <button
              onClick={onNewGame}
              className="w-full rounded border-2 border-accent bg-transparent py-3 text-xs font-semibold uppercase tracking-wider text-accent transition-colors hover:bg-accent hover:text-surface-0"
            >
              {language === 'es' ? 'Nueva partida' : 'New game'}
            </button>
            <button
              onClick={onDismiss}
              className="mt-3 w-full rounded bg-surface-2 py-2.5 text-xs font-medium text-neutral-500 transition-colors hover:text-white"
            >
              {language === 'es' ? 'Ver tablero' : 'View board'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
