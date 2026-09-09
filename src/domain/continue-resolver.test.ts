import { describe, expect, it } from "vitest";
import { resolveContinue } from "./continue-resolver";
import { STALE_SESSION_MS } from "./config";

const now = new Date("2026-03-01T12:00:00Z");
const skills = [
  {
    id: "S1",
    lessons: [
      { id: "L2", sortOrder: 2, completed: false },
      { id: "L1", sortOrder: 1, completed: true },
    ],
  },
  { id: "S2", lessons: [{ id: "L3", sortOrder: 1, completed: false }] },
];

describe("resolveContinue", () => {
  it("resumes a fresh active session", () => {
    const d = resolveContinue({ activeSession: { id: "sess", lastActivityAt: new Date(now.getTime() - 1000) }, now, skills });
    expect(d).toEqual({ target: { kind: "resume", sessionId: "sess" }, abandonSessionId: null });
  });
  it("abandons a stale session and moves on", () => {
    const d = resolveContinue({
      activeSession: { id: "old", lastActivityAt: new Date(now.getTime() - STALE_SESSION_MS - 1) },
      now,
      skills,
    });
    expect(d.abandonSessionId).toBe("old");
    expect(d.target).toEqual({ kind: "lesson", skillId: "S1", lessonId: "L2" });
  });
  it("picks the next incomplete lesson by lesson order, then crosses skills", () => {
    expect(resolveContinue({ activeSession: null, now, skills }).target).toEqual({ kind: "lesson", skillId: "S1", lessonId: "L2" });
    const done = [{ ...skills[0]!, lessons: skills[0]!.lessons.map((l) => ({ ...l, completed: true })) }, skills[1]!];
    expect(resolveContinue({ activeSession: null, now, skills: done }).target).toEqual({ kind: "lesson", skillId: "S2", lessonId: "L3" });
  });
  it("reviews the last skill when everything is complete", () => {
    const all = skills.map((s) => ({ ...s, lessons: s.lessons.map((l) => ({ ...l, completed: true })) }));
    expect(resolveContinue({ activeSession: null, now, skills: all }).target).toEqual({ kind: "review", skillId: "S2" });
  });
  it("reports nothing when there is no content", () => {
    expect(resolveContinue({ activeSession: null, now, skills: [] }).target).toEqual({ kind: "nothing" });
  });
});
