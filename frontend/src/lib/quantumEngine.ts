// ═══════════════════════════════════════════════════════════════════════
//  Motor de Ajedrez Cuántico
//  Basado en las reglas del Quantum Chess (QuantumFracture / Quantum Realm)
// ═══════════════════════════════════════════════════════════════════════

import type {
  PieceColor, PieceType, QPiece, QBoardCell, QMoveRecord,
  QMoveType, QEntanglement, QCastleEntData, QTunnelEntData,
  QState, QGameOver, QMeasurementEvent,
} from './types'

// ─── Utilidades de coordenadas ───

function sq2rc(sq: string): [number, number] {
  return [sq.charCodeAt(0) - 97, parseInt(sq[1]) - 1]
}

function rc2sq(file: number, rank: number): string | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null
  return String.fromCharCode(97 + file) + (rank + 1)
}

// ─── Direcciones de movimiento ───

type Dir = [number, number]
const ROOK_DIRS: Dir[] = [[1, 0], [-1, 0], [0, 1], [0, -1]]
const BISHOP_DIRS: Dir[] = [[1, 1], [1, -1], [-1, 1], [-1, -1]]
const QUEEN_DIRS: Dir[] = [...ROOK_DIRS, ...BISHOP_DIRS]
const KNIGHT_OFFSETS: Dir[] = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]
const KING_OFFSETS: Dir[] = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]

// ─── Etiquetas de piezas (español) ───

const LABELS: Record<string, string> = {
  p: 'Peón', n: 'Caballo', b: 'Alfil', r: 'Torre', q: 'Dama', k: 'Rey',
}

// ─── Resultado de generación de movimientos ───

export interface MoveTarget {
  square: string
  isCapture: boolean
  tunnelThrough: string[] // casillas de piezas cuánticas atravesadas
}

// ═══════════════════════════════════════════════════════════════════════
//  Clase principal del motor cuántico
// ═══════════════════════════════════════════════════════════════════════

export class QuantumChessEngine {
  state: QState

  constructor() {
    this.state = createInitialState()
  }

  // ─── Vista del tablero ───

  getBoard(): Record<string, QBoardCell[]> {
    const board: Record<string, QBoardCell[]> = {}
    for (const p of Object.values(this.state.pieces)) {
      if (!p.alive) continue
      for (const [sq, prob] of Object.entries(p.positions)) {
        if (!board[sq]) board[sq] = []
        board[sq].push({ pieceId: p.id, type: p.type, color: p.color, probability: prob })
      }
    }
    return board
  }

  getPiece(id: string): QPiece | null {
    return this.state.pieces[id] ?? null
  }

  isQuantum(id: string): boolean {
    const p = this.state.pieces[id]
    return !!p && Object.keys(p.positions).length > 1
  }

  // ─── Generación de movimientos legales ───

  getLegalMoves(pieceId: string, fromSquare: string): MoveTarget[] {
    const piece = this.state.pieces[pieceId]
    if (!piece || !piece.alive || !(fromSquare in piece.positions)) return []
    if (piece.color !== this.state.turn) return []

    const board = this.getBoard()
    const myColor = piece.color

    switch (piece.type) {
      case 'p': return this._pawnMoves(piece, fromSquare, board)
      case 'n': return this._jumpMoves(fromSquare, KNIGHT_OFFSETS, myColor, board, pieceId)
      case 'b': return this._sliderMoves(fromSquare, BISHOP_DIRS, myColor, board, pieceId)
      case 'r': return this._sliderMoves(fromSquare, ROOK_DIRS, myColor, board, pieceId)
      case 'q': return this._sliderMoves(fromSquare, QUEEN_DIRS, myColor, board, pieceId)
      case 'k': return this._jumpMoves(fromSquare, KING_OFFSETS, myColor, board, pieceId)
      default: return []
    }
  }

  /** Casillas de fusión: reachable desde TODAS las posiciones del quantum piece */
  getMergeTargets(pieceId: string): string[] {
    const piece = this.state.pieces[pieceId]
    if (!piece || !piece.alive) return []
    const squares = Object.keys(piece.positions)
    if (squares.length < 2) return []

    const board = this.getBoard()
    let intersection: Set<string> | null = null

    for (const sq of squares) {
      const moves = this.getLegalMoves(pieceId, sq)
      const nonCapture = new Set(moves.filter(m => !m.isCapture).map(m => m.square))

      if (intersection === null) {
        intersection = nonCapture
      } else {
        const filtered: string[] = []
        intersection.forEach(s => { if (nonCapture.has(s)) filtered.push(s) })
        intersection = new Set(filtered)
      }
    }

    // También filtramos: el destino debe estar vacío de piezas enemigas y de otras piezas propias
    const result: string[] = []
    for (const sq of intersection ?? []) {
      const cells = board[sq] || []
      const hasOtherPiece = cells.some(c => c.pieceId !== pieceId)
      if (!hasOtherPiece) result.push(sq)
    }

    return result
  }

  /** Opciones de enroque cuántico disponibles */
  canQuantumCastle(color: PieceColor): ('k' | 'q')[] {
    const sides: ('k' | 'q')[] = []
    const c = this.state.castling[color]
    const rank = color === 'w' ? '1' : '8'
    const kingId = `${color}_k`
    const king = this.state.pieces[kingId]

    if (!king || !king.alive || Object.keys(king.positions).length !== 1) return []
    if (king.positions[`e${rank}`] !== 1) return []

    const board = this.getBoard()

    if (c.k) {
      const rookId = `${color}_r_h`
      const rook = this.state.pieces[rookId]
      if (rook?.alive && Object.keys(rook.positions).length === 1 && rook.positions[`h${rank}`] === 1) {
        const f = board[`f${rank}`] || []
        const g = board[`g${rank}`] || []
        const pathClear = f.every(c => c.probability < 1) && g.every(c => c.probability < 1)
        if (pathClear) sides.push('k')
      }
    }

    if (c.q) {
      const rookId = `${color}_r_a`
      const rook = this.state.pieces[rookId]
      if (rook?.alive && Object.keys(rook.positions).length === 1 && rook.positions[`a${rank}`] === 1) {
        const b = board[`b${rank}`] || []
        const c2 = board[`c${rank}`] || []
        const d = board[`d${rank}`] || []
        const pathClear = b.every(c => c.probability < 1) && c2.every(c => c.probability < 1) && d.every(c => c.probability < 1)
        if (pathClear) sides.push('q')
      }
    }

    return sides
  }

  // ─── Ejecución de movimientos ───

  doClassicalMove(pieceId: string, from: string, to: string, promotion?: PieceType): QMoveRecord {
    const piece = this.state.pieces[pieceId]
    const prob = piece.positions[from]
    const board = this.getBoard()
    const targetCells = board[to] || []
    const enemies = targetCells.filter(c => c.color !== piece.color)
    const attemptedPawnCapture = piece.type === 'p' && from[0] !== to[0]

    let captured: { id: string; type: PieceType } | undefined
    let measurement: QMeasurementEvent | undefined
    let attackerMeasurement: QMeasurementEvent | undefined
    let staysOnOrigin = false

    // ¿La pieza que mueve es cuántica?
    const attackerIsQuantum = prob < 1

    if (enemies.length > 0) {
      const defender = enemies[0]
      const defenderPiece = this.state.pieces[defender.pieceId]
      const defenderIsQuantum = defender.probability < 1

      if (attackerIsQuantum) {
        // Medir atacante primero
        const roll = Math.random()
        const alive = roll < prob
        if (!alive) {
          // Atacante no existe → pierde turno, colapsa en otra casilla
          measurement = {
            target: 'attacker',
            result: 'dead',
            probability: prob,
            roll,
            attackerWasQuantum: true,
            defenderWasQuantum: defenderIsQuantum,
            step: 1,
            totalSteps: defenderIsQuantum ? 2 : 1,
          }
          this._collapsePieceAway(pieceId, from)
          this._resolveEntanglementsFor(pieceId)
          const desc = `⚡ ${LABELS[piece.type]} mide en ${to} → NO existe`
          const record: QMoveRecord = {
            pieceId, pieceType: piece.type, color: piece.color,
            moveType: 'classical', from, to, measurement, description: desc,
          }
          this.state.history.push(record)
          this._endTurn()
          return record
        }
        // Atacante existe → colapsa a 100% en from, luego captura
        attackerMeasurement = {
          target: 'attacker',
          result: 'alive',
          probability: prob,
          roll,
          attackerWasQuantum: true,
            defenderWasQuantum: defenderIsQuantum,
          step: 1,
          totalSteps: defenderIsQuantum ? 2 : 1,
        }
        measurement = attackerMeasurement
        this._collapsePieceTo(pieceId, from)
        this._resolveEntanglementsFor(pieceId)
      }

      if (defenderIsQuantum && (!attackerIsQuantum || measurement?.result === 'alive')) {
        // Medir defensor
        const defRoll = Math.random()
        const defAlive = defRoll < defender.probability
        if (!defAlive) {
          // Defensor no existe → movimiento normal (casilla vacía), defensor colapsa en otra casilla
          measurement = {
            target: 'defender',
            result: 'dead',
            probability: defender.probability,
            roll: defRoll,
            attackerWasQuantum: attackerIsQuantum,
            defenderWasQuantum: true,
            step: attackerIsQuantum ? 2 : 1,
            totalSteps: attackerIsQuantum ? 2 : 1,
            priorStepResult: attackerMeasurement
              ? { target: attackerMeasurement.target, result: attackerMeasurement.result }
              : undefined,
          }
          this._collapsePieceAway(defender.pieceId, to)
          this._resolveEntanglementsFor(defender.pieceId)
          staysOnOrigin = attemptedPawnCapture
        } else {
          // Defensor existe → captura
          measurement = {
            target: 'defender',
            result: 'alive',
            probability: defender.probability,
            roll: defRoll,
            attackerWasQuantum: attackerIsQuantum,
            defenderWasQuantum: true,
            step: attackerIsQuantum ? 2 : 1,
            totalSteps: attackerIsQuantum ? 2 : 1,
            priorStepResult: attackerMeasurement
              ? { target: attackerMeasurement.target, result: attackerMeasurement.result }
              : undefined,
          }
          captured = { id: defender.pieceId, type: defender.type }
          this._killPiece(defender.pieceId)
          this._resolveEntanglementsFor(defender.pieceId)
        }
      } else if (!defenderIsQuantum) {
        // Captura estándar de pieza clásica
        captured = { id: defender.pieceId, type: defender.type }
        this._killPiece(defender.pieceId)
      }
    }

    // Mover la pieza
    const prevPositions = { ...piece.positions }
    if (!staysOnOrigin) {
      delete piece.positions[from]
      piece.positions[to] = attackerIsQuantum && measurement?.result === 'alive' ? 1 : (prevPositions[from] ?? 1)
    }

    // Si todas las probabilidades restantes están en un solo lugar → la pieza ya es 100%
    const sqs = Object.keys(piece.positions)
    if (sqs.length === 1) piece.positions[sqs[0]] = 1

    // Crear entrelazamientos de túnel
    const moves = this._cachedMoves ?? this.getLegalMoves(pieceId, from)
    const moveInfo = moves.find(m => m.square === to)
    if (!staysOnOrigin && moveInfo && moveInfo.tunnelThrough.length > 0) {
      for (const tunnelSq of moveInfo.tunnelThrough) {
        const blockerCells = board[tunnelSq]?.filter(c => c.probability < 1) ?? []
        for (const blocker of blockerCells) {
          this.state.entanglements.push({
            id: this.state.nextEntId++,
            type: 'tunnel',
            data: {
              tunnelerId: pieceId,
              tunnelerOriginal: from,
              blockerId: blocker.pieceId,
              blockerSquare: tunnelSq,
            } as QTunnelEntData,
          })
        }
      }
    }

    // Promoción de peón
    if (promotion && piece.type === 'p') {
      const destRank = to[1]
      if ((piece.color === 'w' && destRank === '8') || (piece.color === 'b' && destRank === '1')) {
        piece.type = promotion
      }
    }

    // Derechos de enroque
    this._updateCastlingRights(pieceId, from, to)

    // Descripción
    let desc = ''
    if (captured) {
      desc = `${LABELS[piece.type]} captura en ${to}`
    } else if (staysOnOrigin) {
      desc = `${LABELS[piece.type]} intenta capturar en ${to}, pero permanece en ${from}`
    } else {
      desc = `${LABELS[piece.type]} a ${to}`
    }
    if (measurement) {
      const icon = measurement.result === 'alive' ? '✓' : '✗'
      const stepLabel = measurement.totalSteps > 1 ? ` ${measurement.step}/${measurement.totalSteps}` : ''
      desc = `⚡ ${desc} (${measurement.target === 'attacker' ? 'atac.' : 'def.'}${stepLabel}: ${icon})`
    }

    const record: QMoveRecord = {
      pieceId, pieceType: piece.type, color: piece.color,
      moveType: 'classical', from, to: staysOnOrigin ? from : to, captured, measurement, description: desc,
    }
    this.state.history.push(record)
    this._checkGameOver()
    this._endTurn()
    return record
  }

  private _cachedMoves: MoveTarget[] | null = null

  doQuantumMove(pieceId: string, from: string, toA: string, toB: string): QMoveRecord {
    const piece = this.state.pieces[pieceId]
    if (piece.type === 'p') throw new Error('Los peones no pueden hacer movimientos cuánticos')

    const prob = piece.positions[from]
    const halfProb = prob / 2

    // Quitar de la casilla actual
    delete piece.positions[from]
    // Añadir a las dos casillas destino
    piece.positions[toA] = (piece.positions[toA] ?? 0) + halfProb
    piece.positions[toB] = (piece.positions[toB] ?? 0) + halfProb

    const desc = `${LABELS[piece.type]} → ${toA} | ${toB} (${Math.round(halfProb * 100)}%/${Math.round(halfProb * 100)}%)`

    const record: QMoveRecord = {
      pieceId, pieceType: piece.type, color: piece.color,
      moveType: 'quantum', from, to: toA, secondTo: toB, description: desc,
    }
    this.state.history.push(record)
    this._endTurn()
    return record
  }

  doMerge(pieceId: string, to: string): QMoveRecord {
    const piece = this.state.pieces[pieceId]
    // Quitar de todas las posiciones actuales
    piece.positions = { [to]: 1 }

    // Limpiar entrelazamientos asociados
    this.state.entanglements = this.state.entanglements.filter(e => {
      if (e.type === 'tunnel') {
        const d = e.data as QTunnelEntData
        return d.tunnelerId !== pieceId && d.blockerId !== pieceId
      }
      if (e.type === 'castle') {
        const d = e.data as QCastleEntData
        return d.kingId !== pieceId && d.rookId !== pieceId
      }
      return true
    })

    const desc = `${LABELS[piece.type]} fusionado en ${to} (100%)`
    const record: QMoveRecord = {
      pieceId, pieceType: piece.type, color: piece.color,
      moveType: 'merge', from: '*', to, description: desc,
    }
    this.state.history.push(record)
    this._endTurn()
    return record
  }

  doQuantumCastle(color: PieceColor, side: 'k' | 'q'): QMoveRecord {
    const rank = color === 'w' ? '1' : '8'
    const kingId = `${color}_k`
    const rookId = side === 'k' ? `${color}_r_h` : `${color}_r_a`
    const king = this.state.pieces[kingId]
    const rook = this.state.pieces[rookId]

    let castledKing: string, castledRook: string
    if (side === 'k') {
      castledKing = `g${rank}`
      castledRook = `f${rank}`
    } else {
      castledKing = `c${rank}`
      castledRook = `d${rank}`
    }

    const origKing = `e${rank}`
    const origRook = side === 'k' ? `h${rank}` : `a${rank}`

    // Poner ambas piezas en superposición 50/50
    king.positions = { [origKing]: 0.5, [castledKing]: 0.5 }
    rook.positions = { [origRook]: 0.5, [castledRook]: 0.5 }

    // Crear entrelazamiento
    this.state.entanglements.push({
      id: this.state.nextEntId++,
      type: 'castle',
      data: {
        kingId,
        rookId,
        castled: { king: castledKing, rook: castledRook },
        original: { king: origKing, rook: origRook },
      } as QCastleEntData,
    })

    // Invalidar derechos de enroque
    this.state.castling[color] = { k: false, q: false }

    const sideName = side === 'k' ? 'corto' : 'largo'
    const desc = `Enroque cuántico ${sideName} (50%/50%)`
    const record: QMoveRecord = {
      pieceId: kingId, pieceType: 'k', color,
      moveType: 'quantumCastle', from: origKing, to: castledKing, description: desc,
    }
    this.state.history.push(record)
    this._endTurn()
    return record
  }

  // ─── Generación de tableros clásicos (para Stockfish) ───

  generateClassicalBoards(): { fen: string; probability: number; pieceMap: Record<string, string> }[] {
    const pieces = Object.values(this.state.pieces).filter(p => p.alive)
    const classical: QPiece[] = []
    const quantum: QPiece[] = []

    for (const p of pieces) {
      const sqs = Object.keys(p.positions)
      if (sqs.length === 1 && p.positions[sqs[0]] >= 1) {
        classical.push(p)
      } else {
        quantum.push(p)
      }
    }

    if (quantum.length === 0) {
      // Todo clásico: un solo tablero
      const placement: Record<string, QPiece> = {}
      for (const p of classical) placement[Object.keys(p.positions)[0]] = p
      return [{ fen: this._buildFen(placement), probability: 1, pieceMap: this._buildPieceMap(placement) }]
    }

    // Generar combinaciones (Cartesian product)
    const optionsList: Array<Array<{ piece: QPiece; square: string; prob: number }>> = []
    for (const p of quantum) {
      const opts = Object.entries(p.positions).map(([sq, prob]) => ({ piece: p, square: sq, prob }))
      optionsList.push(opts)
    }

    const boards: { fen: string; probability: number; pieceMap: Record<string, string> }[] = []
    const MAX_BOARDS = 128

    const generate = (idx: number, chosen: Array<{ piece: QPiece; square: string; prob: number }>, accProb: number) => {
      if (boards.length >= MAX_BOARDS) return
      if (idx === optionsList.length) {
        // Verificar que no haya dos piezas en la misma casilla
        const placement: Record<string, QPiece> = {}

        for (const p of classical) {
          const sq = Object.keys(p.positions)[0]
          if (placement[sq]) return // conflicto
          placement[sq] = p
        }
        for (const item of chosen) {
          if (placement[item.square]) return // conflicto
          placement[item.square] = item.piece
        }

        boards.push({
          fen: this._buildFen(placement),
          probability: accProb,
          pieceMap: this._buildPieceMap(placement),
        })
        return
      }
      for (const opt of optionsList[idx]) {
        generate(idx + 1, [...chosen, opt], accProb * opt.prob)
      }
    }

    generate(0, [], 1)

    // Normalizar probabilidades
    const total = boards.reduce((s, b) => s + b.probability, 0)
    if (total > 0) {
      for (const b of boards) b.probability /= total
    }

    return boards
  }

  // ─── Serialización para el backend ───

  toPayload(): object {
    const pieces = Object.values(this.state.pieces)
      .filter(p => p.alive)
      .map(p => ({
        id: p.id,
        type: p.type,
        color: p.color,
        squares: Object.entries(p.positions).map(([sq, prob]) => ({ square: sq, probability: prob })),
      }))

    return {
      pieces,
      turn: this.state.turn,
      castling: this.state.castling,
    }
  }

  // ─── Detección de fin de partida ───

  checkGameOverPublic(): QGameOver | null {
    return this.state.gameOver
  }

  // ═══════════════════════════════════════════════════════════════════
  //  Métodos privados
  // ═══════════════════════════════════════════════════════════════════

  /** Movimientos de peón */
  private _pawnMoves(piece: QPiece, from: string, board: Record<string, QBoardCell[]>): MoveTarget[] {
    const [f, r] = sq2rc(from)
    const dir = piece.color === 'w' ? 1 : -1
    const startRank = piece.color === 'w' ? 1 : 6
    const moves: MoveTarget[] = []

    // Avance 1
    const fwd1 = rc2sq(f, r + dir)
    if (fwd1) {
      const cells = board[fwd1] || []
      const hasClassical = cells.some(c => c.probability >= 1)
      if (!hasClassical) {
        const tunneled = cells.filter(c => c.probability < 1).length > 0 ? [fwd1] : []
        if (cells.filter(c => c.color === piece.color).length === 0 || tunneled.length > 0) {
          moves.push({ square: fwd1, isCapture: false, tunnelThrough: tunneled })

          // Avance 2 desde posición inicial
          if (r === startRank) {
            const fwd2 = rc2sq(f, r + 2 * dir)
            if (fwd2) {
              const cells2 = board[fwd2] || []
              const hasClassical2 = cells2.some(c => c.probability >= 1)
              if (!hasClassical2) {
                const tunneled2 = [...tunneled]
                if (cells2.filter(c => c.probability < 1).length > 0) tunneled2.push(fwd2)
                moves.push({ square: fwd2, isCapture: false, tunnelThrough: tunneled2 })
              }
            }
          }
        }
      }
    }

    // Capturas diagonales
    for (const df of [-1, 1]) {
      const cap = rc2sq(f + df, r + dir)
      if (cap) {
        const cells = board[cap] || []
        if (cells.some(c => c.color !== piece.color)) {
          moves.push({ square: cap, isCapture: true, tunnelThrough: [] })
        }
      }
    }

    return moves
  }

  /** Movimientos de salto (caballo, rey) */
  private _jumpMoves(from: string, offsets: Dir[], color: PieceColor, board: Record<string, QBoardCell[]>, myId: string): MoveTarget[] {
    const [f, r] = sq2rc(from)
    const moves: MoveTarget[] = []

    for (const [df, dr] of offsets) {
      const sq = rc2sq(f + df, r + dr)
      if (!sq) continue

      const cells = board[sq] || []
      const hasOwnClassical = cells.some(c => c.color === color && c.probability >= 1 && c.pieceId !== myId)
      if (hasOwnClassical) continue

      const hasEnemy = cells.some(c => c.color !== color)
      moves.push({ square: sq, isCapture: hasEnemy, tunnelThrough: [] })
    }
    return moves
  }

  /** Movimientos de deslizamiento (alfil, torre, dama) */
  private _sliderMoves(from: string, dirs: Dir[], color: PieceColor, board: Record<string, QBoardCell[]>, myId: string): MoveTarget[] {
    const [f, r] = sq2rc(from)
    const moves: MoveTarget[] = []

    for (const [df, dr] of dirs) {
      let cf = f + df, cr = r + dr
      const tunneled: string[] = []

      while (cf >= 0 && cf < 8 && cr >= 0 && cr < 8) {
        const sq = rc2sq(cf, cr)!
        const cells = board[sq] || []

        const ownClassical = cells.find(c => c.color === color && c.probability >= 1 && c.pieceId !== myId)
        const ownQuantum = cells.filter(c => c.color === color && c.probability < 1 && c.pieceId !== myId)
        const enemyClassical = cells.find(c => c.color !== color && c.probability >= 1)
        const enemyQuantum = cells.filter(c => c.color !== color && c.probability < 1)

        // Pieza propia clásica → bloqueado
        if (ownClassical) break

        // Pieza enemiga clásica → captura y parar
        if (enemyClassical) {
          moves.push({ square: sq, isCapture: true, tunnelThrough: [...tunneled] })
          break
        }

        // Solo piezas cuánticas en esta casilla
        if (ownQuantum.length > 0 && enemyQuantum.length === 0 && cells.every(c => c.pieceId === myId || (c.color === color && c.probability < 1))) {
          // Piezas propias cuánticas → túnel (pasar sin aterrizar)
          tunneled.push(sq)
          cf += df; cr += dr
          continue
        }

        if (enemyQuantum.length > 0) {
          // Pieza enemiga cuántica → opción de captura + seguir deslizando
          moves.push({ square: sq, isCapture: true, tunnelThrough: [...tunneled] })
          tunneled.push(sq)
          cf += df; cr += dr
          continue
        }

        // Casilla vacía o solo nuestra propia pieza cuántica (fusión se maneja aparte)
        if (cells.length === 0) {
          moves.push({ square: sq, isCapture: false, tunnelThrough: [...tunneled] })
        } else if (cells.every(c => c.pieceId === myId)) {
          // La propia pieza en otra posición → no aterrizar (fusión maneja esto)
          tunneled.push(sq)
        }

        cf += df; cr += dr
      }
    }
    return moves
  }

  /** Colapsar pieza LEJOS de una casilla (no existe ahí → va a otra posición) */
  private _collapsePieceAway(pieceId: string, awayFrom: string) {
    const piece = this.state.pieces[pieceId]
    if (!piece) return

    const remaining = Object.entries(piece.positions).filter(([sq]) => sq !== awayFrom)
    if (remaining.length === 0) {
      // No tiene otra casilla → muere
      this._killPiece(pieceId)
      return
    }

    // Normalizar y elegir proporcionalmente
    const totalProb = remaining.reduce((s, [, p]) => s + p, 0)
    const roll = Math.random() * totalProb
    let accum = 0
    let target = remaining[0][0]
    for (const [sq, p] of remaining) {
      accum += p
      if (roll <= accum) { target = sq; break }
    }

    piece.positions = { [target]: 1 }
  }

  /** Colapsar pieza HACIA una casilla (existe ahí → 100% en esa casilla) */
  private _collapsePieceTo(pieceId: string, toSquare: string) {
    const piece = this.state.pieces[pieceId]
    if (!piece) return
    piece.positions = { [toSquare]: 1 }
  }

  /** Eliminar pieza del juego */
  private _killPiece(pieceId: string) {
    const piece = this.state.pieces[pieceId]
    if (!piece) return
    piece.alive = false
    piece.positions = {}
  }

  /** Resolver entrelazamientos cuando una pieza colapsa */
  private _resolveEntanglementsFor(pieceId: string) {
    const toRemove: number[] = []

    for (const ent of this.state.entanglements) {
      if (ent.type === 'castle') {
        const d = ent.data as QCastleEntData
        if (d.kingId === pieceId || d.rookId === pieceId) {
          const collapsedPiece = this.state.pieces[pieceId]
          if (!collapsedPiece?.alive) {
            // La pieza murió → la otra también colapsa (al estado original si aplica)
            const otherId = d.kingId === pieceId ? d.rookId : d.kingId
            const otherPiece = this.state.pieces[otherId]
            if (otherPiece?.alive && Object.keys(otherPiece.positions).length > 1) {
              // Colapsar al estado original
              const otherIsCastled = d.kingId === pieceId
                ? d.original.rook
                : d.original.king
              this._collapsePieceTo(otherId, otherIsCastled)
            }
          } else {
            // La pieza colapsó a una casilla → determinar si fue "enrocado" o "original"
            const collapsedSq = Object.keys(collapsedPiece.positions)[0]
            const otherId = d.kingId === pieceId ? d.rookId : d.kingId
            const otherPiece = this.state.pieces[otherId]

            if (otherPiece?.alive) {
              if (d.kingId === pieceId) {
                // El rey colapsó
                if (collapsedSq === d.castled.king) {
                  this._collapsePieceTo(d.rookId, d.castled.rook)
                } else {
                  this._collapsePieceTo(d.rookId, d.original.rook)
                }
              } else {
                // La torre colapsó
                if (collapsedSq === d.castled.rook) {
                  this._collapsePieceTo(d.kingId, d.castled.king)
                } else {
                  this._collapsePieceTo(d.kingId, d.original.king)
                }
              }
            }
          }
          toRemove.push(ent.id)
        }
      }

      if (ent.type === 'tunnel') {
        const d = ent.data as QTunnelEntData
        if (d.blockerId === pieceId) {
          const blocker = this.state.pieces[d.blockerId]
          if (blocker?.alive) {
            const blockerSq = Object.keys(blocker.positions)[0]
            if (blockerSq === d.blockerSquare) {
              // El bloqueador estaba ahí → el túnel era inválido → pieza retrocede
              const tunneler = this.state.pieces[d.tunnelerId]
              if (tunneler?.alive) {
                // Buscar la posición actual del tunneler que corresponde al destino post-túnel
                // y moverla de vuelta al origen
                const currentSqs = Object.keys(tunneler.positions)
                if (currentSqs.length > 1) {
                  // Si está en superposición, solo quitar la parte que pasó por el túnel
                  const afterTunnel = currentSqs.filter(s => s !== d.tunnelerOriginal)
                  if (afterTunnel.length > 0) {
                    for (const s of afterTunnel) {
                      delete tunneler.positions[s]
                    }
                    // Renormalizar
                    const totalP = Object.values(tunneler.positions).reduce((a, b) => a + b, 0)
                    for (const s of Object.keys(tunneler.positions)) {
                      tunneler.positions[s] /= totalP
                    }
                  }
                } else {
                  // Estaba solo en la posición post-túnel → volver al origen
                  const sq = currentSqs[0]
                  delete tunneler.positions[sq]
                  tunneler.positions[d.tunnelerOriginal] = 1
                }
              }
            }
          }
          toRemove.push(ent.id)
        }
        if (d.tunnelerId === pieceId) {
          toRemove.push(ent.id)
        }
      }
    }

    this.state.entanglements = this.state.entanglements.filter(e => !toRemove.includes(e.id))
  }

  /** Actualizar derechos de enroque */
  private _updateCastlingRights(pieceId: string, from: string, to: string) {
    // Si mueve el rey → pierde ambos enroques
    if (pieceId.endsWith('_k')) {
      const color = pieceId[0] as PieceColor
      this.state.castling[color] = { k: false, q: false }
    }
    // Si mueve una torre → pierde ese enroque
    if (pieceId === 'w_r_a') this.state.castling.w.q = false
    if (pieceId === 'w_r_h') this.state.castling.w.k = false
    if (pieceId === 'b_r_a') this.state.castling.b.q = false
    if (pieceId === 'b_r_h') this.state.castling.b.k = false
    // Si captura una torre en su casilla original
    if (to === 'a1') this.state.castling.w.q = false
    if (to === 'h1') this.state.castling.w.k = false
    if (to === 'a8') this.state.castling.b.q = false
    if (to === 'h8') this.state.castling.b.k = false
  }

  /** Verificar si algún rey fue capturado */
  private _checkGameOver() {
    const wk = this.state.pieces['w_k']
    const bk = this.state.pieces['b_k']
    if (!wk?.alive) {
      this.state.gameOver = { winner: 'b', reason: 'Rey blanco capturado' }
    }
    if (!bk?.alive) {
      this.state.gameOver = { winner: 'w', reason: 'Rey negro capturado' }
    }
  }

  /** Cambiar turno */
  private _endTurn() {
    this.state.turn = this.state.turn === 'w' ? 'b' : 'w'
    if (this.state.turn === 'w') this.state.moveNumber++
  }

  /** Construir FEN desde un placement (para Stockfish) */
  private _buildFen(placement: Record<string, QPiece>): string {
    const PIECE_CHAR: Record<string, string> = {
      p: 'p', n: 'n', b: 'b', r: 'r', q: 'q', k: 'k',
    }
    const rows: string[] = []
    for (let rank = 7; rank >= 0; rank--) {
      let row = ''
      let empty = 0
      for (let file = 0; file < 8; file++) {
        const sq = rc2sq(file, rank)!
        const piece = placement[sq]
        if (piece) {
          if (empty > 0) { row += empty; empty = 0 }
          const ch = PIECE_CHAR[piece.type]
          row += piece.color === 'w' ? ch.toUpperCase() : ch
        } else {
          empty++
        }
      }
      if (empty > 0) row += empty
      rows.push(row)
    }

    const turn = this.state.turn
    let castling = ''
    if (this.state.castling.w.k) castling += 'K'
    if (this.state.castling.w.q) castling += 'Q'
    if (this.state.castling.b.k) castling += 'k'
    if (this.state.castling.b.q) castling += 'q'
    if (!castling) castling = '-'

    return `${rows.join('/')} ${turn} ${castling} - 0 ${this.state.moveNumber}`
  }

  /** Construir mapa pieceId → square */
  private _buildPieceMap(placement: Record<string, QPiece>): Record<string, string> {
    const map: Record<string, string> = {}
    for (const [sq, piece] of Object.entries(placement)) {
      map[sq] = piece.id
    }
    return map
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  Creación del estado inicial
// ═══════════════════════════════════════════════════════════════════════

function createInitialState(): QState {
  const pieces: Record<string, QPiece> = {}

  const add = (id: string, type: PieceType, color: PieceColor, sq: string) => {
    pieces[id] = { id, type, color, positions: { [sq]: 1 }, alive: true }
  }

  // Blancas
  add('w_r_a', 'r', 'w', 'a1'); add('w_n_b', 'n', 'w', 'b1')
  add('w_b_c', 'b', 'w', 'c1'); add('w_q', 'q', 'w', 'd1')
  add('w_k', 'k', 'w', 'e1'); add('w_b_f', 'b', 'w', 'f1')
  add('w_n_g', 'n', 'w', 'g1'); add('w_r_h', 'r', 'w', 'h1')
  for (let i = 0; i < 8; i++) {
    const file = String.fromCharCode(97 + i)
    add(`w_p_${file}`, 'p', 'w', `${file}2`)
  }

  // Negras
  add('b_r_a', 'r', 'b', 'a8'); add('b_n_b', 'n', 'b', 'b8')
  add('b_b_c', 'b', 'b', 'c8'); add('b_q', 'q', 'b', 'd8')
  add('b_k', 'k', 'b', 'e8'); add('b_b_f', 'b', 'b', 'f8')
  add('b_n_g', 'n', 'b', 'g8'); add('b_r_h', 'r', 'b', 'h8')
  for (let i = 0; i < 8; i++) {
    const file = String.fromCharCode(97 + i)
    add(`b_p_${file}`, 'p', 'b', `${file}7`)
  }

  return {
    pieces,
    turn: 'w',
    castling: { w: { k: true, q: true }, b: { k: true, q: true } },
    history: [],
    moveNumber: 1,
    entanglements: [],
    nextEntId: 1,
    gameOver: null,
  }
}
