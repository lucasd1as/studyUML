import { notFound, redirect } from "next/navigation";
import { LevelBar } from "@/components/LevelBar";
import { Button } from "@/components/ui/Button";
import { levelHint } from "@/lib/copy";
import { continueAction } from "@/server/actions/continue";
import { getCurrentUser } from "@/server/current-user";
import { getSessionSummary } from "@/server/sessions";

export const dynamic = "force-dynamic";

export default async function SummaryPage({ params }: PageProps<"/session/[sessionId]/summary">) {
  const { sessionId } = await params;
  const user = await getCurrentUser();
  const summary = await getSessionSummary(sessionId, user.id);
  if (!summary) notFound();
  if (summary.status === "active") redirect(`/session/${summary.id}`);

  const title =
    summary.mode === "lesson" ? (summary.lessonTitle ?? summary.skillTitle) : `${summary.mode === "review" ? "Review" : "Practice"} · ${summary.skillTitle}`;

  return (
    <main className="flex flex-1 flex-col justify-center gap-6" data-testid="session-summary">
      <header>
        <p className="text-xs uppercase tracking-wide text-ink-400">Session complete</p>
        <h1 className="mt-1 text-2xl font-bold text-ink-100">{title}</h1>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="XP earned" value={`+${summary.xpEarned}`} testId="summary-xp" accent />
        <Stat label="Correct" value={`${summary.correctCount} / ${summary.questionCount}`} testId="summary-correct" />
        <Stat label="Best combo" value={`${summary.maxCombo}`} testId="summary-combo" />
      </div>

      {summary.levelsGained > 0 ? (
        <p className="rounded-xl bg-xp-500 px-4 py-3 text-center font-bold text-ink-950" data-testid="summary-level-up">
          Level {summary.progressAfter.level} reached
        </p>
      ) : null}
      {summary.lessonCompleted ? (
        <p className="rounded-xl border border-correct-500/50 bg-correct-500/10 px-4 py-3 text-center text-sm text-correct-300" data-testid="summary-lesson-complete">
          Lesson complete: every question answered correctly at least once.
        </p>
      ) : null}
      {summary.skillCompleted ? (
        <p className="rounded-xl border border-xp-500/50 bg-xp-500/10 px-4 py-3 text-center text-sm text-xp-300">
          {summary.skillTitle} complete. Continue keeps it sharp with spaced review.
        </p>
      ) : null}

      <LevelBar progress={summary.progressAfter} totalXp={summary.totalXpAfter} hint={levelHint(summary.progressAfter, null)} />

      <form action={continueAction}>
        <Button type="submit" className="w-full" data-testid="continue">
          Continue
        </Button>
      </form>
    </main>
  );
}

function Stat({ label, value, testId, accent = false }: { label: string; value: string; testId: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-800/60 p-3 text-center">
      <p className="text-xs uppercase tracking-wide text-ink-400">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${accent ? "text-xp-300" : "text-ink-100"}`} data-testid={testId}>
        {value}
      </p>
    </div>
  );
}
