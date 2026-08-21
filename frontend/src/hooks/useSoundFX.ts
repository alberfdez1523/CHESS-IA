import { useRef, useCallback, useEffect, useMemo } from 'react'

// ─── Efectos de sonido con Web Audio API ───
export function useSoundFX(volume = 0.8, haptics = false) {
  const ctxRef = useRef<AudioContext | null>(null)
  const volumeRef = useRef(volume)
  const hapticsRef = useRef(haptics)

  useEffect(() => {
    volumeRef.current = volume
  }, [volume])

  useEffect(() => {
    hapticsRef.current = haptics
  }, [haptics])

  const vibrate = useCallback((pattern: number | number[]) => {
    if (!hapticsRef.current || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
    navigator.vibrate(pattern)
  }, [])

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext()
    }
    return ctxRef.current
  }, [])

  const playTone = useCallback(
    (freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.12) => {
      try {
        const ctx = getCtx()
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        const scaledGain = gain * volumeRef.current
        if (scaledGain <= 0.001) return
        osc.type = type
        osc.frequency.value = freq
        g.gain.setValueAtTime(scaledGain, ctx.currentTime)
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
        osc.connect(g).connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + duration)
      } catch {
        /* Silenciar errores de audio */
      }
    },
    [getCtx]
  )

  const playMove = useCallback(() => { playTone(600, 0.08, 'sine', 0.1); vibrate(12) }, [playTone, vibrate])
  const playSplit = useCallback(() => {
    playTone(520, 0.12, 'sine', 0.08)
    setTimeout(() => playTone(760, 0.16, 'sine', 0.07), 55)
    vibrate([10, 25, 10])
  }, [playTone, vibrate])
  const playMerge = useCallback(() => {
    playTone(760, 0.12, 'triangle', 0.08)
    setTimeout(() => playTone(430, 0.18, 'triangle', 0.09), 55)
    vibrate([18, 20, 24])
  }, [playTone, vibrate])
  const playMeasurement = useCallback(() => {
    playTone(880, 0.1, 'square', 0.045)
    setTimeout(() => playTone(660, 0.16, 'sine', 0.065), 90)
    vibrate([15, 30, 15, 30, 28])
  }, [playTone, vibrate])
  const playCapture = useCallback(() => { playTone(300, 0.12, 'triangle', 0.15); vibrate(32) }, [playTone, vibrate])
  const playCheck = useCallback(() => {
    playTone(800, 0.1, 'square', 0.08)
    setTimeout(() => playTone(1000, 0.15, 'square', 0.06), 100)
  }, [playTone])
  const playGameEnd = useCallback(() => {
    playTone(523, 0.2, 'sine', 0.1)
    setTimeout(() => playTone(659, 0.2, 'sine', 0.1), 150)
    setTimeout(() => playTone(784, 0.4, 'sine', 0.1), 300)
  }, [playTone])

  return useMemo(() => ({
    playMove,
    playSplit,
    playMerge,
    playMeasurement,
    playCapture,
    playCheck,
    playGameEnd,
  }), [playCapture, playCheck, playGameEnd, playMeasurement, playMerge, playMove, playSplit])
}
