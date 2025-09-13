import { users, quotes, bomItems, costItems, type User, type InsertUser, type Quote, type InsertQuote, type BomItem, type InsertBomItem, type CostItem, type InsertCostItem, type QuoteData, type QuoteFormData, type TemplateSettings, defaultTemplateSettings } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";


// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Quote operations with new QuoteFormData structure
  saveQuoteForm(quoteData: QuoteFormData): Promise<QuoteFormData>;
  getQuoteForm(id: string): Promise<QuoteFormData | undefined>;
  getAllQuoteForms(): Promise<QuoteFormData[]>;
  deleteQuoteForm(id: string): Promise<boolean>;
  updateQuoteForm(id: string, quoteData: QuoteFormData): Promise<QuoteFormData | undefined>;
  
  // Settings operations
  getSettings(): Promise<TemplateSettings>;
  updateSettings(settings: TemplateSettings): Promise<TemplateSettings>;
  
  // Legacy quote operations (keeping for compatibility)
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
  // Quote form operations (required by interface) - not implemented for database storage
  async saveQuoteForm(quoteData: QuoteFormData): Promise<QuoteFormData> {
    throw new Error("Database storage for QuoteFormData not implemented - use MemStorage");
  }
  
  async getQuoteForm(id: string): Promise<QuoteFormData | undefined> {
    throw new Error("Database storage for QuoteFormData not implemented - use MemStorage");
  }
  
  async getAllQuoteForms(): Promise<QuoteFormData[]> {
    throw new Error("Database storage for QuoteFormData not implemented - use MemStorage");
  }
  
  async deleteQuoteForm(id: string): Promise<boolean> {
    throw new Error("Database storage for QuoteFormData not implemented - use MemStorage");
  }
  
  async updateQuoteForm(id: string, quoteData: QuoteFormData): Promise<QuoteFormData | undefined> {
    throw new Error("Database storage for QuoteFormData not implemented - use MemStorage");
  }
  
  async getSettings(): Promise<TemplateSettings> {
    throw new Error("Database storage for settings not implemented - use MemStorage");
  }
  
  async updateSettings(settings: TemplateSettings): Promise<TemplateSettings> {
    throw new Error("Database storage for settings not implemented - use MemStorage");
  }
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
    return await db.transaction(async (tx) => {
      // Insert quote and get the created record
      const [quote] = await tx
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
        const insertedBomItems = await tx
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
        const insertedCostItems = await tx
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
    });
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
    return await db.transaction(async (tx) => {
      // Delete the quote (related records will be deleted automatically due to CASCADE)
      const result = await tx.delete(quotes).where(eq(quotes.id, id));
      return (result.rowCount || 0) > 0;
    });
  }

  async updateQuote(id: string, quoteData: {
    quote: Partial<InsertQuote>,
    bomItems: Array<Omit<InsertBomItem, 'quoteId'>>,
    costItems: Array<Omit<InsertCostItem, 'quoteId'>>
  }): Promise<QuoteData | undefined> {
    return await db.transaction(async (tx) => {
      // Update the quote
      const [updatedQuote] = await tx
        .update(quotes)
        .set(quoteData.quote)
        .where(eq(quotes.id, id))
        .returning();

      if (!updatedQuote) return undefined;

      // Delete existing BOM and cost items
      await tx.delete(bomItems).where(eq(bomItems.quoteId, id));
      await tx.delete(costItems).where(eq(costItems.quoteId, id));

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
        const insertedBomItems = await tx
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
        const insertedCostItems = await tx
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
    });
  }

}

// MemStorage implementation for quotes and settings (as per fullstack guidelines)
export class MemStorage implements IStorage {
  private quotes: Map<string, QuoteFormData> = new Map();
  private settings: TemplateSettings = defaultTemplateSettings;
  private users: Map<string, User> = new Map();

  // Quote form operations (new structure)
  async saveQuoteForm(quoteData: QuoteFormData): Promise<QuoteFormData> {
    const id = quoteData.id || this.generateId();
    const savedQuote: QuoteFormData = {
      ...quoteData,
      id,
      lastModified: new Date().toISOString()
    };
    this.quotes.set(id, savedQuote);
    return savedQuote;
  }

  async getQuoteForm(id: string): Promise<QuoteFormData | undefined> {
    return this.quotes.get(id);
  }

  async getAllQuoteForms(): Promise<QuoteFormData[]> {
    return Array.from(this.quotes.values()).sort((a, b) => {
      const aDate = new Date(a.lastModified || 0);
      const bDate = new Date(b.lastModified || 0);
      return bDate.getTime() - aDate.getTime(); // Sort by lastModified desc
    });
  }

  async deleteQuoteForm(id: string): Promise<boolean> {
    return this.quotes.delete(id);
  }

  async updateQuoteForm(id: string, quoteData: QuoteFormData): Promise<QuoteFormData | undefined> {
    if (!this.quotes.has(id)) return undefined;
    const updatedQuote: QuoteFormData = {
      ...quoteData,
      id,
      lastModified: new Date().toISOString()
    };
    this.quotes.set(id, updatedQuote);
    return updatedQuote;
  }

  // Settings operations
  async getSettings(): Promise<TemplateSettings> {
    return { ...this.settings };
  }

  async updateSettings(settings: TemplateSettings): Promise<TemplateSettings> {
    this.settings = { ...settings };
    return { ...this.settings };
  }

  // User operations (existing)
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const [_, user] of this.users) {
      if (user.username === username) return user;
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: this.generateId(),
      ...insertUser
    };
    this.users.set(user.id, user);
    return user;
  }

  // Legacy quote operations (for compatibility) - implement to avoid crashes
  async saveQuote(quoteData: {
    quote: InsertQuote,
    bomItems: Array<Omit<InsertBomItem, 'quoteId'>>,
    costItems: Array<Omit<InsertCostItem, 'quoteId'>>
  }): Promise<QuoteData> {
    // Convert legacy format to new QuoteFormData format
    const quoteFormData: QuoteFormData = {
      quoteSubject: quoteData.quote.quoteSubject,
      customerCompany: quoteData.quote.customerCompany || '',
      customerLogo: quoteData.quote.customerLogo || '',
      salesPersonName: quoteData.quote.salesPersonName,
      date: quoteData.quote.date,
      version: quoteData.quote.version || '1',
      paymentTerms: quoteData.quote.paymentTerms || 'Current +30',
      currency: 'USD',
      bomEnabled: quoteData.quote.bomEnabled ?? true,
      costsEnabled: true,
      columnVisibility: {
        no: true,
        partNumber: true,
        productDescription: true,
        qty: true,
        unitPrice: true,
        totalPrice: true,
      },
      contactInfo: {
        salesPersonName: quoteData.quote.salesPersonName,
        phone: '',
        email: '',
      },
      bomItems: quoteData.bomItems.map(item => ({
        no: item.no,
        partNumber: item.partNumber,
        productDescription: item.productDescription,
        quantity: item.quantity,
        unitPrice: typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice,
        totalPrice: typeof item.totalPrice === 'string' ? parseFloat(item.totalPrice) : item.totalPrice,
      })),
      costItems: quoteData.costItems.map(item => ({
        productDescription: item.productDescription,
        quantity: item.quantity,
        unitPrice: typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice || 0,
        totalPrice: typeof item.totalPrice === 'string' ? parseFloat(item.totalPrice) : item.totalPrice || 0,
        isDiscount: item.isDiscount ?? false,
      })),
    };

    const savedQuoteForm = await this.saveQuoteForm(quoteFormData);
    
    // Convert back to legacy format for return
    return {
      quote: {
        id: savedQuoteForm.id!,
        quoteSubject: savedQuoteForm.quoteSubject,
        customerCompany: savedQuoteForm.customerCompany,
        customerLogo: savedQuoteForm.customerLogo || null,
        salesPersonName: savedQuoteForm.salesPersonName,
        date: savedQuoteForm.date,
        version: savedQuoteForm.version,
        paymentTerms: savedQuoteForm.paymentTerms,
        bomEnabled: savedQuoteForm.bomEnabled,
        createdAt: savedQuoteForm.lastModified || new Date().toISOString(),
      },
      bomItems: (savedQuoteForm.bomItems || []).map((item, index) => ({
        id: this.generateId(),
        quoteId: savedQuoteForm.id!,
        no: item.no,
        partNumber: item.partNumber,
        productDescription: item.productDescription,
        quantity: item.quantity,
        unitPrice: item.unitPrice?.toString() || null,
        totalPrice: item.totalPrice?.toString() || null,
        sortOrder: index,
      })),
      costItems: savedQuoteForm.costItems.map((item, index) => ({
        id: this.generateId(),
        quoteId: savedQuoteForm.id!,
        productDescription: item.productDescription,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        totalPrice: item.totalPrice.toString(),
        isDiscount: item.isDiscount,
        sortOrder: index,
      })),
    };
  }

  async getQuote(id: string): Promise<QuoteData | undefined> {
    const quoteForm = await this.getQuoteForm(id);
    if (!quoteForm) return undefined;

    // Convert QuoteFormData to legacy QuoteData format
    return {
      quote: {
        id: quoteForm.id!,
        quoteSubject: quoteForm.quoteSubject,
        customerCompany: quoteForm.customerCompany,
        customerLogo: quoteForm.customerLogo || null,
        salesPersonName: quoteForm.salesPersonName,
        date: quoteForm.date,
        version: quoteForm.version,
        paymentTerms: quoteForm.paymentTerms,
        bomEnabled: quoteForm.bomEnabled,
        createdAt: quoteForm.lastModified || new Date().toISOString(),
      },
      bomItems: (quoteForm.bomItems || []).map((item, index) => ({
        id: this.generateId(),
        quoteId: quoteForm.id!,
        no: item.no,
        partNumber: item.partNumber,
        productDescription: item.productDescription,
        quantity: item.quantity,
        unitPrice: item.unitPrice?.toString() || null,
        totalPrice: item.totalPrice?.toString() || null,
        sortOrder: index,
      })),
      costItems: quoteForm.costItems.map((item, index) => ({
        id: this.generateId(),
        quoteId: quoteForm.id!,
        productDescription: item.productDescription,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        totalPrice: item.totalPrice.toString(),
        isDiscount: item.isDiscount,
        sortOrder: index,
      })),
    };
  }

  async getAllQuotes(): Promise<Quote[]> {
    const quoteForms = await this.getAllQuoteForms();
    return quoteForms.map(quoteForm => ({
      id: quoteForm.id!,
      quoteSubject: quoteForm.quoteSubject,
      customerCompany: quoteForm.customerCompany,
      customerLogo: quoteForm.customerLogo || null,
      salesPersonName: quoteForm.salesPersonName,
      date: quoteForm.date,
      version: quoteForm.version,
      paymentTerms: quoteForm.paymentTerms,
      bomEnabled: quoteForm.bomEnabled,
      createdAt: quoteForm.lastModified || new Date().toISOString(),
    }));
  }

  async deleteQuote(id: string): Promise<boolean> {
    return this.deleteQuoteForm(id);
  }

  async updateQuote(id: string, quoteData: {
    quote: Partial<InsertQuote>,
    bomItems: Array<Omit<InsertBomItem, 'quoteId'>>,
    costItems: Array<Omit<InsertCostItem, 'quoteId'>>
  }): Promise<QuoteData | undefined> {
    const existingQuoteForm = await this.getQuoteForm(id);
    if (!existingQuoteForm) return undefined;

    // Merge the updates into the existing quote form
    const updatedQuoteFormData: QuoteFormData = {
      ...existingQuoteForm,
      quoteSubject: quoteData.quote.quoteSubject ?? existingQuoteForm.quoteSubject,
      customerCompany: quoteData.quote.customerCompany ?? existingQuoteForm.customerCompany,
      customerLogo: quoteData.quote.customerLogo ?? existingQuoteForm.customerLogo,
      salesPersonName: quoteData.quote.salesPersonName ?? existingQuoteForm.salesPersonName,
      date: quoteData.quote.date ?? existingQuoteForm.date,
      version: quoteData.quote.version ?? existingQuoteForm.version,
      paymentTerms: quoteData.quote.paymentTerms ?? existingQuoteForm.paymentTerms,
      bomEnabled: quoteData.quote.bomEnabled ?? existingQuoteForm.bomEnabled,
      bomItems: quoteData.bomItems.map(item => ({
        no: item.no,
        partNumber: item.partNumber,
        productDescription: item.productDescription,
        quantity: item.quantity,
        unitPrice: typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice,
        totalPrice: typeof item.totalPrice === 'string' ? parseFloat(item.totalPrice) : item.totalPrice,
      })),
      costItems: quoteData.costItems.map(item => ({
        productDescription: item.productDescription,
        quantity: item.quantity,
        unitPrice: typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice || 0,
        totalPrice: typeof item.totalPrice === 'string' ? parseFloat(item.totalPrice) : item.totalPrice || 0,
        isDiscount: item.isDiscount ?? false,
      })),
    };

    const updatedQuoteForm = await this.updateQuoteForm(id, updatedQuoteFormData);
    if (!updatedQuoteForm) return undefined;

    // Convert back to legacy format
    return {
      quote: {
        id: updatedQuoteForm.id!,
        quoteSubject: updatedQuoteForm.quoteSubject,
        customerCompany: updatedQuoteForm.customerCompany,
        customerLogo: updatedQuoteForm.customerLogo || null,
        salesPersonName: updatedQuoteForm.salesPersonName,
        date: updatedQuoteForm.date,
        version: updatedQuoteForm.version,
        paymentTerms: updatedQuoteForm.paymentTerms,
        bomEnabled: updatedQuoteForm.bomEnabled,
        createdAt: updatedQuoteForm.lastModified || new Date().toISOString(),
      },
      bomItems: (updatedQuoteForm.bomItems || []).map((item, index) => ({
        id: this.generateId(),
        quoteId: updatedQuoteForm.id!,
        no: item.no,
        partNumber: item.partNumber,
        productDescription: item.productDescription,
        quantity: item.quantity,
        unitPrice: item.unitPrice?.toString() || null,
        totalPrice: item.totalPrice?.toString() || null,
        sortOrder: index,
      })),
      costItems: updatedQuoteForm.costItems.map((item, index) => ({
        id: this.generateId(),
        quoteId: updatedQuoteForm.id!,
        productDescription: item.productDescription,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        totalPrice: item.totalPrice.toString(),
        isDiscount: item.isDiscount,
        sortOrder: index,
      })),
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

export const storage = new MemStorage();
