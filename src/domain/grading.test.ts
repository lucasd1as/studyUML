import { describe, expect, it } from "vitest";
import { gradeAnswer, normalizeCode } from "./grading";
import type { GradableQuestion } from "./types";

const mc: GradableQuestion = {
  questionType: "multiple_choice",
  options: [
    { key: "a", isCorrect: false },
    { key: "b", isCorrect: true },
    { key: "c", isCorrect: false },
  ],
  correctAnswer: null,
  acceptedAnswers: [],
  caseSensitive: true,
};

const blank: GradableQuestion = {
  questionType: "fill_blank",
  options: [],
  correctAnswer: "std::make_unique<int>(5)",
  acceptedAnswers: ["make_unique<int>(5)"],
  caseSensitive: true,
};

describe("normalizeCode", () => {
  it("ignores whitespace around punctuation", () => {
    expect(normalizeCode("  std :: make_unique < int > ( 5 ) ")).toBe("std::make_unique<int>(5)");
    expect(normalizeCode("p . lock ( )")).toBe("p.lock()");
    expect(normalizeCode("unique_ptr< int[] >")).toBe("unique_ptr<int[]>");
  });
  it("keeps whitespace between identifiers", () => {
    expect(normalizeCode("const   int x")).toBe("const int x");
  });
});

describe("gradeAnswer — option questions", () => {
  it("grades by key", () => {
    expect(gradeAnswer(mc, { kind: "option", key: "b" })).toEqual({ correct: true, correctOptionKey: "b" });
    expect(gradeAnswer(mc, { kind: "option", key: "a" })).toEqual({ correct: false, correctOptionKey: "b" });
  });
  it("unknown key or wrong answer kind is simply wrong", () => {
    expect(gradeAnswer(mc, { kind: "option", key: "zzz" }).correct).toBe(false);
    expect(gradeAnswer(mc, { kind: "text", text: "b" }).correct).toBe(false);
  });
  it("true/false and code_diagnosis behave like multiple choice", () => {
    const tf: GradableQuestion = {
      ...mc,
      questionType: "true_false",
      options: [
        { key: "true", isCorrect: false },
        { key: "false", isCorrect: true },
      ],
    };
    expect(gradeAnswer(tf, { kind: "option", key: "false" }).correct).toBe(true);
    expect(gradeAnswer({ ...mc, questionType: "code_diagnosis" }, { kind: "option", key: "b" }).correct).toBe(true);
  });
});

describe("gradeAnswer — fill in the blank", () => {
  it("accepts the canonical answer and listed alternatives, whitespace-insensitively", () => {
    expect(gradeAnswer(blank, { kind: "text", text: "std::make_unique<int>(5)" }).correct).toBe(true);
    expect(gradeAnswer(blank, { kind: "text", text: " std::make_unique< int >( 5 ) " }).correct).toBe(true);
    expect(gradeAnswer(blank, { kind: "text", text: "make_unique<int>(5)" }).correct).toBe(true);
  });
  it("is case-sensitive by default (C++ is)", () => {
    expect(gradeAnswer(blank, { kind: "text", text: "std::Make_Unique<int>(5)" }).correct).toBe(false);
    expect(gradeAnswer({ ...blank, caseSensitive: false }, { kind: "text", text: "STD::MAKE_UNIQUE<INT>(5)" }).correct).toBe(true);
  });
  it("rejects empty and wrong-kind answers, and reports the canonical answer", () => {
    expect(gradeAnswer(blank, { kind: "text", text: "   " })).toEqual({ correct: false, correctAnswerText: "std::make_unique<int>(5)" });
    expect(gradeAnswer(blank, { kind: "option", key: "a" }).correct).toBe(false);
  });
});
