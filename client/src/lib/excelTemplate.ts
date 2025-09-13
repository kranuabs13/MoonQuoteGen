import * as XLSX from 'xlsx';
import type { QuoteFormData, ColumnVisibility } from '@shared/schema';

export interface ExcelTemplateOptions {
  includeQuoteInfo?: boolean;
  includeBomItems?: boolean;
  includeCostItems?: boolean;
  columnVisibility?: ColumnVisibility;
}

export function createExcelTemplate(options: ExcelTemplateOptions = {}): ArrayBuffer {
  const {
    includeQuoteInfo = true,
    includeBomItems = true,
    includeCostItems = true,
    columnVisibility = {
      no: true,
      partNumber: true,
      productDescription: true,
      qty: true,
      unitPrice: false,
      totalPrice: false,
    }
  } = options;

  const workbook = XLSX.utils.book_new();

  // Sheet 1: Quote Information
  if (includeQuoteInfo) {
    const quoteInfoData = [
      ['Field', 'Value', 'Description'],
      ['Quote Subject', '', 'Brief description of the quote'],
      ['Customer Company', '', 'Customer company name'],
      ['Sales Person Name', '', 'Name of the sales representative'],
      ['Date', new Date().toISOString().split('T')[0], 'Quote date (YYYY-MM-DD)'],
      ['Version', '1', 'Quote version number'],
      ['Payment Terms', 'Current +30', 'Payment terms for the quote'],
      ['Currency', 'USD', 'Currency for all prices'],
      ['BOM Enabled', 'TRUE', 'Enable BOM section (TRUE/FALSE)'],
      ['Costs Enabled', 'TRUE', 'Enable costs section (TRUE/FALSE)'],
    ];

    const quoteSheet = XLSX.utils.aoa_to_sheet(quoteInfoData);
    
    // Set column widths
    quoteSheet['!cols'] = [
      { wch: 20 }, // Field column
      { wch: 30 }, // Value column
      { wch: 40 }  // Description column
    ];

    XLSX.utils.book_append_sheet(workbook, quoteSheet, 'Quote Info');
  }

  // Sheet 2: BOM Items (Multiple Groups Support)
  if (includeBomItems) {
    const bomHeaders = [];
    const bomDescriptions = [];
    const bomInstructions = [];

    // Always include ALL possible BOM columns in template (regardless of current visibility)
    bomHeaders.push('Part Number');
    bomDescriptions.push('Manufacturer part number');
    bomInstructions.push('VH2G4324-ONE');

    bomHeaders.push('Product Description');
    bomDescriptions.push('Detailed product description');
    bomInstructions.push('Catalyst 9300 48-port PoE+');

    bomHeaders.push('QTY');
    bomDescriptions.push('Quantity needed');
    bomInstructions.push('2');

    bomHeaders.push('Unit Price');
    bomDescriptions.push('Price per unit (numbers only)');
    bomInstructions.push('1500.00');

    // Create improved template with clearly copyable sections
    const bomData = [
      // Instructions Section (clearly separated)
      ['📋 BOM TEMPLATE INSTRUCTIONS', '', '', ''],
      ['', '', '', ''],
      ['HOW TO USE:', '', '', ''],
      ['1. Scroll down to find the data groups below', '', '', ''],
      ['2. Select the 3-4 data rows for one group (rectangular selection)', '', '', ''],
      ['3. Copy with Ctrl+C', '', '', ''],
      ['4. Go to your app and paste into a BOM group table', '', '', ''],
      ['5. Repeat for additional groups as needed', '', '', ''],
      ['', '', '', ''],
      ['💡 TIP: You can copy multiple rows at once - the app will filter out headers automatically', '', '', ''],
      ['📊 COLUMN ORDER: Part Number → Product Description → QTY → Unit Price', '', '', ''],
      ['⚡ Auto-calculated: Item numbers (NO) and Total Prices are calculated automatically', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['🔽 COPYABLE DATA SECTIONS BELOW 🔽', '', '', ''],
      ['', '', '', ''],
      
      // Group 1: Clean, easy-to-select block
      ['📦 GROUP 1: Network Infrastructure', '', '', ''],
      ['Part Number', 'Product Description', 'QTY', 'Unit Price'],
      ['C9300-48P', 'Catalyst 9300 48-port PoE+ Switch', '1', '2500.00'],
      ['PWR-C1-715WAC', 'Power Supply 715W AC', '1', '400.00'],
      ['C9300-NM-8X', 'Network Module 8x10G', '1', '1200.00'],
      ['', '', '', ''],
      
      // Group 2: Clean, easy-to-select block
      ['📦 GROUP 2: Cables & Accessories', '', '', ''],
      ['Part Number', 'Product Description', 'QTY', 'Unit Price'],
      ['CAB-C13-C14-2M', 'Power Cable 2M', '4', '25.00'],
      ['CAB-ETH-S-RJ45', 'Ethernet Cable 1M', '8', '15.00'],
      ['RACK-MOUNT-KIT', 'Rack Mount Kit', '1', '75.00'],
      ['PATCH-PANEL-24', '24-Port Patch Panel', '2', '85.00'],
      ['', '', '', ''],
      
      // Group 3: Clean, easy-to-select block
      ['📦 GROUP 3: Security & Monitoring', '', '', ''],
      ['Part Number', 'Product Description', 'QTY', 'Unit Price'],
      ['FIREWALL-60F', 'FortiGate 60F Firewall', '1', '800.00'],
      ['UPS-1500VA', 'UPS 1500VA Battery Backup', '2', '350.00'],
      ['SENSOR-ENV', 'Environmental Sensor', '4', '120.00'],
      ['CAM-IP-4MP', '4MP IP Security Camera', '6', '180.00'],
      ['', '', '', ''],
      
      // Group 4: Mixed pricing example
      ['📦 GROUP 4: Mixed Pricing Example', '', '', ''],
      ['Part Number', 'Product Description', 'QTY', 'Unit Price'],
      ['ITEM-001', 'Sample Item Without Price', '3', ''],
      ['ITEM-002', 'Sample Item With Price', '2', '199.99'],
      ['ITEM-003', 'License - Annual Subscription', '1', '50.00'],
      ['ITEM-004', 'Installation Service', '1', '500.00'],
    ];

    const bomSheet = XLSX.utils.aoa_to_sheet(bomData);
    
    // Set column widths based on content
    const colWidths = [
      { wch: 20 }, // Part Number / Instructions
      { wch: 40 }, // Product Description
      { wch: 8 },  // QTY
      { wch: 12 }  // Unit Price
    ];
    bomSheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, bomSheet, 'BOM Items (Multi-Group)');
  }

  // Sheet 3: Cost Items
  if (includeCostItems) {
    const costData = [
      ['Product Description', 'QTY', 'Unit Price', 'Total Price', 'Is Discount'],
      ['Description of service or product', 'Quantity', 'Price per unit', 'Total amount', 'TRUE for discounts'],
      ['Installation Services', '1', '500.00', '500.00', 'FALSE'],
      ['Volume Discount', '1', '-100.00', '-100.00', 'TRUE'],
    ];

    const costSheet = XLSX.utils.aoa_to_sheet(costData);
    
    // Set column widths
    costSheet['!cols'] = [
      { wch: 35 }, // Product Description
      { wch: 8 },  // QTY
      { wch: 12 }, // Unit Price
      { wch: 12 }, // Total Price
      { wch: 12 }  // Is Discount
    ];

    XLSX.utils.book_append_sheet(workbook, costSheet, 'Cost Items');
  }

  // Write workbook to buffer
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
}

export function downloadExcelTemplate(
  filename: string = 'quote-template.xlsx',
  options: ExcelTemplateOptions = {}
): void {
  const buffer = createExcelTemplate(options);
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function createBomOnlyTemplate(columnVisibility: ColumnVisibility): ArrayBuffer {
  return createExcelTemplate({
    includeQuoteInfo: false,
    includeBomItems: true,
    includeCostItems: false,
    columnVisibility
  });
}

export function downloadBomOnlyTemplate(
  filename: string = 'bom-template.xlsx',
  columnVisibility: ColumnVisibility
): void {
  const buffer = createBomOnlyTemplate(columnVisibility);
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  document.body.appendChild(link);
  link.click();
  
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}