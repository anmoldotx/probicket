'use client'

import { motion, useSpring, useTransform } from 'motion/react'
import { useEffect } from 'react'

interface CandidateCountProps {
  count: number
  total: number
}

export function CandidateCount({ count, total }: CandidateCountProps) {
  const spring = useSpring(total, { stiffness: 200, damping: 25 })
  const rounded = useTransform(spring, (v) => Math.round(v))

  useEffect(() => {
    spring.set(count)
  }, [count, spring])

  return (
    <div className="flex items-center gap-1.5">
      <span className="font-body text-xs text-muted">Narrowed to</span>
      <motion.span className="font-display text-sm font-semibold text-green tabular-nums">
        {rounded}
      </motion.span>
      <span className="font-body text-xs text-muted">players</span>
    </div>
  )
}
