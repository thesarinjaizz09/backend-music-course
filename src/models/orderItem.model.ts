import { pgTable, serial, integer, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { orders } from './order.model';

export const orderItems = pgTable('order_items', {
  orderItemId: serial('order_item_id').primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.orderId),
  itemType: varchar('item_type', { length: 20 }).notNull(),
  itemId: integer('item_id').notNull(),
});

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.orderId],
  }),
}));

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;

export const orderItemSchema = createInsertSchema(orderItems);
