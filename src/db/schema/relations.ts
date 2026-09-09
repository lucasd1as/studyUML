import { relations } from "drizzle-orm";
import { courses, lessons, questionOptions, questions, skills, units } from "./content";
import { studySessionQuestions, studySessions, userQuestionHistory } from "./sessions";
import { users } from "./users";
import { xpEvents } from "./xp";

export const coursesRelations = relations(courses, ({ many }) => ({ units: many(units) }));

export const unitsRelations = relations(units, ({ one, many }) => ({
  course: one(courses, { fields: [units.courseId], references: [courses.id] }),
  skills: many(skills),
}));

export const skillsRelations = relations(skills, ({ one, many }) => ({
  unit: one(units, { fields: [skills.unitId], references: [units.id] }),
  lessons: many(lessons),
  questions: many(questions),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  skill: one(skills, { fields: [lessons.skillId], references: [skills.id] }),
  questions: many(questions),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  lesson: one(lessons, { fields: [questions.lessonId], references: [lessons.id] }),
  skill: one(skills, { fields: [questions.skillId], references: [skills.id] }),
  options: many(questionOptions),
}));

export const questionOptionsRelations = relations(questionOptions, ({ one }) => ({
  question: one(questions, { fields: [questionOptions.questionId], references: [questions.id] }),
}));

export const studySessionsRelations = relations(studySessions, ({ one, many }) => ({
  user: one(users, { fields: [studySessions.userId], references: [users.id] }),
  skill: one(skills, { fields: [studySessions.skillId], references: [skills.id] }),
  lesson: one(lessons, { fields: [studySessions.lessonId], references: [lessons.id] }),
  sessionQuestions: many(studySessionQuestions),
  attempts: many(userQuestionHistory),
  xpEvents: many(xpEvents),
}));

export const studySessionQuestionsRelations = relations(studySessionQuestions, ({ one }) => ({
  session: one(studySessions, { fields: [studySessionQuestions.sessionId], references: [studySessions.id] }),
  question: one(questions, { fields: [studySessionQuestions.questionId], references: [questions.id] }),
}));

export const userQuestionHistoryRelations = relations(userQuestionHistory, ({ one }) => ({
  session: one(studySessions, { fields: [userQuestionHistory.sessionId], references: [studySessions.id] }),
  question: one(questions, { fields: [userQuestionHistory.questionId], references: [questions.id] }),
}));

export const xpEventsRelations = relations(xpEvents, ({ one }) => ({
  user: one(users, { fields: [xpEvents.userId], references: [users.id] }),
  session: one(studySessions, { fields: [xpEvents.sessionId], references: [studySessions.id] }),
  attempt: one(userQuestionHistory, { fields: [xpEvents.attemptId], references: [userQuestionHistory.id] }),
}));
