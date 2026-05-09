"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { EASE_OUT } from "@/lib/motion";
import { GuessReveal } from "@/components/game/GuessReveal";
import { useGameState } from "@/lib/hooks/useGameState";
import { useFeedback } from "@/lib/hooks/useFeedback";
import { Spinner } from "@/components/ui/Spinner";

function ResultPageInner() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session") ?? "";
  const router = useRouter();

  const { data: state, isLoading } = useGameState(sessionId, true);
  const { mutate: submitFeedback, isPending: feedbackPending } =
    useFeedback(sessionId);

  if (!sessionId || (!isLoading && !state)) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-6">
        <p className="font-body text-sm text-muted text-center">
          Session not found.{" "}
          <a href="/" className="text-yellow underline">
            Play again
          </a>
        </p>
      </main>
    );
  }

  if (isLoading || !state) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <Spinner size={32} />
      </main>
    );
  }

  const isFailed = state.status === "failed";

  return (
    <main className="min-h-dvh flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
        className="max-w-md w-full space-y-8"
      >
        {/* Eyebrow */}
        <div className="flex items-center gap-3">
          <div
            className="h-px flex-1"
            style={{ background: "var(--color-border)" }}
          />
          <span className="font-body text-xs text-muted uppercase tracking-widest">
            {isFailed ? "You stumped Probicket" : "Probicket's guess"}
          </span>
          <div
            className="h-px flex-1"
            style={{ background: "var(--color-border)" }}
          />
        </div>

        {isFailed ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.35, ease: EASE_OUT }}
            className="space-y-6"
          >
            <h1 className="font-display text-4xl font-bold text-text">
              You stumped me!
            </h1>
            <p className="font-body text-sm text-muted leading-relaxed">
              I couldn&apos;t narrow it down in 8 questions. That player is a
              tough one!
            </p>
            <a
              href="/"
              className="inline-block font-body text-sm text-yellow border border-yellow rounded-lg px-6 py-3 hover:bg-yellow hover:text-bg transition-colors duration-150"
            >
              Play again →
            </a>
          </motion.div>
        ) : (
          state.guess && (
            <GuessReveal
              guess={state.guess}
              questionsAsked={state.askedQuestions.length}
              canReject={false}
              onCorrect={() => {}}
              onWrong={() => submitFeedback(undefined)}
              feedbackPending={feedbackPending}
            />
          )
        )}

        {!isFailed && state.guess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.3 }}
          >
            <button
              onClick={() => router.push("/")}
              className="font-body text-xs text-muted hover:text-text transition-colors cursor-pointer"
            >
              ← Play again
            </button>
          </motion.div>
        )}
      </motion.div>
    </main>
  );
}

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-dvh flex items-center justify-center">
          <Spinner size={32} />
        </main>
      }
    >
      <ResultPageInner />
    </Suspense>
  );
}
