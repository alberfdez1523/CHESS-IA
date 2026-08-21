import { useRegisterSW } from 'virtual:pwa-register/react'
import type { Language } from '../lib/types'
import GameIcon from './GameIcon'

export default function PwaUpdatePrompt({
  language,
  canApplyUpdate,
}: {
  language: Language
  canApplyUpdate: boolean
}) {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!offlineReady && !needRefresh) return null
  if (needRefresh && !canApplyUpdate) return null

  const es = language === 'es'
  return (
    <aside
      className="fixed bottom-20 left-1/2 z-[80] w-[min(92vw,30rem)] -translate-x-1/2 border border-line bg-surface-1 p-4 text-ink shadow-card md:bottom-6"
      role="status"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center border border-quantum/40 text-quantum">
          <GameIcon name={needRefresh ? 'download' : 'check'} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {needRefresh
              ? (es ? 'Actualización preparada' : 'Update ready')
              : (es ? 'Academia disponible sin conexión' : 'Academy ready offline')}
          </p>
          <p className="mt-1 text-xs leading-5 text-ink-secondary">
            {needRefresh
              ? (es ? 'Se aplicará ahora sin interrumpir ninguna partida.' : 'It can be applied now without interrupting a game.')
              : (es ? 'El inicio y el contenido educativo esencial ya están guardados.' : 'The app shell and essential learning content are cached.')}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {needRefresh && (
              <button type="button" onClick={() => void updateServiceWorker(true)} className="min-h-11 bg-quantum px-4 text-xs font-semibold text-on-quantum">
                {es ? 'Actualizar' : 'Update'}
              </button>
            )}
            <button
              type="button"
              onClick={() => { setOfflineReady(false); setNeedRefresh(false) }}
              className="min-h-11 px-4 text-xs font-semibold text-ink-secondary hover:text-ink"
            >
              {es ? 'Ahora no' : 'Not now'}
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}

