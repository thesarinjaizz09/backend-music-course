import { boolean, decimal, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core"
import { Users } from "./user.model"
import { Modules } from "./module.model"

export const UserModules = pgTable('user_modules', {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull().references(() => Users.id, {
        onDelete: 'cascade',
    }),
    moduleId: uuid('module_id').notNull().references(() => Modules.id, {
        onDelete: 'cascade',
    }),
    enrollmentDate: timestamp('enrollment_date').defaultNow(),
    progress: decimal('progress').default('0.0'),
    completed: boolean('completed').default(false),
})


// TypeScript interface for UserModule
export type UserModule = {
    id: string;
    userId: string;
    moduleId: string;
    enrollmentDate: Date;
    progress: string;
    completed: boolean;
  }
