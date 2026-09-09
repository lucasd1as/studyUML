import { db } from "@/db";
import { LevelBar } from "@/components/LevelBar";
import { InlineMd } from "@/components/InlineMd";
import { Button } from "@/components/ui/Button";
import { correctAnswersToLevelUp } from "@/domain/levels";
import type { Difficulty } from "@/domain/types";
import { levelHint } from "@/lib/copy";
import { continueAction } from "@/server/actions/continue";
import { getCurrentUser } from "@/server/current-user";
import { getContinuePreview } from "@/server/queries/home";
import { getUserXpSnapshot } from "@/server/queries/xp";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  const [xp, preview] = await Promise.all([getUserXpSnapshot(db, user.id), getContinuePreview(user.id)]);

  const estimateDifficulties =
    preview.kind === "lesson" || preview.kind === "review" ? (preview.estimateDifficulties as Difficulty[]) : [];
  const hint = levelHint(
    xp.progress,
    correctAnswersToLevelUp({ totalXp: xp.totalXp, combo: 0, upcomingDifficulties: estimateDifficulties }),
  );

  return (
    <main className="flex flex-1 flex-col justify-center gap-8">
      <header className="flex items-center justify-between">
        <span className="text-sm font-semibold tracking-wide text-ink-200">studyUML</span>
        <span className="text-xs text-ink-400">Computing IV</span>
      </header>

      <LevelBar progress={xp.progress} totalXp={xp.totalXp} hint={hint} />

      <section className="rounded-2xl border border-ink-700 bg-ink-800/60 p-5 sm:p-6" data-testid="continue-card">
        {preview.kind === "nothing" ? (
          <p className="text-ink-200">No content is available yet. Run the seed and come back.</p>
        ) : (
          <>
            <p className="text-xs uppercase tracking-wide text-ink-400">
              {preview.kind === "resume" ? "In progress" : preview.kind === "lesson" ? "Up next" : "Keep it sharp"}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-ink-100" data-testid="continue-title">
              {preview.kind === "resume"
                ? (preview.lessonTitle ?? preview.skillTitle)
                : preview.kind === "lesson"
                  ? preview.lessonTitle
                  : `Review · ${preview.skillTitle}`}
            </h1>
            <p className="mt-1 text-sm text-ink-400">
              {preview.kind === "resume"
                ? `${preview.answered} of ${preview.total} answered · ${preview.skillTitle}`
                : preview.kind === "lesson"
                  ? `${preview.skillTitle} · ${preview.questionCount} questions`
                  : `${preview.questionCount} questions from everything you have learned`}
            </p>
            {preview.kind === "lesson" && preview.introMd ? (
              <p className="mt-4 text-[15px] leading-relaxed text-ink-200">
                <InlineMd text={preview.introMd} />
              </p>
            ) : null}
            <form action={continueAction} className="mt-6">
              <Button type="submit" className="w-full" data-testid="continue">
                {preview.kind === "resume" ? "Resume" : "Continue"}
              </Button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
