import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import QuotePreview from '@/components/QuotePreview';
import type { ColumnVisibility, ContactInfo } from '@shared/schema';

interface BomItem {
  no: number;
  partNumber: string;
  productDescription: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
}

interface CostItem {
  productDescription: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isDiscount: boolean;
}

interface QuoteData {
  quoteSubject: string;
  customerCompany: string;
  customerLogo?: string;
  salesPersonName: string;
  date: string;
  version: string;
  paymentTerms: string;
  currency: string;
  bomEnabled: boolean;
  costsEnabled: boolean;
  columnVisibility: ColumnVisibility;
  contactInfo: ContactInfo;
  bomItems: BomItem[];
  costItems: CostItem[];
}

export default function PrintPage() {
  const [location] = useLocation();
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadQuoteData = async () => {
      try {
        // Get jobId from URL params
        const urlParams = new URLSearchParams(location.split('?')[1] || '');
        const jobId = urlParams.get('jobId');
        
        if (jobId) {
          // Fetch quote data from export job API
          const response = await fetch(`/api/export/job/${jobId}`);
          if (response.ok) {
            const data = await response.json();
            setQuoteData(data.quoteData);
          } else {
            throw new Error('Failed to load export job data');
          }
        } else {
          // Fallback to localStorage
          const savedData = localStorage.getItem('quoteData');
          if (savedData) {
            const data = JSON.parse(savedData);
            // Map data structure to QuoteData interface
            setQuoteData({
              quoteSubject: data.quote?.subject || data.quoteSubject || '',
              customerCompany: data.quote?.customer || data.customerCompany || '',
              customerLogo: data.customerLogo,
              salesPersonName: data.quote?.salesPerson || data.salesPersonName || '',
              date: data.date || new Date().toISOString().split('T')[0],
              version: data.version || '1',
              paymentTerms: data.quote?.terms || data.paymentTerms || 'Current +30',
              currency: data.quote?.currency || data.currency || 'USD',
              bomEnabled: data.bomEnabled ?? true,
              costsEnabled: data.costsEnabled ?? true,
              columnVisibility: data.columnVisibility || {
                no: true,
                partNumber: true,
                productDescription: true,
                qty: true,
                unitPrice: false,
                totalPrice: false
              },
              contactInfo: data.contact || data.contactInfo || {
                salesPersonName: '',
                phone: '+972-XXX-XXXX',
                email: 'info@emetdorcom.com'
              },
              bomItems: data.bomItems || [],
              costItems: data.costItems || []
            });
          }
        }
      } catch (error) {
        console.error('Failed to load quote data for print:', error);
        // Set basic fallback data to prevent crashes
        setQuoteData({
          quoteSubject: 'Quote',
          customerCompany: 'Customer',
          salesPersonName: 'Sales Rep',
          date: new Date().toISOString().split('T')[0],
          version: '1',
          paymentTerms: 'Current +30',
          currency: 'USD',
          bomEnabled: true,
          costsEnabled: true,
          columnVisibility: {
            no: true,
            partNumber: true,
            productDescription: true,
            qty: true,
            unitPrice: false,
            totalPrice: false
          },
          contactInfo: {
            salesPersonName: '',
            phone: '+972-XXX-XXXX',
            email: 'info@emetdorcom.com'
          },
          bomItems: [],
          costItems: []
        });
      }
    };

    loadQuoteData();
  }, [location]);

  useEffect(() => {
    if (!quoteData) return;

    const prepareForPrint = async () => {
      // Wait for images to load
      const images = document.querySelectorAll('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = () => resolve(void 0);
          img.onerror = () => resolve(void 0);
          // Timeout after 5 seconds
          setTimeout(() => resolve(void 0), 5000);
        });
      }));

      // Wait for fonts to load
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      // Additional delay for layout stabilization
      await new Promise(resolve => setTimeout(resolve, 500));

      // Set readiness flag for Playwright
      (window as any).__EXPORT_READY = true;
      setIsReady(true);
    };

    prepareForPrint();
  }, [quoteData]);

  if (!quoteData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading quote data...</div>
      </div>
    );
  }

  return (
    <div className="print-layout">
      <style>{`
        @page {
          size: A4;
          margin: 0;
        }
        
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .print-layout {
            transform: none !important;
            zoom: 1 !important;
          }
          
          /* Hide print controls */
          .print-controls {
            display: none !important;
          }
        }
        
        .print-layout {
          width: 100vw;
          min-height: 100vh;
          background: #f0f0f0;
          margin: 0;
          padding: 0;
        }
        
        /* Override QuotePreview styles for print */
        .quote-preview-print {
          zoom: 1 !important;
          transform: none !important;
          width: 210mm !important;
          margin: 0 auto;
          background: white;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        
        /* Hide interactive elements */
        .print-controls,
        .hover\\:bg-blue-50,
        .cursor-pointer {
          pointer-events: none !important;
        }
      `}</style>
      
      <div className="quote-preview-print">
        <QuotePreview
          quoteSubject={quoteData.quoteSubject}
          customerCompany={quoteData.customerCompany}
          customerLogo={quoteData.customerLogo}
          salesPersonName={quoteData.salesPersonName}
          date={quoteData.date}
          version={quoteData.version}
          paymentTerms={quoteData.paymentTerms}
          currency={quoteData.currency}
          bomEnabled={quoteData.bomEnabled}
          costsEnabled={quoteData.costsEnabled}
          columnVisibility={quoteData.columnVisibility}
          contactInfo={quoteData.contactInfo}
          bomItems={quoteData.bomItems}
          costItems={quoteData.costItems}
        />
      </div>
      
      {/* Readiness indicator for debugging */}
      {isReady && (
        <div 
          id="export-ready-indicator" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '1px', 
            height: '1px', 
            opacity: 0,
            pointerEvents: 'none'
          }}
          data-ready="true"
        />
      )}
    </div>
  );
}