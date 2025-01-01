import { pgTable, uuid, varchar, date, timestamp, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './user.model';
import { createInsertSchema } from 'drizzle-zod';

export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, {
      onDelete: 'cascade',
    }),
  firstName: varchar('first_name', { length: 50 }),
  lastName: varchar('last_name', { length: 50 }),
  dateOfBirth: date('date_of_birth'),
  gender: varchar('gender', { length: 15 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.userId],
  }),
}));

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;

export const userProfileSchema = createInsertSchema(userProfiles);
