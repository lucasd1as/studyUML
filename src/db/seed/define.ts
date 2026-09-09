import type { Difficulty, QuestionType } from "@/domain/types";

/**
 * A tiny typed DSL for hand-written content. Option keys ('a'..'d') and question slugs are assigned
 * by position, so authors only write the substance. Exactly one option must be correct.
 */

export interface OptionDef {
  text: string;
  correct?: boolean;
  /** Why this distractor is tempting and wrong. Shown when it is picked. */
  why?: string;
}

export interface QuestionDef {
  type: QuestionType;
  difficulty: Difficulty;
  prompt: string;
  code?: string;
  options?: OptionDef[];
  answer?: string;
  accepted?: string[];
  caseSensitive?: boolean;
  explanation: string;
  sourceSection?: string;
}

export interface LessonDef {
  slug: string;
  title: string;
  intro?: string;
  sourceSection?: string;
  questions: QuestionDef[];
}

export interface SkillDef {
  slug: string;
  title: string;
  description?: string;
  lessons?: LessonDef[];
}

export interface UnitDef {
  slug: string;
  title: string;
  description?: string;
  skills: SkillDef[];
}

export interface CourseDef {
  slug: string;
  title: string;
  description?: string;
  units: UnitDef[];
}

function assertOneCorrect(options: OptionDef[], prompt: string) {
  const n = options.filter((o) => o.correct).length;
  if (n !== 1) throw new Error(`Question must have exactly one correct option (has ${n}): ${prompt}`);
}

export function mc(
  difficulty: Difficulty,
  prompt: string,
  options: OptionDef[],
  explanation: string,
  extra: { code?: string } = {},
): QuestionDef {
  assertOneCorrect(options, prompt);
  return { type: "multiple_choice", difficulty, prompt, options, explanation, ...extra };
}

/** "What's wrong with this code?" — graded like multiple choice, framed around a snippet. */
export function diag(
  difficulty: Difficulty,
  prompt: string,
  code: string,
  options: OptionDef[],
  explanation: string,
): QuestionDef {
  assertOneCorrect(options, prompt);
  return { type: "code_diagnosis", difficulty, prompt, code, options, explanation };
}

export function tf(
  difficulty: Difficulty,
  prompt: string,
  answer: boolean,
  explanation: string,
  extra: { code?: string; whyWrong?: string } = {},
): QuestionDef {
  return {
    type: "true_false",
    difficulty,
    prompt,
    explanation,
    ...(extra.code ? { code: extra.code } : {}),
    options: [
      { text: "True", correct: answer, ...(answer ? {} : { why: extra.whyWrong }) },
      { text: "False", correct: !answer, ...(answer ? { why: extra.whyWrong } : {}) },
    ],
  };
}

export function blank(
  difficulty: Difficulty,
  prompt: string,
  code: string,
  answer: string,
  explanation: string,
  extra: { accepted?: string[]; caseSensitive?: boolean } = {},
): QuestionDef {
  return {
    type: "fill_blank",
    difficulty,
    prompt,
    code,
    answer,
    accepted: extra.accepted ?? [],
    caseSensitive: extra.caseSensitive ?? true,
    explanation,
  };
}

/** True/false options are keyed 'true' / 'false'; everything else 'a', 'b', 'c', ... */
export function optionKey(type: QuestionType, index: number): string {
  if (type === "true_false") return index === 0 ? "true" : "false";
  return String.fromCharCode("a".charCodeAt(0) + index);
}
