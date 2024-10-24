import { pgTable, uuid, text, varchar, decimal, timestamp } from 'drizzle-orm/pg-core';

// A table named courses with the given properties
export const Courses = pgTable('courses', {
  id: uuid('id').primaryKey(), // Unique identifier for the course
  title: varchar('title', { length: 255 }).notNull(), // Course title
  description: text('description').notNull(), // Course description
  price: decimal('price', { precision: 10, scale: 2 }).notNull(), // Course price
  createdAt: timestamp('created_at').defaultNow(), // Course created
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()), // Course updated
});

export interface Course {
  id: string;
  title: string;
  description: string;
  price: number; 
  createdAt: Date;
  updatedAt: Date;
}
