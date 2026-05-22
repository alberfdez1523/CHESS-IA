import type { ReactNode } from 'react'

interface GameViewportShellProps {
  variant?: 'gold' | 'quantum'
  /** Número de banners bajo el header (0–2) para ajustar --game-banner-h */
  bannerCount?: 0 | 1 | 2
  /** Botones de enroque visibles bajo el tablero en móvil */
  hasCastleButtons?: boolean
  header: ReactNode
  banners?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

export default function GameViewportShell({
  variant = 'gold',
  bannerCount = 0,
  hasCastleButtons = false,
  header,
  banners,
  children,
  footer,
}: GameViewportShellProps) {
  const bannerClass =
    bannerCount === 2 ? 'has-game-banner-double'
      : bannerCount === 1 ? 'has-game-banner'
        : ''

  return (
    <div
      className={`game-viewport flex h-dvh max-h-dvh flex-col overflow-hidden bg-surface-0 ${
        variant === 'quantum' ? 'bg-atm-quantum game-viewport--quantum' : 'bg-atm-gold'
      } ${bannerClass} ${hasCastleButtons ? 'has-castle-buttons' : ''}`}
    >
      <div className="game-chrome-header shrink-0">{header}</div>
      {banners ? <div className="game-banners shrink-0">{banners}</div> : null}
      <div className="game-main flex min-h-0 flex-1 flex-col overflow-hidden px-2 py-1 lg:flex-row lg:items-start lg:justify-center lg:gap-0 lg:px-4 lg:py-8">
        {children}
      </div>
      {footer ? (
        <div className="game-chrome-footer shrink-0 lg:hidden">{footer}</div>
      ) : null}
    </div>
  )
}
