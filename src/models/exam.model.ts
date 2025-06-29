// models/exam.model.ts
import { pgTable, pgEnum, serial, integer, varchar, boolean, timestamp, text, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { courses } from './course.model';
import { users } from './user.model';
import { admins } from './admin.model';
import { mcqQuestions, mcqResponses } from './mcq.model';
import { assignmentSubmissions } from './assignment.model';
import { years } from './year.model';


export const examTypeEnum = pgEnum('exam_type', ['mcq', 'assignment']);

export const exams = pgTable('exams', {
  examId: serial('exam_id').primaryKey(),
  courseId: integer('course_id').references(() => courses.courseId).notNull(),
  yearId: integer('year_id').references(() => years.yearId).notNull(), // Direct reference to year
  weekNumber: integer('week_number').notNull(),
  type: examTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const examsRelations = relations(exams, ({ one, many }) => ({
  course: one(courses, {
    fields: [exams.courseId],
    references: [courses.courseId],
  }),
  year: one(years, {
    fields: [exams.yearId],
    references: [years.yearId],
  }),
  attempts: many(examAttempts),
  mcqQuestions: many(mcqQuestions),
  assignmentSubmissions: many(assignmentSubmissions)
}));

export const examAttempts = pgTable('exam_attempts', {
  attemptId: serial('attempt_id').primaryKey(),
  examId: integer('exam_id').references(() => exams.examId).notNull(),
  userId: integer('user_id').references(() => users.userId).notNull(),
  passed: boolean('passed').default(false),
  submittedAt: timestamp('submitted_at').defaultNow(),
  gradedAt: timestamp('graded_at'),
  gradedBy: integer('graded_by').references(() => admins.adminId)
}, (table) => ({
  uniqueUserExam: unique().on(table.examId, table.userId)
}));

export const examAttemptsRelations = relations(examAttempts, ({ one, many }) => ({
  exam: one(exams, {
    fields: [examAttempts.examId],
    references: [exams.examId],
  }),
  user: one(users, {
    fields: [examAttempts.userId],
    references: [users.userId],
  }),
  gradedByAdmin: one(admins, {
    fields: [examAttempts.gradedBy],
    references: [admins.adminId],
  }),
  mcqResponses: many(mcqResponses),
  assignmentSubmission: one(assignmentSubmissions, {
    fields: [examAttempts.attemptId],
    references: [assignmentSubmissions.attemptId],
  })
}));

export type Exam = typeof exams.$inferSelect;
export type NewExam = typeof exams.$inferInsert;
export type ExamAttempt = typeof examAttempts.$inferSelect;
export type NewExamAttempt = typeof examAttempts.$inferInsert;

export const examSchema = createInsertSchema(exams);
export const examSchemaSelect = createSelectSchema(exams);
export const examAttemptSchema = createInsertSchema(examAttempts);
export const examAttemptSchemaSelect = createSelectSchema(examAttempts);
