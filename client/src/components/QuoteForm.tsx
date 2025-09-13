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
import { Download, FileSpreadsheet } from "lucide-react";
import ExcelUpload from "./ExcelUpload";
import { useToast } from "@/hooks/use-toast";
import type { QuoteFormData, ColumnVisibility, ContactInfo } from "@shared/schema";
import type { ParsedExcelData } from "../lib/excelParser";

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
  bomItems: [],
  costItems: [],
};

export default function QuoteForm() {
  const [formData, setFormData] = useState<QuoteFormData>(MOCK_INITIAL_DATA);
  const [customerLogoUrl, setCustomerLogoUrl] = useState<string>("");
  const { toast } = useToast();

  // Debounce form data for performance optimization (200ms as specified)
  const debouncedFormData = useDebounce(formData, 200);

  useEffect(() => {
    // Load saved data from localStorage on component mount
    // TODO: Remove mock functionality - replace with API call
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
          }
        };
        setFormData(mergedData);
        console.log('Loaded saved quote data with defaults');
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
          bomItems={formData.bomItems}
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
      bomItems={debouncedFormData.bomItems}
      costItems={debouncedFormData.costItems}
      onSectionClick={handleSectionClick}
    />
  );

  return (
    <MainLayout
      inputPanel={inputPanel}
      previewPanel={previewPanel}
      onSave={handleSave}
    />
  );
}