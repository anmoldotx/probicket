'use client'

import { useEffect, useState, Suspense } from 'react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { EASE_OUT } from '@/lib/motion'
import { QuestionCard } from '@/components/game/QuestionCard'
import { AnswerGrid } from '@/components/game/AnswerGrid'
import { ProgressBar } from '@/components/game/ProgressBar'
import { CandidateCount } from '@/components/game/CandidateCount'
import { ThinkingState } from '@/components/game/ThinkingState'
import { GuessReveal } from '@/components/game/GuessReveal'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { DotGrid } from '@/components/ui/DotGrid'
import { useAnswerQuestion } from '@/lib/hooks/useAnswerQuestion'
import { useGameState } from '@/lib/hooks/useGameState'
import { useRejectGuess } from '@/lib/hooks/useRejectGuess'
import { useFeedback } from '@/lib/hooks/useFeedback'
import { useSound } from '@/lib/hooks/useSound'
import { useConfetti } from '@/lib/hooks/useConfetti'
import type { AnswerValue, AnswerResult, GuessResult, RejectGuessResult } from '@/types/game'

const MAX_Q = 12

type Phase =
  | 'loading'
  | 'thinking'
  | 'active'
  | 'guessed'
  | 'failed'
  | 'done'

interface ActiveState {
  question: string
  questionNumber: number
  candidateCount: number
  totalPlayers: number
}

function GamePageInner() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session') ?? ''

  const [phase, setPhase] = useState<Phase>('loading')
  const [active, setActive] = useState<ActiveState | null>(null)
  const [guess, setGuess] = useState<GuessResult | null>(null)
  const [questionsAsked, setQuestionsAsked] = useState(0)
  const [canReject, setCanReject] = useState(true)
  const [musicPlayed, setMusicPlayed] = useState(false)

  const { play: playTrumpet } = useSound('/ipl_trumpet.mp3')
  const fireConfetti = useConfetti()

  // Play music once when first question appears
  useEffect(() => {
    if (phase === 'active' && !musicPlayed) {
      setMusicPlayed(true)
      playTrumpet(2500)
    }
  }, [phase, musicPlayed, playTrumpet])

  // Play music again when guess is revealed
  useEffect(() => {
    if (phase === 'guessed') {
      playTrumpet(2500)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Session recovery on page reload
  const needsRecovery = !!sessionId && phase === 'loading'
  const { data: recovered } = useGameState(sessionId, needsRecovery)

  useEffect(() => {
    if (!recovered || phase !== 'loading') return
    if (recovered.status === 'in_progress' && recovered.currentQuestion) {
      setActive({
        question: recovered.currentQuestion,
        questionNumber: recovered.questionNumber,
        candidateCount: recovered.candidateCount,
        totalPlayers: recovered.candidateCount,
      })
      setQuestionsAsked(recovered.askedQuestions.length)
      setPhase('active')
    } else if (recovered.status === 'guessed' && recovered.guess) {
      setGuess(recovered.guess)
      setQuestionsAsked(recovered.askedQuestions.length)
      setCanReject(recovered.askedQuestions.length < MAX_Q)
      setPhase('guessed')
    } else if (recovered.status === 'failed') {
      setQuestionsAsked(recovered.askedQuestions.length)
      setPhase('failed')
    }
  }, [recovered, phase])

  const handleAnswerSuccess = (data: AnswerResult) => {
    if (data.status === 'guessed' && data.guess) {
      setGuess(data.guess)
      setQuestionsAsked(data.questionsAsked ?? 0)
      setCanReject((data.questionsAsked ?? 0) < MAX_Q)
      setPhase('guessed')
    } else if (data.status === 'failed') {
      setQuestionsAsked(data.questionsAsked ?? 0)
      setPhase('failed')
    } else if (data.question) {
      setActive((prev) => ({
        question: data.question!,
        questionNumber: data.questionNumber ?? (prev?.questionNumber ?? 0) + 1,
        candidateCount: data.candidateCount ?? prev?.candidateCount ?? 0,
        totalPlayers: prev?.totalPlayers ?? data.candidateCount ?? 0,
      }))
      setPhase('active')
    }
  }

  const handleRejectSuccess = (data: RejectGuessResult) => {
    setActive((prev) => ({
      question: data.question,
      questionNumber: data.questionNumber,
      candidateCount: data.candidateCount,
      totalPlayers: prev?.totalPlayers ?? data.candidateCount,
    }))
    setPhase('active')
  }

  const { mutate: answerQuestion, isPending: answering } = useAnswerQuestion(sessionId, handleAnswerSuccess)
  const { mutate: rejectGuess, isPending: rejecting } = useRejectGuess(sessionId, handleRejectSuccess)
  const { mutate: submitFeedback } = useFeedback(sessionId)

  const handleAnswer = (answer: AnswerValue) => {
    setPhase('thinking')
    answerQuestion(answer)
  }

  const handleCorrect = () => {
    fireConfetti()
    setPhase('done')
  }

  const handleWrong = () => {
    submitFeedback(undefined)
    if (canReject) {
      setPhase('thinking')
      rejectGuess()
    }
  }

  if (!sessionId) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-6">
        <p className="font-body text-sm" style={{ color: 'var(--muted)' }}>
          No session.{' '}
          <a href="/" style={{ color: 'var(--yellow)' }} className="underline">Start a new game</a>
        </p>
      </main>
    )
  }

  const isBlocked = phase === 'thinking' || answering || rejecting
  const questionNumber = active?.questionNumber ?? 1
  const candidateCount = active?.candidateCount ?? 0
  const totalPlayers = active?.totalPlayers ?? 0

  return (
    <>
      <DotGrid />

      <main className="relative z-10 min-h-dvh flex items-center justify-center px-6 py-10">
        {/* Header */}
        <div
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}
        >
          <div className="flex items-center gap-2.5">
            <Image src="/IPLLogo.webp" alt="IPL" width={24} height={24} className="rounded-sm object-contain" />
            <span className="font-display text-sm font-semibold" style={{ color: 'var(--text)' }}>Probicket</span>
          </div>
          <ThemeToggle />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE_OUT }}
          className="max-w-md w-full space-y-5 pt-10"
        >
          {/* Progress + stats */}
          {(phase === 'active' || phase === 'thinking' || phase === 'guessed') && (
            <>
              <ProgressBar current={questionsAsked} total={MAX_Q} />
              {totalPlayers > 0 && (
                <CandidateCount count={candidateCount} total={totalPlayers} />
              )}
            </>
          )}

          {/* Main card */}
          <div
            className="relative rounded-2xl p-6"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              minHeight: '260px',
            }}
          >
            <ThinkingState visible={isBlocked} />

            <AnimatePresence mode="wait">
              {/* Active question */}
              {!isBlocked && phase === 'active' && active && (
                <motion.div
                  key="question"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-8"
                >
                  <QuestionCard question={active.question} questionNumber={questionNumber} />
                  <AnswerGrid onAnswer={handleAnswer} disabled={isBlocked} />
                </motion.div>
              )}

              {/* Guess reveal — spotlight effect via GuessReveal */}
              {!isBlocked && phase === 'guessed' && guess && (
                <motion.div
                  key="guess"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: EASE_OUT }}
                >
                  <GuessReveal
                    guess={guess}
                    questionsAsked={questionsAsked}
                    canReject={canReject}
                    onCorrect={handleCorrect}
                    onWrong={handleWrong}
                    feedbackPending={rejecting}
                  />
                </motion.div>
              )}

              {/* Failed */}
              {phase === 'failed' && (
                <motion.div
                  key="failed"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: EASE_OUT }}
                  className="flex flex-col gap-4 py-4"
                >
                  <p className="font-body text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                    {questionsAsked} questions asked
                  </p>
                  <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--text)' }}>
                    You stumped me! 🏏
                  </h2>
                  <p className="font-body text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                    I couldn&apos;t identify the player in {MAX_Q} questions. Impressive!
                  </p>
                  <a
                    href="/"
                    className="inline-block font-body text-sm rounded-lg px-6 py-3 transition-colors duration-150"
                    style={{ color: 'var(--yellow)', border: '1px solid var(--yellow)' }}
                  >
                    Play again →
                  </a>
                </motion.div>
              )}

              {/* Done — correct guess celebration */}
              {phase === 'done' && guess && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: EASE_OUT }}
                  className="flex flex-col items-center gap-4 py-4 text-center"
                >
                  <Image src="/IPLLogo.webp" alt="IPL" width={56} height={56} className="rounded-xl object-contain" />
                  <div>
                    <p className="font-body text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--green)' }}>
                      Got it! 🎉
                    </p>
                    <h2 className="font-display text-3xl font-bold" style={{ color: 'var(--text)' }}>
                      {guess.name}
                    </h2>
                    <p className="font-body text-sm mt-1" style={{ color: 'var(--muted)' }}>
                      Identified in {questionsAsked} question{questionsAsked !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <a
                    href="/"
                    className="font-body text-sm rounded-lg px-6 py-3 transition-colors duration-150"
                    style={{ color: 'var(--green)', border: '1px solid var(--green)' }}
                  >
                    Play again →
                  </a>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Loading state */}
          {phase === 'loading' && (
            <div className="flex justify-center py-8">
              <div
                className="w-6 h-6 rounded-full border-2 animate-spin"
                style={{ borderColor: 'var(--border)', borderTopColor: 'var(--green)' }}
              />
            </div>
          )}

          <p className="font-body text-xs text-center" style={{ color: 'var(--muted)' }}>
            <a href="/" className="hover:text-text transition-colors">← Start over</a>
          </p>
        </motion.div>
      </main>
    </>
  )
}

export default function GamePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-dvh flex items-center justify-center">
          <div
            className="w-6 h-6 rounded-full border-2 animate-spin"
            style={{ borderColor: 'var(--border)', borderTopColor: 'var(--green)' }}
          />
        </main>
      }
    >
      <GamePageInner />
    </Suspense>
  )
}
