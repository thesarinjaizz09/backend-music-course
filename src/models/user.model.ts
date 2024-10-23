import { pgTable, uuid, text, varchar,integer } from 'drizzle-orm/pg-core';
import { Transactions } from './transaction.model';

// a table named user with the given properties
export const Users = pgTable('users', {
  id: uuid('id').primaryKey(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
});


export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
}

