// Server-renderable quote template that exactly matches QuotePreview.tsx
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
  quote: {
    subject: string;
    customer: string;
    salesPerson: string;
    terms: string;
    currency: string;
  };
  bomItems: BomItem[];
  costItems: CostItem[];
  columnVisibility: ColumnVisibility;
  bomEnabled: boolean;
  costsEnabled: boolean;
  date: string;
  version: string;
  contact: ContactInfo;
}

// Asset paths - these will be served from the server
const emetLogo = '/assets/image_1757577759606.png';
const techDiagram = '/assets/image_1757577458643.png';  
const frameImage = '/assets/image_1757577550193.png';

export function generateQuoteHTML(quoteData: QuoteData): string {
  const formatCurrency = (amount: number, currency: string) => {
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

  const grandTotal = quoteData.costItems.reduce((sum, item) => {
    return sum + (item.isDiscount ? -item.totalPrice : item.totalPrice);
  }, 0);

  const contact = quoteData.contact;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quote - ${quoteData.quote.subject}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .page {
      width: 210mm;
      height: 297mm;
      position: relative;
      background: white;
      overflow: hidden;
      page-break-after: always;
    }
    
    .page:last-child {
      page-break-after: avoid;
    }
    
    /* Page 1 - Cover page */
    .cover-page {
      background-image: url('${frameImage}');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    }
    
    .cover-logo {
      position: absolute;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
    }
    
    .cover-logo img {
      height: 96px;
      width: auto;
      image-rendering: crisp-edges;
    }
    
    .cover-content {
      position: relative;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 0 64px;
    }
    
    .cover-title {
      font-size: 36px;
      font-weight: bold;
      color: black;
      margin-bottom: 16px;
    }
    
    .cover-subject {
      font-size: 28px;
      color: black;
      margin-bottom: 8px;
      line-height: 1.2;
    }
    
    .cover-bottom {
      position: absolute;
      bottom: 60px;
      left: 50%;
      transform: translateX(-50%);
      text-align: center;
      font-size: 18px;
      color: black;
    }
    
    .page-number {
      position: absolute;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 18px;
      font-weight: bold;
      color: black;
    }
    
    /* Inner pages */
    .inner-page {
      background: white;
    }
    
    .page-logo {
      position: absolute;
      top: 24px;
      left: 24px;
    }
    
    .page-logo img {
      height: 48px;
      width: auto;
    }
    
    .page-logo-small img {
      height: 40px;
    }
    
    .page-content {
      padding-top: 80px;
      padding-left: 48px;
      padding-right: 48px;
      padding-bottom: 48px;
    }
    
    .page-number-gray {
      color: #6B7280;
    }
    
    /* Typography */
    h3 {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 24px;
      color: #111827;
    }
    
    h4 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #374151;
    }
    
    p {
      font-size: 16px;
      line-height: 1.625;
      color: #374151;
      margin-bottom: 16px;
    }
    
    ul {
      margin-left: 32px;
      margin-bottom: 16px;
    }
    
    li {
      font-size: 16px;
      color: #374151;
      margin-bottom: 8px;
    }
    
    ol {
      margin-left: 24px;
    }
    
    ol li {
      font-size: 16px;
      color: #374151;
      margin-bottom: 12px;
      line-height: 1.625;
    }
    
    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      border: 1px solid #D1D5DB;
    }
    
    .bom-table {
      font-size: 12px;
      margin-bottom: 24px;
    }
    
    .cost-table {
      font-size: 14px;
      margin-bottom: 24px;
    }
    
    .contact-table {
      font-size: 16px;
    }
    
    th {
      background-color: #4A90E2 !important;
      color: white !important;
      font-weight: bold;
      text-align: left;
      padding: 8px 12px;
      border-right: 1px solid #D1D5DB;
    }
    
    th:last-child {
      border-right: none;
    }
    
    td {
      padding: 8px 12px;
      border-right: 1px solid #E5E7EB;
      border-bottom: 1px solid #E5E7EB;
      color: #374151;
    }
    
    td:last-child {
      border-right: none;
    }
    
    .bom-table th,
    .bom-table td {
      padding: 6px 8px;
    }
    
    .cost-table th,
    .cost-table td {
      padding: 12px;
    }
    
    .contact-table th,
    .contact-table td {
      padding: 12px;
    }
    
    .text-center {
      text-align: center;
    }
    
    .text-right {
      text-align: right;
    }
    
    .whitespace-nowrap {
      white-space: nowrap;
    }
    
    .font-medium {
      font-weight: 500;
    }
    
    .tech-diagram {
      width: 100%;
      max-width: 800px;
      margin: 0 auto 32px auto;
      display: block;
    }
    
    .grand-total {
      text-align: right;
      border-top: 2px solid #9CA3AF;
      padding-top: 16px;
      font-size: 20px;
      font-weight: bold;
    }
    
    .signature-lines {
      margin-top: 48px;
    }
    
    .signature-line {
      border-bottom: 1px solid #9CA3AF;
      padding-bottom: 8px;
      margin-bottom: 16px;
      font-size: 16px;
    }
    
    .ip-text {
      font-size: 14px;
      line-height: 1.625;
      margin-bottom: 16px;
    }
    
    a {
      color: #2563EB;
      text-decoration: underline;
    }
    
    a:hover {
      color: #1D4ED8;
    }
    
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .page {
        margin: 0;
        page-break-after: always;
      }
      
      .page:last-child {
        page-break-after: avoid;
      }
      
      body {
        margin: 0;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <!-- Page 1 - Cover Page -->
  <div class="page cover-page">
    <div class="cover-logo">
      <img src="${emetLogo}" alt="EMET Dorcom" />
    </div>
    
    <div class="cover-content">
      <div>
        <h1 class="cover-title">Quotation For</h1>
        <h2 class="cover-subject">${quoteData.quote.subject || 'Cisco Catalyst Switch'}</h2>
      </div>
      
      <div class="cover-bottom">
        <div>${quoteData.quote.salesPerson || 'David Gilboa'} | ${formatDate(quoteData.date)} | Ver ${quoteData.version || '1'}</div>
      </div>
      
      <div class="page-number">1</div>
    </div>
  </div>

  <!-- Page 2 - Intro & Technology Diagram -->
  <div class="page inner-page">
    <div class="page-logo">
      <img src="${emetLogo}" alt="EMET Dorcom" />
    </div>
    
    <div class="page-content">
      <h3>Intro</h3>
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
      <ul>
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
      
      <img src="${techDiagram}" alt="Technology Solutions" class="tech-diagram" />
    </div>
    
    <div class="page-number page-number-gray">2</div>
  </div>

  ${(quoteData.bomEnabled || quoteData.costsEnabled) ? `
  <!-- Page 3 - BOM & Costs -->
  <div class="page inner-page">
    <div class="page-logo page-logo-small">
      <img src="${emetLogo}" alt="EMET Dorcom" />
    </div>
    
    <div class="page-content">
      ${quoteData.bomEnabled ? `
      <div>
        <h3>BOM</h3>
        <h4>${quoteData.quote.subject || 'Catalyst 9300 48-port PoE+'}</h4>
        
        ${quoteData.bomItems.length > 0 ? `
        <table class="bom-table">
          <thead>
            <tr>
              ${quoteData.columnVisibility.no ? '<th>NO</th>' : ''}
              ${quoteData.columnVisibility.partNumber ? '<th>PN</th>' : ''}
              ${quoteData.columnVisibility.productDescription ? '<th>Product Description</th>' : ''}
              ${quoteData.columnVisibility.qty ? '<th>QTY</th>' : ''}
              ${quoteData.columnVisibility.unitPrice ? '<th>Unit Price</th>' : ''}
              ${quoteData.columnVisibility.totalPrice ? '<th>Total Price</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${quoteData.bomItems.map(item => `
              <tr>
                ${quoteData.columnVisibility.no ? `<td class="whitespace-nowrap">${item.no}</td>` : ''}
                ${quoteData.columnVisibility.partNumber ? `<td class="font-medium whitespace-nowrap">${item.partNumber}</td>` : ''}
                ${quoteData.columnVisibility.productDescription ? `<td>${item.productDescription}</td>` : ''}
                ${quoteData.columnVisibility.qty ? `<td class="whitespace-nowrap">${item.quantity}</td>` : ''}
                ${quoteData.columnVisibility.unitPrice ? `<td class="whitespace-nowrap">${item.unitPrice !== undefined && item.unitPrice !== null ? formatCurrency(item.unitPrice, quoteData.quote.currency) : ''}</td>` : ''}
                ${quoteData.columnVisibility.totalPrice ? `<td class="whitespace-nowrap">${item.totalPrice !== undefined && item.totalPrice !== null ? formatCurrency(item.totalPrice, quoteData.quote.currency) : ''}</td>` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : '<p style="color: #6B7280; font-style: italic; text-align: center; padding: 24px 0;">No BOM items added yet</p>'}
      </div>
      ` : ''}

      ${quoteData.costsEnabled ? `
      <div>
        <h3>Costs</h3>
        
        ${quoteData.costItems.length > 0 ? `
        <table class="cost-table">
          <thead>
            <tr>
              <th>Product Description</th>
              <th class="text-center">QTY</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Total Price</th>
            </tr>
          </thead>
          <tbody>
            ${quoteData.costItems.map(item => `
              <tr>
                <td>${item.productDescription}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">${formatCurrency(item.unitPrice, quoteData.quote.currency)}</td>
                <td class="text-right font-medium">
                  ${item.isDiscount ? '-' : ''}${formatCurrency(item.totalPrice, quoteData.quote.currency)}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="grand-total">
          Grand Total: ${formatCurrency(grandTotal, quoteData.quote.currency)}
        </div>
        ` : '<p style="color: #6B7280; font-style: italic; text-align: center; padding: 24px 0;">No cost items added yet</p>'}
      </div>
      ` : ''}
    </div>
    
    <div class="page-number page-number-gray">3</div>
  </div>
  ` : ''}

  <!-- Page 4 - Payment Terms -->
  <div class="page inner-page">
    <div class="page-logo page-logo-small">
      <img src="${emetLogo}" alt="EMET Dorcom" />
    </div>
    
    <div class="page-content">
      <h3>Payment & General terms</h3>
      <ol>
        <li>Prices are not including VAT</li>
        <li>Installation is not included unless specifically stated in the quote.</li>
        <li>Payment in NIS will be at the dollar exchange rate represented on the day of the invoice issuance.</li>
        <li>Our offer is valid for a period of 14 days.</li>
        <li>The total price is for the purchase of the entire proposal</li>
        <li>Payment Terms - ${quoteData.quote.terms || 'Current +30'}</li>
        <li>Any delay in payment will result in the customer being charged an exceptional shekel-based interest or conversion to dollars according to the calculation that will produce the highest result.</li>
        <li>The contents will be delivered to the customer on the condition that the exchange for it will be fully paid according to the terms of the transaction. Any rights not acquired by the customer, at any time that the full exchange has not been received by Dorcom Computers Ltd., and has not been fully waived. Dorcom Computers Ltd. reserves the right to immediately return the endorsement in the contents, if the customer does not meet the full terms and schedule of the transaction, or to credit any amount received from the customer as partial payment towards the items of the order. All of this according to its sole choice and discretion.</li>
        <li>Subject to the general terms <a href="https://dorcom.co.il/%d7%aa%d7%a0%d7%90%d7%99-%d7%9e%d7%9b%d7%a8/" target="_blank" rel="noopener noreferrer">here</a></li>
      </ol>
      
      <div class="signature-lines">
        <div class="signature-line">Name | ___________</div>
        <div class="signature-line">Date | ___________</div>
        <div class="signature-line">Company + Signature | ___________</div>
      </div>
    </div>
    
    <div class="page-number page-number-gray">4</div>
  </div>

  <!-- Page 5 - IP Section -->
  <div class="page inner-page">
    <div class="page-logo page-logo-small">
      <img src="${emetLogo}" alt="EMET Dorcom" />
    </div>
    
    <div class="page-content">
      <h3>Intellectual property</h3>
      <div class="ip-text">
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

      <h3>Contact</h3>
      <table class="contact-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Phone</th>
            <th>Email</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="whitespace-nowrap">${contact.salesPersonName || quoteData.quote.salesPerson || 'David Gilboa'}</td>
            <td class="whitespace-nowrap">Account Manager</td>
            <td class="whitespace-nowrap">${contact.phone || ''}</td>
            <td class="whitespace-nowrap" style="word-break: break-all;">${contact.email || ''}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div class="page-number page-number-gray">5</div>
  </div>
</body>
</html>
  `;
}