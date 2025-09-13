import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Upload, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { ColumnVisibility, BomGroup } from "@shared/schema";

interface BomItem {
  no: number;
  partNumber: string;
  productDescription: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
}

interface BomGroupsSectionProps {
  bomEnabled: boolean;
  bomGroups: BomGroup[];
  columnVisibility: ColumnVisibility;
  onBomEnabledChange: (enabled: boolean) => void;
  onBomGroupsChange: (groups: BomGroup[]) => void;
  onColumnVisibilityChange: (visibility: ColumnVisibility) => void;
}

export default function BomGroupsSection({
  bomEnabled,
  bomGroups,
  columnVisibility,
  onBomEnabledChange,
  onBomGroupsChange,
  onColumnVisibilityChange,
}: BomGroupsSectionProps) {
  
  // State for collapsing individual groups
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroupCollapse = (groupId: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(groupId)) {
      newCollapsed.delete(groupId);
    } else {
      newCollapsed.add(groupId);
    }
    setCollapsedGroups(newCollapsed);
  };

  const addBomGroup = () => {
    const newGroupNumber = bomGroups.length + 1;
    const newGroup: BomGroup = {
      id: `bom-${Date.now()}`, // Unique ID
      name: `BOM ${newGroupNumber}`,
      items: []
    };
    onBomGroupsChange([...bomGroups, newGroup]);
    console.log(`Added new BOM group: ${newGroup.name}`);
  };

  const removeBomGroup = (groupId: string) => {
    const updatedGroups = bomGroups.filter(group => group.id !== groupId);
    // Renumber remaining groups
    const renumberedGroups = updatedGroups.map((group, index) => ({
      ...group,
      name: `BOM ${index + 1}`
    }));
    onBomGroupsChange(renumberedGroups);
    
    // Remove from collapsed state if it was collapsed
    const newCollapsed = new Set(collapsedGroups);
    newCollapsed.delete(groupId);
    setCollapsedGroups(newCollapsed);
    
    console.log(`Removed BOM group and renumbered`);
  };

  const updateGroupName = (groupId: string, newName: string) => {
    const updatedGroups = bomGroups.map(group =>
      group.id === groupId ? { ...group, name: newName } : group
    );
    onBomGroupsChange(updatedGroups);
  };

  const addBomItem = (groupId: string) => {
    const updatedGroups = bomGroups.map(group => {
      if (group.id === groupId) {
        const newItem: BomItem = {
          no: group.items.length + 1,
          partNumber: '',
          productDescription: '',
          quantity: 1,
          unitPrice: columnVisibility.unitPrice ? 0 : undefined,
          totalPrice: columnVisibility.totalPrice ? 0 : undefined,
        };
        return {
          ...group,
          items: [...group.items, newItem]
        };
      }
      return group;
    });
    onBomGroupsChange(updatedGroups);
    console.log(`Added BOM item to group ${groupId}`);
  };

  const removeBomItem = (groupId: string, itemIndex: number) => {
    const updatedGroups = bomGroups.map(group => {
      if (group.id === groupId) {
        const updatedItems = group.items.filter((_, i) => i !== itemIndex);
        // Renumber the items
        const renumberedItems = updatedItems.map((item, i) => ({ ...item, no: i + 1 }));
        return {
          ...group,
          items: renumberedItems
        };
      }
      return group;
    });
    onBomGroupsChange(updatedGroups);
    console.log(`Removed BOM item from group ${groupId}`);
  };

  const updateBomItem = (groupId: string, itemIndex: number, field: keyof BomItem, value: string | number) => {
    const updatedGroups = bomGroups.map(group => {
      if (group.id === groupId) {
        const updatedItems = group.items.map((item, i) => {
          if (i === itemIndex) {
            const updatedItem = { ...item, [field]: value };
            
            // Auto-calculate total price when quantity or unitPrice changes
            if ((field === 'quantity' || field === 'unitPrice') && 
                updatedItem.unitPrice != null && updatedItem.quantity != null && 
                updatedItem.unitPrice >= 0 && updatedItem.quantity >= 0) {
              const totalPrice = updatedItem.quantity * updatedItem.unitPrice;
              updatedItem.totalPrice = totalPrice;
            }
            
            return updatedItem;
          }
          return item;
        });
        return {
          ...group,
          items: updatedItems
        };
      }
      return group;
    });
    onBomGroupsChange(updatedGroups);
  };

  const handleExcelPaste = (e: React.ClipboardEvent, groupId: string) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const rows = text.split('\n').filter(row => row.trim());
    
    const group = bomGroups.find(g => g.id === groupId);
    if (!group) return;

    const newItems: BomItem[] = rows.map((row, index) => {
      const cells = row.split('\t');
      const partNumber = cells[0] || '';
      const productDescription = cells[1] || '';
      const quantity = parseInt(cells[2]) || 1;
      const unitPrice = parseFloat(cells[3]) || undefined;

      return {
        no: group.items.length + index + 1,
        partNumber,
        productDescription,
        quantity,
        unitPrice: columnVisibility.unitPrice ? unitPrice : undefined,
        totalPrice: columnVisibility.totalPrice && unitPrice ? quantity * unitPrice : undefined,
      };
    });

    const updatedGroups = bomGroups.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          items: [...g.items, ...newItems]
        };
      }
      return g;
    });

    onBomGroupsChange(updatedGroups);
    console.log(`Pasted ${newItems.length} items from Excel to group ${groupId}`);
  };

  const toggleColumnVisibility = (column: keyof ColumnVisibility) => {
    const newVisibility = { ...columnVisibility, [column]: !columnVisibility[column] };
    
    // When enabling cost columns, backfill calculations for existing items across all groups
    if (column === 'totalPrice' && newVisibility.totalPrice) {
      const updatedGroups = bomGroups.map(group => ({
        ...group,
        items: group.items.map(item => ({
          ...item,
          totalPrice: item.unitPrice !== undefined && item.unitPrice !== null 
            ? item.quantity * item.unitPrice 
            : undefined
        }))
      }));
      onBomGroupsChange(updatedGroups);
    }
    
    onColumnVisibilityChange(newVisibility);
    console.log(`Column ${column} visibility toggled`);
  };

  return (
    <Card data-testid="card-bom-groups-section">
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
        <CardContent className="space-y-6">
          {/* Column Visibility Controls - Global for all groups */}
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
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="col-unit-price"
                  checked={columnVisibility.unitPrice}
                  onCheckedChange={() => toggleColumnVisibility('unitPrice')}
                  data-testid="checkbox-col-unit-price"
                />
                <Label htmlFor="col-unit-price" className="text-sm">Unit Price</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="col-total-price"
                  checked={columnVisibility.totalPrice}
                  onCheckedChange={() => toggleColumnVisibility('totalPrice')}
                  data-testid="checkbox-col-total-price"
                />
                <Label htmlFor="col-total-price" className="text-sm">Total Price</Label>
              </div>
            </div>
            
            <Button
              onClick={addBomGroup}
              variant="outline"
              size="sm"
              data-testid="button-add-bom-group"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add BOM Group
            </Button>
          </div>

          {/* BOM Groups */}
          {bomGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No BOM groups yet.</p>
              <p className="text-sm mt-2">Click "Add BOM Group" to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bomGroups.map((group, groupIndex) => {
                const isCollapsed = collapsedGroups.has(group.id);
                
                return (
                  <Card key={group.id} className="border-l-4 border-l-primary" data-testid={`card-bom-group-${group.id}`}>
                    <CardHeader 
                      className="cursor-pointer hover-elevate"
                      onClick={() => toggleGroupCollapse(group.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isCollapsed ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronUp className="h-4 w-4" />
                          )}
                          <Input
                            value={group.name}
                            onChange={(e) => {
                              e.stopPropagation();
                              updateGroupName(group.id, e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="text-lg font-semibold border-none bg-transparent p-0 h-auto focus-visible:ring-0"
                            data-testid={`input-group-name-${group.id}`}
                          />
                          <span className="text-sm text-muted-foreground">
                            ({group.items.length} items)
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            onClick={() => addBomItem(group.id)}
                            variant="outline"
                            size="sm"
                            data-testid={`button-add-item-${group.id}`}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Item
                          </Button>
                          
                          {bomGroups.length > 1 && (
                            <Button
                              onClick={() => removeBomGroup(group.id)}
                              variant="outline"
                              size="sm"
                              data-testid={`button-remove-group-${group.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    {!isCollapsed && (
                      <CardContent>
                        {group.items.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>No items in this BOM group yet.</p>
                            <p className="text-sm mt-2">Click "Add Item" to get started.</p>
                          </div>
                        ) : (
                          <div className="border rounded-md">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  {columnVisibility.no && <TableHead>NO</TableHead>}
                                  {columnVisibility.partNumber && <TableHead>Part Number</TableHead>}
                                  {columnVisibility.productDescription && <TableHead>Product Description</TableHead>}
                                  {columnVisibility.qty && <TableHead>QTY</TableHead>}
                                  {columnVisibility.unitPrice && <TableHead>Unit Price</TableHead>}
                                  {columnVisibility.totalPrice && <TableHead>Total Price</TableHead>}
                                  <TableHead className="w-16">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody onPaste={(e) => handleExcelPaste(e, group.id)} data-testid={`table-bom-items-${group.id}`}>
                                {group.items.map((item, itemIndex) => (
                                  <TableRow key={itemIndex} data-testid={`row-bom-item-${group.id}-${itemIndex}`}>
                                    {columnVisibility.no && (
                                      <TableCell>
                                        <Input
                                          type="number"
                                          value={item.no}
                                          onChange={(e) => updateBomItem(group.id, itemIndex, 'no', parseInt(e.target.value) || 0)}
                                          className="w-16"
                                          data-testid={`input-bom-no-${group.id}-${itemIndex}`}
                                        />
                                      </TableCell>
                                    )}
                                    {columnVisibility.partNumber && (
                                      <TableCell>
                                        <Input
                                          value={item.partNumber}
                                          onChange={(e) => updateBomItem(group.id, itemIndex, 'partNumber', e.target.value)}
                                          placeholder="e.g., VH2G4324-ONE"
                                          data-testid={`input-bom-part-number-${group.id}-${itemIndex}`}
                                        />
                                      </TableCell>
                                    )}
                                    {columnVisibility.productDescription && (
                                      <TableCell>
                                        <Input
                                          value={item.productDescription}
                                          onChange={(e) => updateBomItem(group.id, itemIndex, 'productDescription', e.target.value)}
                                          placeholder="e.g., Catalyst 9300 48-port PoE+"
                                          className="min-w-[200px]"
                                          data-testid={`input-bom-description-${group.id}-${itemIndex}`}
                                        />
                                      </TableCell>
                                    )}
                                    {columnVisibility.qty && (
                                      <TableCell>
                                        <Input
                                          type="number"
                                          value={item.quantity}
                                          onChange={(e) => updateBomItem(group.id, itemIndex, 'quantity', parseInt(e.target.value) || 0)}
                                          className="w-20"
                                          data-testid={`input-bom-quantity-${group.id}-${itemIndex}`}
                                        />
                                      </TableCell>
                                    )}
                                    {columnVisibility.unitPrice && (
                                      <TableCell>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          value={item.unitPrice || ''}
                                          onChange={(e) => updateBomItem(group.id, itemIndex, 'unitPrice', parseFloat(e.target.value) || 0)}
                                          placeholder="0.00"
                                          className="w-24"
                                          data-testid={`input-bom-unit-price-${group.id}-${itemIndex}`}
                                        />
                                      </TableCell>
                                    )}
                                    {columnVisibility.totalPrice && (
                                      <TableCell>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          value={item.totalPrice || ''}
                                          onChange={(e) => updateBomItem(group.id, itemIndex, 'totalPrice', parseFloat(e.target.value) || 0)}
                                          placeholder="0.00"
                                          className="w-24"
                                          data-testid={`input-bom-total-price-${group.id}-${itemIndex}`}
                                        />
                                      </TableCell>
                                    )}
                                    <TableCell>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeBomItem(group.id, itemIndex)}
                                        data-testid={`button-remove-item-${group.id}-${itemIndex}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}