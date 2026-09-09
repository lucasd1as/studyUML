import type { AttemptOutcome, LevelProgress, QuestionType, SessionMode, SubmittedAnswer } from "@/domain/types";

/** A question as the client sees it: no answer key, no explanation. */
export interface ClientOption {
  key: string;
  labelMd: string;
}

export interface ClientQuestion {
  id: string;
  position: number;
  questionType: QuestionType;
  difficulty: number;
  promptMd: string;
  codeSnippet: string | null;
  codeLanguage: string;
  options: ClientOption[];
}

export interface ClientSession {
  id: string;
  mode: SessionMode;
  status: "active" | "completed" | "abandoned";
  skillTitle: string;
  lessonTitle: string | null;
  questionCount: number;
  answeredCount: number;
  correctCount: number;
  currentCombo: number;
  maxCombo: number;
  questions: ClientQuestion[];
}

export interface SubmitAnswerInput {
  sessionId: string;
  position: number;
  answer: SubmittedAnswer;
  responseMs?: number;
}

/** Everything the client needs to render feedback and animate XP / combo / level with no further request. */
export interface SubmitAnswerResult {
  correct: boolean;
  correctOptionKey?: string;
  correctAnswerText?: string;
  explanationMd: string;
  optionFeedbackMd?: string;
  outcome: AttemptOutcome;
  xp: { amount: number; base: number; outcomeMultiplier: number; comboMultiplier: number };
  combo: { before: number; after: number; multiplierAfter: number; nextMultiplier: number | null };
  level: {
    before: LevelProgress;
    after: LevelProgress;
    leveledUp: boolean;
    totalXpBefore: number;
    totalXpAfter: number;
  };
  estimate: { correctAnswersToLevelUp: number | null };
  session: { answered: number; total: number; correctCount: number; status: "active" | "completed" };
  lessonCompleted: boolean;
  skillCompleted: boolean;
}

export interface UserXpSnapshot {
  totalXp: number;
  progress: LevelProgress;
}

export type ContinuePreview =
  | { kind: "resume"; sessionId: string; answered: number; total: number; lessonTitle: string | null; skillTitle: string }
  | { kind: "lesson"; lessonTitle: string; skillTitle: string; introMd: string | null; questionCount: number; estimateDifficulties: number[] }
  | { kind: "review"; skillTitle: string; questionCount: number; estimateDifficulties: number[] }
  | { kind: "nothing" };

export interface SessionSummary {
  id: string;
  mode: SessionMode;
  status: "active" | "completed" | "abandoned";
  skillTitle: string;
  lessonTitle: string | null;
  questionCount: number;
  correctCount: number;
  maxCombo: number;
  xpEarned: number;
  totalXpBefore: number;
  totalXpAfter: number;
  progressBefore: LevelProgress;
  progressAfter: LevelProgress;
  levelsGained: number;
  lessonCompleted: boolean;
  skillCompleted: boolean;
}
