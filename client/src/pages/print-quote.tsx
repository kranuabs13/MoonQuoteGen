import { useEffect, useState } from 'react';
import frameImage from '@assets/image_1757577550193.png';
import emetLogo from '@assets/image_1757577759606.png';
import techDiagram from '@assets/image_1757577458643.png';

// Types for quote data
interface QuoteData {
  quote: {
    subject: string;
    customer: string;
    salesPerson: string;
    terms: number;
    currency: string;
  };
  bomItems: Array<{
    no: string;
    partNumber: string;
    productDescription: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  costItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    isDiscount: boolean;
  }>;
  columnVisibility: {
    no: boolean;
    partNumber: boolean;
    productDescription: boolean;
    qty: boolean;
    unitPrice: boolean;
    totalPrice: boolean;
  };
  bomEnabled: boolean;
  costsEnabled: boolean;
  date: string;
  version: string;
  contact: {
    name: string;
    phone: string;
    email: string;
  };
}

export default function PrintQuote() {
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);

  useEffect(() => {
    // Load quote data from localStorage
    try {
      const savedData = localStorage.getItem('quoteData');
      if (savedData) {
        setQuoteData(JSON.parse(savedData));
      }
    } catch (error) {
      console.error('Failed to load quote data for printing:', error);
    }

    // Auto-trigger print dialog after a short delay to ensure rendering is complete
    const printTimer = setTimeout(() => {
      window.print();
    }, 1000);

    return () => clearTimeout(printTimer);
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-GB');
  };

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (!quoteData) {
    return <div className="p-8 text-center">Loading quote data...</div>;
  }

  const {
    quote,
    bomItems,
    costItems,
    columnVisibility,
    bomEnabled,
    costsEnabled,
    date,
    version,
    contact,
  } = quoteData;

  const grandTotal = costItems.reduce((sum, item) => {
    return sum + (item.isDiscount ? -item.totalPrice : item.totalPrice);
  }, 0);

  return (
    <div className="print-document">
      {/* Page 1 - Cover Page with Border Frame */}
      <div 
        className="print-page page-break-before"
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
              {quote.subject || 'Cisco Catalyst Switch'}
            </h2>
          </div>

          {/* Bottom Info */}
          <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 text-center text-lg text-black">
            <div>{quote.salesPerson || 'David Gilboa'} | {formatDate(date)} | Ver {version || '1'}</div>
          </div>

          {/* Page Number */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-black text-lg font-bold">
            1
          </div>
        </div>
      </div>

      {/* Page 2 - Intro & Technology Diagram */}
      <div className="print-page page-break-before">
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
      {(bomEnabled || costsEnabled) && (
        <div className="print-page page-break-before">
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
            {bomEnabled && (
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-4 text-gray-900">BOM</h3>
                <h4 className="text-xl font-semibold mb-4 text-gray-800">{quote.subject || 'Catalyst 9300 48-port PoE+'}</h4>
                
                {bomItems.length > 0 ? (
                  <table className="w-full border-collapse text-xs mb-6 border border-gray-300">
                    <thead>
                      <tr className="border-b-2 border-gray-400">
                        {columnVisibility.no && <th className="text-left p-2 font-bold text-white border-r border-gray-300" style={{backgroundColor: '#4A90E2'}}>NO</th>}
                        {columnVisibility.partNumber && <th className="text-left p-2 font-bold text-white border-r border-gray-300" style={{backgroundColor: '#4A90E2'}}>PN</th>}
                        {columnVisibility.productDescription && <th className="text-left p-2 font-bold text-white border-r border-gray-300" style={{backgroundColor: '#4A90E2'}}>Product Description</th>}
                        {columnVisibility.qty && <th className="text-left p-2 font-bold text-white border-r border-gray-300" style={{backgroundColor: '#4A90E2'}}>QTY</th>}
                        {columnVisibility.unitPrice && <th className="text-left p-2 font-bold text-white border-r border-gray-300" style={{backgroundColor: '#4A90E2'}}>Unit Price</th>}
                        {columnVisibility.totalPrice && <th className="text-left p-2 font-bold text-white" style={{backgroundColor: '#4A90E2'}}>Total Price</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {bomItems.map((item, index) => (
                        <tr key={index} className="border-b border-gray-200">
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
                  <p className="text-gray-500 italic text-center py-6">No BOM items added yet</p>
                )}
              </div>
            )}

            {/* Costs Section */}
            {costsEnabled && (
              <div>
                <h3 className="text-xl font-bold mb-4 text-gray-900">Costs</h3>
                {costItems.length > 0 ? (
                  <>
                    <table className="w-full border-collapse text-sm mb-4 border border-gray-300">
                      <thead>
                        <tr className="border-b-2 border-gray-400">
                          <th className="text-left p-3 font-bold text-white border-r border-gray-300" style={{backgroundColor: '#4A90E2'}}>Description</th>
                          <th className="text-left p-3 font-bold text-white border-r border-gray-300" style={{backgroundColor: '#4A90E2'}}>QTY</th>
                          <th className="text-left p-3 font-bold text-white border-r border-gray-300" style={{backgroundColor: '#4A90E2'}}>Unit Price</th>
                          <th className="text-left p-3 font-bold text-white" style={{backgroundColor: '#4A90E2'}}>Total Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {costItems.map((item, index) => (
                          <tr key={index} className="border-b border-gray-200">
                            <td className="p-3 border-r border-gray-200">
                              {item.isDiscount && <span className="text-red-600 font-medium">DISCOUNT: </span>}
                              {item.description}
                            </td>
                            <td className="p-3 border-r border-gray-200">{item.quantity}</td>
                            <td className="p-3 border-r border-gray-200">{formatCurrency(item.unitPrice)}</td>
                            <td className="p-3 font-medium">
                              {item.isDiscount ? (
                                <span className="text-red-600">-{formatCurrency(item.totalPrice)}</span>
                              ) : (
                                formatCurrency(item.totalPrice)
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="text-right mb-4">
                      <div className="text-xl font-bold">
                        Grand Total: <span className="text-blue-600">{formatCurrency(grandTotal)}</span>
                      </div>
                    </div>
                  </>
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
      <div className="print-page page-break-before">
        {/* EMET Dorcom Logo - Top Left */}
        <div className="absolute top-6 left-6">
          <img 
            src={emetLogo} 
            alt="EMET Dorcom" 
            className="h-10 w-auto"
          />
        </div>

        <div className="pt-20 px-12 pb-12">
          <h3 className="text-2xl font-bold mb-6 text-gray-900">Payment Terms</h3>
          <div className="space-y-4 text-base text-gray-800">
            <p><strong>Payment Terms:</strong> {quote.terms || 30} days</p>
            <p><strong>Currency:</strong> {quote.currency || 'USD'}</p>
            <p><strong>Validity:</strong> This quotation is valid for 30 days from the date of issue.</p>
            <p><strong>Delivery:</strong> Standard delivery times apply unless otherwise specified.</p>
            <p><strong>Warranty:</strong> All products come with manufacturer's standard warranty.</p>
          </div>
        </div>

        {/* Page Number */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-gray-500 text-lg font-bold">
          4
        </div>
      </div>

      {/* Page 5 - Contact Information */}
      <div className="print-page page-break-before">
        {/* EMET Dorcom Logo - Top Left */}
        <div className="absolute top-6 left-6">
          <img 
            src={emetLogo} 
            alt="EMET Dorcom" 
            className="h-10 w-auto"
          />
        </div>

        <div className="pt-20 px-12 pb-12">
          <h3 className="text-2xl font-bold mb-6 text-gray-900">Contact Information</h3>
          <div className="space-y-4 text-base text-gray-800">
            <div>
              <p><strong>Sales Person:</strong> {contact.name || quote.salesPerson || 'David Gilboa'}</p>
              <p><strong>Phone:</strong> {contact.phone || '+972-XXX-XXXX'}</p>
              <p><strong>Email:</strong> {contact.email || 'info@emetdorcom.com'}</p>
            </div>
            <div className="mt-8">
              <p><strong>Company:</strong> EMET Dorcom</p>
              <p><strong>Customer:</strong> {quote.customer || 'Customer Name'}</p>
            </div>
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