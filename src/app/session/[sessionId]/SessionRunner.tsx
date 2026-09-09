"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CodeBlock } from "@/components/CodeBlock";
import { ComboMeter } from "@/components/ComboMeter";
import { FeedbackPanel } from "@/components/FeedbackPanel";
import { InlineMd } from "@/components/InlineMd";
import { LevelBar } from "@/components/LevelBar";
import { ProgressPips, type PipState } from "@/components/ProgressPips";
import { FillBlank } from "@/components/question/FillBlank";
import { OptionList } from "@/components/question/OptionList";
import type { SubmittedAnswer } from "@/domain/types";
import { levelHint } from "@/lib/copy";
import { submitAnswerAction } from "@/server/actions/submit-answer";
import type { ClientSession, SubmitAnswerResult, UserXpSnapshot } from "@/server/types";

const TYPE_LABEL: Record<ClientSession["questions"][number]["questionType"], string> = {
  multiple_choice: "Pick one",
  true_false: "True or false?",
  fill_blank: "Fill in the blank",
  code_diagnosis: "What's wrong with this code?",
};

export function SessionRunner({ session, xp }: { session: ClientSession; xp: UserXpSnapshot }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(session.answeredCount);
  const [combo, setCombo] = useState(session.currentCombo);
  const [snapshot, setSnapshot] = useState(xp);
  const [hint, setHint] = useState<string | null>(null);
  const [pips, setPips] = useState<PipState[]>(() =>
    Array.from({ length: session.questionCount }, (_, i) => (i < session.answeredCount ? "correct" : i === session.answeredCount ? "current" : "pending")),
  );
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitAnswerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const startedAt = useRef(0);

  const question = session.questions[index];
  const total = session.questionCount;
  const locked = pending || result !== null;

  const submit = useCallback(
    (answer: SubmittedAnswer) => {
      if (locked || !question) return;
      setError(null);
      const responseMs = Math.max(0, Date.now() - startedAt.current);
      startTransition(async () => {
        try {
          const r = await submitAnswerAction({ sessionId: session.id, position: question.position, answer, responseMs });
          setResult(r);
          setCombo(r.combo.after);
          setSnapshot({ totalXp: r.level.totalXpAfter, progress: r.level.after });
          setHint(levelHint(r.level.after, r.estimate.correctAnswersToLevelUp));
          setPips((prev) => prev.map((p, i) => (i === index ? (r.correct ? "correct" : "wrong") : p)));
        } catch {
          setSelectedKey(null);
          setError("That answer did not save. Check your connection and try again.");
        }
      });
    },
    [locked, question, session.id, index],
  );

  const next = useCallback(() => {
    if (!result) return;
    if (result.session.status === "completed" || index + 1 >= total) {
      router.push(`/session/${session.id}/summary`);
      return;
    }
    setIndex((i) => i + 1);
    setPips((prev) => prev.map((p, i) => (i === index + 1 ? "current" : p)));
    setResult(null);
    setSelectedKey(null);
  }, [result, index, total, router, session.id]);

  useEffect(() => {
    startedAt.current = Date.now();
  }, [index]);

  useEffect(() => {
    if (!result) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [result, next]);

  if (!question) {
    router.replace(`/session/${session.id}/summary`);
    return null;
  }

  const isOptionQuestion = question.questionType !== "fill_blank";

  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="flex items-center justify-between gap-4">
        <ProgressPips index={index} total={total} states={pips} />
        <ComboMeter combo={combo} />
      </header>

      <LevelBar progress={snapshot.progress} totalXp={snapshot.totalXp} hint={hint ?? undefined} compact />

      <AnimatePresence mode="wait" initial={false}>
        <motion.section
          key={question.id}
          initial={reduce ? false : { x: 24, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={reduce ? undefined : { x: -24, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="flex flex-col gap-4 rounded-2xl border border-ink-700 bg-ink-800/60 p-4 sm:p-6"
          data-testid="question"
          data-position={question.position}
          data-question-type={question.questionType}
        >
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs uppercase tracking-wide text-ink-400">
            <span className="shrink-0 text-ink-200">{TYPE_LABEL[question.questionType]}</span>
            <span className="truncate">
              {session.lessonTitle ?? session.skillTitle} · difficulty {question.difficulty}
            </span>
          </div>
          <h1 className="text-lg font-semibold leading-snug text-ink-100 sm:text-xl">
            <InlineMd text={question.promptMd} />
          </h1>
          {question.codeSnippet ? <CodeBlock code={question.codeSnippet} language={question.codeLanguage} /> : null}

          {isOptionQuestion ? (
            <OptionList
              options={question.options}
              selectedKey={selectedKey}
              correctKey={result?.correctOptionKey ?? null}
              locked={locked}
              onSelect={(key) => {
                setSelectedKey(key);
                submit({ kind: "option", key });
              }}
            />
          ) : (
            <FillBlank locked={locked} correct={result ? result.correct : null} onSubmit={(text) => submit({ kind: "text", text })} />
          )}

          {error ? (
            <p role="alert" className="text-sm text-wrong-300">
              {error}
            </p>
          ) : null}
        </motion.section>
      </AnimatePresence>

      <AnimatePresence>
        {result ? <FeedbackPanel key={question.id} result={result} isLast={index + 1 >= total} onNext={next} /> : null}
      </AnimatePresence>
    </div>
  );
}
