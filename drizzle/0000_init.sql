CREATE TYPE "public"."attempt_outcome" AS ENUM('first_try_correct', 'later_correct', 'review_correct', 'wrong');--> statement-breakpoint
CREATE TYPE "public"."question_source" AS ENUM('hand_written', 'generated');--> statement-breakpoint
CREATE TYPE "public"."question_status" AS ENUM('draft', 'approved', 'rejected', 'archived');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('multiple_choice', 'true_false', 'fill_blank', 'code_diagnosis');--> statement-breakpoint
CREATE TYPE "public"."session_mode" AS ENUM('lesson', 'review', 'practice');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('active', 'completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."skill_status" AS ENUM('locked', 'available', 'in_progress', 'completed', 'mastered');--> statement-breakpoint
CREATE TYPE "public"."xp_reason" AS ENUM('answer', 'lesson_complete', 'skill_complete', 'streak_bonus', 'achievement', 'boss', 'admin_adjustment');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text,
	"email_verified" timestamp with time zone,
	"image" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"skill_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"intro_md" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "lessons_skill_slug" UNIQUE("skill_id","slug")
);
--> statement-breakpoint
CREATE TABLE "question_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label_md" text NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL,
	"feedback_md" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "question_options_question_key" UNIQUE("question_id","key")
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"lesson_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"question_type" "question_type" NOT NULL,
	"difficulty" smallint NOT NULL,
	"prompt_md" text NOT NULL,
	"code_snippet" text,
	"code_language" text DEFAULT 'cpp' NOT NULL,
	"correct_answer" text,
	"accepted_answers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"case_sensitive" boolean DEFAULT true NOT NULL,
	"explanation_md" text NOT NULL,
	"source" "question_source" DEFAULT 'hand_written' NOT NULL,
	"status" "question_status" DEFAULT 'draft' NOT NULL,
	"source_section" text,
	"review_notes" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "questions_slug_unique" UNIQUE("slug"),
	CONSTRAINT "questions_difficulty_range" CHECK ("questions"."difficulty" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "skills_unit_slug" UNIQUE("unit_id","slug")
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "units_course_slug" UNIQUE("course_id","slug")
);
--> statement-breakpoint
CREATE TABLE "user_lesson_progress" (
	"user_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"questions_total" integer DEFAULT 0 NOT NULL,
	"questions_ever_correct" integer DEFAULT 0 NOT NULL,
	"first_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "user_lesson_progress_user_id_lesson_id_pk" PRIMARY KEY("user_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "user_progress" (
	"user_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"status" "skill_status" DEFAULT 'available' NOT NULL,
	"lessons_total" integer DEFAULT 0 NOT NULL,
	"lessons_completed" integer DEFAULT 0 NOT NULL,
	"mastery" real DEFAULT 0 NOT NULL,
	"first_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "user_progress_user_id_skill_id_pk" PRIMARY KEY("user_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "user_question_state" (
	"user_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"ease_factor" numeric(4, 2) DEFAULT '2.50' NOT NULL,
	"interval_days" integer DEFAULT 0 NOT NULL,
	"repetitions" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"due_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"total_attempts" integer DEFAULT 0 NOT NULL,
	"correct_attempts" integer DEFAULT 0 NOT NULL,
	"ever_correct" boolean DEFAULT false NOT NULL,
	"last_correct" boolean,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_question_state_user_id_question_id_pk" PRIMARY KEY("user_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "study_session_questions" (
	"session_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"question_id" uuid NOT NULL,
	CONSTRAINT "study_session_questions_session_id_position_pk" PRIMARY KEY("session_id","position"),
	CONSTRAINT "study_session_questions_unique_question" UNIQUE("session_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "study_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"mode" "session_mode" NOT NULL,
	"status" "session_status" DEFAULT 'active' NOT NULL,
	"skill_id" uuid NOT NULL,
	"lesson_id" uuid,
	"question_count" smallint NOT NULL,
	"answered_count" smallint DEFAULT 0 NOT NULL,
	"correct_count" smallint DEFAULT 0 NOT NULL,
	"current_combo" smallint DEFAULT 0 NOT NULL,
	"max_combo" smallint DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_question_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"submitted_answer" jsonb NOT NULL,
	"is_correct" boolean NOT NULL,
	"outcome" "attempt_outcome" NOT NULL,
	"combo_before" smallint NOT NULL,
	"combo_after" smallint NOT NULL,
	"xp_awarded" integer NOT NULL,
	"response_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_question_history_session_position" UNIQUE("session_id","position")
);
--> statement-breakpoint
CREATE TABLE "xp_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"reason" "xp_reason" NOT NULL,
	"attempt_id" uuid,
	"session_id" uuid,
	"question_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "xp_events_amount_positive" CHECK ("xp_events"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"icon" text,
	"xp_reward" integer DEFAULT 0 NOT NULL,
	"criteria" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "achievements_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"user_id" uuid NOT NULL,
	"achievement_id" uuid NOT NULL,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_achievements_user_id_achievement_id_pk" PRIMARY KEY("user_id","achievement_id")
);
--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_lesson_progress" ADD CONSTRAINT "user_lesson_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_lesson_progress" ADD CONSTRAINT "user_lesson_progress_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_question_state" ADD CONSTRAINT "user_question_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_question_state" ADD CONSTRAINT "user_question_state_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_session_questions" ADD CONSTRAINT "study_session_questions_session_id_study_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."study_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_session_questions" ADD CONSTRAINT "study_session_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_question_history" ADD CONSTRAINT "user_question_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_question_history" ADD CONSTRAINT "user_question_history_session_id_study_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."study_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_question_history" ADD CONSTRAINT "user_question_history_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_attempt_id_user_question_history_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."user_question_history"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_session_id_study_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."study_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lessons_skill_order" ON "lessons" USING btree ("skill_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "question_options_one_correct" ON "question_options" USING btree ("question_id") WHERE "question_options"."is_correct";--> statement-breakpoint
CREATE INDEX "questions_lesson_status_order" ON "questions" USING btree ("lesson_id","status","sort_order");--> statement-breakpoint
CREATE INDEX "questions_skill_status" ON "questions" USING btree ("skill_id","status");--> statement-breakpoint
CREATE INDEX "skills_unit_order" ON "skills" USING btree ("unit_id","sort_order");--> statement-breakpoint
CREATE INDEX "units_course_order" ON "units" USING btree ("course_id","sort_order");--> statement-breakpoint
CREATE INDEX "user_lesson_progress_completed" ON "user_lesson_progress" USING btree ("user_id","completed_at");--> statement-breakpoint
CREATE INDEX "user_question_state_due" ON "user_question_state" USING btree ("user_id","due_at");--> statement-breakpoint
CREATE INDEX "user_question_state_ever_correct" ON "user_question_state" USING btree ("user_id","ever_correct");--> statement-breakpoint
CREATE INDEX "study_sessions_user_status" ON "study_sessions" USING btree ("user_id","status","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "study_sessions_one_active" ON "study_sessions" USING btree ("user_id") WHERE "study_sessions"."status" = 'active';--> statement-breakpoint
CREATE INDEX "user_question_history_user_question" ON "user_question_history" USING btree ("user_id","question_id","created_at");--> statement-breakpoint
CREATE INDEX "user_question_history_user_time" ON "user_question_history" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "xp_events_user_time" ON "xp_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "xp_events_one_per_attempt" ON "xp_events" USING btree ("attempt_id") WHERE "xp_events"."attempt_id" is not null;