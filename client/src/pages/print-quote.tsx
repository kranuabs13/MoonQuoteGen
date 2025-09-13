import { useEffect, useState } from 'react';
import frameImage from '@assets/image_1757577550193.png';
import emetLogo from '@assets/image_1757577759606.png';
import techDiagram from '@assets/image_1757577458643.png';

// Comprehensive types for quote data with proper field mapping
interface QuoteData {
  quote: {
    subject: string;
    customer: string;
    salesPerson: string;
    terms: string | number;
    currency: string;
  };
  bomItems: Array<{
    no: string | number;
    partNumber: string;
    productDescription: string;
    quantity: number;
    unitPrice?: number;
    totalPrice?: number;
  }>;
  costItems: Array<{
    description?: string;
    productDescription?: string;
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
    name?: string;
    salesPersonName?: string;
    phone: string;
    email: string;
  };
}

export default function PrintQuote() {
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // Enhanced data loading with better error handling
  useEffect(() => {
    const loadQuoteData = () => {
      try {
        const savedData = localStorage.getItem('quoteData');
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          if (!parsedData.quote) {
            setLoadingError('Invalid quote data structure');
            return;
          }
          const mappedData: QuoteData = {
            quote: {
              subject: parsedData.quote.subject || parsedData.quoteSubject || 'Untitled Quote',
              customer: parsedData.quote.customer || parsedData.customerCompany || 'Customer Name',
              salesPerson: parsedData.quote.salesPerson || parsedData.salesPersonName || 'Sales Representative',
              terms: parsedData.quote.terms || parsedData.paymentTerms || 30,
              currency: parsedData.quote.currency || parsedData.currency || 'USD'
            },
            bomItems: (parsedData.bomItems || []).map((item: any, i: number) => ({
              no: item.no || i + 1,
              partNumber: item.partNumber || '',
              productDescription: item.productDescription || item.description || '',
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice
            })),
            costItems: (parsedData.costItems || []).map((item: any) => ({
              description: item.description || item.productDescription || '',
              productDescription: item.productDescription || item.description || '',
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 0,
              totalPrice: item.totalPrice || 0,
              isDiscount: item.isDiscount || false
            })),
            columnVisibility: parsedData.columnVisibility || {
              no: true, partNumber: true, productDescription: true,
              qty: true, unitPrice: false, totalPrice: false
            },
            bomEnabled: parsedData.bomEnabled ?? true,
            costsEnabled: parsedData.costsEnabled ?? true,
            date: parsedData.date || new Date().toISOString().split('T')[0],
            version: parsedData.version || '1',
            contact: {
              name: parsedData.contact?.name || parsedData.contact?.salesPersonName || parsedData.salesPersonName,
              salesPersonName: parsedData.contact?.salesPersonName || parsedData.contact?.name || parsedData.salesPersonName,
              phone: parsedData.contact?.phone || '+972-XXX-XXXX',
              email: parsedData.contact?.email || 'info@emetdorcom.com'
            }
          };
          setQuoteData(mappedData);
        } else {
          setLoadingError('No quote data found. Please create a quote first.');
        }
      } catch (error) {
        setLoadingError('Failed to load quote data. Please try again.');
      }
    };

    loadQuoteData();
  }, []);

  // Enhanced printing logic
  useEffect(() => {
    if (!quoteData || loadingError) return;
    const waitForPrint = async () => {
      try {
        const images = [frameImage, emetLogo, techDiagram];
        const loadImg = (src: string) =>
          new Promise<void>(resolve => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = src;
            setTimeout(resolve, 5000);
          });

        await Promise.all(images.map(loadImg));
        await Promise.all(Array.from(document.images).map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; setTimeout(r,3000);})));
        await new Promise(r => requestAnimationFrame(r));
        window.print();
      } catch {
        window.print();
      }
    };

    setTimeout(waitForPrint, 200);
  }, [quoteData, loadingError]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB') || d;
  const formatCurrency = (amt: number, cur='USD') => {
    try {
      const map:{[k:string]:any}={USD:{code:'USD',locale:'en-US'},NIS:{code:'ILS',locale:'he-IL'},EUR:{code:'EUR',locale:'de-DE'}};
      const cfg = map[cur]||map.USD;
      return new Intl.NumberFormat(cfg.locale,{style:'currency',currency:cfg.code}).format(amt);
    } catch {
      return amt+' '+cur;
    }
  };

  if (loadingError) return <div>Error: {loadingError}</div>;
  if (!quoteData) return <div>Loading quote data...</div>;

  const { quote, bomItems, costItems, columnVisibility, bomEnabled, costsEnabled, date, version, contact } = quoteData;
  const grandTotal = costItems.reduce((s,i)=>s+(i.isDiscount?-i.totalPrice:i.totalPrice),0);

  return (
    <div className="print-container">
      <style jsx>{`
        @media print {
          .print-container { font-family:Arial,sans-serif; font-size:12px; }
          .page-break { page-break-before:always; }
        }
      `}</style>

      {/* Page 1 */}
      <div className="page-break">
        <img src={emetLogo} alt="Logo" style={{height:64,display:'block',margin:'16px auto'}}/>
        <h1 style={{textAlign:'center',fontSize:48}}>Quotation For</h1>
        <h2 style={{textAlign:'center',fontSize:32,borderBottom:'4px solid #2563EB',margin:'16px'}}> 
          {quote.subject}
        </h2>
        <p style={{textAlign:'center',marginTop:32}}>
          {quote.salesPerson} | {formatDate(date)} | Ver {version}
        </p>
      </div>

      {/* Page 2 */}
      <div className="page-break">
        <img src={emetLogo} alt="Logo" style={{height:48}}/>
        <h3>Intro</h3>
        <p>EMET Dorcom is one of the most successful...</p>
        <img src={techDiagram} alt="Diagram" style={{width:'100%',marginTop:16}}/>
      </div>

      {/* Page 3: BOM & Costs */}
      {(bomEnabled || costsEnabled) && (
        <div className="page-break">
          <img src={emetLogo} alt="Logo" style={{height:48}}/>
          {bomEnabled && (
            <>
              <h3>BOM</h3>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
                <thead>
                  <tr>
                    {columnVisibility.no && <th style={{border:'1px solid #ccc',padding:4}}>NO</th>}
                    {columnVisibility.partNumber && <th style={{border:'1px solid #ccc',padding:4}}>PN</th>}
                    {columnVisibility.productDescription && <th style={{border:'1px solid #ccc',padding:4}}>Product Description</th>}
                    {columnVisibility.qty && <th style={{border:'1px solid #ccc',padding:4}}>QTY</th>}
                    {columnVisibility.unitPrice && <th style={{border:'1px solid #ccc',padding:4}}>Unit Price</th>}
                    {columnVisibility.totalPrice && <th style={{border:'1px solid #ccc',padding:4}}>Total Price</th>}
                  </tr>
                </thead>
                <tbody>
                  {bomItems.map((item, i) => (
                    <tr key={i} style={{backgroundColor:i%2?'#f9fafb':'#fff'}}>
                      {columnVisibility.no && <td style={{border:'1px solid #ccc',padding:4}}>{item.no}</td>}
                      {columnVisibility.partNumber && <td style={{border:'1px solid #ccc',padding:4}}>{item.partNumber}</td>}
                      {columnVisibility.productDescription && <td style={{border:'1px solid #ccc',padding:4}}>{item.productDescription}</td>}
                      {columnVisibility.qty && <td style={{border:'1px solid #ccc',padding:4}}>{item.quantity}</td>}
                      {columnVisibility.unitPrice && <td style={{border:'1px solid #ccc',padding:4}}>{item.unitPrice!=null?formatCurrency(item.unitPrice,quote.currency):''}</td>}
                      {columnVisibility.totalPrice && <td style={{border:'1px solid #ccc',padding:4}}>{item.totalPrice!=null?formatCurrency(item.totalPrice,quote.currency):''}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {costsEnabled && (
            <>
              <h3 style={{marginTop:16}}>Costs</h3>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
                <thead>
                  <tr>
                    <th style={{border:'1px solid #ccc',padding:4}}>Description</th>
                    <th style={{border:'1px solid #ccc',padding:4}}>QTY</th>
                    <th style={{border:'1px solid #ccc',padding:4}}>Unit Price</th>
                    <th style={{border:'1px solid #ccc',padding:4}}>Total Price</th>
                  </tr>
                </thead>
                <tbody>
                  {costItems.map((item,i)=>(
                    <tr key={i} style={{backgroundColor:i%2?'#f9fafb':'#fff'}}>
                      <td style={{border:'1px solid #ccc',padding:4}}>
                        {item.isDiscount?'-':''}{item.description||item.productDescription}
                      </td>
                      <td style={{border:'1px solid #ccc',padding:4}}>{item.quantity}</td>
                      <td style={{border:'1px solid #ccc',padding:4}}>{formatCurrency(item.unitPrice,quote.currency)}</td>
                      <td style={{border:'1px solid #ccc',padding:4}}>
                        {item.isDiscount?'-':''}{formatCurrency(item.totalPrice,quote.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{textAlign:'right',marginTop:16,fontSize:14,fontWeight:'bold'}}>
                Grand Total: {formatCurrency(grandTotal,quote.currency)}
              </div>
            </>
          )}
        </div>
      )}

      {/* Page 4: Terms */}
      <div className="page-break">
        <img src={emetLogo} alt="Logo" style={{height:48}}/>
        <h3>Terms & Conditions</h3>
        <p>Payment Terms: {quote.terms}</p>
        <p>Currency: {quote.currency}</p>
        <div style={{marginTop:32}}>
          <h4>Standard Terms:</h4>
          <ul style={{fontSize:10,lineHeight:1.4}}>
            <li>All prices are exclusive of taxes unless otherwise stated</li>
            <li>Delivery terms to be confirmed upon order</li>
            <li>Standard warranty applies</li>
            <li>Subject to credit approval</li>
          </ul>
        </div>
      </div>

      {/* Page 5: Contact */}
      <div className="page-break">
        <img src={emetLogo} alt="Logo" style={{height:48}}/>
        <h3>Contact Information</h3>
        <div style={{marginTop:32,fontSize:14}}>
          <p><strong>Sales Contact:</strong> {contact.name || contact.salesPersonName || quote.salesPerson}</p>
          <p><strong>Phone:</strong> {contact.phone}</p>
          <p><strong>Email:</strong> {contact.email}</p>
          <div style={{marginTop:32}}>
            <p><strong>EMET Dorcom Ltd.</strong></p>
            <p>Technology Solutions Provider</p>
            <p>www.emetdorcom.com</p>
          </div>
        </div>
        <div style={{position:'absolute',bottom:32,left:0,right:0,textAlign:'center',fontSize:10,color:'#666'}}>
          Quote generated on {formatDate(date)} | Version {version}
        </div>
      </div>
    </div>
  );
}