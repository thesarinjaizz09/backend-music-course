import { pgTable, serial, uuid, varchar, timestamp} from 'drizzle-orm/pg-core';
import { Users } from './user.model';

// Define refreshTokens table with the given properties
export const RefreshTokens = pgTable('refresh_tokens', {
  id: serial('id').primaryKey(),
  token: varchar('token', { length: 512 }).notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => Users.id),  // Foreign key reference to Users table
  expiresAt: timestamp('expires_at').notNull(),      // Expiration timestamp
  createdAt: timestamp('created_at').defaultNow(),   // Creation timestamp
});

// Type definition for refresh token
export type RefreshToken = {
  id: number;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
};
