import { pgTable, uuid, text, varchar } from 'drizzle-orm/pg-core';
import { Years } from './year.model';

// A table named 'modules' that contains modules for courses
export const Modules = pgTable('modules', {
  id: uuid('id').primaryKey(),
  year_id: uuid('year_id').references(() => Years.id), 
  vimeo_module_id: varchar('vimeo_module_id').unique().notNull(),
  title: varchar('title', { length: 255 }).notNull(),  // Title of the module
  description: text('description'), // Optional description
});

// Module type
export type Module = {
  id: string;
  year_id: string | null;
  vimeo_module_id: string;
  title: string;
  description?: string | null;
}
