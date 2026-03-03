"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Plus, Minus, Trash2, Hash } from "lucide-react";
import { toast } from "sonner";

interface OrderItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  modelId?: string;
  model?: {
    id: string;
    name: string;
    code: string;
    family?: {
      name: string;
    };
  };
}

interface SplitData {
  id: string;
  number: string;
  itemIds: string[];
}

interface SplitDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: 'invoice' | 'proforma' | 'purchase-order' | 'delivery-note';
  documentNumber?: string;
  documentYear?: number;
  items: OrderItem[];
  currency: string;
  orderId: string;
  onSplitComplete?: () => void;
}

export default function SplitDocumentDialog({
  open,
  onOpenChange,
  documentType,
  documentNumber,
  documentYear,
  items,
  currency,
  orderId,
  onSplitComplete,
}: SplitDocumentDialogProps) {
  const [numSplits, setNumSplits] = useState(2);
  const [splits, setSplits] = useState<SplitData[]>([]);
  const [shareNumber, setShareNumber] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSplitIndex, setPreviewSplitIndex] = useState<number | null>(null);

  // Initialize splits when component opens
  useEffect(() => {
    if (open) {
      initializeSplits();
    }
  }, [open, numSplits, items, documentNumber, documentYear]);

  const initializeSplits = () => {
    const newSplits: SplitData[] = [];

    for (let i = 0; i < numSplits; i++) {
      // Extract the sequence number from the document number
      let sequence = 1;
      if (documentNumber && documentNumber.includes('/')) {
        const parts = documentNumber.split('/');
        const numberPart = parts[0];
        // Try to extract the numeric part (handles prefixes like "INV-001", "PRO-002")
        const numericMatch = numberPart.match(/\d+/);
        if (numericMatch) {
          sequence = parseInt(numericMatch[0]);
        } else {
          // Fallback: default to index + 1
          sequence = i + 1;
        }
      } else {
        sequence = i + 1;
      }

      const splitNumber = documentNumber
        ? shareNumber
          ? documentNumber
          : `${sequence}/${documentYear || new Date().getFullYear()}`
        : `${sequence}/${documentYear || new Date().getFullYear()}`;

      newSplits.push({
        id: `split-${i}`,
        number: splitNumber,
        itemIds: [],
      });
    }

    setSplits(newSplits);
    setSelectedItemIds(new Set());
  };

  // Calculate totals for a split
  const calculateSplitTotals = (split: SplitData) => {
    const splitItems = items.filter(item => split.itemIds.includes(item.id));
    const subtotal = splitItems.reduce((sum, item) => {
      const lineTotal = item.quantity * item.unitPrice - item.discount;
      return sum + lineTotal;
    }, 0);

    return { subtotal, itemCount: splitItems.length };
  };

  // Distribute items evenly across splits
  const distributeItemsEvenly = () => {
    const newSplits = [...splits];
    const itemsPerSplit = Math.ceil(items.length / numSplits);

    items.forEach((item, index) => {
      const splitIndex = Math.floor(index / itemsPerSplit) % numSplits;
      newSplits[splitIndex].itemIds.push(item.id);
    });

    setSplits(newSplits);
  };

  // Add selected items to split
  const addSelectedToSplit = (splitIndex: number) => {
    const newSplits = [...splits];
    selectedItemIds.forEach(itemId => {
      // Remove from other splits
      for (let i = 0; i < newSplits.length; i++) {
        if (i !== splitIndex) {
          newSplits[i].itemIds = newSplits[i].itemIds.filter(id => id !== itemId);
        }
      }
      // Add to target split
      if (!newSplits[splitIndex].itemIds.includes(itemId)) {
        newSplits[splitIndex].itemIds.push(itemId);
      }
    });
    setSplits(newSplits);
    setSelectedItemIds(new Set());
  };

  // Remove item from split
  const removeItemFromSplit = (splitIndex: number, itemId: string) => {
    const newSplits = [...splits];
    newSplits[splitIndex].itemIds = newSplits[splitIndex].itemIds.filter(id => id !== itemId);
    setSplits(newSplits);
  };

  // Update split field
  const updateSplitField = (splitIndex: number, field: keyof SplitData, value: any) => {
    const newSplits = [...splits];
    newSplits[splitIndex] = { ...newSplits[splitIndex], [field]: value };
    setSplits(newSplits);
  };

  // Handle item checkbox toggle
  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItemIds);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItemIds(newSelected);
  };

  // Toggle all items
  const toggleAllItems = () => {
    if (selectedItemIds.size === items.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(items.map(item => item.id)));
    }
  };

  // Handle preview
  const handlePreview = (splitIndex: number) => {
    setPreviewSplitIndex(splitIndex);
    setPreviewOpen(true);
  };

  // Handle create splits
  const handleCreateSplits = async () => {
    // Validate that all items are distributed
    const distributedItemIds = new Set<string>();
    splits.forEach(split => split.itemIds.forEach(id => distributedItemIds.add(id)));

    if (distributedItemIds.size !== items.length) {
      toast.error("Please distribute all items before creating splits");
      return;
    }

    // Validate that each split has at least one item
    const emptySplits = splits.filter(split => split.itemIds.length === 0);
    if (emptySplits.length > 0) {
      toast.error("Each split must have at least one item");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/splits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType,
          splits: splits.map((split, index) => ({
            index,
            number: split.number,
            itemIds: split.itemIds,
          })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Successfully created ${numSplits} ${documentType} splits`);
        onOpenChange(false);
        if (onSplitComplete) {
          onSplitComplete();
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create splits');
      }
    } catch (error) {
      console.error('Error creating splits:', error);
      toast.error('Failed to create splits');
    } finally {
      setIsCreating(false);
    }
  };

  const getDocumentTypeName = () => {
    switch (documentType) {
      case 'invoice': return 'Invoice';
      case 'proforma': return 'Proforma';
      case 'purchase-order': return 'Purchase Order';
      case 'delivery-note': return 'Delivery Note';
      default: return 'Document';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="!max-w-[90vw] !sm:max-w-[90vw] !w-[90vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Split {getDocumentTypeName()}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {/* Settings Section */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <Label htmlFor="numSplits">Number of Splits</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setNumSplits(Math.max(2, numSplits - 1))}
                    disabled={numSplits <= 2}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="numSplits"
                    type="number"
                    min="2"
                    max="10"
                    value={numSplits}
                    onChange={(e) => setNumSplits(Math.min(10, Math.max(2, parseInt(e.target.value) || 2)))}
                    className="w-20 text-center"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setNumSplits(Math.min(10, numSplits + 1))}
                    disabled={numSplits >= 10}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col justify-end pb-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="shareNumber"
                    checked={shareNumber}
                    onCheckedChange={(checked) => setShareNumber(checked as boolean)}
                  />
                  <Label htmlFor="shareNumber">Share same number for all splits</Label>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 mb-6">
              <Button
                variant="outline"
                onClick={distributeItemsEvenly}
                disabled={items.length === 0}
              >
                Distribute Items Evenly
              </Button>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-muted-foreground">Selected: {selectedItemIds.size} items</span>
                <Checkbox
                  id="selectAll"
                  checked={selectedItemIds.size === items.length && items.length > 0}
                  onCheckedChange={toggleAllItems}
                />
                <Label htmlFor="selectAll">Select All</Label>
              </div>
            </div>

            {/* Splits Tabs */}
            <Tabs defaultValue="0" className="w-full">
              <TabsList className="grid w-full grid-cols-5 mb-4">
                {splits.map((split, index) => (
                  <TabsTrigger key={split.id} value={index.toString()}>
                    Split {index + 1}
                  </TabsTrigger>
                ))}
              </TabsList>

              {splits.map((split, splitIndex) => (
                <TabsContent key={split.id} value={splitIndex.toString()} className="space-y-4">
                  {/* Split Settings */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-4">
                      <Label htmlFor={`split-${splitIndex}-number`}>
                        <Hash className="h-4 w-4 inline mr-1" />
                        Number
                      </Label>
                      <Input
                        id={`split-${splitIndex}-number`}
                        value={split.number}
                        onChange={(e) => updateSplitField(splitIndex, 'number', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Add Selected Items Button */}
                  {selectedItemIds.size > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => addSelectedToSplit(splitIndex)}
                      className="w-full"
                    >
                      Add {selectedItemIds.size} Selected Items to Split {splitIndex + 1}
                    </Button>
                  )}

                  {/* Items Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium">Item</th>
                          <th className="px-4 py-2 text-right text-sm font-medium">Qty</th>
                          <th className="px-4 py-2 text-right text-sm font-medium">Price</th>
                          <th className="px-4 py-2 text-right text-sm font-medium">Discount</th>
                          <th className="px-4 py-2 text-right text-sm font-medium">Total</th>
                          <th className="px-4 py-2 text-center text-sm font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => {
                          const isInSplit = split.itemIds.includes(item.id);

                          return (
                            <tr
                              key={item.id}
                              className={`border-t ${isInSplit ? 'bg-green-50 dark:bg-green-950/20' : 'hover:bg-muted/50'}`}
                            >
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={selectedItemIds.has(item.id)}
                                    onCheckedChange={() => toggleItemSelection(item.id)}
                                  />
                                  <div>
                                    <div className="font-medium">{item.description}</div>
                                    {item.model && (
                                      <div className="text-xs text-muted-foreground">
                                        {item.model.code} - {item.model.name}
                                        {item.model.family && ` (${item.model.family.name})`}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-2 text-right">{item.quantity}</td>
                              <td className="px-4 py-2 text-right">
                                {item.unitPrice.toFixed(2)} {currency}
                              </td>
                              <td className="px-4 py-2 text-right">
                                {item.discount.toFixed(2)} {currency}
                              </td>
                              <td className="px-4 py-2 text-right font-medium">
                                {item.totalPrice.toFixed(2)} {currency}
                              </td>
                              <td className="px-4 py-2 text-center">
                                {isInSplit ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeItemFromSplit(splitIndex, item.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                ) : (
                                  <Badge variant="outline">Not in this split</Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Split Totals */}
                  {(() => {
                    const totals = calculateSplitTotals(split);
                    return (
                      <div className="bg-muted p-4 rounded-lg">
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div>
                            <div className="text-sm text-muted-foreground">Items</div>
                            <div className="text-2xl font-bold">
                              {totals.itemCount}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Subtotal</div>
                            <div className="text-2xl font-bold text-primary">
                              {totals.subtotal.toFixed(2)} {currency}
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          className="w-full mt-4"
                          onClick={() => handlePreview(splitIndex)}
                          disabled={split.itemIds.length === 0}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Preview Split {splitIndex + 1}
                        </Button>
                      </div>
                    );
                  })()}
                </TabsContent>
              ))}
            </Tabs>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateSplits}
              disabled={isCreating || splits.some(s => s.itemIds.length === 0)}
            >
              {isCreating ? 'Creating...' : `Create ${numSplits} Splits`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog for individual split */}
      {previewSplitIndex !== null && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="!max-w-[80vw] !sm:max-w-[80vw] !w-[80vw] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Preview: Split {previewSplitIndex + 1} - {splits[previewSplitIndex]?.number}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Document Number</Label>
                <div className="font-mono text-lg mt-1">{splits[previewSplitIndex]?.number}</div>
              </div>

              <div>
                <Label>Items ({splits[previewSplitIndex]?.itemIds.length})</Label>
                <div className="border rounded-lg mt-1 max-h-60 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left">Description</th>
                        <th className="px-4 py-2 text-right">Qty</th>
                        <th className="px-4 py-2 text-right">Price</th>
                        <th className="px-4 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items
                        .filter(item => splits[previewSplitIndex]?.itemIds.includes(item.id))
                        .map(item => (
                          <tr key={item.id} className="border-t">
                            <td className="px-4 py-2">{item.description}</td>
                            <td className="px-4 py-2 text-right">{item.quantity}</td>
                            <td className="px-4 py-2 text-right">{item.unitPrice.toFixed(2)}</td>
                            <td className="px-4 py-2 text-right">{item.totalPrice.toFixed(2)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {(() => {
                const previewSplit = splits[previewSplitIndex];
                if (!previewSplit) return null;
                const totals = calculateSplitTotals(previewSplit);
                return (
                  <div className="grid grid-cols-2 gap-4 bg-muted p-4 rounded-lg">
                    <div>
                      <Label>Items</Label>
                      <div className="text-xl font-bold">{totals.itemCount}</div>
                    </div>
                    <div>
                      <Label>Subtotal</Label>
                      <div className="text-xl font-bold text-primary">{totals.subtotal.toFixed(2)} {currency}</div>
                    </div>
                  </div>
                );
              })()}
            </div>
            <DialogFooter>
              <Button onClick={() => setPreviewOpen(false)}>Close Preview</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
