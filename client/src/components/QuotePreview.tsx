import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Download, FileText, Maximize2 } from "lucide-react";
import { useState } from "react";
import emetLogo from "@assets/image_1757577759606.png";
import techDiagram from "@assets/image_1757577458643.png";
import frameImage from "@assets/image_1757577550193.png";

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
  bomEnabled: boolean;
  bomItems: BomItem[];
  costItems: CostItem[];
  onSectionClick?: (section: string) => void;
}

export default function QuotePreview({
  quoteSubject,
  customerCompany,
  customerLogo,
  salesPersonName,
  date,
  version,
  paymentTerms,
  bomEnabled,
  bomItems,
  costItems,
  onSectionClick,
}: QuotePreviewProps) {
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-GB');
  };

  const grandTotal = costItems.reduce((sum, item) => {
    return sum + (item.isDiscount ? -item.totalPrice : item.totalPrice);
  }, 0);

  const getSalesPersonContact = (name: string) => {
    const contacts: Record<string, { phone: string; email: string }> = {
      'David Gilboa': { phone: '+97252-750-3069', email: 'david.gilboa@emetdorcom.co.il' },
      'Sarah Cohen': { phone: '+97252-750-3070', email: 'sarah.cohen@emetdorcom.co.il' },
      'Michael Levi': { phone: '+97252-750-3071', email: 'michael.levi@emetdorcom.co.il' },
      'Rachel Ben-David': { phone: '+97252-750-3072', email: 'rachel.bendavid@emetdorcom.co.il' },
    };
    return contacts[name] || { phone: '+97252-750-3069', email: 'contact@emetdorcom.co.il' };
  };

  const contact = getSalesPersonContact(salesPersonName);

  const handleZoom = (direction: 'in' | 'out') => {
    setZoom(prev => {
      const newZoom = direction === 'in' ? prev + 25 : prev - 25;
      return Math.max(50, Math.min(150, newZoom));
    });
    console.log(`Zoom ${direction}: ${zoom}%`);
  };

  const handleExport = async (format: 'pdf' | 'word') => {
    console.log(`Exporting as ${format.toUpperCase()}`);
    
    if (format === 'pdf') {
      try {
        // Import html2pdf dynamically
        const html2pdf = (await import('html2pdf.js')).default;
        
        // Get the preview document element
        const element = document.querySelector('[data-testid="preview-document"]');
        if (!element) {
          console.error('Preview document not found');
          return;
        }
        
        // Create safe filename by replacing invalid characters
        const safeDate = formatDate(date).replace(/[/\\:*?"<>|]/g, '_');
        const safeSubject = (quoteSubject || 'Quote').replace(/[/\\:*?"<>|]/g, '_');
        const filename = `${safeSubject}_${safeDate}_v${version || '1'}.pdf`;
        
        // Configure PDF options
        const opt = {
          margin: 0,
          filename,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { 
            scale: Math.min(2, window.devicePixelRatio || 1),
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff'
          },
          jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait',
            compress: true
          },
          pagebreak: { mode: ['css', 'legacy'], before: '.page-break-before' }
        };
        
        // Generate and download PDF
        console.log('Generating PDF...');
        await html2pdf().set(opt).from(element).save();
        console.log('PDF export completed');
        
      } catch (error) {
        console.error('PDF export failed:', error);
      }
    } else if (format === 'word') {
      // Word export placeholder - would require different library
      console.log('Word export not yet implemented');
    }
  };

  return (
    <Card className={`h-full ${isFullscreen ? 'fixed inset-0 z-50' : ''}`} data-testid="card-quote-preview">
      <CardContent className="p-0 h-full flex flex-col">
        {/* Preview Controls */}
        <div className="border-b p-2 flex items-center justify-between bg-muted/30">
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
              variant="outline"
              size="sm"
              onClick={() => handleExport('pdf')}
              data-testid="button-export-pdf"
            >
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('word')}
              data-testid="button-export-word"
            >
              <FileText className="h-4 w-4 mr-2" />
              Word
            </Button>
          </div>
        </div>

        {/* Quote Document Preview */}
        <div className="flex-1 overflow-auto bg-gray-100">
          <div 
            className="mx-auto shadow-lg print:shadow-none relative"
            style={{ 
              zoom: `${zoom}%`,
              width: '210mm',
              minHeight: '297mm',
              fontFamily: 'Inter, sans-serif'
            }}
            data-testid="preview-document"
          >
            {/* Page 1 - Cover Page with Border Frame */}
            <div 
              className="relative h-[297mm] p-0 overflow-hidden bg-white page-break-before"
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
                  src={emetLogo} 
                  alt="EMET Dorcom" 
                  className="h-24 w-auto"
                  data-testid="emet-logo-page1"
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
                  <h3 className="text-2xl text-black">
                    9300 48-port PoE+
                  </h3>
                  
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
                  1
                </div>
              </div>
            </div>

            {/* Page 2 - Intro & Technology Diagram */}
            <div className="bg-white h-[297mm] p-0 page-break-before relative">
              {/* EMET Dorcom Logo - Top Left */}
              <div className="absolute top-6 left-6">
                <img 
                  src={emetLogo} 
                  alt="EMET Dorcom" 
                  className="h-12 w-auto"
                  data-testid="emet-logo-page2"
                />
              </div>

              <div className="pt-20 px-12 pb-12">
                {/* Intro Section */}
                <div className="mb-12">
                  <h3 className="text-2xl font-bold mb-6 text-gray-900">Intro</h3>
                  <div className="text-base leading-relaxed space-y-4 text-gray-800">
                    <p>
                      EMET Dorcom is one of the most successful and experienced companies in the field of
                      computer infrastructure and integration with extensive knowledge, which includes all types of
                      technologies in the IT market.
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
                    src={techDiagram} 
                    alt="Technology Solutions" 
                    className="w-full max-w-4xl mx-auto"
                    data-testid="tech-diagram"
                  />
                </div>
              </div>

              {/* Page Number */}
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-gray-500 text-lg font-bold">
                2
              </div>
            </div>

            {/* Page 3 - Combined BOM & Costs Section */}
            {bomEnabled && (
              <div className="bg-white h-[297mm] p-0 page-break-before relative">
                {/* EMET Dorcom Logo - Top Left */}
                <div className="absolute top-6 left-6">
                  <img 
                    src={emetLogo} 
                    alt="EMET Dorcom" 
                    className="h-10 w-auto"
                    data-testid="emet-logo-page3"
                  />
                </div>

                <div className="pt-20 px-12 pb-12">
                  {/* BOM Section */}
                  <div 
                    className="cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors mb-8"
                    onClick={() => onSectionClick?.('bom')}
                    data-testid="preview-bom"
                  >
                    <h3 className="text-2xl font-bold mb-4 text-gray-900">BOM</h3>
                    <h4 className="text-xl font-semibold mb-4 text-gray-800">{quoteSubject || 'Catalyst 9300 48-port PoE+'}</h4>
                    
                    {bomItems.length > 0 ? (
                      (() => {
                        const hasUnitPrice = bomItems.some(item => item.unitPrice !== undefined && item.unitPrice !== null);
                        const hasTotalPrice = bomItems.some(item => item.totalPrice !== undefined && item.totalPrice !== null);
                        
                        return (
                          <table className="w-full border-collapse text-xs mb-6">
                            <thead>
                              <tr className="border-b-2 border-gray-400">
                                <th className="text-left p-2 font-bold text-white" style={{backgroundColor: '#4A90E2'}}>NO</th>
                                <th className="text-left p-2 font-bold text-white" style={{backgroundColor: '#4A90E2'}}>PN</th>
                                <th className="text-left p-2 font-bold text-white" style={{backgroundColor: '#4A90E2'}}>Product Description</th>
                                <th className="text-left p-2 font-bold text-white" style={{backgroundColor: '#4A90E2'}}>QTY</th>
                                {hasUnitPrice && <th className="text-left p-2 font-bold text-white" style={{backgroundColor: '#4A90E2'}}>Unit Price</th>}
                                {hasTotalPrice && <th className="text-left p-2 font-bold text-white" style={{backgroundColor: '#4A90E2'}}>Total Price</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {bomItems.map((item, index) => (
                                <tr key={index} className="border-b border-gray-200">
                                  <td className="p-2">{item.no}</td>
                                  <td className="p-2 font-medium">{item.partNumber}</td>
                                  <td className="p-2">{item.productDescription}</td>
                                  <td className="p-2">{item.quantity}</td>
                                  {hasUnitPrice && <td className="p-2">{item.unitPrice !== undefined && item.unitPrice !== null ? formatCurrency(item.unitPrice) : ''}</td>}
                                  {hasTotalPrice && <td className="p-2">{item.totalPrice !== undefined && item.totalPrice !== null ? formatCurrency(item.totalPrice) : ''}</td>}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        );
                      })()
                    ) : (
                      <p className="text-gray-500 italic text-center py-6">No BOM items added yet</p>
                    )}
                  </div>

                  {/* Costs Section */}
                  <div 
                    className="cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors"
                    onClick={() => onSectionClick?.('costs')}
                    data-testid="preview-costs"
                  >
                    <h3 className="text-2xl font-bold mb-4 text-gray-900">Costs</h3>
                    
                    {costItems.length > 0 ? (
                      <div>
                        <table className="w-full border-collapse text-sm mb-6">
                          <thead>
                            <tr className="border-b-2 border-gray-400">
                              <th className="text-left p-3 font-bold text-white" style={{backgroundColor: '#4A90E2'}}>Product Description</th>
                              <th className="text-center p-3 font-bold text-white" style={{backgroundColor: '#4A90E2'}}>QTY</th>
                              <th className="text-right p-3 font-bold text-white" style={{backgroundColor: '#4A90E2'}}>Unit Price</th>
                              <th className="text-right p-3 font-bold text-white" style={{backgroundColor: '#4A90E2'}}>Total Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {costItems.map((item, index) => (
                              <tr key={index} className="border-b border-gray-200">
                                <td className="p-3">{item.productDescription}</td>
                                <td className="p-3 text-center">{item.quantity}</td>
                                <td className="p-3 text-right">{formatCurrency(item.unitPrice)}</td>
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
                </div>

                {/* Page Number */}
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-gray-500 text-lg font-bold">
                  3
                </div>
              </div>
            )}

            {/* Page 4 - Payment Terms */}
            <div className="bg-white h-[297mm] p-0 page-break-before relative">
              {/* EMET Dorcom Logo - Top Left */}
              <div className="absolute top-6 left-6">
                <img 
                  src={emetLogo} 
                  alt="EMET Dorcom" 
                  className="h-10 w-auto"
                  data-testid="emet-logo-page4"
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
                4
              </div>
            </div>

            {/* Page 5 - IP Section */}
            <div className="bg-white h-[297mm] p-0 page-break-before relative">
              {/* EMET Dorcom Logo - Top Left */}
              <div className="absolute top-6 left-6">
                <img 
                  src={emetLogo} 
                  alt="EMET Dorcom" 
                  className="h-10 w-auto"
                  data-testid="emet-logo-page5"
                />
              </div>

              <div className="pt-20 px-12 pb-12">
                {/* IP Section */}
                <div className="mb-12">
                  <h3 className="text-2xl font-bold mb-6 text-gray-900">Intellectual property</h3>
                  <div className="text-sm leading-relaxed space-y-4">
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
                  <table className="w-full text-base border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-400">
                        <th className="text-left p-3 font-bold text-white" style={{backgroundColor: '#4A90E2'}}>Name</th>
                        <th className="text-left p-3 font-bold text-white" style={{backgroundColor: '#4A90E2'}}>Role</th>
                        <th className="text-left p-3 font-bold text-white" style={{backgroundColor: '#4A90E2'}}>Phone</th>
                        <th className="text-left p-3 font-bold text-white" style={{backgroundColor: '#4A90E2'}}>Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="p-3">{salesPersonName || 'David Gilboa'}</td>
                        <td className="p-3">Account Manager</td>
                        <td className="p-3">{contact.phone}</td>
                        <td className="p-3">{contact.email}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Page Number */}
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-gray-500 text-lg font-bold">
                5
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}