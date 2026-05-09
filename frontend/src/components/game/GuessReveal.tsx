'use client'

import { motion, useSpring, useTransform, type Variants } from 'motion/react'
import { useEffect, useState } from 'react'
import { EASE_OUT } from '@/lib/motion'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { GuessResult } from '@/types/game'

interface GuessRevealProps {
  guess: GuessResult
  questionsAsked: number
  canReject: boolean
  onCorrect: () => void
  onWrong: () => void
  feedbackPending: boolean
}

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
}

const row: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } },
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const spring = useSpring(0, { stiffness: 90, damping: 18 })
  const width = useTransform(spring, (v) => `${v}%`)
  const color = confidence >= 75 ? 'var(--green)' : 'var(--yellow)'

  useEffect(() => { spring.set(confidence) }, [confidence, spring])

  return (
    <div className="space-y-1">
      <div className="flex justify-between font-body text-xs" style={{ color: 'var(--muted)' }}>
        <span>AI Confidence</span>
        <span>{confidence}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full" style={{ background: 'var(--border)' }}>
        <motion.div style={{ width, background: color }} className="h-full rounded-full" />
      </div>
    </div>
  )
}

export function GuessReveal({
  guess,
  questionsAsked,
  canReject,
  onCorrect,
  onWrong,
  feedbackPending,
}: GuessRevealProps) {
  const [answered, setAnswered] = useState(false)

  const nameBlock = (
    <motion.div variants={row}>
      <p className="font-body text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>
        My guess — after {questionsAsked} question{questionsAsked !== 1 ? 's' : ''}
      </p>
      <h1 className="font-display text-4xl sm:text-5xl font-bold leading-tight" style={{ color: 'var(--text)' }}>
        {guess.name}
      </h1>
    </motion.div>
  )

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      className="w-full space-y-6"
    >
      {nameBlock}

      <motion.div variants={row}>
        <Badge variant="yellow">{guess.team}</Badge>
      </motion.div>

      <motion.div variants={row}>
        <ConfidenceBar confidence={guess.confidence} />
      </motion.div>

      <motion.p variants={row} className="font-body text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
        {guess.reasoning}
      </motion.p>

      {!answered && (
        <motion.div variants={row} className="flex gap-3 pt-2">
          <Button
            variant="green"
            onClick={() => { setAnswered(true); onCorrect() }}
            className="flex-1"
          >
            Yes, correct!
          </Button>
          {canReject && (
            <Button
              variant="ghost"
              onClick={() => { setAnswered(true); onWrong() }}
              loading={feedbackPending}
              className="flex-1"
            >
              No, continue →
            </Button>
          )}
        </motion.div>
      )}

      {answered && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: EASE_OUT }}
          className="font-body text-sm text-center pt-2"
          style={{ color: 'var(--muted)' }}
        >
          Thanks for the feedback!
        </motion.p>
      )}
    </motion.div>
  )
}
