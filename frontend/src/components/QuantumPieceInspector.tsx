import { pieceGlyph } from '../lib/constants'
import { getPieceName } from '../lib/i18n'
import type {
  Language,
  QBoardCell,
  QEntanglement,
  QMoveMode,
  QPiece,
  QState,
} from '../lib/types'
import GameIcon from './GameIcon'

interface QuantumPieceInspectorProps {
  state: QState
  board: Record<string, QBoardCell[]>
  selectedPiece: { id: string; square: string } | null
  legalTargets: Set<string>
  mergeTargets: Set<string>
  moveMode: QMoveMode
  firstQuantumTarget: string | null
  language: Language
  showHints?: boolean
}

function relatedPieceId(entanglement: QEntanglement, selectedId: string) {
  if (entanglement.type === 'castle') {
    const { kingId, rookId } = entanglement.data
    if (kingId === selectedId) return rookId
    if (rookId === selectedId) return kingId
    return null
  }

  const { tunnelerId, blockerId } = entanglement.data
  if (tunnelerId === selectedId) return blockerId
  if (blockerId === selectedId) return tunnelerId
  return null
}

function percentage(value: number) {
  return `${Math.round(value * 100)}%`
}

function selectedCaptures(
  piece: QPiece,
  legalTargets: Set<string>,
  board: Record<string, QBoardCell[]>,
) {
  return [...legalTargets].flatMap((square) =>
    (board[square] ?? [])
      .filter((cell) => cell.color !== piece.color)
      .map((cell) => ({ square, cell })),
  )
}

export default function QuantumPieceInspector({
  state,
  board,
  selectedPiece,
  legalTargets,
  mergeTargets,
  moveMode,
  firstQuantumTarget,
  language,
  showHints = true,
}: QuantumPieceInspectorProps) {
  const isSpanish = language === 'es'
  const piece = selectedPiece ? state.pieces[selectedPiece.id] : null

  if (!piece?.alive) {
    return (
      <section className="py-3 text-center">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded border border-quantum/20 bg-quantum/10 text-quantum">
          <GameIcon name="atom" className="h-5 w-5" />
        </span>
        <h2 className="mt-3 text-ui-sm font-semibold text-ink">
          {isSpanish ? 'Selecciona una pieza' : 'Select a piece'}
        </h2>
        {showHints && (
          <p className="mx-auto mt-1 max-w-[28ch] text-ui-sm leading-relaxed text-neutral-500">
            {isSpanish
              ? 'Aquí verás sus ramas, probabilidades, destinos y entrelazamientos.'
              : 'You will see its branches, probabilities, destinations, and entanglements here.'}
          </p>
        )}
      </section>
    )
  }

  const branches = Object.entries(piece.positions).sort(([a], [b]) => a.localeCompare(b))
  const totalProbability = branches.reduce((total, [, probability]) => total + probability, 0)
  const relatedEntanglements = state.entanglements
    .map((entanglement) => ({
      entanglement,
      relatedId: relatedPieceId(entanglement, piece.id),
    }))
    .filter((item): item is { entanglement: QEntanglement; relatedId: string } => !!item.relatedId)
  const captures = selectedCaptures(piece, legalTargets, board)
  const destinations = moveMode === 'merge' ? [...mergeTargets] : [...legalTargets]
  const originProbability = piece.positions[selectedPiece?.square ?? ''] ?? 0

  return (
    <section aria-label={isSpanish ? 'Inspector cuántico' : 'Quantum inspector'}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`chess-piece-inline text-2xl ${piece.color === 'w' ? 'piece-white' : 'piece-black'}`}
            aria-hidden="true"
          >
            {pieceGlyph(piece.color, piece.type)}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-ui-base font-semibold text-ink">
              {getPieceName(piece.type, language)}
            </h2>
            <p className="font-mono text-ui-xs text-neutral-600">{piece.id}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-sm border border-quantum/25 bg-quantum/10 px-2 py-1 font-mono text-ui-xs text-quantum">
          {branches.length === 1
            ? (isSpanish ? 'clásica' : 'classical')
            : `${branches.length} ${isSpanish ? 'ramas' : 'branches'}`}
        </span>
      </div>

      <div className="mt-5 flex items-center justify-between text-ui-xs text-neutral-500">
        <h3 className="font-semibold text-neutral-300">{isSpanish ? 'Distribución' : 'Distribution'}</h3>
        <span className="font-mono tabular-nums">
          {isSpanish ? 'Total' : 'Total'} {percentage(totalProbability)}
        </span>
      </div>
      <ol className="mt-2 space-y-2">
        {branches.map(([square, probability]) => {
          const isOrigin = selectedPiece?.square === square
          return (
            <li
              key={square}
              className={`relative overflow-hidden rounded border px-2.5 py-2 ${
                isOrigin
                  ? 'border-quantum/35 bg-quantum/10'
                  : 'border-surface-4 bg-surface-2/70'
              }`}
            >
              <span
                className="absolute inset-y-0 left-0 bg-quantum/10"
                style={{ width: percentage(probability) }}
                aria-hidden="true"
              />
              <span className="relative flex items-center justify-between gap-3">
                <span className="font-mono text-ui-sm font-semibold text-ink">{square}</span>
                <span className="font-mono text-ui-sm tabular-nums text-quantum">
                  {percentage(probability)}
                </span>
              </span>
            </li>
          )
        })}
      </ol>

      <div className="mt-5 border-t border-surface-4 pt-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-ui-xs font-semibold text-neutral-300">
            {moveMode === 'merge'
              ? (isSpanish ? 'Destinos de fusión' : 'Merge destinations')
              : moveMode === 'quantum'
                ? (isSpanish ? 'Destinos de split' : 'Split destinations')
                : (isSpanish ? 'Destinos legales' : 'Legal destinations')}
          </h3>
          <span className="font-mono text-ui-xs text-neutral-500">{destinations.length}</span>
        </div>
        {destinations.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {destinations.map((square) => (
              <span
                key={square}
                className={`rounded-sm border px-1.5 py-1 font-mono text-ui-xs ${
                  firstQuantumTarget === square
                    ? 'border-quantum/45 bg-quantum/15 text-quantum-light'
                    : 'border-surface-4 text-neutral-400'
                }`}
              >
                {square}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-ui-xs text-neutral-600">
            {isSpanish ? 'No hay destinos para este modo.' : 'There are no destinations for this mode.'}
          </p>
        )}
        {showHints && moveMode === 'quantum' && originProbability > 0 ? (
          <p className="mt-2 text-ui-xs leading-relaxed text-neutral-500">
            {firstQuantumTarget
              ? (isSpanish
                  ? `Primera rama fijada en ${firstQuantumTarget}. Elige el segundo destino.`
                  : `First branch set on ${firstQuantumTarget}. Choose the second destination.`)
              : (isSpanish
                  ? `La rama seleccionada parte de ${selectedPiece?.square} con ${percentage(originProbability)}.`
                  : `The selected branch starts on ${selectedPiece?.square} at ${percentage(originProbability)}.`)}
          </p>
        ) : null}
      </div>

      {captures.length > 0 ? (
        <div className="mt-5 border-t border-surface-4 pt-4">
          <h3 className="text-ui-xs font-semibold text-neutral-300">
            {isSpanish ? 'Capturas posibles' : 'Possible captures'}
          </h3>
          <ul className="mt-2 space-y-1.5">
            {captures.map(({ square, cell }) => {
              const successProbability = originProbability * cell.probability
              return (
                <li key={`${square}-${cell.pieceId}`} className="border border-line bg-surface-2/70 p-3 text-ui-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate font-medium text-ink">
                      {selectedPiece?.square} → {square} · {getPieceName(cell.type, language)}
                    </span>
                    <span className="shrink-0 font-mono tabular-nums text-quantum">
                      {percentage(successProbability)}
                    </span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden bg-surface-4" aria-hidden="true">
                    <span className="block h-full bg-quantum" style={{ width: percentage(successProbability) }} />
                  </div>
                  <dl className="mt-2 grid grid-cols-3 gap-2 text-ink-secondary">
                    <div>
                      <dt>{isSpanish ? 'Atacante' : 'Attacker'}</dt>
                      <dd className="mt-0.5 font-mono text-ink">{percentage(originProbability)}</dd>
                    </div>
                    <div>
                      <dt>{isSpanish ? 'Defensor' : 'Defender'}</dt>
                      <dd className="mt-0.5 font-mono text-ink">{percentage(cell.probability)}</dd>
                    </div>
                    <div>
                      <dt>{isSpanish ? 'Captura' : 'Capture'}</dt>
                      <dd className="mt-0.5 font-mono text-quantum">{percentage(successProbability)}</dd>
                    </div>
                  </dl>
                  {showHints && <p className="mt-2 leading-relaxed text-ink-muted">
                    {isSpanish
                      ? 'Si una rama no existe, la captura falla y la secuencia de medición lo mostrará paso a paso.'
                      : 'If either branch does not exist, the capture fails and the measurement sequence shows it step by step.'}
                  </p>}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      <div className="mt-5 border-t border-surface-4 pt-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-ui-xs font-semibold text-neutral-300">
            {isSpanish ? 'Entrelazamientos' : 'Entanglements'}
          </h3>
          <span className="font-mono text-ui-xs text-neutral-500">{relatedEntanglements.length}</span>
        </div>
        {relatedEntanglements.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {relatedEntanglements.map(({ entanglement, relatedId }) => {
              const related = state.pieces[relatedId]
              return (
                <li key={entanglement.id} className="border-l border-quantum/50 pl-3 text-ui-xs">
                  <p className="font-medium text-quantum">
                    {entanglement.type === 'castle'
                      ? (isSpanish ? 'Enroque entrelazado' : 'Entangled castle')
                      : (isSpanish ? 'Túnel cuántico' : 'Quantum tunnel')}
                  </p>
                  <p className="mt-0.5 text-neutral-500">
                    {related
                      ? `${getPieceName(related.type, language)} · ${Object.keys(related.positions).join(' / ')}`
                      : relatedId}
                  </p>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-2 text-ui-xs text-neutral-600">
            {isSpanish ? 'Esta pieza no está entrelazada.' : 'This piece is not entangled.'}
          </p>
        )}
      </div>
    </section>
  )
}
