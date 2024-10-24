import { pgTable, uuid, text, varchar, timestamp } from 'drizzle-orm/pg-core';
;

// a table named user with the given properties
export const Users = pgTable('users', {
  id: uuid('id').primaryKey(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  createdAt: timestamp('created_at').defaultNow(),   // Creation timestamp
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()), // Last updated timestamp
});


export type User = {
  id: string;
  username: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

