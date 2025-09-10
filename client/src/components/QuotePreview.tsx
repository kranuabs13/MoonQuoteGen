import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Download, FileText, Maximize2 } from "lucide-react";
import { useState } from "react";

interface BomItem {
  no: number;
  partNumber: string;
  productDescription: string;
  quantity: number;
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

  const handleExport = (format: 'pdf' | 'word') => {
    console.log(`Exporting as ${format.toUpperCase()}`);
    // TODO: Implement actual export functionality
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
        <div className="flex-1 overflow-auto bg-white">
          <div 
            className="mx-auto bg-white shadow-lg print:shadow-none"
            style={{ 
              zoom: `${zoom}%`,
              width: '210mm',
              minHeight: '297mm',
              padding: '25mm',
              fontFamily: 'Inter, sans-serif'
            }}
            data-testid="preview-document"
          >
            {/* Header */}
            <div 
              className="mb-8 cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors"
              onClick={() => onSectionClick?.('header')}
              data-testid="preview-header"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Quotation For</h1>
                  <h2 className="text-xl text-gray-700 mt-1">
                    {quoteSubject || 'Quote Subject'}
                  </h2>
                </div>
                {customerLogo && (
                  <img 
                    src={customerLogo} 
                    alt="Customer logo" 
                    className="h-16 w-auto"
                    data-testid="preview-customer-logo"
                  />
                )}
              </div>
              
              <div className="text-right text-sm text-gray-600">
                {salesPersonName || 'Sales Person'} | {formatDate(date)} | Ver {version || '1'}
              </div>
            </div>

            {/* Company Intro */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Intro</h3>
              <div className="text-sm leading-relaxed space-y-3">
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
                <ul className="list-disc ml-6 space-y-1">
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

            {/* BOM Section */}
            {bomEnabled && (
              <div 
                className="mb-8 cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors"
                onClick={() => onSectionClick?.('bom')}
                data-testid="preview-bom"
              >
                <h3 className="text-lg font-semibold mb-4">BOM</h3>
                <h4 className="font-medium mb-4">{quoteSubject || 'Product Name'}</h4>
                
                {bomItems.length > 0 ? (
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-semibold">NO</th>
                        <th className="text-left p-2 font-semibold">PN</th>
                        <th className="text-left p-2 font-semibold">Product Description</th>
                        <th className="text-left p-2 font-semibold">QTY</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bomItems.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">{item.no}</td>
                          <td className="p-2">{item.partNumber}</td>
                          <td className="p-2">{item.productDescription}</td>
                          <td className="p-2">{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-500 italic">No BOM items added yet</p>
                )}
              </div>
            )}

            {/* Costs Section */}
            <div 
              className="mb-8 cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors"
              onClick={() => onSectionClick?.('costs')}
              data-testid="preview-costs"
            >
              <h3 className="text-lg font-semibold mb-4">Costs</h3>
              
              {costItems.length > 0 ? (
                <div>
                  <table className="w-full border-collapse text-sm mb-4">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-semibold">Product Description</th>
                        <th className="text-center p-2 font-semibold">QTY</th>
                        <th className="text-right p-2 font-semibold">Unit Price</th>
                        <th className="text-right p-2 font-semibold">Total Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costItems.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">{item.productDescription}</td>
                          <td className="p-2 text-center">{item.quantity}</td>
                          <td className="p-2 text-right">{formatCurrency(item.unitPrice)}</td>
                          <td className="p-2 text-right">
                            {item.isDiscount ? '-' : ''}{formatCurrency(item.totalPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      Grand Total: {formatCurrency(grandTotal)}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 italic">No cost items added yet</p>
              )}
            </div>

            {/* Payment Terms */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Payment & General terms</h3>
              <ol className="text-sm space-y-1 list-decimal ml-4">
                <li>Prices are not including VAT</li>
                <li>Installation is not included unless specifically stated in the quote.</li>
                <li>Payment in NIS will be at the dollar exchange rate represented on the day of the invoice issuance.</li>
                <li>Our offer is valid for a period of 14 days.</li>
                <li>The total price is for the purchase of the entire proposal</li>
                <li>Payment Terms - {paymentTerms || 'Current +30'}</li>
                <li>Any delay in payment will result in the customer being charged an exceptional shekel-based interest or conversion to dollars according to the calculation that will produce the highest result.</li>
                <li>Subject to the general terms here</li>
              </ol>
              
              <div className="mt-8 space-y-2">
                <div>Name | ___________</div>
                <div>Date | ___________</div>
                <div>Company + Signature | ___________</div>
              </div>
            </div>

            {/* IP Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Intellectual property</h3>
              <div className="text-xs leading-relaxed space-y-2">
                <p>
                  All rights, ownership and intellectual property rights (including, but not limited to, copyrights,
                  professional knowledge and trade secrets) in the information contained in this document or any
                  part thereof, as well as in any amendments or additions to this document, are owned by Dorcom
                  Computers Ltd.
                </p>
                <p>
                  The information contained in this document is confidential and commercially sensitive, and may
                  not be copied or disclosed to any third party without the prior written approval of Dorcom
                  Computers Ltd.
                </p>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-semibold">Name</th>
                    <th className="text-left p-2 font-semibold">Role</th>
                    <th className="text-left p-2 font-semibold">Phone</th>
                    <th className="text-left p-2 font-semibold">Email</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2">{salesPersonName || 'Sales Person'}</td>
                    <td className="p-2">Account Manager</td>
                    <td className="p-2">{contact.phone}</td>
                    <td className="p-2">{contact.email}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}