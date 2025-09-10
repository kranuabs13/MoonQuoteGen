import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const quotes = pgTable("quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteSubject: text("quote_subject").notNull(),
  customerCompany: text("customer_company"),
  customerLogo: text("customer_logo"), // URL to uploaded logo
  salesPersonName: text("sales_person_name").notNull(),
  date: text("date").notNull(),
  version: text("version").default("1"),
  paymentTerms: text("payment_terms").default("Current +30"),
  bomEnabled: boolean("bom_enabled").default(true),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const bomItems = pgTable("bom_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id").notNull(),
  no: integer("no").notNull(),
  partNumber: text("part_number").notNull(),
  productDescription: text("product_description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const costItems = pgTable("cost_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id").notNull(),
  productDescription: text("product_description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  isDiscount: boolean("is_discount").default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Schemas for form validation
export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  createdAt: true,
});

export const insertBomItemSchema = createInsertSchema(bomItems).omit({
  id: true,
  quoteId: true,
});

export const insertCostItemSchema = createInsertSchema(costItems).omit({
  id: true,
  quoteId: true,
});

// Types
export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type BomItem = typeof bomItems.$inferSelect;
export type InsertBomItem = z.infer<typeof insertBomItemSchema>;
export type CostItem = typeof costItems.$inferSelect;
export type InsertCostItem = z.infer<typeof insertCostItemSchema>;

// Complete quote data type for the application
export type QuoteData = {
  quote: Quote;
  bomItems: BomItem[];
  costItems: CostItem[];
};

// Form data types for the input components
export type QuoteFormData = {
  quoteSubject: string;
  customerCompany: string;
  customerLogo?: File | string;
  salesPersonName: string;
  date: string;
  version: string;
  paymentTerms: string;
  bomEnabled: boolean;
  bomItems: Array<{
    no: number;
    partNumber: string;
    productDescription: string;
    quantity: number;
  }>;
  costItems: Array<{
    productDescription: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    isDiscount: boolean;
  }>;
};

// Legacy user types (keeping for compatibility)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;