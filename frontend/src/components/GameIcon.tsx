import type { SVGProps } from 'react'

type GameIconName =
  | 'undo'
  | 'flip'
  | 'flag'
  | 'settings'
  | 'menu'
  | 'chart'
  | 'music'
  | 'pause'
  | 'play'
  | 'atom'
  | 'queen'
  | 'classic'
  | 'merge'

interface GameIconProps extends SVGProps<SVGSVGElement> {
  name: GameIconName
}

const paths: Record<GameIconName, JSX.Element> = {
  undo: <path d="M9 7H5v4M5.4 7.4A7 7 0 1 1 4 12" />,
  flip: <path d="M8 4 5 7l3 3M5 7h11M16 20l3-3-3-3M19 17H8" />,
  flag: <path d="M6 21V4m0 0h11l-2 4 2 4H6" />,
  settings: <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm0-5v2m0 13v2M4.2 4.2l1.4 1.4m12.8 12.8 1.4 1.4M1 12h2m18 0h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />,
  menu: <path d="M6 8h12M6 12h12M6 16h12" />,
  chart: <path d="M5 19V9m7 10V5m7 14v-7M3 21h18" />,
  music: <path d="M9 18V5l10-2v13M9 18a3 3 0 1 1-2-2.83M19 16a3 3 0 1 1-2-2.83" />,
  pause: <path d="M8 5v14M16 5v14" />,
  play: <path d="m8 5 11 7-11 7V5Z" />,
  atom: <path d="M12 12h.01M20 12c0 2-3.58 3.6-8 3.6S4 14 4 12s3.58-3.6 8-3.6 8 1.6 8 3.6Zm-4 6.93c-1.73 1-4.9-1.84-7.1-5.66C6.68 9.45 6.3 5.22 8.03 4.22c1.73-1 4.9 1.84 7.1 5.66 2.2 3.82 2.6 8.05.87 9.05Zm-8 0c-1.73-1-1.33-5.23.87-9.05 2.2-3.82 5.37-6.66 7.1-5.66 1.73 1 1.33 5.23-.87 9.05-2.2 3.82-5.37 6.66-7.1 5.66Z" />,
  queen: <path d="m4 19 2-10 4 5 2-8 2 8 4-5 2 10H4Zm1 2h14" />,
  classic: <path d="M8 21h8M9 17h6l1-8h-8l1 8Zm0-8V5a3 3 0 0 1 6 0v4" />,
  merge: <path d="M7 7h6a4 4 0 0 1 0 8H5m0 0 3-3m-3 3 3 3M17 7l3-3m0 0v5m0-5h-5" />,
}

export default function GameIcon({ name, className = '', ...props }: GameIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`inline-block h-4 w-4 shrink-0 ${className}`}
      {...props}
    >
      {paths[name]}
    </svg>
  )
}

