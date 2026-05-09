'use client'

import { motion, useSpring, useTransform } from 'motion/react'
import { useEffect } from 'react'

interface ProgressBarProps {
  current: number
  total?: number
}

export function ProgressBar({ current, total = 12 }: ProgressBarProps) {
  const raw = useSpring(0, { stiffness: 120, damping: 20 })
  const width = useTransform(raw, (v) => `${v}%`)

  useEffect(() => {
    raw.set((current / total) * 100)
  }, [current, total, raw])

  return (
    <div className="w-full space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="font-body text-xs text-muted">Progress</span>
        <span className="font-body text-xs text-muted">{current} / {total}</span>
      </div>
      <div
        className="h-1 w-full rounded-full overflow-hidden"
        style={{ background: 'var(--color-border)' }}
      >
        <motion.div
          style={{ width, background: 'var(--color-green)' }}
          className="h-full rounded-full"
        />
      </div>
    </div>
  )
}
