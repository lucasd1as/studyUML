import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url(),
  DEV_USER_EMAIL: z.email().default("dev@studyuml.local"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Validated process.env, evaluated once. Throws a readable error on first access if misconfigured. */
export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(`Invalid environment:\n${z.prettifyError(parsed.error)}`);
    }
    cached = parsed.data;
  }
  return cached;
}
