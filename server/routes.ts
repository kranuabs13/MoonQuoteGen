import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { storage } from "./storage";
import { insertQuoteSchema, insertBomItemSchema, insertCostItemSchema } from "@shared/schema";
import { z } from "zod";
import { Document, Page, Text, View, StyleSheet, renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import * as React from "react";

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

  // PDF download endpoint
  app.post("/api/download-pdf", async (req, res) => {
    try {
      const { quoteData } = req.body;
      
      if (!quoteData) {
        return res.status(400).json({ error: 'Quote data is required' });
      }

      // Generate PDF using React PDF
      const QuotePDFDocument = generateQuotePDF(quoteData);
      const pdfBuffer = await renderToBuffer(QuotePDFDocument);
      
      // Set response headers for PDF download
      const filename = `quote-${quoteData.quote?.subject || 'untitled'}-${quoteData.date || new Date().toISOString().split('T')[0]}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      // Send PDF buffer
      res.send(pdfBuffer);
      
    } catch (error: unknown) {
      console.error('Error generating PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: 'Failed to generate PDF: ' + errorMessage });
    }
  });


  const httpServer = createServer(app);

  return httpServer;
}

// Helper function to generate React PDF document
function generateQuotePDF(quoteData: any): React.ReactElement<DocumentProps> {
  const { quote, bomItems = [], costItems = [], columnVisibility = {}, bomEnabled = true, costsEnabled = true, date, version, contact = {} } = quoteData;
  
  // Calculate grand total
  const grandTotal = costItems.reduce((sum: number, item: any) => {
    return sum + (item.isDiscount ? -item.totalPrice : item.totalPrice);
  }, 0);
  
  // Format currency function
  const formatCurrency = (amount: number) => {
    const currencyConfig = {
      USD: { code: 'USD', locale: 'en-US' },
      NIS: { code: 'ILS', locale: 'he-IL' },
      EUR: { code: 'EUR', locale: 'de-DE' }
    };
    const config = currencyConfig[quote?.currency as keyof typeof currencyConfig] || currencyConfig.USD;
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.code,
    }).format(amount);
  };
  
  // Format date function
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-GB');
  };

  // PDF Styles
  const styles = StyleSheet.create({
    page: {
      flexDirection: 'column',
      backgroundColor: 'white',
      padding: 30,
      fontFamily: 'Helvetica'
    },
    coverPage: {
      flexDirection: 'column',
      backgroundColor: '#f8f9fa',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center'
    },
    title: {
      fontSize: 32,
      marginBottom: 20,
      fontWeight: 'bold',
      color: '#333'
    },
    subtitle: {
      fontSize: 20,
      marginBottom: 15,
      color: '#555'
    },
    sectionTitle: {
      fontSize: 18,
      marginBottom: 15,
      fontWeight: 'bold',
      color: '#333'
    },
    text: {
      fontSize: 12,
      marginBottom: 10,
      lineHeight: 1.5,
      color: '#333'
    },
    list: {
      marginLeft: 20,
      marginBottom: 15
    },
    listItem: {
      fontSize: 12,
      marginBottom: 5,
      color: '#333'
    },
    table: {
      width: '100%',
      borderStyle: 'solid',
      borderWidth: 1,
      borderColor: '#ccc',
      marginBottom: 20
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#eee'
    },
    tableHeader: {
      backgroundColor: '#4A90E2',
      color: 'white',
      fontWeight: 'bold'
    },
    tableCell: {
      padding: 8,
      fontSize: 10,
      borderRightWidth: 1,
      borderRightColor: '#eee',
      flex: 1
    },
    footer: {
      position: 'absolute',
      bottom: 30,
      left: 0,
      right: 0,
      textAlign: 'center',
      fontSize: 10,
      color: '#666'
    },
    grandTotal: {
      fontSize: 16,
      fontWeight: 'bold',
      textAlign: 'right',
      marginTop: 20,
      borderTopWidth: 2,
      borderTopColor: '#333',
      paddingTop: 10
    }
  });

  return React.createElement(Document, {},
    // Page 1 - Cover Page
    React.createElement(Page, { size: 'A4', style: [styles.page, styles.coverPage] },
      React.createElement(View, { style: { alignItems: 'center', justifyContent: 'center', flex: 1 } },
        React.createElement(Text, { style: styles.title }, 'Quotation For'),
        React.createElement(Text, { style: styles.subtitle }, quote?.subject || 'Cisco Catalyst Switch'),
        React.createElement(View, { style: { marginTop: 40 } },
          React.createElement(Text, { style: styles.text }, 
            `${quote?.salesPerson || 'David Gilboa'} | ${formatDate(date)} | Ver ${version || '1'}`
          )
        )
      ),
      React.createElement(Text, { style: styles.footer }, '1')
    ),

    // Page 2 - Introduction
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(Text, { style: styles.sectionTitle }, 'Intro'),
      React.createElement(Text, { style: styles.text }, 
        'EMET Dorcom is one of the most successful and experienced companies in the field of computer infrastructure and integration with extensive knowledge, which includes all types of technologies in the IT market.'
      ),
      React.createElement(Text, { style: styles.text }, 
        'We provide comprehensive and complete solutions through the entire process and accompanies our customers in all stages, starting from the stage of needs analysis, planning the systems to the stages of assimilation, integration, and ongoing maintenance of the systems.'
      ),
      React.createElement(Text, { style: styles.text }, 
        'Dorcom\'s portfolio of solutions is extensive and enables the provision of a complete and diverse solution:'
      ),
      React.createElement(View, { style: styles.list },
        React.createElement(Text, { style: styles.listItem }, '• Server and Storage'),
        React.createElement(Text, { style: styles.listItem }, '• Backup and replication'),
        React.createElement(Text, { style: styles.listItem }, '• Mobile and Workstation computing'),
        React.createElement(Text, { style: styles.listItem }, '• Software and operating system'),
        React.createElement(Text, { style: styles.listItem }, '• Networking - Switches and Wireless'),
        React.createElement(Text, { style: styles.listItem }, '• Cybersecurity L2-L7')
      ),
      React.createElement(Text, { style: styles.text }, 
        'Throughout every technological solution supplied by Dorcom, our commitment to professionalism is unwavering. We are proud to have partnerships with several the world\'s leading IT manufacturers, including: HPE, HPI, DELL, NetApp, VERITAS, Commvault, Veeam, Nutanix, Redhat, Aruba, Juniper, Fortinet, Cloudem.'
      ),
      React.createElement(Text, { style: styles.footer }, '2')
    ),

    // Page 3 - BOM & Costs (conditionally rendered)
    ...(bomEnabled || costsEnabled ? [
      React.createElement(Page, { size: 'A4', style: styles.page },
        ...(bomEnabled ? [
          React.createElement(Text, { style: styles.sectionTitle }, 'BOM'),
          React.createElement(Text, { style: { ...styles.text, fontWeight: 'bold' } }, quote?.subject || 'Catalyst 9300 48-port PoE+'),
          ...(bomItems.length > 0 ? [
            React.createElement(View, { style: styles.table },
              React.createElement(View, { style: [styles.tableRow, styles.tableHeader] },
                ...(columnVisibility.no ? [React.createElement(Text, { style: styles.tableCell }, 'NO')] : []),
                ...(columnVisibility.partNumber ? [React.createElement(Text, { style: styles.tableCell }, 'PN')] : []),
                ...(columnVisibility.productDescription ? [React.createElement(Text, { style: styles.tableCell }, 'Product Description')] : []),
                ...(columnVisibility.qty ? [React.createElement(Text, { style: styles.tableCell }, 'QTY')] : []),
                ...(columnVisibility.unitPrice ? [React.createElement(Text, { style: styles.tableCell }, 'Unit Price')] : []),
                ...(columnVisibility.totalPrice ? [React.createElement(Text, { style: styles.tableCell }, 'Total Price')] : [])
              ),
              ...bomItems.map((item: any) => 
                React.createElement(View, { style: styles.tableRow },
                  ...(columnVisibility.no ? [React.createElement(Text, { style: styles.tableCell }, String(item.no))] : []),
                  ...(columnVisibility.partNumber ? [React.createElement(Text, { style: styles.tableCell }, item.partNumber)] : []),
                  ...(columnVisibility.productDescription ? [React.createElement(Text, { style: styles.tableCell }, item.productDescription)] : []),
                  ...(columnVisibility.qty ? [React.createElement(Text, { style: styles.tableCell }, String(item.quantity))] : []),
                  ...(columnVisibility.unitPrice ? [React.createElement(Text, { style: styles.tableCell }, item.unitPrice !== undefined && item.unitPrice !== null ? formatCurrency(item.unitPrice) : '')] : []),
                  ...(columnVisibility.totalPrice ? [React.createElement(Text, { style: styles.tableCell }, item.totalPrice !== undefined && item.totalPrice !== null ? formatCurrency(item.totalPrice) : '')] : [])
                )
              )
            )
          ] : [React.createElement(Text, { style: { ...styles.text, textAlign: 'center', fontStyle: 'italic' } }, 'No BOM items added yet')])
        ] : []),
        
        ...(costsEnabled ? [
          React.createElement(Text, { style: styles.sectionTitle }, 'Costs'),
          ...(costItems.length > 0 ? [
            React.createElement(View, { style: styles.table },
              React.createElement(View, { style: [styles.tableRow, styles.tableHeader] },
                React.createElement(Text, { style: styles.tableCell }, 'Product Description'),
                React.createElement(Text, { style: styles.tableCell }, 'QTY'),
                React.createElement(Text, { style: styles.tableCell }, 'Unit Price'),
                React.createElement(Text, { style: styles.tableCell }, 'Total Price')
              ),
              ...costItems.map((item: any) => 
                React.createElement(View, { style: styles.tableRow },
                  React.createElement(Text, { style: styles.tableCell }, item.productDescription),
                  React.createElement(Text, { style: styles.tableCell }, String(item.quantity)),
                  React.createElement(Text, { style: styles.tableCell }, formatCurrency(item.unitPrice)),
                  React.createElement(Text, { style: styles.tableCell }, 
                    `${item.isDiscount ? '-' : ''}${formatCurrency(item.totalPrice)}`
                  )
                )
              )
            ),
            React.createElement(Text, { style: styles.grandTotal }, `Grand Total: ${formatCurrency(grandTotal)}`)
          ] : [React.createElement(Text, { style: { ...styles.text, textAlign: 'center', fontStyle: 'italic' } }, 'No cost items added yet')])
        ] : []),
        React.createElement(Text, { style: styles.footer }, '3')
      )
    ] : []),

    // Page 4 - Payment Terms
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(Text, { style: styles.sectionTitle }, 'Payment & General Terms'),
      React.createElement(View, { style: styles.list },
        React.createElement(Text, { style: styles.listItem }, '1. Prices are not including VAT'),
        React.createElement(Text, { style: styles.listItem }, '2. Installation is not included unless specifically stated in the quote.'),
        React.createElement(Text, { style: styles.listItem }, '3. Payment in NIS will be at the dollar exchange rate represented on the day of the invoice issuance.'),
        React.createElement(Text, { style: styles.listItem }, '4. Our offer is valid for a period of 14 days.'),
        React.createElement(Text, { style: styles.listItem }, '5. The total price is for the purchase of the entire proposal'),
        React.createElement(Text, { style: styles.listItem }, `6. Payment Terms - ${quote?.terms || 'Current +30'}`),
        React.createElement(Text, { style: styles.listItem }, '7. Any delay in payment will result in the customer being charged an exceptional shekel-based interest or conversion to dollars according to the calculation that will produce the highest result.'),
        React.createElement(Text, { style: styles.listItem }, '8. The contents will be delivered to the customer on the condition that the exchange for it will be fully paid according to the terms of the transaction.'),
        React.createElement(Text, { style: styles.listItem }, '9. Subject to the general terms available at dorcom.co.il')
      ),
      React.createElement(View, { style: { marginTop: 40 } },
        React.createElement(Text, { style: { ...styles.text, borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 5, marginBottom: 15 } }, 'Name | ___________'),
        React.createElement(Text, { style: { ...styles.text, borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 5, marginBottom: 15 } }, 'Date | ___________'),
        React.createElement(Text, { style: { ...styles.text, borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 5, marginBottom: 15 } }, 'Company + Signature | ___________')
      ),
      React.createElement(Text, { style: styles.footer }, '4')
    ),

    // Page 5 - Contact Information
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(Text, { style: styles.sectionTitle }, 'Contact Information'),
      React.createElement(View, { style: { alignItems: 'center', marginBottom: 40 } },
        React.createElement(Text, { style: { ...styles.text, fontSize: 14, marginBottom: 8 } }, `Sales Person: ${quote?.salesPerson || 'David Gilboa'}`),
        React.createElement(Text, { style: { ...styles.text, fontSize: 14, marginBottom: 8 } }, `Email: ${contact.email || 'david@emetdorcom.com'}`),
        React.createElement(Text, { style: { ...styles.text, fontSize: 14, marginBottom: 8 } }, `Phone: ${contact.phone || '+972-50-123-4567'}`),
        React.createElement(Text, { style: { ...styles.text, fontSize: 14, marginBottom: 8 } }, 'Company: EMET Dorcom'),
        React.createElement(Text, { style: { ...styles.text, fontSize: 14, marginBottom: 8 } }, `Address: ${contact.address || 'Tel Aviv, Israel'}`)
      ),
      React.createElement(View, { style: { marginTop: 60, alignItems: 'center' } },
        React.createElement(Text, { style: { ...styles.text, fontSize: 16, fontWeight: 'bold', marginBottom: 20 } }, 'Thank you for choosing EMET Dorcom'),
        React.createElement(Text, { style: { ...styles.text, textAlign: 'center', lineHeight: 1.6 } }, 
          'We look forward to working with you and providing exceptional IT solutions that meet your business needs. Should you have any questions or require clarification on any aspect of this quotation, please don\'t hesitate to contact us.'
        )
      ),
      React.createElement(Text, { style: styles.footer }, '5')
    )
  );
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
