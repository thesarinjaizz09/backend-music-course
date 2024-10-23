import { pgTable, serial, integer, timestamp, uuid } from 'drizzle-orm/pg-core';
import { Users } from './user.model'; 

export const Transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => Users.id), // Foreign key referencing Users table
  amount: integer('amount').notNull(), 
  createdAt: timestamp('created_at').notNull().defaultNow(), // Timestamp for when the transaction occurred
});


export interface Transaction {
  id: number;
  userId: number; 
  amount: number; 
  createdAt: Date; 
}
