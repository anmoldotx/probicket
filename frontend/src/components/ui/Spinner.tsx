'use client'

import { motion } from 'motion/react'

export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <motion.div
      style={{ width: size, height: size }}
      animate={{ rotate: 360 }}
      transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
      className="rounded-full border-2 border-border border-t-green"
    />
  )
}
