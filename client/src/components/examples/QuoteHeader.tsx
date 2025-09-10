import QuoteHeader from '../QuoteHeader';
import { useState } from 'react';

export default function QuoteHeaderExample() {
  const [formData, setFormData] = useState({
    quoteSubject: 'Cisco Catalyst Switch 9300 48-port PoE+',
    customerCompany: 'Armis Technologies',
    customerLogo: '',
    salesPersonName: 'David Gilboa',
    date: '2025-09-10',
    version: '1',
    paymentTerms: 'Current +30'
  });

  const handleLogoChange = (file: File | null) => {
    if (file) {
      const url = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, customerLogo: url }));
      console.log('Logo uploaded:', file.name);
    } else {
      setFormData(prev => ({ ...prev, customerLogo: '' }));
      console.log('Logo removed');
    }
  };

  return (
    <div className="p-4">
      <QuoteHeader
        quoteSubject={formData.quoteSubject}
        customerCompany={formData.customerCompany}
        customerLogo={formData.customerLogo}
        salesPersonName={formData.salesPersonName}
        date={formData.date}
        version={formData.version}
        paymentTerms={formData.paymentTerms}
        onQuoteSubjectChange={(value) => setFormData(prev => ({ ...prev, quoteSubject: value }))}
        onCustomerCompanyChange={(value) => setFormData(prev => ({ ...prev, customerCompany: value }))}
        onCustomerLogoChange={handleLogoChange}
        onSalesPersonChange={(value) => setFormData(prev => ({ ...prev, salesPersonName: value }))}
        onDateChange={(value) => setFormData(prev => ({ ...prev, date: value }))}
        onVersionChange={(value) => setFormData(prev => ({ ...prev, version: value }))}
        onPaymentTermsChange={(value) => setFormData(prev => ({ ...prev, paymentTerms: value }))}
      />
    </div>
  );
}