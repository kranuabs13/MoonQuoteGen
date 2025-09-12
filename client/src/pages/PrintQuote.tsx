import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import emetLogo from "@assets/image_1757577759606.png";
import techDiagram from "@assets/image_1757577458643.png";
import frameImage from "@assets/image_1757577550193.png";
import type { ColumnVisibility, ContactInfo } from "@shared/schema";

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

export default function PrintQuote() {
  const [, setLocation] = useLocation();
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);

  useEffect(() => {
    // Get quote data from localStorage
    const savedData = localStorage.getItem('quoteFormData');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setQuoteData(parsed);
      } catch (error) {
        console.error('Failed to parse quote data:', error);
        setLocation('/');
        return;
      }
    } else {
      console.error('No quote data found');
      setLocation('/');
      return;
    }

    // Automatically trigger print dialog after a short delay
    const timer = setTimeout(() => {
      window.print();
    }, 500);

    return () => clearTimeout(timer);
  }, [setLocation]);

  // Handle print completion - return to main page
  useEffect(() => {
    const handleAfterPrint = () => {
      setLocation('/');
    };

    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, [setLocation]);

  if (!quoteData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading quote data...</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    const currencyConfig = {
      USD: { code: 'USD', locale: 'en-US' },
      NIS: { code: 'ILS', locale: 'he-IL' },
      EUR: { code: 'EUR', locale: 'de-DE' }
    };
    
    const config = currencyConfig[quoteData.currency as keyof typeof currencyConfig] || currencyConfig.USD;
    
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.code,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-GB');
  };

  const grandTotal = quoteData.costItems.reduce((sum, item) => {
    return sum + (item.isDiscount ? -item.totalPrice : item.totalPrice);
  }, 0);

  const contact = quoteData.contactInfo;

  return (
    <div 
      className="print-document"
      style={{ 
        width: '210mm',
        minHeight: '297mm',
        fontFamily: 'Inter, sans-serif',
        WebkitPrintColorAdjust: 'exact',
        colorAdjust: 'exact',
        printColorAdjust: 'exact'
      }}
      data-testid="print-document"
    >
      {/* Page 1 - Cover Page with Border Frame */}
      <div 
        className="relative h-[297mm] p-0 overflow-hidden bg-white page-break-after"
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
            style={{ imageRendering: 'crisp-edges', maxWidth: 'none' }}
            crossOrigin="anonymous"
          />
        </div>

        {/* Cover Page Content */}
        <div className="relative h-full flex flex-col justify-center items-center text-center px-16">
          <div className="w-full">
            <h1 className="text-4xl font-bold text-black mb-4">Quotation For</h1>
            <h2 className="text-3xl text-black mb-2 leading-tight">
              {quoteData.quoteSubject || 'Cisco Catalyst Switch'}
            </h2>
            
            {/* Customer Logo */}
            {quoteData.customerLogo && (
              <div className="mt-12 mb-12">
                <img 
                  src={quoteData.customerLogo} 
                  alt="Customer logo" 
                  className="h-20 w-auto mx-auto"
                />
              </div>
            )}
          </div>

          {/* Bottom Info */}
          <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 text-center text-lg text-black">
            <div>{quoteData.salesPersonName || 'David Gilboa'} | {formatDate(quoteData.date)} | Ver {quoteData.version || '1'}</div>
          </div>

          {/* Page Number */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-black text-lg font-bold">
            1
          </div>
        </div>
      </div>

      {/* Page 2 - Intro & Technology Diagram */}
      <div className="bg-white h-[297mm] p-0 page-break-after relative">
        {/* EMET Dorcom Logo - Top Left */}
        <div className="absolute top-6 left-6">
          <img 
            src={emetLogo} 
            alt="EMET Dorcom" 
            className="h-12 w-auto"
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
            />
          </div>
        </div>

        {/* Page Number */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-gray-500 text-lg font-bold">
          2
        </div>
      </div>

      {/* Page 3 - Combined BOM & Costs Section */}
      {(quoteData.bomEnabled || quoteData.costsEnabled) && (
        <div className="bg-white h-[297mm] p-0 page-break-after relative">
          {/* EMET Dorcom Logo - Top Left */}
          <div className="absolute top-6 left-6">
            <img 
              src={emetLogo} 
              alt="EMET Dorcom" 
              className="h-10 w-auto"
            />
          </div>

          <div className="pt-20 px-12 pb-12">
            {/* BOM Section */}
            {quoteData.bomEnabled && (
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-4 text-gray-900">BOM</h3>
                <h4 className="text-xl font-semibold mb-4 text-gray-800">{quoteData.quoteSubject || 'Catalyst 9300 48-port PoE+'}</h4>
                
                {quoteData.bomItems.length > 0 ? (
                  <table className="w-full border-collapse text-xs mb-6 border border-gray-300">
                    <thead>
                      <tr className="border-b-2 border-gray-400">
                        {quoteData.columnVisibility.no && <th className="text-left p-2 font-bold text-white border-r border-gray-300" style={{backgroundColor: '#4A90E2'}}>NO</th>}
                        {quoteData.columnVisibility.partNumber && <th className="text-left p-2 font-bold text-white border-r border-gray-300" style={{backgroundColor: '#4A90E2'}}>PN</th>}
                        {quoteData.columnVisibility.productDescription && <th className="text-left p-2 font-bold text-white border-r border-gray-300" style={{backgroundColor: '#4A90E2'}}>Product Description</th>}
                        {quoteData.columnVisibility.qty && <th className="text-left p-2 font-bold text-white border-r border-gray-300" style={{backgroundColor: '#4A90E2'}}>QTY</th>}
                        {quoteData.columnVisibility.unitPrice && <th className="text-left p-2 font-bold text-white border-r border-gray-300" style={{backgroundColor: '#4A90E2'}}>Unit Price</th>}
                        {quoteData.columnVisibility.totalPrice && <th className="text-left p-2 font-bold text-white" style={{backgroundColor: '#4A90E2'}}>Total Price</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {quoteData.bomItems.map((item, index) => (
                        <tr key={index} className="border-b border-gray-200">
                          {quoteData.columnVisibility.no && <td className="p-2 border-r border-gray-200 whitespace-nowrap">{item.no}</td>}
                          {quoteData.columnVisibility.partNumber && <td className="p-2 font-medium border-r border-gray-200 whitespace-nowrap">{item.partNumber}</td>}
                          {quoteData.columnVisibility.productDescription && <td className="p-2 border-r border-gray-200">{item.productDescription}</td>}
                          {quoteData.columnVisibility.qty && <td className="p-2 border-r border-gray-200 whitespace-nowrap">{item.quantity}</td>}
                          {quoteData.columnVisibility.unitPrice && <td className="p-2 border-r border-gray-200 whitespace-nowrap">{item.unitPrice !== undefined && item.unitPrice !== null ? formatCurrency(item.unitPrice) : ''}</td>}
                          {quoteData.columnVisibility.totalPrice && <td className="p-2 whitespace-nowrap">{item.totalPrice !== undefined && item.totalPrice !== null ? formatCurrency(item.totalPrice) : ''}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-500 italic text-center py-6">No BOM items added yet</p>
                )}
              </div>
            )}

            {/* Costs Section */}
            {quoteData.costsEnabled && (
              <div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">Costs</h3>
                
                {quoteData.costItems.length > 0 ? (
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
                        {quoteData.costItems.map((item, index) => (
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
            3
          </div>
        </div>
      )}

      {/* Page 4 - Payment Terms */}
      <div className="bg-white h-[297mm] p-0 page-break-after relative">
        {/* EMET Dorcom Logo - Top Left */}
        <div className="absolute top-6 left-6">
          <img 
            src={emetLogo} 
            alt="EMET Dorcom" 
            className="h-10 w-auto"
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
              <li>Payment Terms - {quoteData.paymentTerms || 'Current +30'}</li>
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

      {/* Page 5 - Contact & IP */}
      <div className="bg-white h-[297mm] p-0 relative">
        {/* EMET Dorcom Logo - Top Left */}
        <div className="absolute top-6 left-6">
          <img 
            src={emetLogo} 
            alt="EMET Dorcom" 
            className="h-10 w-auto"
          />
        </div>

        <div className="pt-20 px-12 pb-12">
          {/* Intellectual Property */}
          <div className="mb-12">
            <h3 className="text-2xl font-bold mb-6 text-gray-900">Intellectual property</h3>
            <div className="text-base leading-relaxed space-y-4 text-gray-800">
              <p>
                All rights, ownership and intellectual property rights (including, but not limited to, copyrights,
                professional knowledge and trade secrets) in the information contained in this document or any
                part thereof, as well as in amendments or additions to this document, belong to or are owned by
                Dorcom Computers Ltd. The submission of this document does not imply, imply, or in any other
                way, grant any rights, ownership, intellectual property rights or license to use according to
                Dorcom or third parties.
              </p>
              <p>
                The information contained in this document is confidential and commercially sensitive, and may
                not be copied or disclosed to any third party without the prior written approval of Dorcom
                Computers Ltd. The intended recipient is authorized to disclose information only to those of his
                employees directly involved in the project to which this document relates, who have a "need to
                know". It is the sole and exclusive responsibility of the recipient to ensure that all such
                persons act accordingly. The recipient is authorized to use the information contained herein for
                evaluation purposes only.
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
                  <td className="p-3 border-r border-gray-200 whitespace-nowrap">{contact.salesPersonName || quoteData.contactInfo.salesPersonName || 'David Gilboa'}</td>
                  <td className="p-3 border-r border-gray-200 whitespace-nowrap">Account Manager</td>
                  <td className="p-3 border-r border-gray-200 whitespace-nowrap">{contact.phone || quoteData.contactInfo.phone}</td>
                  <td className="p-3 whitespace-nowrap break-all">{contact.email || quoteData.contactInfo.email}</td>
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
  );
}