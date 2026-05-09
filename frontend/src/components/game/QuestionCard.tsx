'use client'

import { AnimatePresence, motion } from 'motion/react'
import { EASE_OUT } from '@/lib/motion'

interface QuestionCardProps {
  question: string
  questionNumber: number
}

export function QuestionCard({ question, questionNumber }: QuestionCardProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={questionNumber}
        initial={{ opacity: 0, x: 28, filter: 'blur(6px)' }}
        animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, x: -28, filter: 'blur(6px)' }}
        transition={{ duration: 0.28, ease: EASE_OUT }}
        className="w-full"
      >
        <p className="font-body text-xs text-muted uppercase tracking-widest mb-4">
          Question {questionNumber} of 8
        </p>
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-text leading-snug">
          {question}
        </h2>
      </motion.div>
    </AnimatePresence>
  )
}

