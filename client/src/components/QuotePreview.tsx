import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import emetLogo from "@assets/image_1757577759606.png";
import techDiagram from "@assets/image_1757577458643.png";
import frameImage from "@assets/image_1757577550193.png";
import type { ColumnVisibility, ContactInfo, TemplateSettings, BomGroup } from "@shared/schema";

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

interface QuotePreviewProps {
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
  bomGroups: BomGroup[];
  costItems: CostItem[];
  onSectionClick?: (section: string) => void;
  showControls?: boolean;
  templateSettings?: TemplateSettings;
}

export default function QuotePreview({
  quoteSubject,
  customerCompany,
  customerLogo,
  salesPersonName,
  date,
  version,
  paymentTerms,
  currency,
  bomEnabled,
  costsEnabled,
  columnVisibility,
  contactInfo,
  bomGroups,
  costItems,
  onSectionClick,
  showControls = true,
  templateSettings,
}: QuotePreviewProps) {
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const previewRef = useRef<HTMLDivElement>(null);
  const wheelAccumRef = useRef(0);
  const lastFlipRef = useRef(0);

  const formatCurrency = (amount: number) => {
    // Map UI currency codes to valid ISO 4217 codes and locales
    const currencyConfig = {
      USD: { code: 'USD', locale: 'en-US' },
      NIS: { code: 'ILS', locale: 'he-IL' }, // NIS maps to ILS (Israeli New Shekel)
      EUR: { code: 'EUR', locale: 'de-DE' }
    };
    
    const config = currencyConfig[currency as keyof typeof currencyConfig] || currencyConfig.USD;
    
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.code,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-GB');
  };

  const grandTotal = costItems.reduce((sum, item) => {
    return sum + (item.isDiscount ? -item.totalPrice : item.totalPrice);
  }, 0);

  // Use contactInfo from props instead of hardcoded contacts
  const contact = contactInfo;

  // Use template settings with fallbacks
  const companyLogo = templateSettings?.companyLogo || emetLogo;
  const frameColor = templateSettings?.frameColor || '#1f2937';
  const introText = templateSettings?.introText || 'EMET Dorcom is one of the most successful and experienced companies in the field of computer infrastructure and integration with extensive knowledge, which includes all types of technologies in the IT market.';
  const tableHeaderColor = templateSettings?.tableHeaderColor || '#f3f4f6';
  const introImage = templateSettings?.introImage || techDiagram;

  const handleZoom = (direction: 'in' | 'out') => {
    setZoom(prev => {
      const newZoom = direction === 'in' ? prev + 25 : prev - 25;
      return Math.max(50, Math.min(150, newZoom));
    });
    console.log(`Zoom ${direction}: ${zoom}%`);
  };

  // Calculate total pages and page mapping
  const pages = [
    { id: 1, name: 'Cover', visible: true },
    { id: 2, name: 'Intro', visible: true },
    { id: 3, name: 'BOM & Costs', visible: bomEnabled || costsEnabled },
    { id: 4, name: 'Payment Terms', visible: true },
    { id: 5, name: 'IP & Contact', visible: true }
  ].filter(page => page.visible);

  const totalPages = pages.length;

  const handlePdfDownload = async () => {
    setIsGeneratingPdf(true);
    const originalPage = currentPage; // Move this outside try block for proper scope
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      let isFirstPage = true;

      // Capture each page
      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        // Navigate to the page
        setCurrentPage(pageIndex + 1);
        
        // Wait longer for the page to render completely
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Get the preview document element
        const previewElement = document.querySelector('[data-testid="preview-document"]') as HTMLElement;
        if (!previewElement) {
          throw new Error('Preview element not found');
        }

        // Capture the page as canvas with optimized settings
        const canvas = await html2canvas(previewElement, {
          scale: 1, // Reduced from 2 to prevent massive file sizes
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: 794, // Fixed A4 width at 96 DPI (210mm * 96/25.4)
          height: 1123, // Fixed A4 height at 96 DPI (297mm * 96/25.4)
          windowWidth: 794,
          windowHeight: 1123,
          scrollX: 0,
          scrollY: 0
        });

        // Convert canvas to compressed image data
        const imgData = canvas.toDataURL('image/jpeg', 0.85); // Use JPEG with 85% quality for smaller files
        
        // A4 dimensions in mm
        const imgWidth = 210; 
        const imgHeight = 297;
        
        // Add new page if not the first one
        if (!isFirstPage) {
          pdf.addPage();
        }
        isFirstPage = false;
        
        // Add image to PDF with exact A4 dimensions
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      }

      // Restore original page
      setCurrentPage(originalPage);
      
      // Generate timestamp for unique filename
      const timestamp = Date.now();
      const filename = `quote-${quoteSubject || 'untitled'}-${date || new Date().toISOString().split('T')[0]}_${timestamp}.pdf`;
      pdf.save(filename);
      
    } catch (error) {
      console.error('PDF download failed:', error);
      alert('Failed to generate PDF. Please try again.');
      
      // Restore original page in case of error
      setCurrentPage(originalPage);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Handle scroll between pages with smooth accumulated-delta approach
  useEffect(() => {
    const SCROLL_THRESHOLD = 150; // Threshold for page flip
    const COOLDOWN_MS = 300; // Minimum time between page flips
    
    const handleWheel = (e: WheelEvent) => {
      const now = Date.now();
      
      // Check cooldown period
      if (now - lastFlipRef.current < COOLDOWN_MS) {
        return;
      }
      
      // Accumulate scroll delta
      wheelAccumRef.current += e.deltaY;
      
      // Check if we should flip pages
      if (wheelAccumRef.current > SCROLL_THRESHOLD && currentPage < totalPages) {
        // Prevent default only when actually flipping
        e.preventDefault();
        setCurrentPage(prev => prev + 1);
        wheelAccumRef.current = 0;
        lastFlipRef.current = now;
      } else if (wheelAccumRef.current < -SCROLL_THRESHOLD && currentPage > 1) {
        // Prevent default only when actually flipping
        e.preventDefault();
        setCurrentPage(prev => prev - 1);
        wheelAccumRef.current = 0;
        lastFlipRef.current = now;
      }
      
      // Reset accumulator if at boundaries
      if ((currentPage >= totalPages && wheelAccumRef.current > 0) ||
          (currentPage <= 1 && wheelAccumRef.current < 0)) {
        wheelAccumRef.current = 0;
      }
    };

    const previewElement = previewRef.current;
    if (previewElement) {
      previewElement.addEventListener('wheel', handleWheel, { passive: false });
      
      return () => {
        previewElement.removeEventListener('wheel', handleWheel);
      };
    }
  }, [currentPage, totalPages]);

  // Handle bounds clamping in useEffect to avoid render-time state updates
  useEffect(() => {
    if (currentPage < 1) {
      setCurrentPage(1);
    } else if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };


  return (
    <Card className={`h-full ${isFullscreen ? 'fixed inset-0 z-50' : ''}`} data-testid="card-quote-preview">
      <CardContent className="p-0 h-full flex flex-col">
        {/* Preview Controls */}
        {showControls && (
        <div className="border-b p-2 flex items-center justify-between bg-muted/30 print-controls">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleZoom('out')}
              disabled={zoom <= 50}
              data-testid="button-zoom-out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[60px] text-center" data-testid="text-zoom-level">
              {zoom}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleZoom('in')}
              disabled={zoom >= 150}
              data-testid="button-zoom-in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Page Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePreviousPage}
              disabled={currentPage <= 1}
              data-testid="button-previous-page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[80px] text-center" data-testid="text-page-info">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              data-testid="button-next-page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              data-testid="button-fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handlePdfDownload}
              disabled={isGeneratingPdf}
              data-testid="button-download-pdf"
            >
              <Download className="h-4 w-4 mr-2" />
              {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
            </Button>
          </div>
        </div>
        )}

        {/* Quote Document Preview */}
        <div className="flex-1 overflow-auto bg-gray-100" ref={previewRef}>
          <div 
            className="mx-auto shadow-lg print:shadow-none relative"
            style={{ 
              zoom: `${zoom}%`,
              width: '210mm',
              minHeight: '297mm',
              fontFamily: 'Inter, sans-serif',
              // Better PDF rendering
              WebkitPrintColorAdjust: 'exact',
              colorAdjust: 'exact',
              printColorAdjust: 'exact'
            }}
            data-testid="preview-document"
          >
            {/* Render current page based on page state */}
            {(() => {
              const pageToRender = pages[currentPage - 1];
              
              switch (pageToRender?.id) {
                case 1: // Cover Page
                  return (
                    <div 
                      className="relative h-[297mm] p-0 overflow-hidden bg-white"
                      style={{
                        backgroundImage: `url(${frameImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                      }}
                    >
                      {/* EMET Dorcom Logo - Top Center, Large */}
                      <div className="absolute top-16 left-1/2 transform -translate-x-1/2">
                        <img 
                          src={companyLogo} 
                          alt="Company Logo" 
                          className="h-24 w-auto"
                          data-testid="company-logo-page1"
                          style={{ imageRendering: 'crisp-edges', maxWidth: 'none' }}
                          crossOrigin="anonymous"
                        />
                      </div>

                      {/* Cover Page Content */}
                      <div className="relative h-full flex flex-col justify-center items-center text-center px-16">
                        <div 
                          className="cursor-pointer hover:bg-white/10 p-4 rounded transition-colors w-full"
                          onClick={() => onSectionClick?.('header')}
                          data-testid="preview-header"
                        >
                          <h1 className="text-4xl font-bold text-black mb-4">Quotation For</h1>
                          <h2 className="text-3xl text-black mb-2 leading-tight">
                            {quoteSubject || 'Cisco Catalyst Switch'}
                          </h2>
                          
                          {/* Customer Logo */}
                          {customerLogo && (
                            <div className="mt-12 mb-12">
                              <img 
                                src={customerLogo} 
                                alt="Customer logo" 
                                className="h-20 w-auto mx-auto"
                                data-testid="preview-customer-logo"
                              />
                            </div>
                          )}
                        </div>

                        {/* Bottom Info */}
                        <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 text-center text-lg text-black">
                          <div>{salesPersonName || 'David Gilboa'} | {formatDate(date)} | Ver {version || '1'}</div>
                        </div>

                        {/* Page Number */}
                        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-black text-lg font-bold">
                          {currentPage}
                        </div>
                      </div>
                    </div>
                  );

                case 2: // Intro Page
                  return (
                    <div className="bg-white h-[297mm] p-0 relative">
                      {/* EMET Dorcom Logo - Top Left */}
                      <div className="absolute top-6 left-6">
                        <img 
                          src={companyLogo} 
                          alt="Company Logo" 
                          className="h-12 w-auto"
                          data-testid="company-logo-page2"
                        />
                      </div>

                      <div className="pt-20 px-12 pb-12">
                        {/* Intro Section */}
                        <div className="mb-12">
                          <h3 className="text-2xl font-bold mb-6 text-gray-900">Intro</h3>
                          <div className="text-base leading-relaxed space-y-4 text-gray-800">
                            <p>
                              {introText}
                            </p>
                            <p>
                              We provide comprehensive and complete solutions through the entire process and
                              accompanies our customers in all stages, starting from the stage of needs analysis,
                              planning the systems to the stages of assimilation, integration, and ongoing
                              maintenance of the systems.
                            </p>
                            <p>Dorcom's portfolio of solutions is extensive and enables the provision of a complete and diverse solution:</p>
                            <ul className="list-disc ml-8 space-y-2 text-base">
                              <li>Server and Storage</li>
                              <li>Backup and replication</li>
                              <li>Mobile and Workstation computing</li>
                              <li>Software and operating system</li>
                              <li>Networking - Switches and Wireless</li>
                              <li>Cybersecurity L2-L7</li>
                            </ul>
                            <p>
                              Throughout every technological solution supplied by Dorcom, our commitment to
                              professionalism is unwavering. We are proud to have partnerships with several the
                              world's leading IT manufacturers, including: HPE, HPI, DELL, NetApp, VERITAS,
                              Commvault, Veeam, Nutanix, Redhat, Aruba, Juniper, Fortinet, Cloudem.
                            </p>
                          </div>
                        </div>

                        {/* Technology Solutions Diagram */}
                        <div className="mb-8">
                          <img 
                            src={introImage} 
                            alt="Technology Solutions" 
                            className="w-full max-w-4xl mx-auto"
                            data-testid="tech-diagram"
                          />
                        </div>
                      </div>

                      {/* Page Number */}
                      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-gray-500 text-lg font-bold">
                        {currentPage}
                      </div>
                    </div>
                  );

                case 3: // BOM & Costs Page
                  return (
                    <div className="bg-white h-[297mm] p-0 relative">
                      {/* EMET Dorcom Logo - Top Left */}
                      <div className="absolute top-6 left-6">
                        <img 
                          src={companyLogo} 
                          alt="Company Logo" 
                          className="h-10 w-auto"
                          data-testid="company-logo-page3"
                        />
                      </div>

                      <div className="pt-20 px-12 pb-12">
                        {/* BOM Section */}
                        {bomEnabled && (
                          <div 
                            className="cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors mb-8"
                            onClick={() => onSectionClick?.('bom')}
                            data-testid="preview-bom"
                          >
                            <h3 className="text-2xl font-bold mb-4 text-gray-900">BOM</h3>
                            <h4 className="text-xl font-semibold mb-4 text-gray-800">{quoteSubject || 'Catalyst 9300 48-port PoE+'}</h4>
                            
                            {bomGroups.length > 0 ? (
                              <div className="space-y-6">
                                {bomGroups.map((group, groupIndex) => (
                                  <div key={group.id}>
                                    {/* Group Header */}
                                    <h5 className="text-lg font-semibold text-gray-800 mb-3">{group.name}</h5>
                                    
                                    {group.items.length > 0 ? (
                                      <table className="w-full border-collapse text-xs mb-6 border border-gray-300">
                                        <thead>
                                          <tr className="border-b-2 border-gray-400">
                                            {columnVisibility.no && <th className="text-left p-2 font-bold text-white border-r border-gray-300" style={{backgroundColor: templateSettings?.tableHeaderColor || '#4A90E2'}}>NO</th>}
                                            {columnVisibility.partNumber && <th className="text-left p-2 font-bold text-white border-r border-gray-300" style={{backgroundColor: templateSettings?.tableHeaderColor || '#4A90E2'}}>PN</th>}
                                            {columnVisibility.productDescription && <th className="text-left p-2 font-bold text-white border-r border-gray-300" style={{backgroundColor: templateSettings?.tableHeaderColor || '#4A90E2'}}>Product Description</th>}
                                            {columnVisibility.qty && <th className="text-left p-2 font-bold text-white border-r border-gray-300" style={{backgroundColor: templateSettings?.tableHeaderColor || '#4A90E2'}}>QTY</th>}
                                            {columnVisibility.unitPrice && <th className="text-left p-2 font-bold text-white border-r border-gray-300" style={{backgroundColor: templateSettings?.tableHeaderColor || '#4A90E2'}}>Unit Price</th>}
                                            {columnVisibility.totalPrice && <th className="text-left p-2 font-bold text-white" style={{backgroundColor: templateSettings?.tableHeaderColor || '#4A90E2'}}>Total Price</th>}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {group.items.map((item, itemIndex) => (
                                            <tr key={itemIndex} className="border-b border-gray-200">
                                              {columnVisibility.no && <td className="p-2 border-r border-gray-200 whitespace-nowrap">{item.no}</td>}
                                              {columnVisibility.partNumber && <td className="p-2 font-medium border-r border-gray-200 whitespace-nowrap">{item.partNumber}</td>}
                                              {columnVisibility.productDescription && <td className="p-2 border-r border-gray-200">{item.productDescription}</td>}
                                              {columnVisibility.qty && <td className="p-2 border-r border-gray-200 whitespace-nowrap">{item.quantity}</td>}
                                              {columnVisibility.unitPrice && <td className="p-2 border-r border-gray-200 whitespace-nowrap">{item.unitPrice !== undefined && item.unitPrice !== null ? formatCurrency(item.unitPrice) : ''}</td>}
                                              {columnVisibility.totalPrice && <td className="p-2 whitespace-nowrap">{item.totalPrice !== undefined && item.totalPrice !== null ? formatCurrency(item.totalPrice) : ''}</td>}
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    ) : (
                                      <p className="text-gray-500 italic text-center py-4 text-sm">No items in {group.name}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 italic text-center py-6">No BOM groups added yet</p>
                            )}
                          </div>
                        )}

                        {/* Costs Section */}
                        {costsEnabled && (
                          <div 
                            className="cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors"
                            onClick={() => onSectionClick?.('costs')}
                            data-testid="preview-costs"
                          >
                            <h3 className="text-2xl font-bold mb-4 text-gray-900">Costs</h3>
                            
                            {costItems.length > 0 ? (
                              <div>
                                <table className="w-full border-collapse text-sm mb-6 border border-gray-300">
                                  <thead>
                                    <tr className="border-b-2 border-gray-400">
                                      <th className="text-left p-3 font-bold text-white border-r border-gray-300" style={{backgroundColor: '#4A90E2'}}>Product Description</th>
                                      <th className="text-center p-3 font-bold text-white border-r border-gray-300" style={{backgroundColor: '#4A90E2'}}>QTY</th>
                                      <th className="text-right p-3 font-bold text-white border-r border-gray-300" style={{backgroundColor: '#4A90E2'}}>Unit Price</th>
                                      <th className="text-right p-3 font-bold text-white" style={{backgroundColor: '#4A90E2'}}>Total Price</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {costItems.map((item, index) => (
                                      <tr key={index} className="border-b border-gray-200">
                                        <td className="p-3 border-r border-gray-200">{item.productDescription}</td>
                                        <td className="p-3 text-center border-r border-gray-200">{item.quantity}</td>
                                        <td className="p-3 text-right border-r border-gray-200">{formatCurrency(item.unitPrice)}</td>
                                        <td className="p-3 text-right font-medium">
                                          {item.isDiscount ? '-' : ''}{formatCurrency(item.totalPrice)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                
                                <div className="text-right border-t-2 border-gray-400 pt-4">
                                  <div className="text-xl font-bold">
                                    Grand Total: {formatCurrency(grandTotal)}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-gray-500 italic text-center py-6">No cost items added yet</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Page Number */}
                      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-gray-500 text-lg font-bold">
                        {currentPage}
                      </div>
                    </div>
                  );

                case 4: // Payment Terms Page
                  return (
                    <div className="bg-white h-[297mm] p-0 relative">
                      {/* EMET Dorcom Logo - Top Left */}
                      <div className="absolute top-6 left-6">
                        <img 
                          src={companyLogo} 
                          alt="Company Logo" 
                          className="h-10 w-auto"
                          data-testid="company-logo-page4"
                        />
                      </div>

                      <div className="pt-20 px-12 pb-12">
                        {/* Payment Terms */}
                        <div className="mb-12">
                          <h3 className="text-2xl font-bold mb-6 text-gray-900">Payment & General terms</h3>
                          <ol className="text-base space-y-3 list-decimal ml-6 leading-relaxed">
                            <li>Prices are not including VAT</li>
                            <li>Installation is not included unless specifically stated in the quote.</li>
                            <li>Payment in NIS will be at the dollar exchange rate represented on the day of the invoice issuance.</li>
                            <li>Our offer is valid for a period of 14 days.</li>
                            <li>The total price is for the purchase of the entire proposal</li>
                            <li>Payment Terms - {paymentTerms || 'Current +30'}</li>
                            <li>Any delay in payment will result in the customer being charged an exceptional shekel-based interest or conversion to dollars according to the calculation that will produce the highest result.</li>
                            <li>The contents will be delivered to the customer on the condition that the exchange for it will be fully paid according to the terms of the transaction. Any rights not acquired by the customer, at any time that the full exchange has not been received by Dorcom Computers Ltd., and has not been fully waived. Dorcom Computers Ltd. reserves the right to immediately return the endorsement in the contents, if the customer does not meet the full terms and schedule of the transaction, or to credit any amount received from the customer as partial payment towards the items of the order. All of this according to its sole choice and discretion.</li>
                            <li>Subject to the general terms <a href="https://dorcom.co.il/%d7%aa%d7%a0%d7%90%d7%99-%d7%9e%d7%9b%d7%a8/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">here</a></li>
                          </ol>
                          
                          <div className="mt-12 space-y-4 text-base">
                            <div className="border-b border-gray-400 pb-2">Name | ___________</div>
                            <div className="border-b border-gray-400 pb-2">Date | ___________</div>
                            <div className="border-b border-gray-400 pb-2">Company + Signature | ___________</div>
                          </div>
                        </div>
                      </div>

                      {/* Page Number */}
                      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-gray-500 text-lg font-bold">
                        {currentPage}
                      </div>
                    </div>
                  );

                case 5: // IP & Contact Page
                  return (
                    <div className="bg-white h-[297mm] p-0 relative">
                      {/* EMET Dorcom Logo - Top Left */}
                      <div className="absolute top-6 left-6">
                        <img 
                          src={companyLogo} 
                          alt="Company Logo" 
                          className="h-10 w-auto"
                          data-testid="company-logo-page5"
                        />
                      </div>

                      <div className="pt-20 px-12 pb-12">
                        {/* IP Section */}
                        <div className="mb-12">
                          <h3 className="text-2xl font-bold mb-6 text-gray-900">Intellectual property</h3>
                          <div className="text-sm leading-relaxed space-y-4 text-gray-700">
                    <p>
                      All rights, ownership and intellectual property rights (including, but not limited to, copyrights,
                      professional knowledge and trade secrets) in the information contained in this document or any
                      part thereof, as well as in any amendments or additions to this document, are owned by Dorcom
                      Computers Ltd. This document does not imply, imply, or in any other way, grant any rights,
                      ownership, intellectual property rights or license to use related to Dorcom or third parties.
                    </p>
                    <p>
                      The information contained in this document is confidential and commercially sensitive, and may
                      not be copied or disclosed to any third party without the prior written approval of Dorcom
                      Computers Ltd. The intended recipient is authorized to disclose this information only to those of
                      its employees directly involved in the project to which this document relates, who have a "need
                      to know". It is the sole and exclusive responsibility of the recipient to ensure that all such
                      employees are aware of these terms and act accordingly. The recipient is authorized to use the
                      information contained herein for evaluation purposes only.
                    </p>
                    <p>
                      The receipt of this document "as is" by the recipient shall not create any contractual relations
                      unless and until an agreement on the terms of the project to which this document relates,
                      including these terms, is signed by both parties. This document constitutes a non-binding
                      proposal, which may be amended by Dorcom Computers Ltd. at any time, at its sole discretion.
                      The recipient hereby agrees to return this document to Dorcom Computers Ltd. immediately
                      upon request, and to destroy any copies made thereof.
                    </p>
                    <p>
                      Any breach of these provisions by the recipient or any of its employees will entitle Dorcom
                      Computers Ltd. to all legal remedies, including, but not limited to, damages and injunction,
                      without the need for prior notice or proof of damage.
                    </p>
                  </div>
                </div>

                {/* Contact */}
                <div>
                  <h3 className="text-2xl font-bold mb-6 text-gray-900">Contact</h3>
                  <table className="w-full text-base border-collapse border border-gray-300">
                    <thead>
                      <tr className="border-b-2 border-gray-400">
                        <th className="text-left p-3 font-bold text-white border-r border-gray-300" style={{backgroundColor: '#4A90E2'}}>Name</th>
                        <th className="text-left p-3 font-bold text-white border-r border-gray-300" style={{backgroundColor: '#4A90E2'}}>Role</th>
                        <th className="text-left p-3 font-bold text-white border-r border-gray-300" style={{backgroundColor: '#4A90E2'}}>Phone</th>
                        <th className="text-left p-3 font-bold text-white" style={{backgroundColor: '#4A90E2'}}>Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="p-3 border-r border-gray-200 whitespace-nowrap">{contact.salesPersonName || contactInfo.salesPersonName || 'David Gilboa'}</td>
                        <td className="p-3 border-r border-gray-200 whitespace-nowrap">Account Manager</td>
                        <td className="p-3 border-r border-gray-200 whitespace-nowrap">{contact.phone || contactInfo.phone}</td>
                        <td className="p-3 whitespace-nowrap break-all">{contact.email || contactInfo.email}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

                      {/* Page Number */}
                      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-gray-500 text-lg font-bold">
                        {currentPage}
                      </div>
                    </div>
                  );

                default:
                  return null;
              }
            })()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}