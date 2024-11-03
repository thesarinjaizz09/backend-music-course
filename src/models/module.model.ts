import { pgTable, uuid, text, varchar } from 'drizzle-orm/pg-core';


// A table named 'modules' that contains modules for courses
export const Modules = pgTable('modules', {
  id: uuid('id').primaryKey(),
  vimeo_module_id: varchar('vimeo_module_id').unique().notNull(),
  title: varchar('title', { length: 255 }).notNull(),  // Title of the module
  description: text('description'), // Optional description
});

// Module type
export type Module = {
  id: string;
  vimeo_module_id: string;
  title: string;
  description?: string;
}
