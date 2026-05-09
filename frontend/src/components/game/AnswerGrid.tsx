'use client'

import { motion, type Variants } from 'motion/react'
import { EASE_OUT, SPRING } from '@/lib/motion'
import type { AnswerValue } from '@/types/game'

interface AnswerGridProps {
  onAnswer: (answer: AnswerValue) => void
  disabled?: boolean
}

const ANSWERS: { value: AnswerValue; label: string; style: string }[] = [
  { value: 'yes',        label: 'Yes',        style: 'border-green text-green' },
  { value: 'no',         label: 'No',         style: 'border-yellow text-yellow' },
  { value: 'maybe',      label: 'Maybe',      style: 'border-border text-muted' },
  { value: "don't_know", label: "Don't Know", style: 'border-border text-muted' },
]

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE_OUT } },
}

export function AnswerGrid({ onAnswer, disabled = false }: AnswerGridProps) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 gap-3 w-full"
    >
      {ANSWERS.map(({ value, label, style }) => (
        <motion.button
          key={value}
          variants={item}
          whileHover={!disabled ? { scale: 1.02 } : undefined}
          whileTap={!disabled ? { scale: 0.97 } : undefined}
          transition={SPRING}
          onClick={() => !disabled && onAnswer(value)}
          disabled={disabled}
          className={[
            'h-14 rounded-xl border font-body font-medium text-base cursor-pointer',
            'transition-colors duration-150',
            'disabled:opacity-30 disabled:cursor-not-allowed',
            style,
          ].join(' ')}
        >
          {label}
        </motion.button>
      ))}
    </motion.div>
  )
}
