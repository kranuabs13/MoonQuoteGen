import { users, quotes, bomItems, costItems, type User, type InsertUser, type Quote, type InsertQuote, type BomItem, type InsertBomItem, type CostItem, type InsertCostItem, type QuoteData } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Quote operations
  saveQuote(quoteData: {
    quote: InsertQuote,
    bomItems: Array<Omit<InsertBomItem, 'quoteId'>>,
    costItems: Array<Omit<InsertCostItem, 'quoteId'>>
  }): Promise<QuoteData>;
  getQuote(id: string): Promise<QuoteData | undefined>;
  getAllQuotes(): Promise<Quote[]>;
  deleteQuote(id: string): Promise<boolean>;
  updateQuote(id: string, quoteData: {
    quote: Partial<InsertQuote>,
    bomItems: Array<Omit<InsertBomItem, 'quoteId'>>,
    costItems: Array<Omit<InsertCostItem, 'quoteId'>>
  }): Promise<QuoteData | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Quote operations
  async saveQuote(quoteData: {
    quote: InsertQuote,
    bomItems: Array<Omit<InsertBomItem, 'quoteId'>>,
    costItems: Array<Omit<InsertCostItem, 'quoteId'>>
  }): Promise<QuoteData> {
    // Insert quote and get the created record
    const [quote] = await db
      .insert(quotes)
      .values(quoteData.quote)
      .returning();

    // Insert BOM items with quoteId
    const createdBomItems: BomItem[] = [];
    if (quoteData.bomItems.length > 0) {
      const bomItemsWithQuoteId = quoteData.bomItems.map((item, index) => ({
        ...item,
        quoteId: quote.id,
        sortOrder: index,
        unitPrice: item.unitPrice?.toString() || null,
        totalPrice: item.totalPrice?.toString() || null,
      }));
      const insertedBomItems = await db
        .insert(bomItems)
        .values(bomItemsWithQuoteId)
        .returning();
      createdBomItems.push(...insertedBomItems);
    }

    // Insert cost items with quoteId
    const createdCostItems: CostItem[] = [];
    if (quoteData.costItems.length > 0) {
      const costItemsWithQuoteId = quoteData.costItems.map((item, index) => ({
        ...item,
        quoteId: quote.id,
        sortOrder: index,
        unitPrice: item.unitPrice.toString(),
        totalPrice: item.totalPrice.toString(),
      }));
      const insertedCostItems = await db
        .insert(costItems)
        .values(costItemsWithQuoteId)
        .returning();
      createdCostItems.push(...insertedCostItems);
    }

    return {
      quote,
      bomItems: createdBomItems,
      costItems: createdCostItems,
    };
  }

  async getQuote(id: string): Promise<QuoteData | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
    if (!quote) return undefined;

    const quoteBomItems = await db.select().from(bomItems).where(eq(bomItems.quoteId, id));
    const quoteCostItems = await db.select().from(costItems).where(eq(costItems.quoteId, id));

    return {
      quote,
      bomItems: quoteBomItems,
      costItems: quoteCostItems,
    };
  }

  async getAllQuotes(): Promise<Quote[]> {
    return await db.select().from(quotes);
  }

  async deleteQuote(id: string): Promise<boolean> {
    // Delete related records first
    await db.delete(bomItems).where(eq(bomItems.quoteId, id));
    await db.delete(costItems).where(eq(costItems.quoteId, id));
    
    // Delete the quote
    const result = await db.delete(quotes).where(eq(quotes.id, id));
    return (result.rowCount || 0) > 0;
  }

  async updateQuote(id: string, quoteData: {
    quote: Partial<InsertQuote>,
    bomItems: Array<Omit<InsertBomItem, 'quoteId'>>,
    costItems: Array<Omit<InsertCostItem, 'quoteId'>>
  }): Promise<QuoteData | undefined> {
    // Update the quote
    const [updatedQuote] = await db
      .update(quotes)
      .set(quoteData.quote)
      .where(eq(quotes.id, id))
      .returning();

    if (!updatedQuote) return undefined;

    // Delete existing BOM and cost items
    await db.delete(bomItems).where(eq(bomItems.quoteId, id));
    await db.delete(costItems).where(eq(costItems.quoteId, id));

    // Insert new BOM items
    const createdBomItems: BomItem[] = [];
    if (quoteData.bomItems.length > 0) {
      const bomItemsWithQuoteId = quoteData.bomItems.map((item, index) => ({
        ...item,
        quoteId: id,
        sortOrder: index,
        unitPrice: item.unitPrice?.toString() || null,
        totalPrice: item.totalPrice?.toString() || null,
      }));
      const insertedBomItems = await db
        .insert(bomItems)
        .values(bomItemsWithQuoteId)
        .returning();
      createdBomItems.push(...insertedBomItems);
    }

    // Insert new cost items
    const createdCostItems: CostItem[] = [];
    if (quoteData.costItems.length > 0) {
      const costItemsWithQuoteId = quoteData.costItems.map((item, index) => ({
        ...item,
        quoteId: id,
        sortOrder: index,
        unitPrice: item.unitPrice.toString(),
        totalPrice: item.totalPrice.toString(),
      }));
      const insertedCostItems = await db
        .insert(costItems)
        .values(costItemsWithQuoteId)
        .returning();
      createdCostItems.push(...insertedCostItems);
    }

    return {
      quote: updatedQuote,
      bomItems: createdBomItems,
      costItems: createdCostItems,
    };
  }
}

export const storage = new DatabaseStorage();
