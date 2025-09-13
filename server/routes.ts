import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { storage } from "./storage";
import { insertQuoteSchema, insertBomItemSchema, insertCostItemSchema } from "@shared/schema";
import { z } from "zod";

// Schema for saving quotes with BOM and cost items
const saveQuoteSchema = z.object({
  quote: insertQuoteSchema,
  bomItems: z.array(insertBomItemSchema),
  costItems: z.array(insertCostItemSchema),
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static assets from public directory
  app.use('/assets', express.static(path.join(__dirname, '../public/assets')));
  
  // Quote routes
  
  // Save a new quote
  app.post("/api/quotes", async (req, res) => {
    try {
      console.log('=== POST /api/quotes HANDLER CALLED ===');
      console.log('POST /api/quotes - Method:', req.method);
      console.log('POST /api/quotes - URL:', req.url);
      console.log('POST /api/quotes - Request body:', JSON.stringify(req.body, null, 2));
      
      const validatedData = saveQuoteSchema.parse(req.body);
      console.log('POST /api/quotes - Validated data:', JSON.stringify(validatedData, null, 2));
      
      const savedQuote = await storage.saveQuote(validatedData);
      console.log('POST /api/quotes - Saved quote result type:', typeof savedQuote);
      console.log('POST /api/quotes - Saved quote keys:', Object.keys(savedQuote));
      console.log('POST /api/quotes - Saved quote:', JSON.stringify(savedQuote, null, 2));
      
      console.log('=== SENDING RESPONSE ===');
      res.json(savedQuote);
    } catch (error) {
      console.error('Error saving quote:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request' });
    }
  });

  // Get all quotes (list view)
  app.get("/api/quotes", async (req, res) => {
    try {
      console.log('=== GET /api/quotes HANDLER CALLED ===');
      console.log('GET /api/quotes - Method:', req.method);
      console.log('GET /api/quotes - URL:', req.url);
      
      const quotes = await storage.getAllQuotes();
      console.log('GET /api/quotes - Number of quotes:', quotes.length);
      res.json(quotes);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      res.status(500).json({ error: 'Failed to fetch quotes' });
    }
  });

  // Get a specific quote by ID
  app.get("/api/quotes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const quote = await storage.getQuote(id);
      
      if (!quote) {
        return res.status(404).json({ error: 'Quote not found' });
      }
      
      res.json(quote);
    } catch (error) {
      console.error('Error fetching quote:', error);
      res.status(500).json({ error: 'Failed to fetch quote' });
    }
  });

  // Update a quote
  app.put("/api/quotes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`PUT /api/quotes/${id} - Request body:`, JSON.stringify(req.body, null, 2));
      const validatedData = saveQuoteSchema.parse(req.body);
      console.log(`PUT /api/quotes/${id} - Validated data:`, JSON.stringify(validatedData, null, 2));
      const updatedQuote = await storage.updateQuote(id, validatedData);
      console.log(`PUT /api/quotes/${id} - Updated quote:`, JSON.stringify(updatedQuote?.quote, null, 2));
      
      if (!updatedQuote) {
        return res.status(404).json({ error: 'Quote not found' });
      }
      
      res.json(updatedQuote);
    } catch (error) {
      console.error('Error updating quote:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request' });
    }
  });

  // Delete a quote
  app.delete("/api/quotes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteQuote(id);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Quote not found' });
      }
      
      res.json({ success: true, message: 'Quote deleted successfully' });
    } catch (error) {
      console.error('Error deleting quote:', error);
      res.status(500).json({ error: 'Failed to delete quote' });
    }
  });

  // Export job creation endpoint
  app.post("/api/export/start", async (req, res) => {
    try {
      const { quoteData } = req.body;
      
      if (!quoteData) {
        return res.status(400).json({ error: 'Quote data is required' });
      }
      
      // Create export job with expiration
      const job = await storage.createExportJob(quoteData);
      
      res.json({ jobId: job.id });
    } catch (error: unknown) {
      console.error('Error creating export job:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: 'Failed to create export job: ' + errorMessage });
    }
  });

  // Get export job data endpoint
  app.get("/api/export/job/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;
      
      const job = await storage.getExportJob(jobId);
      if (!job) {
        return res.status(404).json({ error: 'Export job not found or expired' });
      }
      
      res.json({ quoteData: job.quoteData });
    } catch (error: unknown) {
      console.error('Error getting export job:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: 'Failed to get export job: ' + errorMessage });
    }
  });

  // PDF export endpoint - redirects to print page with auto-print
  app.get("/api/export/pdf/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;
      
      // Verify export job exists
      const job = await storage.getExportJob(jobId);
      if (!job) {
        return res.status(404).json({ error: 'Export job not found or expired' });
      }
      
      console.log('Redirecting to client-side print for job:', jobId);
      
      // Use relative redirect to avoid protocol/host issues in proxy environments
      const printUrl = `/print?jobId=${jobId}&auto=1`;
      
      // Redirect to print page which will auto-trigger print dialog
      res.redirect(302, printUrl);
      
    } catch (error: unknown) {
      console.error('Error redirecting to print page:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: 'Failed to initiate PDF export: ' + errorMessage });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

// Helper functions for calculations
function calculateSubtotal(quoteData: any): number {
  let subtotal = 0;
  
  if (quoteData.bomItems) {
    subtotal += quoteData.bomItems.reduce((sum: number, item: any) => 
      sum + (item.quantity * item.unitPrice || 0), 0);
  }
  
  if (quoteData.costItems) {
    subtotal += quoteData.costItems.reduce((sum: number, item: any) => 
      sum + (item.amount * (1 - (item.discount || 0) / 100) || 0), 0);
  }
  
  return subtotal;
}

function calculateTotal(quoteData: any): number {
  return calculateSubtotal(quoteData);
}
