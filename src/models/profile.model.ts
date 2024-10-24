import { pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core';
import { Users } from './user.model';

// A table named 'profiles' with the given properties
export const Profiles = pgTable('profiles', {
  userId: uuid('user_id').notNull().references(() => Users.id),  // Foreign key to the User table
  firstName: varchar('first_name', { length: 50 }),  
  lastName: varchar('last_name', { length: 50 }),   
  bio: text('bio').default(''),  
  avatarUrl: text('avatar_url').default(''),  
});

// TypeScript interface for Profile
export interface Profile {
  userId: string;   
  firstName?: string;  
  lastName?: string;   
  bio?: string;   
  avatarUrl?: string;  
}
