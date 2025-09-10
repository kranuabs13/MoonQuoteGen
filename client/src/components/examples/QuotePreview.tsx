import QuotePreview from '../QuotePreview';

export default function QuotePreviewExample() {
  const sampleData = {
    quoteSubject: 'Cisco Catalyst Switch 9300 48-port PoE+',
    customerCompany: 'Armis Technologies',
    customerLogo: '',
    salesPersonName: 'David Gilboa',
    date: '2025-09-10',
    version: '1',
    paymentTerms: 'Current +30',
    bomEnabled: true,
    bomItems: [
      {
        no: 1,
        partNumber: 'VH2G4324-ONE',
        productDescription: 'Catalyst 9300 48-port PoE+, Network Advantage',
        quantity: 1
      },
      {
        no: 2,
        partNumber: 'PVKS837-RM',
        productDescription: 'C9300 DNA Advantage, 48-Port Term Licenses',
        quantity: 4
      }
    ],
    costItems: [
      {
        productDescription: 'Catalyst 9300 48-port PoE+',
        quantity: 3,
        unitPrice: 4200,
        totalPrice: 12600,
        isDiscount: false
      },
      {
        productDescription: '3 Years Support',
        quantity: 2,
        unitPrice: 1900,
        totalPrice: 3800,
        isDiscount: false
      },
      {
        productDescription: 'Special Discount',
        quantity: 1,
        unitPrice: 4000,
        totalPrice: 4000,
        isDiscount: true
      }
    ]
  };

  const handleSectionClick = (section: string) => {
    console.log(`Preview section clicked: ${section}`);
  };

  return (
    <div className="h-[600px]">
      <QuotePreview
        {...sampleData}
        onSectionClick={handleSectionClick}
      />
    </div>
  );
}