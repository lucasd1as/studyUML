import { RECENTLY_REVIEWED_MS, SESSION_SIZE } from "./config";
import { shuffle } from "./random";
import type { CardState, Difficulty, SessionMode } from "./types";

export interface CandidateQuestion {
  id: string;
  lessonId: string;
  sortOrder: number;
  difficulty: Difficulty;
  /** null = this user has never attempted the question. */
  state: CardState | null;
}

export interface BuildSessionInput {
  mode: "lesson" | "review";
  /** Approved questions of the lesson being studied (empty in review mode). */
  lessonQuestions: CandidateQuestion[];
  /** Approved questions from *earlier* lessons of the same skill (or the whole skill in review mode). */
  skillQuestions: CandidateQuestion[];
  now: Date;
  rng: () => number;
  size?: number;
}

export interface BuiltSession {
  questionIds: string[];
  mode: SessionMode;
  size: number;
}

const seen = (c: CandidateQuestion) => c.state !== null && c.state.totalAttempts > 0;
const unseen = (c: CandidateQuestion) => !seen(c);
const due = (c: CandidateQuestion, now: Date) => seen(c) && (c.state as CardState).dueAt.getTime() <= now.getTime();
const reviewedAt = (c: CandidateQuestion) => c.state?.lastReviewedAt?.getTime() ?? 0;
const recentlyReviewed = (c: CandidateQuestion, now: Date) =>
  now.getTime() - reviewedAt(c) < RECENTLY_REVIEWED_MS;

/**
 * Picks the questions for one fixed-size session. Buckets are drained in order until the session is full;
 * a question appears at most once. New material comes first, review material last.
 *
 * Lesson mode:
 *   1. unseen in this lesson, author order          → learn
 *   2. seen but never correct in this lesson         → guarantees the lesson can be finished
 *   3. due in this lesson                            → spaced repetition
 *   4. due in earlier lessons of the skill
 *   5. weakest across the skill (low ease, many lapses), skipping anything reviewed minutes ago
 *   6. anything left, least recently reviewed first (shuffled among ties)
 * Review mode uses buckets 3–6 over the whole skill; when nothing is due the session is labelled "practice".
 * Never throws and never returns an empty session unless there are no candidates at all.
 */
export function buildSession(input: BuildSessionInput): BuiltSession {
  const size = input.size ?? SESSION_SIZE;
  const { now, rng } = input;
  const picked: string[] = [];
  const taken = new Set<string>();

  const take = (list: CandidateQuestion[]) => {
    for (const c of list) {
      if (picked.length >= size) return;
      if (taken.has(c.id)) continue;
      taken.add(c.id);
      picked.push(c.id);
    }
  };

  const bySort = (a: CandidateQuestion, b: CandidateQuestion) => a.sortOrder - b.sortOrder;
  const byOldestReview = (a: CandidateQuestion, b: CandidateQuestion) => reviewedAt(a) - reviewedAt(b);
  const byDue = (a: CandidateQuestion, b: CandidateQuestion) =>
    (a.state?.dueAt.getTime() ?? 0) - (b.state?.dueAt.getTime() ?? 0);
  const byWeakness = (a: CandidateQuestion, b: CandidateQuestion) => {
    const ease = (a.state?.easeFactor ?? 99) - (b.state?.easeFactor ?? 99);
    if (ease !== 0) return ease;
    return (b.state?.lapses ?? 0) - (a.state?.lapses ?? 0);
  };

  const lesson = input.lessonQuestions;
  const skill = input.skillQuestions;
  const pool = input.mode === "lesson" ? [...lesson, ...skill] : [...skill, ...lesson];

  let dueCount = 0;
  if (input.mode === "lesson") {
    take(lesson.filter(unseen).sort(bySort));
    take(lesson.filter((c) => seen(c) && !c.state?.everCorrect).sort(byOldestReview));
    take(lesson.filter((c) => due(c, now)).sort(byDue));
    take(skill.filter((c) => due(c, now)).sort(byDue));
  } else {
    const dueList = pool.filter((c) => due(c, now)).sort(byDue);
    dueCount = dueList.length;
    take(dueList);
  }
  take(pool.filter((c) => seen(c) && !recentlyReviewed(c, now)).sort(byWeakness));
  take(shuffle(pool.filter(seen), rng).sort(byOldestReview));
  take(shuffle(pool, rng));

  const mode: SessionMode = input.mode === "lesson" ? "lesson" : dueCount > 0 ? "review" : "practice";
  return { questionIds: picked, mode, size: picked.length };
}
