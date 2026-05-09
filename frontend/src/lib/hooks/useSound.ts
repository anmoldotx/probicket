'use client'

import { useRef, useCallback } from 'react'

export function useSound(src: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const play = useCallback(
    (durationMs?: number) => {
      if (typeof window === 'undefined') return
      try {
        const audio = new Audio(src)
        audio.volume = 0.65
        audioRef.current = audio
        audio.play().catch(() => {})

        if (durationMs) {
          timerRef.current = setTimeout(() => {
            audio.pause()
            audio.currentTime = 0
          }, durationMs)
        }
      } catch {
        // Autoplay blocked — silently ignore
      }
    },
    [src]
  )

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [])

  return { play, stop }
}
