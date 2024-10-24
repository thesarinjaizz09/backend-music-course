import { pgTable, uuid, text, varchar, numeric } from 'drizzle-orm/pg-core';
import { Courses } from './course.model'; 

// A table named 'modules' that contains modules for courses
export const Modules = pgTable('modules', {
  id: uuid('id').primaryKey(),
  courseId: uuid('course_id').references(() => Courses.id).notNull(),
  moduleTitle: varchar('module_title', { length: 255 }).notNull(),
  moduleContent: text('module_content').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(), // Including price with two decimal places
});

// TypeScript interface for the Modules table
export interface Module {
  id: string;
  courseId: string;
  moduleTitle: string;
  moduleContent: string;
  price: number;
}
