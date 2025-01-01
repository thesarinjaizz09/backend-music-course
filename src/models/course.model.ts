import { pgTable, serial, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { years } from './year.model';

export const courses = pgTable('courses', {
  courseId: serial('course_id').primaryKey(),
  courseName: varchar('course_name', { length: 255 }).notNull().unique(),
  vimeoCourseId: varchar('vimeo_course_id', { length: 255 }).notNull().unique(),
});

export const coursesRelations = relations(courses, ({ many }) => ({
  years: many(years),
}));

export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;

export const courseSchema = createInsertSchema(courses);
