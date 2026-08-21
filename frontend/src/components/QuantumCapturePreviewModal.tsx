import { useModalA11y } from '../hooks/useModalA11y'
import type { QuantumCapturePreview } from '../hooks/useQuantumChess'
import type { Language } from '../lib/types'
import GameIcon from './GameIcon'

interface QuantumCapturePreviewModalProps {
  preview: QuantumCapturePreview | null
  language: Language
  onConfirm: () => void
  onCancel: () => void
}

const OUTCOME_COPY = {
  'attacker-absent': {
    es: 'El atacante no estaba en la rama',
    en: 'The attacker was absent from the branch',
  },
  capture: {
    es: 'La captura se completa',
    en: 'The capture succeeds',
  },
  'defender-absent': {
    es: 'El defensor no estaba en la rama',
    en: 'The defender was absent from the branch',
  },
} as const

export default function QuantumCapturePreviewModal({
  preview,
  language,
  onConfirm,
  onCancel,
}: QuantumCapturePreviewModalProps) {
  const visible = preview !== null
  const es = language === 'es'
  const { containerRef, onBackdropClick } = useModalA11y(visible, onCancel, true)
  if (!preview) return null

  return (
    <div
      className="fixed inset-0 z-[88] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onBackdropClick}
      role="presentation"
    >
      <section
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="capture-tree-title"
        aria-describedby="capture-tree-description"
        className="screen-enter w-full max-w-xl border border-line bg-surface-1 p-5 shadow-board sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-quantum">
              {es ? 'Medición antes de actuar' : 'Measurement before acting'}
            </p>
            <h2 id="capture-tree-title" className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-ink">
              {es ? 'Árbol de resultados' : 'Outcome tree'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="grid min-h-11 min-w-11 place-items-center text-ink-secondary hover:text-ink"
            aria-label={es ? 'Cancelar captura' : 'Cancel capture'}
          >
            <GameIcon name="close" />
          </button>
        </header>

        <p id="capture-tree-description" className="mt-4 text-sm leading-6 text-ink-secondary">
          {es
            ? `La acción ${preview.from} → ${preview.to} medirá el estado. Revisa sus ramas antes de confirmarla.`
            : `The ${preview.from} → ${preview.to} action will measure the state. Review its branches before confirming.`}
        </p>

        <div className="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-3" aria-label={es ? 'Resultados posibles' : 'Possible outcomes'}>
          <div className="flex flex-col items-center pt-2" aria-hidden="true">
            <span className="grid h-9 w-9 place-items-center border border-quantum bg-quantum/10 font-mono text-xs font-semibold text-quantum">
              {preview.from}
            </span>
            <span className="h-full min-h-16 w-px bg-line" />
          </div>
          <div className="space-y-2">
            {preview.outcomes.map((outcome) => {
              const percentage = Math.round(outcome.probability * 100)
              return (
                <div
                  key={outcome.id}
                  className="relative overflow-hidden border border-line bg-surface-0 p-3"
                >
                  <div
                    className={`absolute inset-y-0 left-0 opacity-15 ${outcome.id === 'capture' ? 'bg-merge' : 'bg-quantum'}`}
                    style={{ width: `${percentage}%` }}
                    aria-hidden="true"
                  />
                  <div className="relative flex items-center justify-between gap-4">
                    <span className="text-xs font-medium leading-5 text-ink">
                      {OUTCOME_COPY[outcome.id][language]}
                    </span>
                    <span className="font-mono text-sm font-semibold text-ink">{percentage}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-6 grid gap-2 border-t border-line pt-5 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-12 border border-line bg-surface-0 px-4 text-sm font-semibold text-ink-secondary hover:border-ink hover:text-ink"
          >
            {es ? 'Volver al tablero' : 'Back to board'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex min-h-12 items-center justify-center gap-2 bg-quantum px-4 text-sm font-semibold text-on-quantum hover:bg-quantum-light"
          >
            <GameIcon name="check" />
            {es ? 'Confirmar y medir' : 'Confirm and measure'}
          </button>
        </div>
      </section>
    </div>
  )
}

