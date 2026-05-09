'use client'

import { AnimatePresence, motion, type Variants } from 'motion/react'
import { EASE_OUT } from '@/lib/motion'

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
}

const dot: Variants = {
  hidden: { opacity: 0.2, y: 0 },
  visible: {
    opacity: [0.2, 1, 0.2] as number[],
    y: [0, -6, 0] as number[],
    transition: { duration: 0.9, repeat: Infinity, ease: 'easeInOut' },
  },
}

interface ThinkingStateProps {
  visible: boolean
}

export function ThinkingState({ visible }: ThinkingStateProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl"
          style={{ background: 'var(--color-surface)' }}
        >
          <motion.div
            variants={container}
            initial="hidden"
            animate="visible"
            className="flex gap-2"
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                variants={dot}
                className="block w-2 h-2 rounded-full bg-green"
              />
            ))}
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.25, ease: EASE_OUT }}
            className="font-body text-sm text-muted"
          >
            AI is reasoning…
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
