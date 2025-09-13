import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { storage } from "./storage";
import { insertQuoteSchema, insertBomItemSchema, insertCostItemSchema } from "@shared/schema";
import { z } from "zod";
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { readFileSync } from "fs";
import { join } from "path";
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

      // Generate PDF using React PDF with file-based images (secure)
      const QuotePDFDocument = generateQuotePDF(quoteData);
      const pdfBuffer = await renderToBuffer(QuotePDFDocument);
      
      // Set response headers for PDF download with sanitized filename
      const sanitizedSubject = (quoteData.quote?.subject || 'untitled')
        .replace(/[^A-Za-z0-9 _-]+/g, '')
        .slice(0, 50)
        .trim() || 'untitled';
      const sanitizedDate = (quoteData.date || new Date().toISOString().split('T')[0])
        .replace(/[^0-9-]/g, '');
      const filename = `quote-${sanitizedSubject}-${sanitizedDate}.pdf`;
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
  
  // Load images from filesystem as buffers (secure approach)
  const assetsPath = join(process.cwd(), 'public', 'assets');
  const emetLogoBuffer = readFileSync(join(assetsPath, 'image_1757577759606.png'));
  const techDiagramBuffer = readFileSync(join(assetsPath, 'image_1757577458643.png'));
  const frameImageBuffer = readFileSync(join(assetsPath, 'image_1757577550193.png'));
  
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

  // PDF Styles - matching original design exactly
  const styles = StyleSheet.create({
    // Page 1 - Cover page with frame background
    coverPage: {
      flexDirection: 'column',
      backgroundColor: 'white',
      padding: 0,
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center'
    },
    // Regular pages
    page: {
      flexDirection: 'column',
      backgroundColor: 'white',
      padding: 0,
      position: 'relative'
    },
    // Frame background for page 1
    frameBackground: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%'
    },
    // EMET logo positioning
    emetLogoLarge: {
      position: 'absolute',
      top: 60,
      left: 250, // Center positioning manually calculated
      width: 120
    },
    emetLogoSmall: {
      position: 'absolute',
      top: 24,
      left: 24,
      width: 60
    },
    // Cover page content
    coverContent: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingLeft: 64,
      paddingRight: 64,
      textAlign: 'center',
      zIndex: 1
    },
    coverTitle: {
      fontSize: 32,
      fontWeight: 'bold',
      color: '#000',
      marginBottom: 16,
      textAlign: 'center'
    },
    coverSubtitle: {
      fontSize: 24,
      color: '#000',
      marginBottom: 8,
      lineHeight: 1.2,
      textAlign: 'center'
    },
    coverBottomContainer: {
      position: 'absolute',
      bottom: 64,
      left: 0,
      right: 0
    },
    coverBottomText: {
      textAlign: 'center',
      fontSize: 14,
      color: '#000'
    },
    pageNumberContainer: {
      position: 'absolute',
      bottom: 32,
      left: 0,
      right: 0
    },
    pageNumberText: {
      textAlign: 'center',
      fontSize: 14,
      fontWeight: 'bold',
      color: '#000'
    },
    // Content pages
    contentContainer: {
      paddingTop: 80,
      paddingLeft: 48,
      paddingRight: 48,
      paddingBottom: 48
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 24,
      color: '#111827'
    },
    text: {
      fontSize: 12,
      marginBottom: 16,
      lineHeight: 1.5,
      color: '#374151'
    },
    listItem: {
      fontSize: 12,
      marginBottom: 8,
      marginLeft: 20,
      lineHeight: 1.5,
      color: '#374151'
    },
    // Technology diagram
    techDiagram: {
      width: '100%',
      maxWidth: 600,
      marginTop: 32,
      marginBottom: 32,
      alignSelf: 'center'
    },
    // Tables
    table: {
      width: '100%',
      marginBottom: 20
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: '#4A90E2',
      borderBottomWidth: 1,
      borderBottomColor: '#ccc'
    },
    tableHeaderCell: {
      padding: 8,
      fontSize: 10,
      fontWeight: 'bold',
      color: 'white',
      borderRightWidth: 1,
      borderRightColor: '#ccc'
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#e5e7eb'
    },
    tableCell: {
      padding: 8,
      fontSize: 10,
      color: '#374151',
      borderRightWidth: 1,
      borderRightColor: '#e5e7eb'
    },
    // IP section
    ipText: {
      fontSize: 11,
      marginBottom: 16,
      lineHeight: 1.5,
      color: '#374151'
    },
    // Payment terms
    paymentList: {
      marginLeft: 24
    },
    paymentListItem: {
      fontSize: 12,
      marginBottom: 12,
      lineHeight: 1.5,
      color: '#374151'
    },
    signatureSection: {
      marginTop: 48
    },
    signatureLine: {
      borderBottomWidth: 1,
      borderBottomColor: '#9ca3af',
      paddingBottom: 8,
      marginBottom: 16,
      fontSize: 12,
      color: '#374151'
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
    // Page 1 - Cover Page with Frame Background
    React.createElement(Page, { size: 'A4', style: styles.coverPage },
      // Frame background image
      React.createElement(Image, { src: frameImageBuffer, style: styles.frameBackground }),
      
      // Large EMET logo at top center
      React.createElement(Image, { src: emetLogoBuffer, style: styles.emetLogoLarge }),
      
      // Cover content
      React.createElement(View, { style: styles.coverContent },
        React.createElement(Text, { style: styles.coverTitle }, 'Quotation For'),
        React.createElement(Text, { style: styles.coverSubtitle }, quote?.subject || 'Cisco Catalyst Switch')
      ),
      
      // Bottom info
      React.createElement(View, { style: styles.coverBottomContainer },
        React.createElement(Text, { style: styles.coverBottomText },
          `${quote?.salesPerson || 'David Gilboa'} | ${formatDate(date)} | Ver ${version || '1'}`
        )
      ),
      
      // Page number
      React.createElement(View, { style: styles.pageNumberContainer },
        React.createElement(Text, { style: styles.pageNumberText, render: ({ pageNumber }) => pageNumber })
      )
    ),

    // Page 2 - Intro & Technology Diagram
    React.createElement(Page, { size: 'A4', style: styles.page },
      // EMET logo at top left
      React.createElement(Image, { src: emetLogoBuffer, style: styles.emetLogoSmall }),
      
      React.createElement(View, { style: styles.contentContainer },
        // Intro section
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
        React.createElement(Text, { style: styles.listItem }, '• Server and Storage'),
        React.createElement(Text, { style: styles.listItem }, '• Backup and replication'),
        React.createElement(Text, { style: styles.listItem }, '• Mobile and Workstation computing'),
        React.createElement(Text, { style: styles.listItem }, '• Software and operating system'),
        React.createElement(Text, { style: styles.listItem }, '• Networking - Switches and Wireless'),
        React.createElement(Text, { style: styles.listItem }, '• Cybersecurity L2-L7'),
        React.createElement(Text, { style: styles.text }, 
          'Throughout every technological solution supplied by Dorcom, our commitment to professionalism is unwavering. We are proud to have partnerships with several the world\'s leading IT manufacturers, including: HPE, HPI, DELL, NetApp, VERITAS, Commvault, Veeam, Nutanix, Redhat, Aruba, Juniper, Fortinet, Cloudem.'
        ),
        
        // Technology diagram
        React.createElement(Image, { src: techDiagramBuffer, style: styles.techDiagram })
      ),
      
      // Page number
      React.createElement(View, { style: styles.pageNumberContainer },
        React.createElement(Text, { style: [styles.pageNumberText, { color: '#6b7280' }], render: ({ pageNumber }) => pageNumber })
      )
    ),

    // Page 3 - BOM & Costs (conditionally rendered)
    ...(bomEnabled || costsEnabled ? [
      React.createElement(Page, { size: 'A4', style: styles.page },
        // EMET logo at top left
        React.createElement(Image, { src: emetLogoBuffer, style: styles.emetLogoSmall }),
        
        React.createElement(View, { style: styles.contentContainer },
          ...(bomEnabled ? [
            React.createElement(Text, { style: styles.sectionTitle }, 'BOM'),
            React.createElement(Text, { style: { ...styles.text, fontSize: 16, fontWeight: 'bold', marginBottom: 16, color: '#374151' } }, quote?.subject || 'Catalyst 9300 48-port PoE+'),
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
        ),
        
        // Page number
        React.createElement(View, { style: styles.pageNumberContainer },
          React.createElement(Text, { style: [styles.pageNumberText, { color: '#6b7280' }], render: ({ pageNumber }) => pageNumber })
        )
      )
    ] : []),

    // Page 4 - Payment Terms
    React.createElement(Page, { size: 'A4', style: styles.page },
      // EMET logo at top left
      React.createElement(Image, { src: emetLogoBuffer, style: styles.emetLogoSmall }),
      
      React.createElement(View, { style: styles.contentContainer },
        React.createElement(Text, { style: styles.sectionTitle }, 'Payment & General terms'),
        React.createElement(View, { style: styles.paymentList },
          React.createElement(Text, { style: styles.paymentListItem }, '1. Prices are not including VAT'),
          React.createElement(Text, { style: styles.paymentListItem }, '2. Installation is not included unless specifically stated in the quote.'),
          React.createElement(Text, { style: styles.paymentListItem }, '3. Payment in NIS will be at the dollar exchange rate represented on the day of the invoice issuance.'),
          React.createElement(Text, { style: styles.paymentListItem }, '4. Our offer is valid for a period of 14 days.'),
          React.createElement(Text, { style: styles.paymentListItem }, '5. The total price is for the purchase of the entire proposal'),
          React.createElement(Text, { style: styles.paymentListItem }, `6. Payment Terms - ${quote?.paymentTerms || 'Current +30'}`),
          React.createElement(Text, { style: styles.paymentListItem }, '7. Any delay in payment will result in the customer being charged an exceptional shekel-based interest or conversion to dollars according to the calculation that will produce the highest result.'),
          React.createElement(Text, { style: styles.paymentListItem }, '8. The contents will be delivered to the customer on the condition that the exchange for it will be fully paid according to the terms of the transaction. Any rights not acquired by the customer, at any time that the full exchange has not been received by Dorcom Computers Ltd., and has not been fully waived. Dorcom Computers Ltd. reserves the right to immediately return the endorsement in the contents, if the customer does not meet the full terms and schedule of the transaction, or to credit any amount received from the customer as partial payment towards the items of the order. All of this according to its sole choice and discretion.'),
          React.createElement(Text, { style: styles.paymentListItem }, '9. Subject to the general terms at https://dorcom.co.il')
        ),
        
        React.createElement(View, { style: styles.signatureSection },
          React.createElement(Text, { style: styles.signatureLine }, 'Name | ___________'),
          React.createElement(Text, { style: styles.signatureLine }, 'Date | ___________'),
          React.createElement(Text, { style: styles.signatureLine }, 'Company + Signature | ___________')
        )
      ),
      
      // Page number
      React.createElement(View, { style: styles.pageNumberContainer },
        React.createElement(Text, { style: [styles.pageNumberText, { color: '#6b7280' }], render: ({ pageNumber }) => pageNumber })
      )
    ),

    // Page 5 - Intellectual Property & Contact
    React.createElement(Page, { size: 'A4', style: styles.page },
      // EMET logo at top left
      React.createElement(Image, { src: emetLogoBuffer, style: styles.emetLogoSmall }),
      
      React.createElement(View, { style: styles.contentContainer },
        // Intellectual Property Section
        React.createElement(View, { style: { marginBottom: 48 } },
          React.createElement(Text, { style: styles.sectionTitle }, 'Intellectual property'),
          React.createElement(Text, { style: styles.ipText },
            'All rights, ownership and intellectual property rights (including, but not limited to, copyrights, professional knowledge and trade secrets) in the information contained in this document or any part thereof, as well as in any amendments or additions to this document, are owned by Dorcom Computers Ltd. This document does not imply, imply, or in any other way, grant any rights, ownership, intellectual property rights or license to use related to Dorcom or third parties.'
          ),
          React.createElement(Text, { style: styles.ipText },
            'The information contained in this document is confidential and commercially sensitive, and may not be copied or disclosed to any third party without the prior written approval of Dorcom Computers Ltd. The intended recipient is authorized to disclose this information only to those of its employees directly involved in the project to which this document relates, who have a "need to know". It is the sole and exclusive responsibility of the recipient to ensure that all such employees are aware of these terms and act accordingly. The recipient is authorized to use the information contained herein for evaluation purposes only.'
          ),
          React.createElement(Text, { style: styles.ipText },
            'The receipt of this document "as is" by the recipient shall not create any contractual relations unless and until an agreement on the terms of the project to which this document relates, including these terms, is signed by both parties. This document constitutes a non-binding proposal, which may be amended by Dorcom Computers Ltd. at any time, at its sole discretion. The recipient hereby agrees to return this document to Dorcom Computers Ltd. immediately upon request, and to destroy any copies made thereof.'
          ),
          React.createElement(Text, { style: styles.ipText },
            'Any breach of these provisions by the recipient or any of its employees will entitle Dorcom Computers Ltd. to all legal remedies, including, but not limited to, damages and injunction, without the need for prior notice or proof of damage.'
          )
        ),
        
        // Contact Section
        React.createElement(View, {},
          React.createElement(Text, { style: styles.sectionTitle }, 'Contact'),
          React.createElement(View, { style: styles.table },
            React.createElement(View, { style: styles.tableHeader },
              React.createElement(Text, { style: [styles.tableHeaderCell, { width: '25%' }] }, 'Name'),
              React.createElement(Text, { style: [styles.tableHeaderCell, { width: '25%' }] }, 'Role'),
              React.createElement(Text, { style: [styles.tableHeaderCell, { width: '25%' }] }, 'Phone'),
              React.createElement(Text, { style: [styles.tableHeaderCell, { width: '25%', borderRightWidth: 0 }] }, 'Email')
            ),
            React.createElement(View, { style: styles.tableRow },
              React.createElement(Text, { style: [styles.tableCell, { width: '25%' }] },
                contact.salesPerson || quote?.salesPerson || 'David Gilboa'
              ),
              React.createElement(Text, { style: [styles.tableCell, { width: '25%' }] }, 'Account Manager'),
              React.createElement(Text, { style: [styles.tableCell, { width: '25%' }] }, contact.phone || ''),
              React.createElement(Text, { style: [styles.tableCell, { width: '25%', borderRightWidth: 0 }] }, contact.email || '')
            )
          )
        )
      ),
      
      // Page number
      React.createElement(View, { style: styles.pageNumberContainer },
        React.createElement(Text, { style: [styles.pageNumberText, { color: '#6b7280' }], render: ({ pageNumber }) => pageNumber })
      )
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
