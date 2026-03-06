import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { QMeasurementEvent } from '../lib/types'

interface QuantumMeasurementRouletteProps {
  visible: boolean
  measurement: QMeasurementEvent | null
  onClose: () => void
}

export default function QuantumMeasurementRoulette({
  visible,
  measurement,
  onClose,
}: QuantumMeasurementRouletteProps) {
  const [spun, setSpun] = useState(false)
  const [spinDone, setSpinDone] = useState(false)

  useEffect(() => {
    if (!visible) {
      setSpun(false)
      setSpinDone(false)
    }
  }, [visible])

  const probability = measurement?.probability ?? 0.5
  const roll = measurement?.roll ?? 0.5
  const result = measurement?.result ?? 'dead'
  const target = measurement?.target ?? 'defender'
  const attackerWasQuantum = measurement?.attackerWasQuantum ?? false
  const defenderWasQuantum = measurement?.defenderWasQuantum ?? false
  const step = measurement?.step ?? 1
  const totalSteps = measurement?.totalSteps ?? 1
  const priorStepResult = measurement?.priorStepResult
  const alivePct = Math.round(probability * 100)
  const deadPct = 100 - alivePct
  const isAlive = result === 'alive'
  const baseTurns = 1440
  const pointerDeg = Math.min(359.9, Math.max(0, roll * 360))
  const finalWheelRotation = spun ? baseTurns - pointerDeg : 0
  const revealResult = spinDone

  const scenario = useMemo(() => {
    if (attackerWasQuantum && defenderWasQuantum) return 'cuantica-vs-cuantica'
    if (attackerWasQuantum) return 'cuantica-vs-clasica'
    return 'clasica-vs-cuantica'
  }, [attackerWasQuantum, defenderWasQuantum])

  const measuredLabel = target === 'attacker' ? 'pieza atacante' : 'pieza objetivo'
  const measuredTitle = target === 'attacker' ? 'Atacante' : 'Objetivo'
  const outcomeAlive = target === 'attacker'
    ? 'La atacante existe en esa casilla y la jugada puede continuar.'
    : 'La objetivo existe en esa casilla y la captura se completa.'
  const outcomeDead = target === 'attacker'
    ? 'La atacante no estaba realmente en esa casilla; la captura falla y la pieza colapsa en su otra posición.'
    : 'La objetivo no estaba realmente en esa casilla; la captura falla y la pieza objetivo colapsa en su otra posición.'

  const scenarioText = useMemo(() => {
    switch (scenario) {
      case 'cuantica-vs-cuantica':
        return {
          title: 'Captura cuántica contra cuántica',
          text: 'Primero se comprueba si la atacante existe en la casilla de origen elegida. Si sobrevive esa medición, después se mide la pieza objetivo para decidir si la captura realmente ocurre.',
        }
      case 'cuantica-vs-clasica':
        return {
          title: 'Captura cuántica contra clásica',
          text: 'Solo se mide la atacante. Si existe, captura una pieza clásica normal. Si no existe, la jugada falla y la pieza colapsa en su otra casilla.',
        }
      default:
        return {
          title: 'Captura clásica contra cuántica',
          text: 'Solo se mide la pieza objetivo. Si existe en esa casilla, la captura se completa. Si no existe, la casilla estaba vacía y la pieza objetivo colapsa en su otra posición.',
        }
    }
  }, [scenario])

  const handleSpin = () => {
    if (spun) return
    setSpun(true)
  }

  if (!visible || !measurement) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-purple-400/30 bg-surface-1/95 text-center shadow-2xl"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="bg-radial-quantum border-b border-white/10 px-5 py-4 text-left">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-purple-300">Medición cuántica</p>
                  <h3 className="mt-1 text-base font-bold text-white">{scenarioText.title}</h3>
                  <p className="mt-1 text-xs leading-tight text-neutral-400">{scenarioText.text}</p>
                </div>
                <div className="rounded-full bg-purple-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-purple-200 ring-1 ring-purple-500/30">
                  Paso {step}/{totalSteps}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-purple-300">Qué se mide</p>
                  <p className="mt-1 font-semibold text-white">{measuredTitle}</p>
                  <p className="mt-1 text-neutral-400">Se comprueba si la {measuredLabel} existe realmente en la casilla implicada.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-surface-2/80 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500">Contexto</p>
                  <p className="mt-1 text-neutral-300">
                    {priorStepResult
                      ? `Antes: ${priorStepResult.target === 'attacker' ? 'la atacante' : 'la objetivo'} salió ${priorStepResult.result === 'alive' ? 'viva' : 'muerta'}.`
                      : 'Esta tirada decide directamente el resultado de la interacción.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="relative mx-auto h-56 w-56 max-w-full">
                <div className="absolute inset-0 rounded-full bg-purple-500/10 blur-2xl" />
                <motion.div
                  className="relative h-full w-full rounded-full p-3"
                  animate={{ rotate: finalWheelRotation }}
                  transition={{ duration: 1.35, ease: [0.1, 0.9, 0.2, 1] }}
                  onAnimationComplete={() => {
                    if (spun) setSpinDone(true)
                  }}
                >
                  <div
                    className="h-full w-full rounded-full border border-white/10 shadow-glow-sm"
                    style={{
                      background: `conic-gradient(
                        rgba(34,197,94,0.96) 0deg ${alivePct * 3.6}deg,
                        rgba(249,115,22,0.96) ${alivePct * 3.6}deg 360deg
                      )`,
                    }}
                  />
                  <div className="pointer-events-none absolute inset-5 rounded-full border border-white/15 ring-1 ring-white/10" />
                  <div className="pointer-events-none absolute inset-[31%] flex flex-col items-center justify-center rounded-full bg-surface-0/95 ring-1 ring-white/10 backdrop-blur-sm">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">Resultado</span>
                    <span className={`mt-1 text-sm font-bold ${revealResult ? (isAlive ? 'text-emerald-400' : 'text-red-400') : 'text-neutral-300'}`}>
                      {revealResult ? (isAlive ? 'VIVO' : 'MUERTO') : 'PENDIENTE'}
                    </span>
                    <span className="mt-1 text-[11px] text-neutral-400">{measuredTitle}</span>
                  </div>
                </motion.div>
                <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2">
                  <div className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-black shadow-sm">Marcador</div>
                  <div className="m-auto h-0 w-0 border-x-8 border-b-[14px] border-x-transparent border-b-white" />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-left text-[11px]">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                  <p className="font-semibold uppercase tracking-wider text-emerald-300">Si sale vivo</p>
                  <p className="mt-1 text-neutral-300">{outcomeAlive}</p>
                  <p className="mt-2 text-emerald-300">Probabilidad: {alivePct}%</p>
                </div>
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2">
                  <p className="font-semibold uppercase tracking-wider text-red-300">Si sale muerto</p>
                  <p className="mt-1 text-neutral-300">{outcomeDead}</p>
                  <p className="mt-2 text-red-300">Probabilidad: {deadPct}%</p>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-white/10 bg-surface-2/70 px-3 py-2 text-left">
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-neutral-400">Tirada aleatoria</span>
                  <span className="font-mono font-semibold text-white">
                    {revealResult ? `${Math.round(roll * 100)} / 100` : 'Oculta hasta girar'}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-neutral-400">Existía en esa casilla si la tirada era menor que</span>
                  <span className="font-mono font-semibold text-purple-200">{alivePct} / 100</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={handleSpin}
                  disabled={spun}
                  className={`btn-shine rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                    spun
                      ? 'cursor-not-allowed bg-surface-2 text-neutral-500 ring-1 ring-white/10'
                      : 'bg-purple-500/20 text-purple-200 ring-1 ring-purple-500/30 hover:bg-purple-500/30 hover:ring-purple-500/40'
                  }`}
                >
                  {spun ? 'Medición resuelta' : 'Girar ruleta'}
                </button>
                <button
                  onClick={onClose}
                  disabled={!spinDone}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                    spinDone
                      ? 'bg-accent/15 text-accent ring-1 ring-accent/30 hover:bg-accent/20'
                      : 'cursor-not-allowed bg-surface-2 text-neutral-600 ring-1 ring-white/5'
                  }`}
                >
                  Cerrar resultado
                </button>
              </div>

              <p className="mt-3 text-[11px] text-neutral-500">
                {spinDone
                  ? 'El resultado queda visible hasta que pulses "Cerrar resultado".'
                  : 'Pulsa "Girar ruleta" para resolver esta medición.'}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
