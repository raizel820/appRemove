/**
 * EditOrderDialog Component
 * Dialog for editing existing orders
 */

"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pencil, X, Plus, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";
import { getCurrencySymbol, formatPrice, CURRENCIES, convertPrice, getExchangeRates } from "@/lib/currencyUtils";

interface Order {
  id: string;
  type: string;
  fullNumber: string;
  orderNumber?: number;
  numberYear?: number;
  numberSequence?: number;
  customerId?: string;
  customerName?: string;
  date: string;
  dueDate?: string;
  status: string;
  currency: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes?: string | null;
  documentLanguage: string;
  activityProfileId?: string | null;
  createdAt: string;
  items?: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    totalPrice: number;
    modelId?: string;
  }>;
}

interface EditOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
  onUpdate: () => void;
}

interface Customer {
  id: string;
  fullName: string;
  shortName: string;
  email?: string;
  phone?: string;
}

interface CompanyProfile {
  id: string;
  profileNumber: number;
  profileName: string;
  nif?: string;
  nis?: string;
  rcn?: string;
  rib?: string;
  bankName?: string;
  fundCapital?: number;
  isActive: boolean;
}

interface Model {
  id: string;
  name: string;
  code: string;
  description?: string;
  basePrice?: number;
  currency?: string;
  family?: {
    id: string;
    code: string;
    name: string;
  };
}

export default function EditOrderDialog({
  open,
  onOpenChange,
  order,
  onUpdate,
}: EditOrderDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Form state - initialize with empty values, then update when order changes
  const [formData, setFormData] = useState({
    customerId: "",
    date: new Date().toISOString().split('T')[0],
    dueDate: "",
    currency: "EUR",
    taxRate: 0,
    notes: "",
    documentLanguage: 'en',
    activityProfileId: undefined,
    items: [] as Array<{
      id: string;
      description: string;
      modelId: string;
      quantity: number;
      unitPrice: number;
      discount: number;
    }>,
  });

  // Update formData when order changes
  useEffect(() => {
    if (order) {
      const mappedItems = (order.items || []).map(item => ({
        id: item.id,
        description: item.description || "",
        modelId: item.modelId || "",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
      }));
      
      setFormData({
        customerId: order.customerId || "",
        date: order.date?.split('T')[0] || new Date().toISOString().split('T')[0],
        dueDate: order.dueDate?.split('T')[0] || "",
        currency: order.currency || "EUR",
        taxRate: order.taxRate || 0,
        notes: order.notes || "",
        documentLanguage: order.documentLanguage || 'en',
        activityProfileId: order.activityProfileId || undefined,
        items: mappedItems,
      });
    }
  }, [order]);

  // Data loading state
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [exchangeRates, setExchangeRates] = useState<any[]>([]);

  // Load necessary data when dialog opens
  useEffect(() => {
    if (open && order) {
      loadData();
    }
  }, [open, order]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [customersRes, profilesRes, modelsRes, familiesRes, ratesRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/company-profiles'),
        fetch('/api/machines/models'),
        fetch('/api/machines/families'),
        fetch('/api/exchange-rates'),
      ]);

      if (customersRes.ok) {
        const customersData = await customersRes.json();
        setCustomers(customersData || []);
      }

      if (profilesRes.ok) {
        const profilesData = await profilesRes.json();
        setProfiles(profilesData || []);
      }

      if (modelsRes.ok) {
        const modelsData = await modelsRes.json();
        setModels(modelsData || []);
      }

      if (familiesRes.ok) {
        const familiesData = await familiesRes.json();
        setFamilies(familiesData || []);
      }

      if (ratesRes.ok) {
        const ratesData = await ratesRes.json();
        setExchangeRates(ratesData || []);
      }
    } catch (error) {
      console.error('Error loading data for edit dialog:', error);
      toast({
        title: 'Error',
        description: 'Failed to load order data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalTax = 0;

    formData.items.forEach((item) => {
      // Calculate as (quantity * unitPrice) - discount (where discount is an absolute amount)
      const lineNet = item.quantity * item.unitPrice;
      const lineDiscount = item.discount || 0; // Discount is already an absolute amount
      const lineAfterDiscount = lineNet - lineDiscount;
      const lineTax = lineAfterDiscount * (formData.taxRate / 100);
      subtotal += lineAfterDiscount;
      totalTax += lineTax;
    });

    const taxAmount = Math.round(totalTax * 100) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;

    return { subtotal, taxAmount, total };
  };

  const totals = calculateTotals();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    try {
      // Update the order
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updatedOrder = await response.json();
        toast({
          title: 'Order Updated',
          description: `${updatedOrder.fullNumber}`,
        });
        onUpdate();
        onOpenChange(false);
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to update order',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: "", modelId: "", quantity: 1, unitPrice: 0, discount: 0 }],
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const moveItemUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...formData.items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    setFormData({ ...formData, items: newItems });
  };

  const moveItemDown = (index: number) => {
    if (index === formData.items.length - 1) return;
    const newItems = [...formData.items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Update unit price if model is selected and currency changes
    if (field === "modelId" && value && families.length > 0) {
      const model = models.find((m) => m.id === value);
      if (model && model.currency && formData.currency) {
        newItems[index].unitPrice = convertPrice(model.basePrice, model.currency, formData.currency, exchangeRates) || 0;
      }
      // Auto-fill description from model if not already customized
      if (model && model.description && !newItems[index].description) {
        newItems[index].description = model.description;
      }
      if (model && model.name && !newItems[index].description) {
        newItems[index].description = model.name;
      }
    }

    setFormData({ ...formData, items: newItems });
  };

  const getModelsByFamily = (familyId: string | null) => {
    if (!familyId) return [];
    return models.filter((m) => m.family?.id === familyId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[90vw] !sm:max-w-[90vw] !w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Order - {order.fullNumber}</DialogTitle>
          <DialogDescription>
            Make changes to the order information below
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Order Information */}
            <div className="p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold">{order.fullNumber}</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={getStatusColor(order.status)}>{getStatusBadge(order.status)}</Badge>
                    <Badge variant="outline">{getOrderTypeLabel(order.type)}</Badge>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Created: {new Date(order.createdAt).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Read-only Order Info */}
            <div className="p-4 border rounded-lg bg-muted/30">
              <div className="grid grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Order Number</Label>
                  <Input value={order.fullNumber} disabled className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Type</Label>
                  <Select value={order.type} disabled>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INVOICE">Invoice</SelectItem>
                        <SelectItem value="PROFORMA">Proforma</SelectItem>
                        <SelectItem value="DELIVERY_NOTE">Delivery Note</SelectItem>
                        <SelectItem value="PURCHASE_ORDER">Purchase Order</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Date and Language */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-date">Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="h-auto min-h-[2.5rem]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dueDate">Due Date (Optional)</Label>
                <Input
                  id="edit-dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="h-auto min-h-[2.5rem]"
                />
              </div>
            </div>

            {/* Currency, Tax Rate, and Notes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-currency">Currency</Label>
                <Select
                  id="edit-currency"
                  value={formData.currency}
                  onValueChange={(value) => {
                    setFormData({ ...formData, currency: value });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-taxRate">Tax Rate (%)</Label>
                <Input
                  id="edit-taxRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.taxRate}
                  onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                  required
                  className="h-auto min-h-[2.5rem]"
                />
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={formData.notes || ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add notes about this order..."
                  rows={3}
                  className="resize-none h-auto min-h-[2.5rem]"
                />
              </div>
            </div>

            {/* Customer */}
            <div className="space-y-2">
              <Label htmlFor="edit-customer">Customer</Label>
              <Select
                id="edit-customer"
                value={formData.customerId}
                onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.fullName || customer.shortName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Document Language */}
            <div className="space-y-2">
              <Label htmlFor="edit-language">Document Language</Label>
              <Select
                id="edit-language"
                value={formData.documentLanguage}
                onValueChange={(value) => setFormData({ ...formData, documentLanguage: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Activity Profile */}
            {profiles.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="edit-profile">Activity Profile</Label>
                <Select
                  id="edit-profile"
                  value={formData.activityProfileId || ""}
                  onValueChange={(value) => setFormData({ ...formData, activityProfileId: value || undefined })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        #{profile.profileNumber} - {profile.profileName}
                        {profile.isActive && " (Active)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Items Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Order Items ({formData.items.length})</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>

              {formData.items.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No items in this order. Click "Add Item" to add items.</p>
                </div>
              )}

              {formData.items.length > 0 && formData.items.map((item, index) => {
                const selectedModel = item.modelId ? models.find((m) => m.id === item.modelId) : null;
                const selectedFamily = selectedModel?.family;
                const availableModels = selectedFamily
                  ? models.filter((m) => m.family?.id === selectedFamily.id)
                  : models;

                return (
                  <div key={item.id || index} className="p-4 border rounded-lg space-y-4 bg-card">
                    {/* Item Header with Reorder and Remove */}
                    <div className="flex items-center justify-between pb-3 border-b">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">Item #{index + 1}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => moveItemUp(index)}
                          disabled={index === 0}
                          title="Move Up"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => moveItemDown(index)}
                          disabled={index === formData.items.length - 1}
                          title="Move Down"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          disabled={formData.items.length === 1}
                          className="text-destructive hover:text-destructive"
                          title="Remove Item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Description */}
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor={`item-desc-${index}`}>Description/Name *</Label>
                        <Textarea
                          id={`item-desc-${index}`}
                          value={item.description || ""}
                          onChange={(e) => updateItem(index, "description", e.target.value)}
                          placeholder="Enter item description or name..."
                          rows={2}
                          required
                        />
                      </div>

                      {/* Family (Brand) */}
                      <div className="space-y-2">
                        <Label htmlFor={`item-family-${index}`}>Brand/Family</Label>
                        <Select
                          id={`item-family-${index}`}
                          value={selectedFamily?.id || ""}
                          onValueChange={(value) => {
                            const family = families.find((f) => f.id === value);
                            if (family) {
                              const firstModel = models.find((m) => m.family?.id === value);
                              updateItem(index, "modelId", firstModel?.id || "");
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select brand/family">
                              {selectedFamily ? `${selectedFamily.code} - ${selectedFamily.name}` : "Select brand/family"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {families.map((family) => (
                              <SelectItem key={family.id} value={family.id}>
                                {family.code} - {family.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Model */}
                      <div className="space-y-2">
                        <Label htmlFor={`item-model-${index}`}>Model</Label>
                        <Select
                          id={`item-model-${index}`}
                          value={item.modelId || ""}
                          onValueChange={(value) => updateItem(index, "modelId", value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={selectedFamily ? "Select model" : "Select brand first"}>
                              {selectedModel ? selectedModel.name : "Select model"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {availableModels.map((model) => (
                              <SelectItem key={model.id} value={model.id}>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{model.name}</span>
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {model.code} {model.family?.code ? `(${model.family.code})` : ''}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Quantity */}
                      <div className="space-y-2">
                        <Label htmlFor={`item-qty-${index}`}>Quantity *</Label>
                        <Input
                          id={`item-qty-${index}`}
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                          required
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="space-y-2">
                        <Label htmlFor={`item-price-${index}`}>
                          Unit Price ({getCurrencySymbol(formData.currency)}) *
                        </Label>
                        <Input
                          id={`item-price-${index}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                          required
                        />
                      </div>

                      {/* Discount */}
                      <div className="space-y-2">
                        <Label htmlFor={`item-discount-${index}`}>
                          Discount ({getCurrencySymbol(formData.currency)})
                        </Label>
                        <Input
                          id={`item-discount-${index}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.discount || 0}
                          onChange={(e) => updateItem(index, "discount", parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      {/* Item Total */}
                      <div className="space-y-2">
                        <Label>Line Total</Label>
                        <div className="p-3 bg-muted rounded-md">
                          <span className="text-lg font-semibold">
                            {formatPrice((item.quantity * item.unitPrice) - (item.discount || 0), formData.currency)} {getCurrencySymbol(formData.currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Totals */}
              <div className="bg-muted p-6 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col space-y-2">
                    <span className="text-sm text-muted-foreground">Subtotal:</span>
                    <span className="text-2xl font-bold">{formatPrice(totals.subtotal, formData.currency)} {getCurrencySymbol(formData.currency)}</span>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <span className="text-sm text-muted-foreground">Tax ({formData.taxRate}%):</span>
                    <span className="text-2xl font-bold">{formatPrice(totals.taxAmount, formData.currency)} {getCurrencySymbol(formData.currency)}</span>
                  </div>
                  <div className="flex flex-col space-y-2 border-l-2 border-primary pl-4">
                    <span className="text-sm text-muted-foreground">Total:</span>
                    <span className="text-3xl font-bold text-primary">{formatPrice(totals.total, formData.currency)} {getCurrencySymbol(formData.currency)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Pencil className="mr-2 h-4 w-4" />
                    Update Order
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
  );
}

function getStatusColor(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "DRAFT":
      return "secondary";
    case "SENT":
      return "default";
    case "PAID":
      return "default";
    case "PARTIALLY_PAID":
      return "default";
    case "DELAYED":
      return "default";
    case "CANCELLED":
      return "destructive";
    case "ACTIVE_ORDER":
      return "default";
    default:
      return "secondary";
  }
}

function getStatusBadge(status: string) {
  const translations: Record<string, string> = {
    DRAFT: "Draft",
    SENT: "Sent",
    PAID: "Paid",
    PARTIALLY_PAID: "Partially Paid",
    DELAYED: "Delayed",
    CANCELLED: "Cancelled",
    ACTIVE_ORDER: "Active Order",
  };
  return translations[status] || status;
}

function getOrderTypeLabel(type: string) {
  const typeMap: Record<string, string> = {
    INVOICE: "Invoice",
    PROFORMA: "Proforma",
    DELIVERY_NOTE: "Delivery Note",
    PURCHASE_ORDER: "Purchase Order",
  };
  return typeMap[type] || type;
}
