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
      
      // Helper functions for calculations
      const calculateSubtotal = (data: any) => {
        const bomTotal = data.bomItems?.reduce((sum: number, item: any) => 
          sum + (item.quantity || 0) * (item.unitPrice || 0), 0) || 0;
        const costTotal = data.costItems?.reduce((sum: number, item: any) => 
          sum + (item.amount || 0) * (1 - (item.discount || 0) / 100), 0) || 0;
        return bomTotal + costTotal;
      };

      const calculateTotal = (data: any) => {
        return calculateSubtotal(data);
      };

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

      // Colors for professional styling
      const primaryBlue = '#4A90E2';
      const darkGray = '#2D3748';
      const mediumGray = '#4A5568';
      const lightGray = '#E2E8F0';

      // Header section
      doc.fontSize(28).font('Helvetica-Bold').fillColor(darkGray).text('EMET DORCOM', 50, 50);
      doc.fontSize(12).font('Helvetica').fillColor(mediumGray)
         .text('Engineering Solutions & Technology', 50, 85)
         .text('Tel: +972-XXX-XXXX | Email: info@emetdorcom.com', 50, 100);
      
      // Blue header line
      doc.rect(50, 125, 495, 3).fill(primaryBlue);
      
      // Title
      doc.fontSize(20).font('Helvetica-Bold').fillColor(darkGray)
         .text('PROFESSIONAL QUOTE', 50, 145, { align: 'center', width: 495 });
      
      let yPos = 185;

      // Quote Information Section
      doc.fontSize(14).font('Helvetica-Bold').fillColor(darkGray).text('Quote Information', 50, yPos);
      yPos += 20;
      
      // Quote details in two columns
      const leftCol = 50;
      const rightCol = 300;
      doc.fontSize(10).font('Helvetica-Bold').fillColor(mediumGray);
      
      doc.text('Subject:', leftCol, yPos);
      doc.font('Helvetica').fillColor(darkGray).text(quoteData.quote?.subject || 'N/A', leftCol + 80, yPos);
      
      doc.font('Helvetica-Bold').fillColor(mediumGray).text('Customer:', rightCol, yPos);
      doc.font('Helvetica').fillColor(darkGray).text(quoteData.quote?.customer || 'N/A', rightCol + 80, yPos);
      yPos += 15;
      
      doc.font('Helvetica-Bold').fillColor(mediumGray).text('Sales Person:', leftCol, yPos);
      doc.font('Helvetica').fillColor(darkGray).text(quoteData.quote?.salesPerson || 'N/A', leftCol + 80, yPos);
      
      doc.font('Helvetica-Bold').fillColor(mediumGray).text('Payment Terms:', rightCol, yPos);
      doc.font('Helvetica').fillColor(darkGray).text(`${quoteData.quote?.terms || 'N/A'} days`, rightCol + 80, yPos);
      yPos += 15;
      
      doc.font('Helvetica-Bold').fillColor(mediumGray).text('Currency:', leftCol, yPos);
      doc.font('Helvetica').fillColor(darkGray).text(quoteData.quote?.currency || 'USD', leftCol + 80, yPos);
      yPos += 30;

      // BOM Section
      if (quoteData.bomItems && quoteData.bomItems.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').fillColor(darkGray).text('Bill of Materials', 50, yPos);
        yPos += 20;
        
        // Table headers
        const tableHeaders = ['No.', 'Part Number', 'Description', 'Qty', 'Unit Price', 'Total'];
        const colWidths = [30, 100, 200, 40, 80, 80];
        let xPos = 50;
        
        // Header background
        doc.rect(50, yPos - 5, 530, 20).fill(primaryBlue);
        
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#FFFFFF');
        tableHeaders.forEach((header, i) => {
          doc.text(header, xPos + 5, yPos, { width: colWidths[i], align: 'center' });
          xPos += colWidths[i];
        });
        yPos += 20;
        
        // Table rows
        doc.font('Helvetica').fillColor(darkGray);
        quoteData.bomItems.forEach((item: any, index: number) => {
          if (yPos > 720) { // Start new page if needed
            doc.addPage();
            yPos = 50;
          }
          
          // Alternating row colors
          if (index % 2 === 0) {
            doc.rect(50, yPos - 3, 530, 18).fill('#F7FAFC');
          }
          
          xPos = 50;
          const rowData = [
            (index + 1).toString(),
            item.partNumber || '',
            item.description || '',
            (item.quantity || 0).toString(),
            `${item.unitPrice || 0}`,
            `${(item.quantity * item.unitPrice) || 0}`
          ];
          
          rowData.forEach((data, i) => {
            const align = i >= 3 ? 'right' : 'left';
            doc.fontSize(8).fillColor(darkGray).text(data, xPos + 5, yPos, { 
              width: colWidths[i] - 10, 
              align 
            });
            xPos += colWidths[i];
          });
          yPos += 18;
        });
        yPos += 20;
      }

      // Cost Section
      if (quoteData.costItems && quoteData.costItems.length > 0) {
        if (yPos > 650) { // Start new page if needed
          doc.addPage();
          yPos = 50;
        }
        
        doc.fontSize(14).font('Helvetica-Bold').fillColor(darkGray).text('Cost Breakdown', 50, yPos);
        yPos += 20;
        
        // Table headers
        const costHeaders = ['Description', 'Amount', 'Discount %', 'Final Amount'];
        const costColWidths = [250, 100, 80, 100];
        let xPos = 50;
        
        // Header background
        doc.rect(50, yPos - 5, 530, 20).fill(primaryBlue);
        
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#FFFFFF');
        costHeaders.forEach((header, i) => {
          doc.text(header, xPos + 5, yPos, { width: costColWidths[i], align: 'center' });
          xPos += costColWidths[i];
        });
        yPos += 20;
        
        // Table rows
        doc.font('Helvetica').fillColor(darkGray);
        quoteData.costItems.forEach((item: any, index: number) => {
          if (yPos > 720) { // Start new page if needed
            doc.addPage();
            yPos = 50;
          }
          
          // Alternating row colors
          if (index % 2 === 0) {
            doc.rect(50, yPos - 3, 530, 18).fill('#F7FAFC');
          }
          
          xPos = 50;
          const finalAmount = item.amount * (1 - (item.discount || 0) / 100);
          const rowData = [
            item.description || '',
            `${item.amount || 0}`,
            `${item.discount || 0}%`,
            `${finalAmount.toFixed(2)}`
          ];
          
          rowData.forEach((data, i) => {
            const align = i >= 1 ? 'right' : 'left';
            doc.fontSize(8).fillColor(darkGray).text(data, xPos + 5, yPos, { 
              width: costColWidths[i] - 10, 
              align 
            });
            xPos += costColWidths[i];
          });
          yPos += 18;
        });
        yPos += 20;
      }

      // Totals section
      if (yPos > 700) { // Start new page if needed
        doc.addPage();
        yPos = 50;
      }
      
      const subtotal = calculateSubtotal(quoteData);
      const total = calculateTotal(quoteData);
      
      yPos += 20;
      doc.fontSize(12).font('Helvetica-Bold').fillColor(darkGray);
      
      // Right-aligned totals
      const totalX = 450;
      doc.text('Subtotal:', totalX - 80, yPos);
      doc.text(`${subtotal} ${quoteData.quote?.currency || 'USD'}`, totalX, yPos, { align: 'right', width: 80 });
      yPos += 20;
      
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('Total:', totalX - 80, yPos);
      doc.text(`${total} ${quoteData.quote?.currency || 'USD'}`, totalX, yPos, { align: 'right', width: 80 });
      
      // Footer
      doc.fontSize(8).font('Helvetica').fillColor(mediumGray)
         .text('Thank you for your business - EMET Dorcom Engineering Solutions', 50, 750, { 
           align: 'center', 
           width: 495 
         });
      
      // Finalize the PDF
      doc.end();
      
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
