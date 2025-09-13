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
  bomGroups?: Array<{
    id: string;
    name: string;
    items: Array<{
      no: number;
      partNumber: string;
      productDescription: string;
      quantity: number;
      unitPrice?: number;
      totalPrice?: number;
    }>;
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
  const allItems: Array<any> = [];
  const bomGroups: Array<NonNullable<ParsedExcelData['bomGroups']>[number]> = [];

  if (data.length < 2) {
    result.warnings.push('BOM sheet appears to be empty or has no data rows');
    return allItems;
  }

  try {
    // Find all group sections
    const groupSections: Array<{ groupLabel: string; groupName: string; startRow: number; headerRow: number; headers: string[] }> = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;
      
      const rowStr = row.map(cell => String(cell || '').toLowerCase()).join(' ');
      
      // Look for group labels like "📦 GROUP 1: Network Infrastructure"
      if (rowStr.includes('📦') && rowStr.includes('group')) {
        const groupLabel = String(row[0] || '').trim();
        const groupMatch = groupLabel.match(/📦\s*GROUP\s*(\d+):\s*(.+)/i);
        
        if (groupMatch) {
          const groupNumber = groupMatch[1];
          const groupName = groupMatch[2];
          
          // Look for the next header row after this group label
          for (let j = i + 1; j < Math.min(i + 5, data.length); j++) {
            const headerRow = data[j];
            if (!headerRow) continue;
            
            const hasPartNumber = headerRow.some(cell => String(cell || '').toLowerCase().trim() === 'part number');
            const hasProductDescription = headerRow.some(cell => String(cell || '').toLowerCase().includes('product description') && String(cell || '').toLowerCase().trim().split(' ').length <= 3);
            const hasQty = headerRow.some(cell => String(cell || '').toLowerCase().trim() === 'qty' || String(cell || '').toLowerCase().trim() === 'quantity');
            
            if ((hasPartNumber || hasProductDescription) && hasQty) {
              const headers = headerRow.map(cell => String(cell || '').trim());
              groupSections.push({
                groupLabel: `BOM ${groupNumber}`,
                groupName: groupName,
                startRow: i,
                headerRow: j,
                headers
              });
              break;
            }
          }
        }
      }
    }

    // If no group sections found, fall back to parsing the entire sheet as one group
    if (groupSections.length === 0) {
      // Find any header row in the sheet
      for (let i = 0; i < Math.min(data.length, 25); i++) {
        const row = data[i];
        if (!row) continue;
        
        const hasPartNumber = row.some(cell => String(cell || '').toLowerCase().trim() === 'part number');
        const hasProductDescription = row.some(cell => String(cell || '').toLowerCase().includes('product description') && String(cell || '').toLowerCase().trim().split(' ').length <= 3);
        const hasQty = row.some(cell => String(cell || '').toLowerCase().trim() === 'qty' || String(cell || '').toLowerCase().trim() === 'quantity');
        
        if ((hasPartNumber || hasProductDescription) && hasQty) {
          const headers = row.map(cell => String(cell || '').trim());
          groupSections.push({
            groupLabel: 'BOM 1',
            groupName: 'Imported Items',
            startRow: -1,
            headerRow: i,
            headers
          });
          break;
        }
      }
    }

    // Process each group section
    for (let groupIndex = 0; groupIndex < groupSections.length; groupIndex++) {
      const group = groupSections[groupIndex];
      const nextGroupStartRow = groupIndex + 1 < groupSections.length ? groupSections[groupIndex + 1].startRow : data.length;
      
      const columnMap = mapBomColumns(group.headers);
      const groupItems: Array<any> = [];
      
      // Parse items for this group
      for (let i = group.headerRow + 1; i < nextGroupStartRow; i++) {
        const row = data[i];
        if (!row || row.every(cell => !cell)) continue; // Skip empty rows
        
        // Skip non-data rows (repeated headers, group labels, etc.)
        if (isNonDataRow(row, group.headers)) {
          result.warnings.push(`Row ${i + 1}: Skipped non-data row`);
          continue;
        }

        const item = parseBomRow(row, columnMap, i + 1, result, validateData);
        if (item) {
          // Set proper item numbering within the group
          item.no = groupItems.length + 1;
          groupItems.push(item);
          allItems.push(item);
        }
      }
      
      if (groupItems.length > 0) {
        bomGroups.push({
          id: `bom-${groupIndex + 1}`,
          name: group.groupLabel,
          items: groupItems
        });
      }
    }

    // Store the bomGroups in the result
    result.bomGroups = bomGroups;
    
    if (allItems.length === 0) {
      result.warnings.push('No valid BOM items found in the sheet');
    }

  } catch (error) {
    result.errors.push(`Error parsing BOM items: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return allItems;
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

function isNonDataRow(row: any[], headers: string[]): boolean {
  // Convert all cells in the row to strings for analysis
  const rowValues = row.map(cell => String(cell || '').trim());
  const rowText = rowValues.join(' ').toLowerCase();
  
  // Skip rows that are clearly group labels
  if (rowText.includes('📦') || rowText.includes('group') || rowText.includes('🔧') || rowText.includes('💻')) {
    return true;
  }
  
  // Skip rows that match header patterns (repeated headers throughout the sheet)
  const headerPatterns = [
    'part number',
    'product description', 
    'qty',
    'quantity',
    'unit price',
    'total price',
    'no.'
  ];
  
  // Check if this row looks like a header row
  const matchedHeaders = headerPatterns.filter(pattern => rowText.includes(pattern));
  if (matchedHeaders.length >= 2) {
    return true;
  }
  
  // Skip rows that are mostly instructional text or formatting
  const instructionalPatterns = [
    'enter your',
    'add items',
    'total:',
    'subtotal',
    'instructions',
    'notes:',
    'please',
    'example',
    'sample'
  ];
  
  for (const pattern of instructionalPatterns) {
    if (rowText.includes(pattern)) {
      return true;
    }
  }
  
  // Skip rows where the first few cells are all text and no numeric/product-like content
  const firstThreeCells = rowValues.slice(0, 3).join(' ').toLowerCase();
  if (firstThreeCells.length > 0 && 
      !firstThreeCells.match(/[0-9]/) && 
      !firstThreeCells.match(/\w{3,}-\w/) && // Product codes like "ABC-123"
      firstThreeCells.split(' ').every(word => word.length > 15)) { // Avoid very long descriptive text
    return true;
  }
  
  return false;
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