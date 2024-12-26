import { pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core';


export const Years = pgTable('years', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
});


export type Year = {
  id: string;
  name: string;
  description?: string | null;
};
