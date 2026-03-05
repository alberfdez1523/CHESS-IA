import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface QuantumMeasurementRouletteProps {
  visible: boolean
  probability: number
  roll: number
  result: 'alive' | 'dead'
  target: 'attacker' | 'defender'
  onClose: () => void
}

export default function QuantumMeasurementRoulette({
  visible,
  probability,
  roll,
  result,
  target,
  onClose,
}: QuantumMeasurementRouletteProps) {
  const [spun, setSpun] = useState(false)
  const [spinDone, setSpinDone] = useState(false)

  useEffect(() => {
    if (!visible) {
      setSpun(false)
      setSpinDone(false)
      return
    }
    // No girar automaticamente: esperar accion del usuario.
    const closeT = spinDone ? setTimeout(onClose, 1000) : null
    return () => {
      if (closeT) clearTimeout(closeT)
    }
  }, [visible, onClose, spinDone])

  const alivePct = Math.round(probability * 100)
  const deadPct = 100 - alivePct
  const isAlive = result === 'alive'
  const pointerDeg = Math.min(359.9, Math.max(0, roll * 360))
  const baseTurns = 1440

  const handleSpin = () => {
    if (spun) return
    setSpun(true)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-xs rounded-2xl border border-purple-400/30 bg-surface-1/95 p-4 text-center shadow-2xl"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-purple-300">Medicion Cuantica</p>
            <p className="mt-1 text-[11px] text-neutral-400">
              {target === 'attacker' ? 'Se mide la pieza atacante' : 'Se mide la pieza objetivo'}
            </p>

            <div className="relative mx-auto mt-4 h-44 w-44">
              <motion.div
                className="h-full w-full rounded-full"
                style={{
                  background: `conic-gradient(
                    rgba(34,197,94,0.9) 0deg ${alivePct * 3.6}deg,
                    rgba(239,68,68,0.9) ${alivePct * 3.6}deg 360deg
                  )`,
                }}
                animate={{ rotate: spun ? baseTurns + pointerDeg : 0 }}
                transition={{ duration: 1.25, ease: [0.1, 0.9, 0.2, 1] }}
                onAnimationComplete={() => {
                  if (spun) setSpinDone(true)
                }}
              />
              <div className="pointer-events-none absolute inset-2 rounded-full border border-white/20" />
              <div className="pointer-events-none absolute inset-[30%] flex items-center justify-center rounded-full bg-surface-0/95 ring-1 ring-white/10">
                <span className={`text-sm font-bold ${isAlive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isAlive ? 'CAPTURA' : 'FALLA'}
                </span>
              </div>
              <div className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 border-x-8 border-b-[14px] border-x-transparent border-b-white" />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg bg-emerald-500/10 px-2 py-1 text-emerald-300">Vivo: {alivePct}%</div>
              <div className="rounded-lg bg-red-500/10 px-2 py-1 text-red-300">Muerto: {deadPct}%</div>
            </div>
            <p className="mt-2 text-[10px] text-neutral-500">
              {spinDone
                ? `Resultado aleatorio: ${Math.round(roll * 100)} / 100`
                : 'Pulsa "Girar ruleta" para resolver la medicion'}
            </p>

            <div className="mt-3">
              <button
                onClick={handleSpin}
                disabled={spun}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  spun
                    ? 'cursor-not-allowed bg-surface-2 text-neutral-500'
                    : 'bg-purple-500/20 text-purple-200 hover:bg-purple-500/30'
                }`}
              >
                {spun ? 'Resolviendo...' : 'Girar ruleta'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
