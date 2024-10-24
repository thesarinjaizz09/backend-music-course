
import { pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { Users } from './user.model'; 
import { Courses } from './course.model';
import { Modules } from './module.model';

// A table named transcations with the given properties
export const Transactions = pgTable('transactions', {
    id: uuid('id').primaryKey(), 
    userId: uuid('user_id').references(() => Users.id).notNull(),
    courseId: uuid('course_id').references(() => Courses.id).notNull(),
    moduleId: uuid('module_id').references(() => Modules.id).notNull(),
    transactionDate: timestamp('transaction_date').defaultNow().notNull(),
});

// TypeScript Interface for transaction
export interface Transaction {
  id: string;
  userId: string; 
  courseId: string; 
  moduleId: string;
  transactionDate: Date;
}
