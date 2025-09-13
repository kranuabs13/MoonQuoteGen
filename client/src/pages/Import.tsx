import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, FileSpreadsheet, Mail, CheckCircle, AlertCircle, Calculator } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link, useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { QuoteFormData } from '@shared/schema';

interface ExtractedItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit?: string;
}

interface ParsedData {
  supplier: string;
  items: ExtractedItem[];
  totalValue: number;
}

export default function Import() {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [selectedMargin, setSelectedMargin] = useState<string>('');
  const [customMargin, setCustomMargin] = useState<string>('');
  const [previewPrices, setPreviewPrices] = useState<ExtractedItem[]>([]);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Mutation to create a quote from imported data
  const createQuoteMutation = useMutation({
    mutationFn: async (quoteData: any) => {
      const response = await apiRequest('POST', '/api/quotes', quoteData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Quote Generated Successfully',
        description: 'Professional quote has been created from imported data.',
      });
      setLocation('/');
    },
    onError: (error) => {
      toast({
        title: 'Quote Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to create quote',
        variant: 'destructive',
      });
    },
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      const validFiles = droppedFiles.filter(file => {
        const validTypes = [
          'application/pdf',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'message/rfc822',
          '.eml',
          '.msg'
        ];
        return validTypes.some(type => file.type === type || file.name.toLowerCase().endsWith(type));
      });

      if (validFiles.length !== droppedFiles.length) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload PDF, Excel, or email files only.',
          variant: 'destructive',
        });
      }

      setFiles(validFiles);
    }
  }, [toast]);

  const handleFileUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setParsing(true);

    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));

      const response = await fetch('/api/import/parse', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to parse files');
      }

      const data = await response.json();
      setParsedData(data);

      toast({
        title: 'Files parsed successfully',
        description: `Extracted ${data.items.length} items from ${files.length} file(s)`,
      });
    } catch (error) {
      toast({
        title: 'Parsing failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setParsing(false);
    }
  };

  const calculateMarginPrice = (costPrice: number, marginPercent: number): number => {
    return costPrice / (1 - marginPercent / 100);
  };

  const handleMarginChange = (value: string) => {
    setSelectedMargin(value);
    if (parsedData) {
      const margin = value === 'custom' ? parseFloat(customMargin) : parseFloat(value);
      if (!isNaN(margin)) {
        const updatedItems = parsedData.items.map(item => ({
          ...item,
          unitPrice: calculateMarginPrice(item.unitPrice, margin),
          totalPrice: calculateMarginPrice(item.totalPrice, margin),
        }));
        setPreviewPrices(updatedItems);
      }
    }
  };

  const handleCustomMarginChange = (value: string) => {
    setCustomMargin(value);
    if (selectedMargin === 'custom' && parsedData) {
      const margin = parseFloat(value);
      if (!isNaN(margin)) {
        const updatedItems = parsedData.items.map(item => ({
          ...item,
          unitPrice: calculateMarginPrice(item.unitPrice, margin),
          totalPrice: calculateMarginPrice(item.totalPrice, margin),
        }));
        setPreviewPrices(updatedItems);
      }
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') return <FileText className="w-4 h-4" />;
    if (file.type.includes('spreadsheet') || file.type.includes('excel')) return <FileSpreadsheet className="w-4 h-4" />;
    if (file.type === 'message/rfc822' || file.name.endsWith('.eml') || file.name.endsWith('.msg')) return <Mail className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const totalOriginalValue = previewPrices.length > 0 
    ? previewPrices.reduce((sum, item) => sum + item.totalPrice, 0)
    : parsedData?.totalValue || 0;

  // Generate professional quote from imported data
  const handleGenerateQuote = () => {
    if (!parsedData || previewPrices.length === 0) {
      toast({
        title: 'No data to process',
        description: 'Please upload files and apply margin before generating quote.',
        variant: 'destructive',
      });
      return;
    }

    const margin = selectedMargin === 'custom' ? parseFloat(customMargin) : parseFloat(selectedMargin);
    if (isNaN(margin) || margin <= 0) {
      toast({
        title: 'Invalid margin',
        description: 'Please select a valid margin percentage.',
        variant: 'destructive',
      });
      return;
    }

    // Convert extracted items to BOM items (omit id for insert schema)
    const bomItems = previewPrices.map((item, index) => ({
      no: (index + 1).toString(),
      partNumber: item.id,
      productDescription: item.description,
      qty: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    }));

    // Create quote data structure matching the backend schema
    const quoteData = {
      quote: {
        quoteSubject: `Quote for ${parsedData.supplier}`,
        customerCompany: parsedData.supplier,
        customerLogo: '',
        salesPersonName: 'David Gilboa',
        date: new Date().toISOString().split('T')[0],
        version: '1',
        paymentTerms: 'Current +30',
        currency: 'ILS',
        bomEnabled: true,
        costsEnabled: false,
        columnVisibility: {
          no: true,
          partNumber: true,
          productDescription: true,
          qty: true,
          unitPrice: true,
          totalPrice: true,
        },
        contactInfo: {
          salesPersonName: 'David Gilboa',
          phone: '+97252-750-3069',
          email: 'david.gilboa@emetdorcom.co.il',
        },
      },
      bomItems: bomItems,
      costItems: [],
    };

    // Save quote to localStorage for immediate form population
    localStorage.setItem('moonquote-draft', JSON.stringify({
      ...quoteData.quote,
      bomItems: bomItems,
      costItems: [],
    }));

    createQuoteMutation.mutate(quoteData);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Import Supplier Quote</h1>
          <p className="text-muted-foreground">Process supplier quotes and generate professional sales quotes</p>
        </div>
        <Link href="/">
          <Button variant="outline" data-testid="button-back-home">
            Back to Quote Generator
          </Button>
        </Link>
      </div>

      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Supplier Files
          </CardTitle>
          <CardDescription>
            Drag and drop PDF quotes, Excel spreadsheets, or email files (.eml, .msg)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            data-testid="dropzone-upload"
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg mb-2">Drop files here or click to browse</p>
            <p className="text-sm text-muted-foreground mb-4">
              Supports PDF, Excel (.xlsx, .xls), and Email (.eml, .msg) files
            </p>
            <input
              type="file"
              multiple
              accept=".pdf,.xlsx,.xls,.eml,.msg,message/rfc822"
              onChange={(e) => e.target.files && setFiles(Array.from(e.target.files))}
              className="hidden"
              id="file-upload"
              data-testid="input-file-upload"
            />
            <Label htmlFor="file-upload">
              <Button variant="outline" className="cursor-pointer" data-testid="button-browse-files">
                Browse Files
              </Button>
            </Label>
          </div>

          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="font-medium">Selected Files:</h4>
              {files.map((file, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                  {getFileIcon(file)}
                  <span className="flex-1">{file.name}</span>
                  <Badge variant="secondary">{(file.size / 1024 / 1024).toFixed(2)} MB</Badge>
                </div>
              ))}
              <Button 
                onClick={handleFileUpload} 
                disabled={uploading}
                className="w-full mt-4"
                data-testid="button-parse-files"
              >
                {parsing ? 'Parsing Files...' : 'Parse Files'}
              </Button>
            </div>
          )}

          {parsing && (
            <div className="mt-4">
              <Progress value={33} className="mb-2" />
              <p className="text-sm text-muted-foreground">Extracting data from supplier files...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Margin Selection */}
      {parsedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Apply Margin
            </CardTitle>
            <CardDescription>
              Select your desired profit margin to calculate selling prices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="margin-select">Profit Margin</Label>
                <Select value={selectedMargin} onValueChange={handleMarginChange}>
                  <SelectTrigger data-testid="select-margin">
                    <SelectValue placeholder="Select margin percentage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10% Margin</SelectItem>
                    <SelectItem value="15">15% Margin</SelectItem>
                    <SelectItem value="20">20% Margin</SelectItem>
                    <SelectItem value="25">25% Margin</SelectItem>
                    <SelectItem value="30">30% Margin</SelectItem>
                    <SelectItem value="35">35% Margin</SelectItem>
                    <SelectItem value="40">40% Margin</SelectItem>
                    <SelectItem value="custom">Custom Margin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedMargin === 'custom' && (
                <div>
                  <Label htmlFor="custom-margin">Custom Margin (%)</Label>
                  <Input
                    id="custom-margin"
                    type="number"
                    placeholder="Enter margin percentage"
                    value={customMargin}
                    onChange={(e) => handleCustomMarginChange(e.target.value)}
                    data-testid="input-custom-margin"
                  />
                </div>
              )}
            </div>

            {previewPrices.length > 0 && (
              <Alert>
                <CheckCircle className="w-4 h-4" />
                <AlertDescription>
                  Total value with {selectedMargin === 'custom' ? customMargin : selectedMargin}% margin: 
                  <strong className="ml-2">₪{totalOriginalValue.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</strong>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Extracted Data Preview */}
      {parsedData && (
        <Card>
          <CardHeader>
            <CardTitle>Extracted Data Preview</CardTitle>
            <CardDescription>
              Review the extracted items from supplier: <strong>{parsedData.supplier}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(previewPrices.length > 0 ? previewPrices : parsedData.items).map((item, index) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.description}</h4>
                    <p className="text-sm text-muted-foreground">
                      Quantity: {item.quantity} {item.unit || 'units'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      ₪{item.unitPrice.toLocaleString('he-IL', { minimumFractionDigits: 2 })} per unit
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total: ₪{item.totalPrice.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}

              <Separator />

              <div className="flex justify-between items-center font-bold text-lg">
                <span>Total Quote Value:</span>
                <span>₪{totalOriginalValue.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</span>
              </div>

              {previewPrices.length > 0 && (
                <div className="flex gap-4 mt-6">
                  <Button 
                    className="flex-1" 
                    onClick={handleGenerateQuote}
                    disabled={createQuoteMutation.isPending}
                    data-testid="button-generate-quote"
                  >
                    {createQuoteMutation.isPending ? 'Creating Quote...' : 'Generate Professional Quote'}
                  </Button>
                  <Button variant="outline" data-testid="button-review-items">
                    Review & Edit Items
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}