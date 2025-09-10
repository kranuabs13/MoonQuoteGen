import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Percent } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";

interface CostItem {
  productDescription: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isDiscount: boolean;
}

interface CostSectionProps {
  costItems: CostItem[];
  onCostItemsChange: (items: CostItem[]) => void;
}

export default function CostSection({
  costItems,
  onCostItemsChange,
}: CostSectionProps) {
  const [grandTotal, setGrandTotal] = useState(0);

  useEffect(() => {
    const total = costItems.reduce((sum, item) => {
      return sum + (item.isDiscount ? -item.totalPrice : item.totalPrice);
    }, 0);
    setGrandTotal(total);
  }, [costItems]);

  const addCostItem = (isDiscount = false) => {
    const newItem: CostItem = {
      productDescription: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      isDiscount,
    };
    onCostItemsChange([...costItems, newItem]);
    console.log(`${isDiscount ? 'Discount' : 'Cost'} item added`);
  };

  const removeCostItem = (index: number) => {
    const updatedItems = costItems.filter((_, i) => i !== index);
    onCostItemsChange(updatedItems);
    console.log('Cost item removed');
  };

  const updateCostItem = (index: number, field: keyof CostItem, value: string | number | boolean) => {
    const updatedItems = costItems.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value };
        
        // Auto-calculate total price when quantity or unit price changes
        if (field === 'quantity' || field === 'unitPrice') {
          updatedItem.totalPrice = updatedItem.quantity * updatedItem.unitPrice;
        }
        
        return updatedItem;
      }
      return item;
    });
    onCostItemsChange(updatedItems);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Card data-testid="card-cost-section">
      <CardHeader>
        <CardTitle>Costs</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => addCostItem(false)}
            data-testid="button-add-cost-item"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Cost Item
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => addCostItem(true)}
            data-testid="button-add-discount"
          >
            <Percent className="h-4 w-4 mr-2" />
            Add Discount
          </Button>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Description</TableHead>
                <TableHead className="w-20">QTY</TableHead>
                <TableHead className="w-32">Unit Price</TableHead>
                <TableHead className="w-32">Total Price</TableHead>
                <TableHead className="w-16">Type</TableHead>
                <TableHead className="w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody data-testid="table-cost-items">
              {costItems.map((item, index) => (
                <TableRow key={index} data-testid={`row-cost-item-${index}`} className={item.isDiscount ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                  <TableCell>
                    <Input
                      value={item.productDescription}
                      onChange={(e) => updateCostItem(index, 'productDescription', e.target.value)}
                      placeholder={item.isDiscount ? "Special Discount" : "e.g., Catalyst 9300 48-port PoE+"}
                      data-testid={`input-cost-description-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateCostItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      min="1"
                      data-testid={`input-cost-quantity-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateCostItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      min="0"
                      placeholder="0.00"
                      data-testid={`input-cost-unit-price-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium" data-testid={`text-cost-total-${index}`}>
                      {item.isDiscount ? '-' : ''}{formatCurrency(item.totalPrice)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={item.isDiscount}
                        onCheckedChange={(checked) => updateCostItem(index, 'isDiscount', checked)}
                        data-testid={`switch-is-discount-${index}`}
                      />
                      <Label className="text-xs">{item.isDiscount ? 'Disc' : 'Cost'}</Label>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCostItem(index)}
                      data-testid={`button-remove-cost-item-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {costItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No cost items. Click "Add Cost Item" to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-end">
            <div className="text-right space-y-2">
              <div className="text-2xl font-bold" data-testid="text-grand-total">
                Grand Total: {formatCurrency(grandTotal)}
              </div>
              <div className="text-sm text-muted-foreground">
                All prices in USD, excluding VAT
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}