import "dotenv/config";
import { and, eq, notInArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../schema";
import { courses, lessons, questionOptions, questions, skills, units, users } from "../schema";
import { computingIV } from "./content/computing-iv";
import { optionKey, type CourseDef } from "./define";

/**
 * Idempotent: every row is upserted by its slug (or by (parent, slug) / (question, key)), so re-running the
 * seed after editing content updates in place. Options that disappeared from the source are removed.
 * Attempts reference option *keys*, so this never breaks a user's history.
 */
export async function seed(databaseUrl: string, devUserEmail: string) {
  const sqlClient = postgres(databaseUrl, { max: 1 });
  const db = drizzle(sqlClient, { schema });
  const counts = { courses: 0, units: 0, skills: 0, lessons: 0, questions: 0, options: 0 };

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(users)
        .values({ email: devUserEmail, name: "Dev" })
        .onConflictDoUpdate({ target: users.email, set: { name: "Dev" } });

      await seedCourse(tx, computingIV);
    });
  } finally {
    await sqlClient.end();
  }
  return counts;

  async function seedCourse(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], course: CourseDef) {
    const [courseRow] = await tx
      .insert(courses)
      .values({ slug: course.slug, title: course.title, description: course.description ?? null, sortOrder: 0 })
      .onConflictDoUpdate({
        target: courses.slug,
        set: { title: course.title, description: course.description ?? null },
      })
      .returning({ id: courses.id });
    if (!courseRow) throw new Error("course upsert returned nothing");
    counts.courses++;

    for (const [unitIndex, unit] of course.units.entries()) {
      const [unitRow] = await tx
        .insert(units)
        .values({
          courseId: courseRow.id,
          slug: unit.slug,
          title: unit.title,
          description: unit.description ?? null,
          sortOrder: unitIndex,
        })
        .onConflictDoUpdate({
          target: [units.courseId, units.slug],
          set: { title: unit.title, description: unit.description ?? null, sortOrder: unitIndex },
        })
        .returning({ id: units.id });
      if (!unitRow) throw new Error("unit upsert returned nothing");
      counts.units++;

      for (const [skillIndex, skill] of unit.skills.entries()) {
        const [skillRow] = await tx
          .insert(skills)
          .values({
            unitId: unitRow.id,
            slug: skill.slug,
            title: skill.title,
            description: skill.description ?? null,
            sortOrder: skillIndex,
          })
          .onConflictDoUpdate({
            target: [skills.unitId, skills.slug],
            set: { title: skill.title, description: skill.description ?? null, sortOrder: skillIndex },
          })
          .returning({ id: skills.id });
        if (!skillRow) throw new Error("skill upsert returned nothing");
        counts.skills++;

        for (const [lessonIndex, lesson] of (skill.lessons ?? []).entries()) {
          const [lessonRow] = await tx
            .insert(lessons)
            .values({
              skillId: skillRow.id,
              slug: lesson.slug,
              title: lesson.title,
              introMd: lesson.intro ?? null,
              sortOrder: lessonIndex,
            })
            .onConflictDoUpdate({
              target: [lessons.skillId, lessons.slug],
              set: { title: lesson.title, introMd: lesson.intro ?? null, sortOrder: lessonIndex },
            })
            .returning({ id: lessons.id });
          if (!lessonRow) throw new Error("lesson upsert returned nothing");
          counts.lessons++;

          for (const [qIndex, q] of lesson.questions.entries()) {
            const slug = `${skill.slug}.${lesson.slug}.q${String(qIndex + 1).padStart(2, "0")}`;
            const values = {
              slug,
              lessonId: lessonRow.id,
              skillId: skillRow.id,
              questionType: q.type,
              difficulty: q.difficulty,
              promptMd: q.prompt,
              codeSnippet: q.code ?? null,
              correctAnswer: q.answer ?? null,
              acceptedAnswers: q.accepted ?? [],
              caseSensitive: q.caseSensitive ?? true,
              explanationMd: q.explanation,
              source: "hand_written" as const,
              status: "approved" as const,
              sourceSection: q.sourceSection ?? lesson.sourceSection ?? null,
              sortOrder: qIndex,
            };
            const [questionRow] = await tx
              .insert(questions)
              .values(values)
              .onConflictDoUpdate({ target: questions.slug, set: { ...values, updatedAt: sql`now()` } })
              .returning({ id: questions.id });
            if (!questionRow) throw new Error("question upsert returned nothing");
            counts.questions++;

            const keys: string[] = [];
            for (const [oIndex, o] of (q.options ?? []).entries()) {
              const key = optionKey(q.type, oIndex);
              keys.push(key);
              const optionValues = {
                questionId: questionRow.id,
                key,
                labelMd: o.text,
                isCorrect: o.correct ?? false,
                feedbackMd: o.why ?? null,
                sortOrder: oIndex,
              };
              await tx
                .insert(questionOptions)
                .values(optionValues)
                .onConflictDoUpdate({ target: [questionOptions.questionId, questionOptions.key], set: optionValues });
              counts.options++;
            }
            const stale = keys.length
              ? and(eq(questionOptions.questionId, questionRow.id), notInArray(questionOptions.key, keys))
              : eq(questionOptions.questionId, questionRow.id);
            await tx.delete(questionOptions).where(stale);
          }
        }
      }
    }
  }
}

const isMain = process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js");
if (isMain) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const counts = await seed(url, process.env.DEV_USER_EMAIL ?? "dev@studyuml.local");
  console.log("seeded", counts);
}
