import * as XLSX from 'xlsx';
import type { QuoteFormData, ColumnVisibility, BomItem, CostItem } from '@shared/schema';

export interface ParsedExcelData {
  quoteInfo?: Partial<QuoteFormData>;
  bomItems?: Array<{
    no: number;
    partNumber: string;
    productDescription: string;
    quantity: number; // This matches the database schema and BomItem type
    unitPrice?: number;
    totalPrice?: number;
  }>;
  costItems?: Array<{
    productDescription: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    isDiscount: boolean;
  }>;
  errors: string[];
  warnings: string[];
}

export interface ExcelParseOptions {
  validateData?: boolean;
  allowPartialData?: boolean;
}

export function parseExcelFile(
  file: ArrayBuffer | File,
  options: ExcelParseOptions = {}
): Promise<ParsedExcelData> {
  return new Promise((resolve) => {
    const { validateData = true, allowPartialData = true } = options;
    const result: ParsedExcelData = {
      errors: [],
      warnings: []
    };

    try {
      let workbook: XLSX.WorkBook;

      if (file instanceof File) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const buffer = e.target?.result as ArrayBuffer;
          workbook = XLSX.read(buffer, { type: 'array' });
          processWorkbook(workbook, result, validateData, allowPartialData);
          resolve(result);
        };
        reader.onerror = () => {
          result.errors.push('Failed to read the Excel file');
          resolve(result);
        };
        reader.readAsArrayBuffer(file);
        return;
      }

      // Handle ArrayBuffer directly
      workbook = XLSX.read(file, { type: 'array' });
      processWorkbook(workbook, result, validateData, allowPartialData);
      resolve(result);

    } catch (error) {
      result.errors.push(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      resolve(result);
    }
  });
}

function processWorkbook(
  workbook: XLSX.WorkBook,
  result: ParsedExcelData,
  validateData: boolean,
  allowPartialData: boolean
): void {
  const sheetNames = workbook.SheetNames;
  
  // Parse Quote Info sheet if available
  const quoteInfoSheet = findSheet(workbook, ['Quote Info', 'quote info', 'QuoteInfo']);
  if (quoteInfoSheet) {
    result.quoteInfo = parseQuoteInfoSheet(quoteInfoSheet, result);
  }

  // Parse BOM Items sheet if available
  const bomSheet = findSheet(workbook, ['BOM Items (Multi-Group)', 'BOM Items', 'bom items', 'BOM', 'bom']);
  if (bomSheet) {
    result.bomItems = parseBomItemsSheet(bomSheet, result, validateData);
  }

  // Parse Cost Items sheet if available
  const costSheet = findSheet(workbook, ['Cost Items', 'cost items', 'Cost', 'cost']);
  if (costSheet) {
    result.costItems = parseCostItemsSheet(costSheet, result, validateData);
  }

  // If no recognized sheets found, try to parse the first sheet as BOM items
  if (!result.quoteInfo && !result.bomItems && !result.costItems && sheetNames.length > 0) {
    result.warnings.push('No recognized sheet names found, attempting to parse first sheet as BOM items');
    const firstSheet = workbook.Sheets[sheetNames[0]];
    result.bomItems = parseBomItemsSheet(firstSheet, result, validateData);
  }
}

function findSheet(workbook: XLSX.WorkBook, possibleNames: string[]): XLSX.WorkSheet | null {
  for (const name of possibleNames) {
    if (workbook.Sheets[name]) {
      return workbook.Sheets[name];
    }
  }
  return null;
}

function parseQuoteInfoSheet(sheet: XLSX.WorkSheet, result: ParsedExcelData): Partial<QuoteFormData> {
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  const quoteInfo: Partial<QuoteFormData> = {};

  try {
    // Look for rows with Field and Value columns
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 2) continue;

      const field = String(row[0] || '').trim().toLowerCase();
      const value = row[1];

      switch (field) {
        case 'quote subject':
          quoteInfo.quoteSubject = String(value || '').trim();
          break;
        case 'customer company':
          quoteInfo.customerCompany = String(value || '').trim();
          break;
        case 'sales person name':
          quoteInfo.salesPersonName = String(value || '').trim();
          break;
        case 'date':
          quoteInfo.date = String(value || '').trim();
          break;
        case 'version':
          quoteInfo.version = String(value || '1').trim();
          break;
        case 'payment terms':
          quoteInfo.paymentTerms = String(value || 'Current +30').trim();
          break;
        case 'currency':
          quoteInfo.currency = String(value || 'USD').trim();
          break;
        case 'bom enabled':
          quoteInfo.bomEnabled = parseBoolean(value, true);
          break;
        case 'costs enabled':
          quoteInfo.costsEnabled = parseBoolean(value, true);
          break;
      }
    }
  } catch (error) {
    result.errors.push(`Error parsing quote info: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return quoteInfo;
}

function parseBomItemsSheet(
  sheet: XLSX.WorkSheet,
  result: ParsedExcelData,
  validateData: boolean
): Array<NonNullable<ParsedExcelData['bomItems']>[number]> {
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  const items: Array<any> = [];

  if (data.length < 2) {
    result.warnings.push('BOM sheet appears to be empty or has no data rows');
    return items;
  }

  try {
    // Find header row (look for common BOM headers)
    let headerRowIndex = -1;
    const headers: string[] = [];
    
    for (let i = 0; i < Math.min(data.length, 5); i++) {
      const row = data[i];
      if (!row) continue;
      
      const rowStr = row.map(cell => String(cell || '').toLowerCase()).join(' ');
      if (rowStr.includes('part number') || rowStr.includes('product description') || 
          rowStr.includes('qty') || rowStr.includes('quantity')) {
        headerRowIndex = i;
        headers.push(...row.map(cell => String(cell || '').trim()));
        break;
      }
    }

    if (headerRowIndex === -1) {
      result.errors.push('Could not find BOM headers in the sheet');
      return items;
    }

    // Map column indices
    const columnMap = mapBomColumns(headers);
    
    // Parse data rows
    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.every(cell => !cell)) continue; // Skip empty rows

      const item = parseBomRow(row, columnMap, i + 1, result, validateData);
      if (item) {
        items.push(item);
      }
    }

    if (items.length === 0) {
      result.warnings.push('No valid BOM items found in the sheet');
    }

  } catch (error) {
    result.errors.push(`Error parsing BOM items: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return items;
}

function parseCostItemsSheet(
  sheet: XLSX.WorkSheet,
  result: ParsedExcelData,
  validateData: boolean
): Array<NonNullable<ParsedExcelData['costItems']>[number]> {
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  const items: Array<any> = [];

  if (data.length < 2) {
    result.warnings.push('Cost sheet appears to be empty or has no data rows');
    return items;
  }

  try {
    // Find header row
    let headerRowIndex = -1;
    const headers: string[] = [];
    
    for (let i = 0; i < Math.min(data.length, 5); i++) {
      const row = data[i];
      if (!row) continue;
      
      const rowStr = row.map(cell => String(cell || '').toLowerCase()).join(' ');
      if (rowStr.includes('product description') && (rowStr.includes('unit price') || rowStr.includes('total price'))) {
        headerRowIndex = i;
        headers.push(...row.map(cell => String(cell || '').trim()));
        break;
      }
    }

    if (headerRowIndex === -1) {
      result.errors.push('Could not find Cost Items headers in the sheet');
      return items;
    }

    // Map column indices
    const columnMap = mapCostColumns(headers);
    
    // Parse data rows
    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.every(cell => !cell)) continue; // Skip empty rows

      const item = parseCostRow(row, columnMap, i + 1, result, validateData);
      if (item) {
        items.push(item);
      }
    }

    if (items.length === 0) {
      result.warnings.push('No valid cost items found in the sheet');
    }

  } catch (error) {
    result.errors.push(`Error parsing cost items: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return items;
}

function mapBomColumns(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  
  headers.forEach((header, index) => {
    const h = header.toLowerCase().trim();
    if (h.includes('no') && !h.includes('part')) {
      map.no = index;
    } else if (h.includes('part number') || h === 'part' || h === 'pn') {
      map.partNumber = index;
    } else if (h.includes('product description') || h.includes('description')) {
      map.productDescription = index;
    } else if (h === 'qty' || h === 'quantity') {
      map.quantity = index;
    } else if (h.includes('unit price')) {
      map.unitPrice = index;
    } else if (h.includes('total price')) {
      map.totalPrice = index;
    }
  });

  return map;
}

function mapCostColumns(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  
  headers.forEach((header, index) => {
    const h = header.toLowerCase().trim();
    if (h.includes('product description') || h.includes('description')) {
      map.productDescription = index;
    } else if (h === 'qty' || h === 'quantity') {
      map.quantity = index;
    } else if (h.includes('unit price')) {
      map.unitPrice = index;
    } else if (h.includes('total price')) {
      map.totalPrice = index;
    } else if (h.includes('discount')) {
      map.isDiscount = index;
    }
  });

  return map;
}

function parseBomRow(
  row: any[],
  columnMap: Record<string, number>,
  rowNumber: number,
  result: ParsedExcelData,
  validateData: boolean
): any | null {
  try {
    const item = {
      no: parseNumber(row[columnMap.no]) || rowNumber - 1,
      partNumber: String(row[columnMap.partNumber] || '').trim(),
      productDescription: String(row[columnMap.productDescription] || '').trim(),
      quantity: parseNumber(row[columnMap.quantity]) || 1,
      unitPrice: columnMap.unitPrice !== undefined ? parseNumber(row[columnMap.unitPrice]) : undefined,
      totalPrice: columnMap.totalPrice !== undefined ? parseNumber(row[columnMap.totalPrice]) : undefined,
    };

    // Validation
    if (validateData) {
      if (!item.partNumber && !item.productDescription) {
        result.warnings.push(`Row ${rowNumber}: Missing both part number and product description`);
        return null;
      }
      if (item.quantity <= 0) {
        result.warnings.push(`Row ${rowNumber}: Quantity must be greater than 0`);
        item.quantity = 1;
      }
    }

    return item;
  } catch (error) {
    result.errors.push(`Row ${rowNumber}: Error parsing BOM item - ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}

function parseCostRow(
  row: any[],
  columnMap: Record<string, number>,
  rowNumber: number,
  result: ParsedExcelData,
  validateData: boolean
): any | null {
  try {
    const item = {
      productDescription: String(row[columnMap.productDescription] || '').trim(),
      quantity: parseNumber(row[columnMap.quantity]) || 1,
      unitPrice: parseNumber(row[columnMap.unitPrice]) || 0,
      totalPrice: parseNumber(row[columnMap.totalPrice]) || 0,
      isDiscount: parseBoolean(row[columnMap.isDiscount], false),
    };

    // Validation
    if (validateData) {
      if (!item.productDescription) {
        result.warnings.push(`Row ${rowNumber}: Missing product description`);
        return null;
      }
      if (item.quantity <= 0) {
        result.warnings.push(`Row ${rowNumber}: Quantity must be greater than 0`);
        item.quantity = 1;
      }
    }

    return item;
  } catch (error) {
    result.errors.push(`Row ${rowNumber}: Error parsing cost item - ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}

function parseNumber(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  
  // Handle string values that might contain currency symbols, commas, etc.
  if (typeof value === 'string') {
    // Remove common currency symbols, commas, and spaces
    const cleaned = value.replace(/[$€£¥,\s]/g, '');
    
    // Handle empty string after cleaning
    if (cleaned === '') return undefined;
    
    const num = Number(cleaned);
    return isNaN(num) ? undefined : num;
  }
  
  // Handle numeric values directly
  const num = Number(value);
  return isNaN(num) ? undefined : num;
}

function parseBoolean(value: any, defaultValue: boolean): boolean {
  if (value === null || value === undefined || value === '') return defaultValue;
  
  const str = String(value).toLowerCase().trim();
  if (str === 'true' || str === '1' || str === 'yes' || str === 'y') return true;
  if (str === 'false' || str === '0' || str === 'no' || str === 'n') return false;
  
  return defaultValue;
}