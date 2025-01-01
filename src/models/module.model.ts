import { pgTable, serial, integer, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { years } from './year.model';
import { months } from './month.model';

export const modules = pgTable('modules', {
  moduleId: serial('module_id').primaryKey(),
  yearId: integer('year_id')
    .notNull()
    .references(() => years.yearId),
  moduleName: varchar('module_name',{ length: 255 }).notNull().unique(),
});

export const modulesRelations = relations(modules, ({ one, many }) => ({
  year: one(years, {
    fields: [modules.yearId],
    references: [years.yearId],
  }),
  months: many(months),
}));

export type Module = typeof modules.$inferSelect;
export type NewModule = typeof modules.$inferInsert;

export const moduleSchema = createInsertSchema(modules);
