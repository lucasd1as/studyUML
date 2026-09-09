"use server";

import { z } from "zod";
import { getCurrentUser } from "../current-user";
import { submitAnswer } from "../sessions";
import type { SubmitAnswerResult } from "../types";

const inputSchema = z.object({
  sessionId: z.uuid(),
  position: z.int().min(0).max(64),
  answer: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("option"), key: z.string().min(1).max(16) }),
    z.object({ kind: z.literal("text"), text: z.string().max(500) }),
  ]),
  responseMs: z.int().min(0).max(6 * 60 * 60 * 1000).optional(),
});

export async function submitAnswerAction(raw: unknown): Promise<SubmitAnswerResult> {
  const input = inputSchema.parse(raw);
  const user = await getCurrentUser();
  return submitAnswer({
    userId: user.id,
    sessionId: input.sessionId,
    position: input.position,
    answer: input.answer,
    responseMs: input.responseMs ?? null,
  });
}
