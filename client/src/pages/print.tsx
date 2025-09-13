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
        // Get jobId from URL params using window.location.search
        const urlParams = new URLSearchParams(window.location.search);
        const jobId = urlParams.get('jobId');
        
        if (jobId) {
          console.log('Print page: Fetching export job data for jobId:', jobId);
          // Fetch quote data from export job API
          const response = await fetch(`/api/export/job/${jobId}`);
          console.log('Print page: Export job API response status:', response.status);
          if (response.ok) {
            const data = await response.json();
            console.log('Print page: Export job data received:', data);
            setQuoteData(data.quoteData);
          } else {
            const errorText = await response.text();
            console.error('Print page: Export job API failed:', response.status, errorText);
            throw new Error(`Failed to load export job data: ${response.status} ${errorText}`);
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
  }, []);  // Remove location dependency since we're using window.location.search

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

      // Wait for CSS background images to load
      const elementsWithBackgrounds = Array.from(document.querySelectorAll('*')).filter(el => {
        const style = window.getComputedStyle(el);
        const bgImage = style.backgroundImage;
        return bgImage && bgImage !== 'none' && bgImage.includes('url(');
      });

      await Promise.all(elementsWithBackgrounds.map(el => {
        const style = window.getComputedStyle(el);
        const bgImage = style.backgroundImage;
        const urlMatches = bgImage.match(/url\(["']?([^"')]+)["']?\)/g);
        
        if (urlMatches) {
          return Promise.all(urlMatches.map(urlMatch => {
            const url = urlMatch.replace(/url\(["']?([^"')]+)["']?\)/, '$1');
            return new Promise((resolve) => {
              const img = new Image();
              img.onload = () => resolve(void 0);
              img.onerror = () => resolve(void 0);
              img.src = url;
              // Timeout after 5 seconds
              setTimeout(() => resolve(void 0), 5000);
            });
          }));
        }
        return Promise.resolve();
      }));

      // Wait for fonts to load
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      // Additional delay for layout stabilization
      await new Promise(resolve => setTimeout(resolve, 500));

      // Set readiness flag for external tools
      (window as any).__EXPORT_READY = true;
      setIsReady(true);
    };

    prepareForPrint();
  }, [quoteData]);

  // Auto-print functionality
  useEffect(() => {
    if (!isReady) return;
    
    // Check if auto-print is enabled via URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const shouldAutoPrint = urlParams.get('auto') === '1';
    
    if (shouldAutoPrint) {
      console.log('Auto-printing enabled, triggering print dialog...');
      
      // Small delay to ensure everything is rendered
      setTimeout(() => {
        window.print();
        
        // Set up event listener to close the tab after printing
        const handleAfterPrint = () => {
          console.log('Print dialog closed, closing tab...');
          window.removeEventListener('afterprint', handleAfterPrint);
          // Close the tab if it was opened by the export function
          if (window.opener) {
            window.close();
          }
        };
        
        window.addEventListener('afterprint', handleAfterPrint);
        
        // Fallback: close tab after 10 seconds if user doesn't print
        setTimeout(() => {
          if (window.opener) {
            console.log('Auto-closing tab after timeout...');
            window.removeEventListener('afterprint', handleAfterPrint);
            window.close();
          }
        }, 10000);
      }, 200);
    }
  }, [isReady]);  // Remove location dependency since we're using window.location.search

  if (!quoteData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading quote data...</div>
      </div>
    );
  }

  return (
    <div className="print-document">
      {/* Debug information for diagnosing PDF export issues */}
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        right: 0, 
        background: 'yellow', 
        padding: '10px', 
        zIndex: 9999,
        fontSize: '12px',
        maxWidth: '300px'
      }}>
        <div><strong>DEBUG INFO:</strong></div>
        <div>Ready: {isReady ? 'YES' : 'NO'}</div>
        <div>Subject: {quoteData.quoteSubject || 'MISSING'}</div>
        <div>Company: {quoteData.customerCompany || 'MISSING'}</div>
        <div>Sales: {quoteData.salesPersonName || 'MISSING'}</div>
        <div>BOM Items: {quoteData.bomItems?.length || 0}</div>
        <div>CSS Class: print-document</div>
        <div>JobId: {new URLSearchParams(window.location.search).get('jobId') || 'NONE'}</div>
      </div>

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
        showControls={false}
      />
      
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