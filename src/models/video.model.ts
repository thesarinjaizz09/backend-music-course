import { pgTable, serial, varchar, text, integer, uuid } from 'drizzle-orm/pg-core';
import { Modules } from './module.model';

export const Videos = pgTable('videos', {
   id: serial('id').primaryKey(),  // Unique ID for each video in our database
   video_id: varchar('video_id', { length: 255 }).notNull().unique(),  // Vimeo video ID
   module_id: uuid('module_id').references(() => Modules.id).notNull(),  // Foreign key to modules table
   title: varchar('title', { length: 255 }).notNull(),
   description: text('description'),
   duration: integer('duration'),  // Duration in seconds
   thumbnail_url: varchar('thumbnail_url', { length: 255 }),  // URL for video thumbnail
   vimeo_url: varchar('vimeo_url', { length: 255 }).notNull(), // Embed URL for video playback
});

// Video type
export type Video = {
    id: number;
    video_id: string;
    module_id: string;
    title: string;
    description?: string;
    duration?: number;
    thumbnail_url?: string;
    vimeo_url: string;
} 