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

  // Sheet 2: BOM Items
  if (includeBomItems) {
    const bomHeaders = [];
    const bomSampleRow = [];
    const bomDescriptions = [];

    // Build headers based on column visibility
    if (columnVisibility.no) {
      bomHeaders.push('NO');
      bomSampleRow.push('1');
      bomDescriptions.push('Item number');
    }
    if (columnVisibility.partNumber) {
      bomHeaders.push('Part Number');
      bomSampleRow.push('VH2G4324-ONE');
      bomDescriptions.push('Manufacturer part number');
    }
    if (columnVisibility.productDescription) {
      bomHeaders.push('Product Description');
      bomSampleRow.push('Catalyst 9300 48-port PoE+');
      bomDescriptions.push('Detailed product description');
    }
    if (columnVisibility.qty) {
      bomHeaders.push('QTY');
      bomSampleRow.push('2');
      bomDescriptions.push('Quantity needed');
    }
    if (columnVisibility.unitPrice) {
      bomHeaders.push('Unit Price');
      bomSampleRow.push('1500.00');
      bomDescriptions.push('Price per unit (numbers only)');
    }
    if (columnVisibility.totalPrice) {
      bomHeaders.push('Total Price');
      bomSampleRow.push('3000.00');
      bomDescriptions.push('Total price (QTY × Unit Price)');
    }

    const bomData = [
      bomHeaders,
      bomDescriptions, // Description row to help users
      bomSampleRow,    // Sample data row
    ];

    const bomSheet = XLSX.utils.aoa_to_sheet(bomData);
    
    // Set column widths based on content
    const colWidths = bomHeaders.map(header => {
      switch (header) {
        case 'NO': return { wch: 5 };
        case 'Part Number': return { wch: 15 };
        case 'Product Description': return { wch: 35 };
        case 'QTY': return { wch: 8 };
        case 'Unit Price':
        case 'Total Price': return { wch: 12 };
        default: return { wch: 15 };
      }
    });
    bomSheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, bomSheet, 'BOM Items');
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