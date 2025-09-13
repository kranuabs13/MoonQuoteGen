import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { storage } from "./storage";
import { insertQuoteSchema, insertBomItemSchema, insertCostItemSchema } from "@shared/schema";
import { z } from "zod";
import puppeteer from 'puppeteer';
import { generateQuoteHTML } from './html/quoteTemplate';

// Schema for saving quotes with BOM and cost items
const saveQuoteSchema = z.object({
  quote: insertQuoteSchema,
  bomItems: z.array(insertBomItemSchema),
  costItems: z.array(insertCostItemSchema),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static assets from public directory
  app.use('/assets', require('express').static(path.join(__dirname, '../public/assets')));
  
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

  // PDF Generation route using Puppeteer
  app.post("/api/generate-pdf", async (req, res) => {
    try {
      const { quoteData, filename } = req.body;
      
      if (!quoteData) {
        return res.status(400).json({ error: 'Quote data is required' });
      }
      
      const suggestedFilename = filename || `quote-${quoteData.quote?.subject || 'document'}.pdf`;
      console.log('Generating PDF with Puppeteer for:', suggestedFilename);
      
      // Generate HTML from template
      const html = generateQuoteHTML(quoteData);
      
      // Launch Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process'
        ]
      });
      
      const page = await browser.newPage();
      
      try {
        // Set content with HTML
        await page.setContent(html, { 
          waitUntil: 'networkidle0',
          timeout: 30000
        });
        
        // Wait for fonts to load
        await page.evaluate(async () => {
          if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
          }
        });
        
        // Wait a bit more to ensure everything is rendered
        await page.waitForTimeout(1000);
        
        // Generate PDF
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '12mm',
            right: '12mm', 
            bottom: '12mm',
            left: '12mm'
          },
          preferCSSPageSize: true
        });
        
        console.log('PDF generated successfully with Puppeteer, size:', pdfBuffer.length, 'bytes');
        
        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${suggestedFilename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        // Send the PDF buffer
        res.send(pdfBuffer);
        
      } finally {
        await browser.close();
      }
      
    } catch (error: unknown) {
      console.error('Error generating PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: 'Failed to generate PDF: ' + errorMessage });
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
