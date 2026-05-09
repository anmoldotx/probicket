'use client'

import Image from 'next/image'
import { motion, type Variants } from 'motion/react'
import { useTransitionRouter } from 'next-view-transitions'
import { Button } from '@/components/ui/Button'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { DotGrid } from '@/components/ui/DotGrid'
import { useStartGame } from '@/lib/hooks/useStartGame'
import { EASE_OUT } from '@/lib/motion'

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
}

const row: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } },
}

const STEPS = [
  'Think of any IPL player — past or present',
  'Answer yes / no / maybe to 8 smart questions',
  "The AI narrows it down and makes its guess",
]

export default function LandingPage() {
  const router = useTransitionRouter()

  const { mutate: startGame, isPending } = useStartGame((data) => {
    router.push(`/game?session=${data.sessionId}`)
  })

  return (
    <>
      <DotGrid />

      <main className="relative z-10 min-h-dvh flex items-center justify-center px-6 py-12">
        {/* Header bar */}
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}
        >
          <div className="flex items-center gap-2.5">
            <Image
              src="/IPLLogo.webp"
              alt="IPL"
              width={28}
              height={28}
              className="rounded-sm object-contain"
            />
            <span className="font-display text-sm font-semibold" style={{ color: 'var(--text)' }}>
              Probicket
            </span>
          </div>
          <ThemeToggle />
        </div>

        {/* Main content */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="max-w-md w-full space-y-8 pt-10"
        >
          {/* Logo + eyebrow */}
          <motion.div variants={row} className="flex flex-col items-center gap-4">
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.1 }}
            >
              <Image
                src="/IPLLogo.webp"
                alt="IPL Logo"
                width={72}
                height={72}
                className="rounded-xl object-contain"
                style={{ border: '1px solid var(--border)' }}
              />
            </motion.div>
            <div className="flex items-center gap-3 w-full">
              <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
              <span className="font-body text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                GDG × Probicket
              </span>
              <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
            </div>
          </motion.div>

          {/* Headline */}
          <motion.div variants={row} className="space-y-3">
            <h1 className="font-display text-5xl sm:text-6xl font-bold leading-none tracking-tight"
              style={{ color: 'var(--text)' }}
            >
              Think of an<br />
              <span style={{ color: 'var(--green)' }}>IPL player.</span>
            </h1>
            <p className="font-body text-base leading-relaxed" style={{ color: 'var(--muted)' }}>
              Think of any IPL cricketer — past or present — and Probicket
              will figure out who it is in just 12 questions.
            </p>
          </motion.div>

          {/* Steps card */}
          <motion.div
            variants={row}
            className="rounded-xl p-4 space-y-3"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-display text-xs font-semibold mt-0.5"
                  style={{ background: 'var(--border)', color: 'var(--green)' }}
                >
                  {i + 1}
                </span>
                <span className="font-body text-sm leading-snug" style={{ color: 'var(--muted)' }}>
                  {step}
                </span>
              </div>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div variants={row}>
            <Button
              variant="yellow"
              size="lg"
              loading={isPending}
              onClick={() => startGame()}
              className="w-full"
            >
              {isPending ? '' : 'Start Game →'}
            </Button>
          </motion.div>

          {/* Footer */}
          <motion.p variants={row} className="font-body text-xs text-center" style={{ color: 'var(--muted)' }}>
            Powered by Gemini AI · GDG Hackathon 2025
          </motion.p>
        </motion.div>
      </main>
    </>
  )
}
