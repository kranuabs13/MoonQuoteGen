import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X } from "lucide-react";
import { parseExcelFile, type ParsedExcelData, type ExcelParseOptions } from "../lib/excelParser";

interface ExcelUploadProps {
  onDataParsed?: (data: ParsedExcelData) => void;
  onError?: (error: string) => void;
  parseOptions?: ExcelParseOptions;
  accept?: string;
  maxFileSize?: number; // in MB
  disabled?: boolean;
  className?: string;
}

export default function ExcelUpload({
  onDataParsed,
  onError,
  parseOptions = { validateData: true, allowPartialData: true },
  accept = ".xlsx,.xls",
  maxFileSize = 10, // 10MB default
  disabled = false,
  className = "",
}: ExcelUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lastResult, setLastResult] = useState<ParsedExcelData | null>(null);

  const processFile = async (file: File) => {
    if (disabled) return;

    // File size validation
    if (file.size > maxFileSize * 1024 * 1024) {
      const error = `File size exceeds ${maxFileSize}MB limit`;
      onError?.(error);
      setLastResult({ errors: [error], warnings: [] });
      return;
    }

    // File type validation
    const isValidType = file.name.toLowerCase().endsWith('.xlsx') || 
                       file.name.toLowerCase().endsWith('.xls');
    if (!isValidType) {
      const error = 'Please upload an Excel file (.xlsx or .xls)';
      onError?.(error);
      setLastResult({ errors: [error], warnings: [] });
      return;
    }

    setUploading(true);
    try {
      const result = await parseExcelFile(file, parseOptions);
      setLastResult(result);

      if (result.errors.length > 0 && (!parseOptions.allowPartialData || 
          (!result.quoteInfo && !result.bomItems && !result.costItems))) {
        onError?.(`Failed to parse Excel file: ${result.errors.join(', ')}`);
      } else {
        onDataParsed?.(result);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      onError?.(errorMsg);
      setLastResult({ errors: [errorMsg], warnings: [] });
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset input to allow same file to be selected again
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setDragActive(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only set to false if we're leaving the component entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragActive(false);
    }
  };

  const clearResults = () => {
    setLastResult(null);
  };

  const hasData = lastResult && (lastResult.quoteInfo || lastResult.bomItems || lastResult.costItems);
  const hasErrors = lastResult && lastResult.errors.length > 0;
  const hasWarnings = lastResult && lastResult.warnings.length > 0;

  return (
    <div className={`space-y-3 ${className}`}>
      <Card 
        className={`transition-colors duration-200 ${
          dragActive ? 'border-primary bg-primary/5' : 'border-dashed'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        data-testid="card-excel-upload"
      >
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <FileSpreadsheet 
                className={`h-12 w-12 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} 
              />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            
            <div>
              <p className="text-lg font-medium">
                {uploading ? 'Processing Excel file...' : 'Upload Excel File'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {dragActive 
                  ? 'Drop your Excel file here' 
                  : `Drag and drop or click to select an Excel file (${accept})`
                }
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={disabled || uploading}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = accept;
                input.onchange = (e) => {
                  if (e.target) {
                    handleFileInput(e as any);
                  }
                };
                input.click();
              }}
              data-testid="button-select-excel-file"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Processing...' : 'Select File'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results display */}
      {lastResult && (
        <div className="space-y-2">
          {/* Success indicators */}
          {hasData && (
            <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <div className="flex items-center justify-between">
                  <span>
                    Excel file parsed successfully! Found:{' '}
                    {lastResult.quoteInfo && <Badge variant="secondary" className="ml-1">Quote Info</Badge>}
                    {lastResult.bomItems && <Badge variant="secondary" className="ml-1">{lastResult.bomItems.length} BOM Items</Badge>}
                    {lastResult.costItems && <Badge variant="secondary" className="ml-1">{lastResult.costItems.length} Cost Items</Badge>}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearResults}
                    data-testid="button-clear-excel-results"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Warning messages */}
          {hasWarnings && (
            <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                <div className="space-y-1">
                  <div className="font-medium">Warnings:</div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {lastResult.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Error messages */}
          {hasErrors && (
            <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-800 dark:text-red-200">
                <div className="space-y-1">
                  <div className="font-medium">Errors:</div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {lastResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}