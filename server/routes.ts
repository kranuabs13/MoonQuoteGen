import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertQuoteSchema, insertBomItemSchema, insertCostItemSchema } from "@shared/schema";
import { z } from "zod";
import htmlToPdf from 'html-pdf-node';

// Schema for saving quotes with BOM and cost items
const saveQuoteSchema = z.object({
  quote: insertQuoteSchema,
  bomItems: z.array(insertBomItemSchema),
  costItems: z.array(insertCostItemSchema),
});

export async function registerRoutes(app: Express): Promise<Server> {
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

  // PDF Generation route - renders exact HTML like preview
  app.post("/api/generate-pdf", async (req, res) => {
    try {
      const { htmlContent, filename } = req.body;
      
      if (!htmlContent || !filename) {
        return res.status(400).json({ error: 'HTML content and filename are required' });
      }
      
      console.log('Generating PDF with html-pdf-node for:', filename);
      
      // Configure html-pdf-node options for exact preview matching
      const options = {
        format: 'A4',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-default-apps',
          '--disable-translate',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI,VizDisplayCompositor',
          '--run-all-compositor-stages-before-draw',
          '--disable-ipc-flooding-protection',
        ],
        width: '210mm',
        height: '297mm',
        border: {
          top: '0mm',
          right: '0mm',
          bottom: '0mm',
          left: '0mm'
        },
        paginationOffset: 0,
        dpi: 150,
        type: 'pdf',
        quality: '100',
        httpHeaders: {},
        renderDelay: 1000,
      };
      
      // Add complete CSS and HTML structure for exact preview matching
      const completeHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Quote PDF</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
              color: #000;
              background: white;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            
            .preview-document {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              background: white;
              position: relative;
            }
            
            /* Page styling */
            .page-break-before {
              page-break-before: always;
            }
            
            /* Exact Tailwind CSS utilities needed for preview */
            .relative { position: relative; }
            .absolute { position: absolute; }
            .h-full { height: 100%; }
            .w-full { width: 100%; }
            .w-auto { width: auto; }
            .h-24 { height: 6rem; }
            .h-12 { height: 3rem; }
            .h-10 { height: 2.5rem; }
            .h-20 { height: 5rem; }
            .top-16 { top: 4rem; }
            .top-6 { top: 1.5rem; }
            .left-6 { left: 1.5rem; }
            .left-1\/2 { left: 50%; }
            .bottom-16 { bottom: 4rem; }
            .bottom-8 { bottom: 2rem; }
            .transform { transform: var(--tw-transform); }
            .-translate-x-1\/2 { --tw-translate-x: -50%; transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y)); }
            .flex { display: flex; }
            .flex-col { flex-direction: column; }
            .justify-center { justify-content: center; }
            .items-center { align-items: center; }
            .text-center { text-align: center; }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .px-16 { padding-left: 4rem; padding-right: 4rem; }
            .px-12 { padding-left: 3rem; padding-right: 3rem; }
            .pt-20 { padding-top: 5rem; }
            .pb-12 { padding-bottom: 3rem; }
            .p-2 { padding: 0.5rem; }
            .p-4 { padding: 1rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-6 { margin-bottom: 1.5rem; }
            .mb-8 { margin-bottom: 2rem; }
            .mb-12 { margin-bottom: 3rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mt-12 { margin-top: 3rem; }
            .text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
            .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
            .text-2xl { font-size: 1.5rem; line-height: 2rem; }
            .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
            .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
            .text-base { font-size: 1rem; line-height: 1.5rem; }
            .text-xs { font-size: 0.75rem; line-height: 1rem; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .text-black { color: #000; }
            .text-white { color: #fff; }
            .text-gray-900 { color: #111827; }
            .text-gray-800 { color: #1f2937; }
            .text-gray-500 { color: #6b7280; }
            .bg-white { background-color: #fff; }
            .leading-tight { line-height: 1.25; }
            .leading-relaxed { line-height: 1.625; }
            .space-y-4 > * + * { margin-top: 1rem; }
            .space-y-2 > * + * { margin-top: 0.5rem; }
            .list-disc { list-style-type: disc; }
            .ml-8 { margin-left: 2rem; }
            .mx-auto { margin-left: auto; margin-right: auto; }
            .max-w-4xl { max-width: 56rem; }
            .border-collapse { border-collapse: collapse; }
            .border { border-width: 1px; }
            .border-b-2 { border-bottom-width: 2px; }
            .border-r { border-right-width: 1px; }
            .border-gray-300 { border-color: #d1d5db; }
            .border-gray-400 { border-color: #9ca3af; }
            .overflow-hidden { overflow: hidden; }
            
            /* Page heights */
            .h-\[297mm\] { height: 297mm; }
            
            /* Custom background for cover page */
            .cover-page-bg {
              background-size: cover;
              background-position: center;
              background-repeat: no-repeat;
            }
            
            /* Table styling */
            table {
              border-collapse: collapse;
              width: 100%;
            }
            
            th, td {
              border: 1px solid #d1d5db;
              padding: 0.5rem;
              text-align: left;
            }
            
            th {
              background-color: #4A90E2;
              color: white;
              font-weight: bold;
            }
            
            /* Print optimizations */
            @media print {
              .page-break-before {
                break-before: page;
              }
              
              * {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
        </html>
      `;
      
      const file = { content: completeHTML };
      
      // Generate PDF
      const pdfBuffer = await htmlToPdf.generatePdf(file, options);
      
      console.log('PDF generated successfully, size:', pdfBuffer.length, 'bytes');
      
      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      // Send the PDF buffer
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      res.status(500).json({ error: 'Failed to generate PDF: ' + error.message });
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
