import { pgTable, uuid, varchar, date, timestamp } from 'drizzle-orm/pg-core';
import { Users } from './user.model';

// A table named 'profiles' with the given properties
export const UserProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => Users.id,{
    onDelete: 'cascade',
  }),  // Foreign key to the User table
  firstName: varchar('first_name', { length: 50 }),  
  lastName: varchar('last_name', { length: 50 }),   
  dateOfBirth: date('date_of_birth'),
  gender: varchar('gender', { length: 15 }),
  createdAt: timestamp('created_at').defaultNow(),    
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()), 
});

// TypeScript interface for Profile
export type UserProfile = {
  id: string;
  userId: string;   
  firstName?: string;  
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  createdAt: Date;
  updatedAt: Date;
}
