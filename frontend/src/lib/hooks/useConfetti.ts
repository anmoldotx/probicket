'use client'

import { useCallback } from 'react'

// IPL green + gold palette for confetti
const COLORS = ['#00874d', '#00c86b', '#f0c200', '#ffd700', '#ffffff']

export function useConfetti() {
  return useCallback(async () => {
    const { default: confetti } = await import('canvas-confetti')

    // Centre burst
    confetti({
      particleCount: 160,
      spread: 100,
      origin: { x: 0.5, y: 0.55 },
      colors: COLORS,
      zIndex: 9999,
    })

    // Left burst with delay
    setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 70,
        origin: { x: 0, y: 0.6 },
        colors: COLORS,
        zIndex: 9999,
      })
    }, 180)

    // Right burst with delay
    setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 70,
        origin: { x: 1, y: 0.6 },
        colors: COLORS,
        zIndex: 9999,
      })
    }, 360)
  }, [])
}
