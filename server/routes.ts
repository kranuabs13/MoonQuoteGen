import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertQuoteSchema, insertBomItemSchema, insertCostItemSchema } from "@shared/schema";
import { z } from "zod";
import PDFDocument from 'pdfkit';

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

  // PDF Generation route using PDFKit
  app.post("/api/generate-pdf", async (req, res) => {
    try {
      const { quoteData, filename } = req.body;
      
      if (!quoteData || !filename) {
        return res.status(400).json({ error: 'Quote data and filename are required' });
      }
      
      console.log('Generating PDF with PDFKit for:', filename);
      
      // Create a new PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Quote - ${quoteData.quote?.subject || 'N/A'}`,
          Author: 'EMET Dorcom',
          Subject: 'Professional Quote',
          Keywords: 'quote, invoice, bill'
        }
      });
      
      // Collect the PDF buffer
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        console.log('PDF generated successfully, size:', pdfBuffer.length, 'bytes');
        
        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        // Send the PDF buffer
        res.send(pdfBuffer);
      });
      
      // Add company header
      doc.fontSize(24).font('Helvetica-Bold').text('EMET DORCOM', 50, 50);
      doc.fontSize(12).font('Helvetica').text('Engineering Solutions & Technology', 50, 80);
      doc.fontSize(10).text('Tel: +972-XXX-XXXX | Email: info@emetdorcom.com', 50, 95);
      
      // Add horizontal line
      doc.moveTo(50, 120).lineTo(545, 120).stroke();
      
      // Quote details section
      let yPos = 140;
      doc.fontSize(16).font('Helvetica-Bold').text('Quote Details', 50, yPos);
      yPos += 25;
      
      // Two-column layout for quote details
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Quote Subject:', 50, yPos);
      doc.font('Helvetica').text(quoteData.quote?.subject || 'N/A', 150, yPos);
      
      doc.font('Helvetica-Bold').text('Customer:', 300, yPos);
      doc.font('Helvetica').text(quoteData.quote?.customer || 'N/A', 400, yPos);
      yPos += 20;
      
      doc.font('Helvetica-Bold').text('Sales Person:', 50, yPos);
      doc.font('Helvetica').text(quoteData.quote?.salesPerson || 'N/A', 150, yPos);
      
      doc.font('Helvetica-Bold').text('Terms:', 300, yPos);
      doc.font('Helvetica').text(`${quoteData.quote?.terms || 'N/A'} days`, 400, yPos);
      yPos += 40;
      
      // BOM Section
      if (quoteData.bomItems && quoteData.bomItems.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Bill of Materials', 50, yPos);
        yPos += 20;
        
        // Table headers
        const tableHeaders = ['No.', 'Part Number', 'Description', 'Qty', 'Unit Price', 'Total'];
        const colWidths = [30, 100, 200, 40, 80, 80];
        let xPos = 50;
        
        doc.fontSize(9).font('Helvetica-Bold');
        tableHeaders.forEach((header, i) => {
          doc.text(header, xPos, yPos, { width: colWidths[i], align: 'left' });
          xPos += colWidths[i];
        });
        yPos += 15;
        
        // Table rows
        doc.font('Helvetica');
        quoteData.bomItems.forEach((item: any, index: number) => {
          if (yPos > 700) { // Start new page if needed
            doc.addPage();
            yPos = 50;
          }
          
          xPos = 50;
          const rowData = [
            (index + 1).toString(),
            item.partNumber || '',
            item.description || '',
            (item.quantity || 0).toString(),
            `${item.unitPrice || 0} ${quoteData.quote?.currency || 'USD'}`,
            `${(item.quantity * item.unitPrice) || 0} ${quoteData.quote?.currency || 'USD'}`
          ];
          
          rowData.forEach((data, i) => {
            doc.text(data, xPos, yPos, { width: colWidths[i], align: i >= 3 ? 'right' : 'left' });
            xPos += colWidths[i];
          });
          yPos += 15;
        });
        yPos += 20;
      }
      
      // Cost Section
      if (quoteData.costItems && quoteData.costItems.length > 0) {
        if (yPos > 600) { // Start new page if needed
          doc.addPage();
          yPos = 50;
        }
        
        doc.fontSize(14).font('Helvetica-Bold').text('Cost Breakdown', 50, yPos);
        yPos += 20;
        
        // Table headers
        const costHeaders = ['Description', 'Amount', 'Discount %', 'Final Amount'];
        const costColWidths = [250, 100, 80, 100];
        let xPos = 50;
        
        doc.fontSize(9).font('Helvetica-Bold');
        costHeaders.forEach((header, i) => {
          doc.text(header, xPos, yPos, { width: costColWidths[i], align: 'left' });
          xPos += costColWidths[i];
        });
        yPos += 15;
        
        // Table rows
        doc.font('Helvetica');
        quoteData.costItems.forEach((item: any) => {
          if (yPos > 700) { // Start new page if needed
            doc.addPage();
            yPos = 50;
          }
          
          xPos = 50;
          const finalAmount = item.amount * (1 - (item.discount || 0) / 100);
          const rowData = [
            item.description || '',
            `${item.amount || 0} ${quoteData.quote?.currency || 'USD'}`,
            `${item.discount || 0}%`,
            `${finalAmount} ${quoteData.quote?.currency || 'USD'}`
          ];
          
          rowData.forEach((data, i) => {
            doc.text(data, xPos, yPos, { width: costColWidths[i], align: i >= 1 ? 'right' : 'left' });
            xPos += costColWidths[i];
          });
          yPos += 15;
        });
        yPos += 20;
      }
      
      // Totals section
      if (yPos > 650) { // Start new page if needed
        doc.addPage();
        yPos = 50;
      }
      
      const subtotal = calculateSubtotal(quoteData);
      const total = calculateTotal(quoteData);
      
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('Summary', 50, yPos);
      yPos += 20;
      
      doc.fontSize(10).font('Helvetica');
      doc.text('Subtotal:', 350, yPos);
      doc.text(`${subtotal} ${quoteData.quote?.currency || 'USD'}`, 450, yPos, { align: 'right' });
      yPos += 15;
      
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('Total:', 350, yPos);
      doc.text(`${total} ${quoteData.quote?.currency || 'USD'}`, 450, yPos, { align: 'right' });
      
      // Add footer
      doc.fontSize(8).font('Helvetica').text(
        'Thank you for your business - EMET Dorcom Engineering Solutions',
        50, 750,
        { align: 'center' }
      );
      
      // Finalize the PDF
      doc.end();
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      res.status(500).json({ error: 'Failed to generate PDF' });
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
