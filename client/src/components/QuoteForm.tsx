import { useState, useEffect, useCallback } from "react";
import { useDebounce } from "../hooks/use-debounce";
import QuoteHeader from "./QuoteHeader";
import BomSection from "./BomSection";
import CostSection from "./CostSection";
import QuotePreview from "./QuotePreview";
import MainLayout from "./MainLayout";
import type { QuoteFormData, ColumnVisibility, ContactInfo } from "@shared/schema";

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