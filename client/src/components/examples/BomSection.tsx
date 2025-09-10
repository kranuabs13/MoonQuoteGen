import BomSection from '../BomSection';
import { useState } from 'react';

export default function BomSectionExample() {
  const [bomEnabled, setBomEnabled] = useState(true);
  const [bomItems, setBomItems] = useState([
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
    },
    {
      no: 3,
      partNumber: 'FKN42',
      productDescription: 'C9300 DNA Advantage, 48-Port, 3 Year Term License',
      quantity: 1
    }
  ]);

  return (
    <div className="p-4">
      <BomSection
        bomEnabled={bomEnabled}
        bomItems={bomItems}
        onBomEnabledChange={setBomEnabled}
        onBomItemsChange={setBomItems}
      />
    </div>
  );
}