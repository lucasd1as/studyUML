import type { GradableQuestion, GradeResult, SubmittedAnswer } from "./types";

/**
 * Normalises a short code answer so spacing choices never masquerade as conceptual errors:
 * trims, collapses internal whitespace, and removes spaces adjacent to punctuation that C++ does not care about.
 * `std :: make_unique < int > ( 5 )` and `std::make_unique<int>(5)` compare equal.
 */
export function normalizeCode(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*([<>()[\]{},;:.*&=])\s*/g, "$1");
}

export function gradeAnswer(question: GradableQuestion, answer: SubmittedAnswer): GradeResult {
  if (question.questionType === "fill_blank") {
    const candidates = [question.correctAnswer, ...question.acceptedAnswers].filter(
      (c): c is string => typeof c === "string" && c.length > 0,
    );
    const correctAnswerText = candidates[0] ?? "";
    if (answer.kind !== "text") return { correct: false, correctAnswerText };
    const fold = (s: string) => (question.caseSensitive ? normalizeCode(s) : normalizeCode(s).toLowerCase());
    const given = fold(answer.text);
    const correct = given.length > 0 && candidates.some((c) => fold(c) === given);
    return { correct, correctAnswerText };
  }

  const correctOption = question.options.find((o) => o.isCorrect);
  const correctOptionKey = correctOption?.key ?? "";
  if (answer.kind !== "option" || !correctOption) return { correct: false, correctOptionKey };
  return { correct: answer.key === correctOption.key, correctOptionKey };
}
