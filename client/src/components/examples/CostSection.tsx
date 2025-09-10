import CostSection from '../CostSection';
import { useState } from 'react';

export default function CostSectionExample() {
  const [costItems, setCostItems] = useState([
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
  ]);

  return (
    <div className="p-4">
      <CostSection
        costItems={costItems}
        onCostItemsChange={setCostItems}
      />
    </div>
  );
}