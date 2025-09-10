import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Upload, Eye, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

interface BomItem {
  no: number;
  partNumber: string;
  productDescription: string;
  quantity: number;
}

interface BomSectionProps {
  bomEnabled: boolean;
  bomItems: BomItem[];
  onBomEnabledChange: (enabled: boolean) => void;
  onBomItemsChange: (items: BomItem[]) => void;
}

interface ColumnVisibility {
  qty: boolean;
  productDescription: boolean;
  partNumber: boolean;
  no: boolean;
}

export default function BomSection({
  bomEnabled,
  bomItems,
  onBomEnabledChange,
  onBomItemsChange,
}: BomSectionProps) {
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    qty: true,
    productDescription: true,
    partNumber: true,
    no: true,
  });

  const addBomItem = () => {
    const newItem: BomItem = {
      no: bomItems.length + 1,
      partNumber: '',
      productDescription: '',
      quantity: 1,
    };
    onBomItemsChange([...bomItems, newItem]);
    console.log('BOM item added');
  };

  const removeBomItem = (index: number) => {
    const updatedItems = bomItems.filter((_, i) => i !== index);
    // Renumber the items
    const renumberedItems = updatedItems.map((item, i) => ({ ...item, no: i + 1 }));
    onBomItemsChange(renumberedItems);
    console.log('BOM item removed');
  };

  const updateBomItem = (index: number, field: keyof BomItem, value: string | number) => {
    const updatedItems = bomItems.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    );
    onBomItemsChange(updatedItems);
  };

  const handleExcelPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const rows = text.split('\n').filter(row => row.trim());
    
    const newItems: BomItem[] = rows.map((row, index) => {
      const cells = row.split('\t');
      return {
        no: bomItems.length + index + 1,
        partNumber: cells[1] || '',
        productDescription: cells[0] || '',
        quantity: parseInt(cells[2]) || 1,
      };
    });

    onBomItemsChange([...bomItems, ...newItems]);
    console.log(`Pasted ${newItems.length} items from Excel`);
  };

  const toggleColumnVisibility = (column: keyof ColumnVisibility) => {
    setColumnVisibility(prev => ({ ...prev, [column]: !prev[column] }));
    console.log(`Column ${column} visibility toggled`);
  };

  return (
    <Card data-testid="card-bom-section">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>BOM (Bill of Materials)</CardTitle>
          <div className="flex items-center space-x-2">
            <Label htmlFor="bom-enabled">Enable BOM</Label>
            <Switch
              id="bom-enabled"
              data-testid="switch-bom-enabled"
              checked={bomEnabled}
              onCheckedChange={onBomEnabledChange}
            />
          </div>
        </div>
      </CardHeader>
      
      {bomEnabled && (
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="col-qty"
                  checked={columnVisibility.qty}
                  onCheckedChange={() => toggleColumnVisibility('qty')}
                  data-testid="checkbox-col-qty"
                />
                <Label htmlFor="col-qty" className="text-sm">QTY</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="col-desc"
                  checked={columnVisibility.productDescription}
                  onCheckedChange={() => toggleColumnVisibility('productDescription')}
                  data-testid="checkbox-col-description"
                />
                <Label htmlFor="col-desc" className="text-sm">Product Description</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="col-pn"
                  checked={columnVisibility.partNumber}
                  onCheckedChange={() => toggleColumnVisibility('partNumber')}
                  data-testid="checkbox-col-part-number"
                />
                <Label htmlFor="col-pn" className="text-sm">PN</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="col-no"
                  checked={columnVisibility.no}
                  onCheckedChange={() => toggleColumnVisibility('no')}
                  data-testid="checkbox-col-no"
                />
                <Label htmlFor="col-no" className="text-sm">NO</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={addBomItem}
                data-testid="button-add-bom-item"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </div>

          <div className="text-sm text-muted-foreground p-2 bg-muted rounded-md">
            <Upload className="h-4 w-4 inline mr-2" />
            Paste from Excel: Copy from spreadsheet and paste directly into the table below
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  {columnVisibility.no && <TableHead>NO</TableHead>}
                  {columnVisibility.partNumber && <TableHead>Part Number</TableHead>}
                  {columnVisibility.productDescription && <TableHead>Product Description</TableHead>}
                  {columnVisibility.qty && <TableHead>QTY</TableHead>}
                  <TableHead className="w-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody onPaste={handleExcelPaste} data-testid="table-bom-items">
                {bomItems.map((item, index) => (
                  <TableRow key={index} data-testid={`row-bom-item-${index}`}>
                    {columnVisibility.no && (
                      <TableCell>
                        <Input
                          type="number"
                          value={item.no}
                          onChange={(e) => updateBomItem(index, 'no', parseInt(e.target.value) || 0)}
                          className="w-16"
                          data-testid={`input-bom-no-${index}`}
                        />
                      </TableCell>
                    )}
                    {columnVisibility.partNumber && (
                      <TableCell>
                        <Input
                          value={item.partNumber}
                          onChange={(e) => updateBomItem(index, 'partNumber', e.target.value)}
                          placeholder="e.g., VH2G4324-ONE"
                          data-testid={`input-bom-part-number-${index}`}
                        />
                      </TableCell>
                    )}
                    {columnVisibility.productDescription && (
                      <TableCell>
                        <Input
                          value={item.productDescription}
                          onChange={(e) => updateBomItem(index, 'productDescription', e.target.value)}
                          placeholder="e.g., Catalyst 9300 48-port PoE+"
                          className="min-w-[200px]"
                          data-testid={`input-bom-description-${index}`}
                        />
                      </TableCell>
                    )}
                    {columnVisibility.qty && (
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateBomItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-20"
                          min="1"
                          data-testid={`input-bom-quantity-${index}`}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeBomItem(index)}
                        data-testid={`button-remove-bom-item-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {bomItems.length === 0 && (
                  <TableRow>
                    <TableCell 
                      colSpan={Object.values(columnVisibility).filter(Boolean).length + 1} 
                      className="text-center text-muted-foreground py-8"
                    >
                      No BOM items. Click "Add Item" to get started or paste from Excel.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      )}
    </Card>
  );
}