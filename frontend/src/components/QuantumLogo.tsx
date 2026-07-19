import { useId, type SVGProps } from 'react'

const queenBody = [
  'M3.5 13',
  'L11 17.8',
  'L8.5 8.5',
  'L17 16',
  'L25.5 8.5',
  'L23 17.8',
  'L30.5 13',
  'L27.5 24',
  'C26.6 27.4 24.5 30.5 22.9 33.7',
  'C21.1 37.1 20.7 40.6 22.4 44.2',
  'L25.2 49.4',
  'H8.8',
  'L11.6 44.2',
  'C13.3 40.6 12.9 37.1 11.1 33.7',
  'C9.5 30.5 7.4 27.4 6.5 24',
  'Z',
].join(' ')

const queenDiamond = 'M17 1.5 L20.5 6.5 L17 10.5 L13.5 6.5 Z'
const queenBase = 'M7.8 50.8 H26.2 L29.2 57.5 H4.8 Z'

export interface QuantumLogoProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  title?: string
}

/**
 * Brand mark inspired by a quantum measurement: the dotted queen is a
 * superposition and the solid queen is its observed state.
 */
export default function QuantumLogo({ title, ...props }: QuantumLogoProps) {
  const instanceId = useId().replace(/:/g, '')
  const gradientId = `quantum-logo-solid-${instanceId}`
  const titleId = `quantum-logo-title-${instanceId}`

  return (
    <svg
      viewBox="0 0 108 64"
      fill="none"
      focusable="false"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-labelledby={title ? titleId : undefined}
      {...props}
    >
      {title ? <title id={titleId}>{title}</title> : null}
      <defs>
        <linearGradient id={gradientId} x1="74" y1="4" x2="105" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgb(var(--brand-solid-highlight-rgb))" />
          <stop offset="0.52" stopColor="rgb(var(--brand-solid-rgb))" />
          <stop offset="1" stopColor="rgb(var(--brand-solid-shadow-rgb))" />
        </linearGradient>
      </defs>

      <g
        transform="translate(2 2)"
        stroke="rgb(var(--quantum-rgb))"
        strokeWidth="2"
        strokeDasharray="0.1 3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      >
        <path d={queenDiamond} />
        <path d={queenBody} />
        <path d={queenBase} />
      </g>

      <line
        x1="54"
        y1="5"
        x2="54"
        y2="59"
        stroke="rgb(var(--brand-measure-rgb))"
        strokeWidth="1.25"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx="54" cy="32" r="3.5" fill="rgb(var(--brand-measure-rgb))" />

      <g transform="translate(72 2)" fill={`url(#${gradientId})`}>
        <path d={queenDiamond} />
        <path d={queenBody} />
        <path d={queenBase} />
      </g>
    </svg>
  )
}
