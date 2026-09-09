export type Difficulty = 1 | 2 | 3 | 4 | 5;

export type QuestionType = "multiple_choice" | "true_false" | "fill_blank" | "code_diagnosis";

export type AttemptOutcome = "first_try_correct" | "later_correct" | "review_correct" | "wrong";

export type CorrectOutcome = Exclude<AttemptOutcome, "wrong">;

export type SessionMode = "lesson" | "review" | "practice";

/** What the client submits. Option keys are stable strings ('a'..'d', 'true'/'false'), never row ids. */
export type SubmittedAnswer = { kind: "option"; key: string } | { kind: "text"; text: string };

export interface GradableOption {
  key: string;
  isCorrect: boolean;
}

/** The subset of a question the grader needs. */
export interface GradableQuestion {
  questionType: QuestionType;
  options: GradableOption[];
  correctAnswer: string | null;
  acceptedAnswers: string[];
  caseSensitive: boolean;
}

export interface GradeResult {
  correct: boolean;
  correctOptionKey?: string;
  correctAnswerText?: string;
}

/** Per user × question spaced-repetition state (the SM-2 "card"). */
export interface CardState {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  dueAt: Date;
  lastReviewedAt: Date | null;
  totalAttempts: number;
  correctAttempts: number;
  everCorrect: boolean;
}

export interface XpBreakdown {
  amount: number;
  base: number;
  outcomeMultiplier: number;
  comboMultiplier: number;
}

export interface LevelProgress {
  level: number;
  /** XP accumulated since reaching `level`. */
  xpIntoLevel: number;
  /** XP needed to go from `level` to `level + 1`. */
  xpForLevel: number;
  /** XP still missing to reach `level + 1`. */
  xpToNext: number;
  /** xpIntoLevel / xpForLevel, in [0, 1). */
  fraction: number;
}
