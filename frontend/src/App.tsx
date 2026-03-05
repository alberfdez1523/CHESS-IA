import { useState, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import StartMenu from './components/StartMenu'
import GameScreen from './components/GameScreen'
import type { GameConfig } from './lib/types'

export default function App() {
  const [screen, setScreen] = useState<'menu' | 'game'>('menu')
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('theme-dark', 'theme-light')
    root.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light')
  }, [theme])

  const handlePlay = useCallback((config: GameConfig) => {
    setGameConfig(config)
    setScreen('game')
  }, [])

  const handleNewGame = useCallback(() => {
    setGameConfig(null)
    setScreen('menu')
  }, [])

  return (
    <>
      <motion.button
        onClick={() => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-4 right-4 z-[60] rounded-xl bg-surface-2/90 px-3.5 py-2.5 text-xs font-semibold text-neutral-300 ring-1 ring-white/10 backdrop-blur-sm transition-colors hover:bg-surface-3 lg:px-5 lg:py-3 lg:text-sm"
        title="Cambiar tema"
      >
        {theme === 'dark' ? '☀ Claro' : '🌙 Oscuro'}
      </motion.button>

      <AnimatePresence mode="wait">
        {screen === 'menu' ? (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <StartMenu onPlay={handlePlay} />
          </motion.div>
        ) : gameConfig ? (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <GameScreen config={gameConfig} onNewGame={handleNewGame} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
