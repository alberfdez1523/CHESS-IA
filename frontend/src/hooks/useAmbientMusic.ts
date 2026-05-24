import { useRef, useState, useCallback, useEffect } from 'react'

// ─── Música ambiente (lofi) ───
export function useAmbientMusic(initialVolume = 0.3) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolumeState] = useState(initialVolume)

  const ensureAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current
    const audio = new Audio('/music/lofi.wav')
    audio.loop = true
    audio.preload = 'none'
    audio.volume = volume
    audioRef.current = audio
    return audio
  }, [volume])

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
    }
  }, [])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  const toggle = useCallback(() => {
    const audio = ensureAudio()
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      audio.play().catch(() => {})
    }
    setPlaying(!playing)
  }, [ensureAudio, playing])

  const setVolume = useCallback((v: number) => {
    setVolumeState(v)
  }, [])

  return { playing, toggle, volume, setVolume }
}
