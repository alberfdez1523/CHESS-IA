import type { SVGProps } from 'react'

export type GameIconName =
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
  | 'close'
  | 'globe'
  | 'book'
  | 'users'
  | 'bot'
  | 'clock'
  | 'copy'
  | 'chevron'
  | 'history'
  | 'share'
  | 'retry'

interface GameIconProps extends SVGProps<SVGSVGElement> {
  name: GameIconName
}

const paths: Record<GameIconName, JSX.Element> = {
  undo: <path d="M9 7H5v4M5.4 7.4A7 7 0 1 1 4 12" />,
  flip: <path d="M8 4 5 7l3 3M5 7h11M16 20l3-3-3-3M19 17H8" />,
  flag: <path d="M6 21V4m0 0h11l-2 4 2 4H6" />,
  settings: (
    <>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  menu: <path d="M6 8h12M6 12h12M6 16h12" />,
  chart: <path d="M5 19V9m7 10V5m7 14v-7M3 21h18" />,
  music: <path d="M9 18V5l10-2v13M9 18a3 3 0 1 1-2-2.83M19 16a3 3 0 1 1-2-2.83" />,
  pause: <path d="M8 5v14M16 5v14" />,
  play: <path d="m8 5 11 7-11 7V5Z" />,
  atom: <path d="M12 12h.01M20 12c0 2-3.58 3.6-8 3.6S4 14 4 12s3.58-3.6 8-3.6 8 1.6 8 3.6Zm-4 6.93c-1.73 1-4.9-1.84-7.1-5.66C6.68 9.45 6.3 5.22 8.03 4.22c1.73-1 4.9 1.84 7.1 5.66 2.2 3.82 2.6 8.05.87 9.05Zm-8 0c-1.73-1-1.33-5.23.87-9.05 2.2-3.82 5.37-6.66 7.1-5.66 1.73 1 1.33 5.23-.87 9.05-2.2 3.82-5.37 6.66-7.1 5.66Z" />,
  queen: <path d="m4 19 2-10 4 5 2-8 2 8 4-5 2 10H4Zm1 2h14" />,
  classic: <path d="M8 21h8M9 17h6l1-8h-8l1 8Zm0-8V5a3 3 0 0 1 6 0v4" />,
  merge: <path d="M7 7h6a4 4 0 0 1 0 8H5m0 0 3-3m-3 3 3 3M17 7l3-3m0 0v5m0-5h-5" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  globe: <path d="M3 12h18M12 3a15.3 15.3 0 0 1 0 18M12 3a15.3 15.3 0 0 0 0 18M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0Z" />,
  book: <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Zm16 0A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" />,
  users: <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />,
  bot: <path d="M9 3h6m-3 0v3M6 7h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm2 5h.01M16 12h.01M8 16h8" />,
  clock: <path d="M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  copy: <path d="M8 8h11a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2Zm8-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h1" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  history: <path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5m4-1v5l3 2" />,
  share: <path d="M18 8a3 3 0 1 0-2.83-4M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm12-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM8.6 16.5l6.8-3M8.6 7.5l6.8 3" />,
  retry: <path d="M20 11a8 8 0 1 0-2.34 5.66M20 4v7h-7" />,
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
