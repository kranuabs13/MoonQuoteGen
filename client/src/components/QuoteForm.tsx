import { useState, useEffect, useCallback } from "react";
import { useDebounce } from "../hooks/use-debounce";
import QuoteHeader from "./QuoteHeader";
import BomSection from "./BomSection";
import CostSection from "./CostSection";
import QuotePreview from "./QuotePreview";
import MainLayout from "./MainLayout";
import { downloadExcelTemplate, downloadBomOnlyTemplate } from "../lib/excelTemplate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet, Save, FolderOpen, FileText, Plus, Trash2 } from "lucide-react";
import ExcelUpload from "./ExcelUpload";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { QuoteFormData, ColumnVisibility, ContactInfo, BomGroup, TemplateSettings } from "@shared/schema";
import type { ParsedExcelData } from "../lib/excelParser";

// Import defaultTemplateSettings with proper ES6 import and fallback
import * as schemaModule from "@shared/schema";

const defaultTemplateSettings: TemplateSettings = schemaModule.defaultTemplateSettings || {
  templateId: 'default',
  frameColor: '#1f2937',
  introText: 'This quote outlines the proposed solution for your requirements. Please review the specifications and pricing details.',
  tableHeaderColor: '#f3f4f6',
};

// Migration utility to convert legacy bomItems to bomGroups
function migrateLegacyBomData(data: any): QuoteFormData {
  // If data has bomItems but no bomGroups, migrate to bomGroups format
  if (data.bomItems && !data.bomGroups) {
    const bomGroup: BomGroup = {
      id: 'bom-1',
      name: 'BOM 1',
      items: data.bomItems
    };
    return {
      ...data,
      bomGroups: [bomGroup],
      bomItems: data.bomItems // Keep legacy for compatibility
    };
  }
  
  // If no bomGroups and no bomItems, ensure both exist
  if (!data.bomGroups && !data.bomItems) {
    return {
      ...data,
      bomGroups: [],
      bomItems: []
    };
  }
  
  return data;
}

// TODO: Remove mock functionality - this will be replaced with real data persistence
const MOCK_INITIAL_DATA: QuoteFormData = {
  quoteSubject: "",
  customerCompany: "",
  customerLogo: "",
  salesPersonName: "",
  date: new Date().toISOString().split('T')[0],
  version: "1",
  paymentTerms: "Current +30",
  currency: "USD",
  bomEnabled: true,
  costsEnabled: true,
  columnVisibility: {
    no: true,
    partNumber: true,
    productDescription: true,
    qty: true,
    unitPrice: false,
    totalPrice: false,
  },
  contactInfo: {
    salesPersonName: "David Gilboa",
    phone: "+97252-750-3069",
    email: "david.gilboa@emetdorcom.co.il",
  },
  bomGroups: [],
  bomItems: [], // Legacy compatibility
  costItems: [],
  templateSettings: defaultTemplateSettings,
  lastModified: new Date().toISOString(),
};

export default function QuoteForm() {
  const [formData, setFormData] = useState<QuoteFormData>(MOCK_INITIAL_DATA);
  const [customerLogoUrl, setCustomerLogoUrl] = useState<string>("");
  const [currentQuoteId, setCurrentQuoteId] = useState<string | null>(null);
  const [quoteName, setQuoteName] = useState<string>("");
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);
  const [isSaveAsDialogOpen, setIsSaveAsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debounce form data for performance optimization (200ms as specified)
  const debouncedFormData = useDebounce(formData, 200);

  // API queries and mutations for quote management
  const { data: quotes = [], isLoading: isLoadingQuotes } = useQuery({
    queryKey: ['/api/quote-forms'],
    enabled: isOpenDialogOpen, // Only fetch when dialog is open for performance
  });

  const saveQuoteMutation = useMutation({
    mutationFn: (quoteData: QuoteFormData) => {
      const body = {
        ...quoteData,
        lastModified: new Date().toISOString(),
      };
      return currentQuoteId
        ? apiRequest(`/api/quote-forms/${currentQuoteId}`, { method: 'PUT', body })
        : apiRequest('/api/quote-forms', { method: 'POST', body });
    },
    onSuccess: (savedQuote) => {
      if (!currentQuoteId) {
        setCurrentQuoteId(savedQuote.id);
        setQuoteName(savedQuote.quoteSubject || 'Untitled Quote');
      }
      queryClient.invalidateQueries({ queryKey: ['/api/quote-forms'] });
      toast({
        title: "Quote saved successfully!",
        description: `Quote "${savedQuote.quoteSubject || 'Untitled'}" has been saved.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save quote",
        description: error.message || "An error occurred while saving the quote.",
        variant: "destructive",
      });
    },
  });

  const deleteQuoteMutation = useMutation({
    mutationFn: (quoteId: string) => apiRequest(`/api/quote-forms/${quoteId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quote-forms'] });
      toast({
        title: "Quote deleted",
        description: "The quote has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete quote",
        description: error.message || "An error occurred while deleting the quote.",
        variant: "destructive",
      });
    },
  });

  // Quote management handlers
  const handleSaveQuote = () => {
    saveQuoteMutation.mutate(formData);
  };

  const handleSaveAsQuote = (newName: string) => {
    const quoteToSave = {
      ...formData,
      quoteSubject: newName || formData.quoteSubject,
    };
    // Reset current quote ID to force a new quote creation
    const originalId = currentQuoteId;
    setCurrentQuoteId(null);
    saveQuoteMutation.mutate(quoteToSave);
    setIsSaveAsDialogOpen(false);
    setQuoteName(newName || formData.quoteSubject);
  };

  const handleOpenQuote = (quote: any) => {
    const migratedData = migrateLegacyBomData(quote);
    setFormData(migratedData);
    setCurrentQuoteId(quote.id);
    setQuoteName(quote.quoteSubject || 'Untitled Quote');
    setIsOpenDialogOpen(false);
    toast({
      title: "Quote loaded",
      description: `Opened quote "${quote.quoteSubject || 'Untitled'}"`,
    });
  };

  const handleNewQuote = () => {
    setFormData(MOCK_INITIAL_DATA);
    setCurrentQuoteId(null);
    setQuoteName("");
    setCustomerLogoUrl("");
    toast({
      title: "New quote created",
      description: "Started with a blank quote form.",
    });
  };

  const handleDeleteQuote = (quoteId: string) => {
    deleteQuoteMutation.mutate(quoteId);
  };

  useEffect(() => {
    // Load saved data from localStorage on component mount for backwards compatibility
    // This will be migrated to proper quote loading in the future
    const savedData = localStorage.getItem('moonquote-draft');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        // Merge with defaults to handle missing fields from old saves
        const mergedData = {
          ...MOCK_INITIAL_DATA,
          ...parsed,
          // Ensure nested objects are properly merged
          columnVisibility: {
            ...MOCK_INITIAL_DATA.columnVisibility,
            ...(parsed.columnVisibility || {})
          },
          contactInfo: {
            ...MOCK_INITIAL_DATA.contactInfo,
            ...(parsed.contactInfo || {})
          },
          templateSettings: {
            ...MOCK_INITIAL_DATA.templateSettings,
            ...(parsed.templateSettings || {})
          }
        };
        
        // Apply migration for legacy data
        const migratedData = migrateLegacyBomData(mergedData);
        setFormData(migratedData);
        console.log('Loaded saved quote data with defaults and migration');
      } catch (error) {
        console.error('Failed to load saved data:', error);
      }
    }
  }, []);

  const saveToLocalStorage = useCallback(() => {
    // TODO: Remove mock functionality - replace with API call
    localStorage.setItem('moonquote-draft', JSON.stringify(formData));
    console.log('Quote auto-saved');
  }, [formData]);

  useEffect(() => {
    // Auto-save functionality
    if (formData !== MOCK_INITIAL_DATA) {
      saveToLocalStorage();
    }
  }, [debouncedFormData, saveToLocalStorage]);

  const handleLogoChange = (file: File | null) => {
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomerLogoUrl(url);
      setFormData(prev => ({ ...prev, customerLogo: file.name }));
      console.log('Customer logo updated:', file.name);
    } else {
      setCustomerLogoUrl("");
      setFormData(prev => ({ ...prev, customerLogo: "" }));
      console.log('Customer logo removed');
    }
  };

  const handleSectionClick = (section: string) => {
    console.log(`Jumping to section: ${section}`);
    // TODO: Implement section focus functionality
    // This would scroll the input panel to the corresponding section
  };

  const handleExcelDataParsed = (data: ParsedExcelData) => {
    let updatedData = { ...formData };
    let changesCount = 0;

    // Update quote info if available
    if (data.quoteInfo) {
      const quoteUpdates = Object.entries(data.quoteInfo).filter(([_, value]) => value !== undefined && value !== '');
      if (quoteUpdates.length > 0) {
        Object.assign(updatedData, data.quoteInfo);
        changesCount += quoteUpdates.length;
      }
    }

    // Update BOM items if available
    if (data.bomItems && data.bomItems.length > 0) {
      updatedData.bomItems = data.bomItems;
      changesCount += data.bomItems.length;
    }

    // Update cost items if available
    if (data.costItems && data.costItems.length > 0) {
      updatedData.costItems = data.costItems;
      changesCount += data.costItems.length;
    }

    // Apply all updates
    if (changesCount > 0) {
      setFormData(updatedData);
      
      toast({
        title: "Excel data imported successfully!",
        description: `Imported ${changesCount} items. ${data.warnings.length > 0 ? `${data.warnings.length} warnings generated.` : ''}`,
      });

      // Log the import for debugging
      console.log('Excel data imported:', {
        quoteInfo: data.quoteInfo,
        bomItemsCount: data.bomItems?.length || 0,
        costItemsCount: data.costItems?.length || 0,
        warnings: data.warnings,
      });
    } else {
      toast({
        title: "No data to import",
        description: "The Excel file didn't contain any recognizable data to import.",
        variant: "destructive",
      });
    }
  };

  const handleExcelError = (error: string) => {
    toast({
      title: "Excel import failed",
      description: error,
      variant: "destructive",
    });
    console.error('Excel import error:', error);
  };

  const handleSave = () => {
    saveToLocalStorage();
    console.log('Manual save triggered');
  };

  const inputPanel = (
    <div className="space-y-6" data-testid="input-form">
      {/* Quote Management Section */}
      <Card data-testid="card-quote-management">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Quote Management
            </div>
            {currentQuoteId && (
              <Badge variant="outline" data-testid="badge-current-quote">
                {quoteName || formData.quoteSubject || 'Untitled Quote'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleSaveQuote}
              disabled={saveQuoteMutation.isPending}
              data-testid="button-save-quote"
            >
              <Save className="h-4 w-4 mr-2" />
              {currentQuoteId ? 'Save' : 'Save Quote'}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setIsSaveAsDialogOpen(true)}
              disabled={saveQuoteMutation.isPending}
              data-testid="button-save-as-quote"
            >
              <Save className="h-4 w-4 mr-2" />
              Save As...
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setIsOpenDialogOpen(true)}
              data-testid="button-open-quote"
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Open Quote
            </Button>
            
            <Button
              variant="outline"
              onClick={handleNewQuote}
              data-testid="button-new-quote"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Quote
            </Button>
          </div>
        </CardContent>
      </Card>

      <QuoteHeader
        quoteSubject={formData.quoteSubject}
        customerCompany={formData.customerCompany}
        customerLogo={customerLogoUrl}
        salesPersonName={formData.salesPersonName}
        date={formData.date}
        version={formData.version}
        paymentTerms={formData.paymentTerms}
        currency={formData.currency}
        bomEnabled={formData.bomEnabled}
        costsEnabled={formData.costsEnabled}
        contactInfo={formData.contactInfo}
        onQuoteSubjectChange={(value) => 
          setFormData(prev => ({ ...prev, quoteSubject: value }))
        }
        onCustomerCompanyChange={(value) => 
          setFormData(prev => ({ ...prev, customerCompany: value }))
        }
        onCustomerLogoChange={handleLogoChange}
        onSalesPersonChange={(value) => 
          setFormData(prev => ({ ...prev, salesPersonName: value }))
        }
        onDateChange={(value) => 
          setFormData(prev => ({ ...prev, date: value }))
        }
        onVersionChange={(value) => 
          setFormData(prev => ({ ...prev, version: value }))
        }
        onPaymentTermsChange={(value) => 
          setFormData(prev => ({ ...prev, paymentTerms: value }))
        }
        onCurrencyChange={(value) => 
          setFormData(prev => ({ ...prev, currency: value }))
        }
        onBomEnabledChange={(enabled) => 
          setFormData(prev => ({ ...prev, bomEnabled: enabled }))
        }
        onCostsEnabledChange={(enabled) => 
          setFormData(prev => ({ ...prev, costsEnabled: enabled }))
        }
        onContactInfoChange={(contactInfo) => 
          setFormData(prev => ({ ...prev, contactInfo }))
        }
      />

      <Card data-testid="card-excel-templates">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Excel Templates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Download Excel templates to fill out your quote data offline, then upload to auto-populate the form.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                downloadExcelTemplate('complete-quote-template.xlsx', {
                  includeQuoteInfo: true,
                  includeBomItems: formData.bomEnabled,
                  includeCostItems: formData.costsEnabled,
                  columnVisibility: formData.columnVisibility
                });
              }}
              data-testid="button-download-complete-template"
            >
              <Download className="h-4 w-4 mr-2" />
              Complete Template
            </Button>
            {formData.bomEnabled && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  downloadBomOnlyTemplate('bom-template.xlsx', formData.columnVisibility);
                }}
                data-testid="button-download-bom-template"
              >
                <Download className="h-4 w-4 mr-2" />
                BOM Only
              </Button>
            )}
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2">Upload Filled Template</h4>
            <ExcelUpload
              onDataParsed={handleExcelDataParsed}
              onError={handleExcelError}
              parseOptions={{
                validateData: true,
                allowPartialData: true
              }}
            />
          </div>
        </CardContent>
      </Card>

      {formData.bomEnabled && (
        <BomSection
          bomEnabled={formData.bomEnabled}
          bomItems={formData.bomItems || []}
          columnVisibility={formData.columnVisibility}
          onBomEnabledChange={(enabled) => 
            setFormData(prev => ({ ...prev, bomEnabled: enabled }))
          }
          onBomItemsChange={(items) => 
            setFormData(prev => ({ ...prev, bomItems: items }))
          }
          onColumnVisibilityChange={(columnVisibility) => 
            setFormData(prev => ({ ...prev, columnVisibility }))
          }
        />
      )}

      {formData.costsEnabled && (
        <CostSection
          costItems={formData.costItems}
          onCostItemsChange={(items) => 
            setFormData(prev => ({ ...prev, costItems: items }))
          }
        />
      )}
    </div>
  );

  const previewPanel = (
    <QuotePreview
      quoteSubject={debouncedFormData.quoteSubject}
      customerCompany={debouncedFormData.customerCompany}
      customerLogo={customerLogoUrl}
      salesPersonName={debouncedFormData.salesPersonName}
      date={debouncedFormData.date}
      version={debouncedFormData.version}
      paymentTerms={debouncedFormData.paymentTerms}
      currency={debouncedFormData.currency}
      bomEnabled={debouncedFormData.bomEnabled}
      costsEnabled={debouncedFormData.costsEnabled}
      columnVisibility={debouncedFormData.columnVisibility}
      contactInfo={debouncedFormData.contactInfo}
      bomItems={debouncedFormData.bomItems || []}
      costItems={debouncedFormData.costItems}
      onSectionClick={handleSectionClick}
    />
  );

  return (
    <>
      <MainLayout
        inputPanel={inputPanel}
        previewPanel={previewPanel}
        onSave={handleSave}
      />
      
      {/* Save As Dialog */}
      <Dialog open={isSaveAsDialogOpen} onOpenChange={setIsSaveAsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Quote As</DialogTitle>
            <DialogDescription>
              Save this quote with a new name to create a copy.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quote-name" className="text-right">
                Quote Name
              </Label>
              <Input
                id="quote-name"
                placeholder="Enter quote name..."
                defaultValue={formData.quoteSubject}
                className="col-span-3"
                data-testid="input-quote-name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.target as HTMLInputElement;
                    handleSaveAsQuote(input.value);
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSaveAsDialogOpen(false)}
              data-testid="button-cancel-save-as"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                const input = document.getElementById('quote-name') as HTMLInputElement;
                handleSaveAsQuote(input?.value || '');
              }}
              disabled={saveQuoteMutation.isPending}
              data-testid="button-confirm-save-as"
            >
              {saveQuoteMutation.isPending ? 'Saving...' : 'Save As'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Open Quote Dialog */}
      <Dialog open={isOpenDialogOpen} onOpenChange={setIsOpenDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Open Quote</DialogTitle>
            <DialogDescription>
              Select a quote to open and edit.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 overflow-y-auto max-h-[60vh]">
            {isLoadingQuotes ? (
              <div className="text-center py-8">
                <p>Loading quotes...</p>
              </div>
            ) : quotes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No saved quotes found.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Start creating quotes and they will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {quotes.map((quote: any) => (
                  <div
                    key={quote.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                    data-testid={`quote-item-${quote.id}`}
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">
                        {quote.quoteSubject || 'Untitled Quote'}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span>Customer: {quote.customerCompany || 'N/A'}</span>
                        <span>Version: {quote.version || '1'}</span>
                        <span>
                          Modified: {new Date(quote.lastModified).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenQuote(quote)}
                        data-testid={`button-open-quote-${quote.id}`}
                      >
                        <FolderOpen className="h-4 w-4 mr-2" />
                        Open
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteQuote(quote.id)}
                        disabled={deleteQuoteMutation.isPending}
                        data-testid={`button-delete-quote-${quote.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpenDialogOpen(false)}
              data-testid="button-close-open-dialog"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}