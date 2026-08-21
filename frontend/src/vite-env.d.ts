/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_FEATURE_ACADEMY?: string
  readonly VITE_FEATURE_ACCOUNT_SYNC?: string
  readonly VITE_FEATURE_DAILY_SPRINT?: string
  readonly VITE_FEATURE_QUANTUM_COHERENCE?: string
  readonly VITE_FEATURE_SUPPORTER?: string
  readonly VITE_SUPPORTER_CHECKOUT_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module 'chess.js' {
  type PieceColor = 'w' | 'b'
  type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k'

  interface ChessPiece {
    type: PieceType
    color: PieceColor
  }

  interface Move {
    color: PieceColor
    from: string
    to: string
    flags: string
    piece: PieceType
    san: string
    captured?: PieceType
    promotion?: PieceType
  }

  export class Chess {
    constructor(fen?: string)
    ascii(): string
    board(): (ChessPiece | null)[][]
    fen(): string
    game_over(): boolean
    get(square: string): ChessPiece | null
    history(options?: { verbose?: boolean }): any[]
    in_check(): boolean
    in_checkmate(): boolean
    in_draw(): boolean
    in_stalemate(): boolean
    in_threefold_repetition(): boolean
    insufficient_material(): boolean
    load(fen: string): boolean
    move(
      move: string | { from: string; to: string; promotion?: string }
    ): Move | null
    moves(options?: { square?: string; verbose?: boolean }): any[]
    pgn(): string
    put(piece: ChessPiece, square: string): boolean
    remove(square: string): ChessPiece | null
    reset(): void
    turn(): PieceColor
    undo(): Move | null
    validate_fen(fen: string): { valid: boolean; error_number: number; error: string }
  }
}
