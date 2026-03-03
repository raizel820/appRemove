"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Trash2, RefreshCcw, Settings, QrCode, Copy, AlertTriangle, Loader2, ClipboardList, Pencil } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import OrderNumbersManagement from "@/components/OrderNumbersManagement";
import EditOrderDialog from "@/components/EditOrderDialog";
import {
  CURRENCIES,
  getCurrencySymbol,
  convertPrice,
  formatPrice,
  type ExchangeRate,
} from "@/lib/currencyUtils";

interface Order {
  id: string;
  type: string;
  fullNumber: string;
  orderNumber?: number;
  numberYear?: number;
  numberSequence?: number;
  customerId?: string;
  customerName: string;
  date: string;
  dueDate?: string;
  status: string;
  total: number;
  currency: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  notes?: string | null;
  documentLanguage: string;
  activityProfileId?: string | null;
  createdAt: string;
  invoiceFullNumber?: string | null;
  invoiceStatus?: string | null;
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

interface CreateOrderData {
  customerId: string;
  date: string;
  currency?: string;
  items: Array<{
    familyId: string;
    modelId: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
  }>;
  taxRate?: number;
  notes?: string;
  documentLanguage?: string;
  activityProfileId?: string;
  customerSnapshot?: {
    fullName?: string;
    shortName?: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
  };
  reservedNumber?: number;
  reservationId?: string;
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
  family?: {
    id: string;
    code: string;
    name: string;
  };
  basePrice?: number;
  currency?: string;
}

interface MachineFamily {
  id: string;
  code: string;
  name: string;
}

interface CompanySettings {
  currency: string;
  defaultLanguage: string;
}

export default function OrdersPage() {
  const { t, language } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Create order dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [families, setFamilies] = useState<MachineFamily[]>([]);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [formData, setFormData] = useState<CreateOrderData>({
    customerId: "",
    date: new Date().toISOString().split("T")[0],
    items: [{ familyId: "", modelId: "", quantity: 1, unitPrice: 0 }],
    currency: "EUR",
    documentLanguage: "en",
    taxRate: 19,
    activityProfileId: undefined,
  });
  const [submitting, setSubmitting] = useState(false);

  // Delete order dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [allowReuse, setAllowReuse] = useState(false); // Default to false (block reuse - safer)
  const [allowInvoiceReuse, setAllowInvoiceReuse] = useState(false); // Default to false (block invoice reuse - safer)
  const [allowProformaReuse, setAllowProformaReuse] = useState(false); // Default to false (block proforma invoice reuse - safer)
  const [allowPurchaseOrderReuse, setAllowPurchaseOrderReuse] = useState(false); // Default to false (block purchase order reuse - safer)
  const [allowDeliveryNoteReuse, setAllowDeliveryNoteReuse] = useState(false); // Default to false (block delivery note reuse - safer)

  // Order numbers management dialog state
  const [numbersManagementOpen, setNumbersManagementOpen] = useState(false);

  // Number selection state
  const [numberOption, setNumberOption] = useState<'next' | 'reuse' | 'custom'>('next');
  const [customNumber, setCustomNumber] = useState<number | null>(null);
  const [selectedReusableNumber, setSelectedReusableNumber] = useState<number | null>(null);
  const [reusableNumbers, setReusableNumbers] = useState<Array<{seq: number; year: number; originalOrderId: string | null; deletedAt: string; notes: string | null}>>([]);
  const [reservationInfo, setReservationInfo] = useState<{seq: number; year: number; reservationId: string; expiresAt: string} | null>(null);
  const [validatingNumber, setValidatingNumber] = useState(false);

  // Verification token dialog state
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [selectedOrderForToken, setSelectedOrderForToken] = useState<Order | null>(null);
  const [verificationToken, setVerificationToken] = useState<string>('');
  const [loadingToken, setLoadingToken] = useState(false);

  // Reset confirmation dialog state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [resetting, setResetting] = useState(false);

  // Edit order dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrders();
    fetchCustomers();
    fetchProfiles();
    fetchModels();
    fetchFamilies();
    fetchCompanyAndRates();
  }, []);

  // Convert all item unit prices when currency changes
  useEffect(() => {
    if (!models.length || !formData.items.length) return;

    // Recalculate unit prices for all items that have a model selected
    const updatedItems = formData.items.map(item => {
      const model = models.find(m => m.id === item.modelId);
      if (model?.basePrice && model.currency && formData.currency) {
        const convertedPrice = convertPrice(model.basePrice, model.currency, formData.currency, exchangeRates) || 0;
        return { ...item, unitPrice: convertedPrice };
      }
      return item;
    });

    // Only update if something actually changed
    const pricesChanged = updatedItems.some((item, index) =>
      item.unitPrice !== formData.items[index].unitPrice
    );

    if (pricesChanged) {
      setFormData(prev => ({ ...prev, items: updatedItems }));
    }
  }, [formData.currency, models, exchangeRates]);

  // Reset number selection when dialog closes
  useEffect(() => {
    if (!createDialogOpen) {
      setNumberOption('next');
      setReservationInfo(null);
      setCustomNumber(null);
      setSelectedReusableNumber(null);
      setReusableNumbers([]);
    }
  }, [createDialogOpen]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchOrders();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, statusFilter, typeFilter]);

  // Countdown timer for reset confirmation
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (resetDialogOpen && countdown > 0) {
      intervalId = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (resetDialogOpen && countdown === 0) {
      clearInterval(intervalId);
    }
    return () => clearInterval(intervalId);
  }, [resetDialogOpen, countdown]);

  const fetchCompanyAndRates = async () => {
    try {
      const [companyRes, ratesRes] = await Promise.all([
        fetch("/api/company"),
        fetch("/api/exchange-rates"),
      ]);

      if (companyRes.ok) {
        const companyData = await companyRes.json();
        setCompany(companyData);
        setFormData((prev) => ({
          ...prev,
          currency: companyData.currency || "EUR",
          documentLanguage: language || companyData.defaultLanguage || "en",
          activityProfileId: companyData.activeProfileId || undefined,
        }));
      }

      if (ratesRes.ok) {
        const ratesData = await ratesRes.json();
        setExchangeRates(ratesData);
      }
    } catch (error) {
      console.error("Error fetching company or exchange rates:", error);
    }
  };

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (typeFilter !== "ALL") params.append("type", typeFilter);

      const response = await fetch(`/api/orders?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers");
      if (response.ok) {
        const data = await response.json();
        setCustomers(data || []);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const fetchProfiles = async () => {
    try {
      const response = await fetch("/api/company-profiles");
      if (response.ok) {
        const data = await response.json();
        setProfiles(data || []);
      }
    } catch (error) {
      console.error("Error fetching profiles:", error);
    }
  };

  const fetchModels = async () => {
    try {
      const response = await fetch("/api/machines/models");
      if (response.ok) {
        const data = await response.json();
        setModels(data || []);
      }
    } catch (error) {
      console.error("Error fetching models:", error);
    }
  };

  const fetchFamilies = async () => {
    try {
      const response = await fetch("/api/machines/families");
      if (response.ok) {
        const data = await response.json();
        setFamilies(data || []);
      }
    } catch (error) {
      console.error("Error fetching families:", error);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);

    try {
      let reservedNumberInfo = reservationInfo;

      // If user selected "Use Next Number" but hasn't reserved yet, reserve it now
      if (numberOption === 'next' && !reservationInfo) {
        try {
          const year = getYearFromDate(formData.date);
          const response = await fetch('/api/numbers/next', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reservedBy: 'order-creation-auto-' + Date.now(), year }),
          });

          if (response.ok) {
            const data = await response.json();
            reservedNumberInfo = {
              seq: data.seq,
              year: data.year,
              reservationId: data.reservationId,
              expiresAt: data.expiresAt,
            };
            // Update state so UI shows the reservation
            setReservationInfo(reservedNumberInfo);
          } else {
            throw new Error('Failed to reserve next number');
          }
        } catch (error) {
          console.error('Auto-reserve failed:', error);
          toast({
            title: t("error") || "Error",
            description: "Failed to reserve order number. Please click 'Reserve Next Number' and try again.",
            variant: "destructive",
          });
          setSubmitting(false);
          return;
        }
      }

      // Check if we have a reservation
      if (!reservedNumberInfo) {
        toast({
          title: t("error") || "Error",
          description: "Please reserve an order number before creating",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      // Check if reservation has expired
      if (new Date() > new Date(reservedNumberInfo.expiresAt)) {
        toast({
          title: t("error") || "Error",
          description: "Number reservation has expired. Please reserve a new number.",
          variant: "destructive",
        });
        setReservationInfo(null);
        setNumberOption('next');
        setSubmitting(false);
        return;
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          reservedYear: reservedNumberInfo.year,
          reservedSeq: reservedNumberInfo.seq,
          reservedId: reservedNumberInfo.reservationId,
        }),
      });

      if (response.ok) {
        const order = await response.json();
        toast({
          title: t("orderCreated"),
          description: `${t("orderNumber")}: ${order.fullNumber}`,
        });
        setCreateDialogOpen(false);
        resetFormData();
        fetchOrders();
      } else {
        let errorMessage = t("failedToCreateOrder");
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch (e) {
          // If response doesn't have JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        toast({
          title: t("error"),
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating order:", error);
      toast({
        title: t("error"),
        description: t("failedToCreateOrder"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Number reservation functions
  const fetchReusableNumbers = async () => {
    try {
      const year = getYearFromDate(formData.date);
      const response = await fetch(`/api/numbers/available?year=${year}`);
      if (response.ok) {
        const data = await response.json();
        setReusableNumbers(data.numbers || []);
      }
    } catch (error) {
      console.error('Error fetching reusable numbers:', error);
    }
  };

  const getYearFromDate = (dateString: string): number => {
    return new Date(dateString).getFullYear();
  };

  const handleNumberOptionChange = async (option: 'next' | 'reuse' | 'custom') => {
    setNumberOption(option);
    setReservationInfo(null);
    setCustomNumber(null);
    setSelectedReusableNumber(null);

    if (option === 'reuse') {
      await fetchReusableNumbers();
    }
  };

  const handleReserveNext = async () => {
    try {
      const year = getYearFromDate(formData.date);
      const response = await fetch('/api/numbers/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservedBy: 'order-creation-' + Date.now(), year }),
      });

      if (response.ok) {
        const data = await response.json();
        setReservationInfo({
          seq: data.seq,
          year: data.year,
          reservationId: data.reservationId,
          expiresAt: data.expiresAt,
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to reserve next number',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error reserving next number:', error);
      toast({
        title: 'Error',
        description: 'Failed to reserve next number',
        variant: 'destructive',
      });
    }
  };

  const handleReserveReusable = async (seq: number, year: number) => {
    try {
      const response = await fetch('/api/numbers/reuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          seq,
          reservedBy: 'order-creation-' + Date.now(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setReservationInfo({
          seq: data.seq,
          year: data.year,
          reservationId: data.reservationId,
          expiresAt: data.expiresAt,
        });
        setSelectedReusableNumber(seq);
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to reserve number',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error reserving reusable number:', error);
      toast({
        title: 'Error',
        description: 'Failed to reserve number',
        variant: 'destructive',
      });
    }
  };

  const handleValidateCustomNumber = async (number: number) => {
    if (!number || number < 1) return;

    setValidatingNumber(true);
    try {
      const year = getYearFromDate(formData.date);

      // Reserve the custom number using the new custom endpoint
      // This handles both new numbers and reusable numbers
      const reserveResponse = await fetch('/api/numbers/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          seq: number,
          reservedBy: 'order-creation-custom-' + Date.now(),
        }),
      });

      if (reserveResponse.ok) {
        const reserveData = await reserveResponse.json();
        setReservationInfo({
          seq: reserveData.seq,
          year: reserveData.year,
          reservationId: reserveData.reservationId,
          expiresAt: reserveData.expiresAt,
        });
        setCustomNumber(number);
        toast({
          title: 'Success',
          description: `Custom number ${number}/${year} reserved successfully`,
        });
      } else {
        const error = await reserveResponse.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to reserve custom number',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error validating/reserving custom number:', error);
      toast({
        title: 'Error',
        description: 'Failed to reserve custom number',
        variant: 'destructive',
      });
    } finally {
      setValidatingNumber(false);
    }
  };

  // Fetch verification token for an order
  const handleShowVerificationToken = async (order: Order) => {
    setSelectedOrderForToken(order);
    setLoadingToken(true);
    setTokenDialogOpen(true);

    try {
      // Search for token by order number label
      const response = await fetch(`/api/qr/tokens?search=order-${order.fullNumber}&limit=1`);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.length > 0) {
          setVerificationToken(data.data[0].token);
        } else {
          setVerificationToken('');
          toast({
            title: 'Token Not Found',
            description: 'No verification token found for this order',
            variant: 'destructive',
          });
        }
      } else {
        throw new Error('Failed to fetch verification token');
      }
    } catch (error) {
      console.error('Error fetching verification token:', error);
      setVerificationToken('');
      toast({
        title: 'Error',
        description: 'Failed to fetch verification token',
        variant: 'destructive',
      });
    } finally {
      setLoadingToken(false);
    }
  };

  // Copy verification token to clipboard
  const handleCopyToken = () => {
    if (!verificationToken) return;

    navigator.clipboard.writeText(verificationToken).then(() => {
      toast({
        title: 'Copied',
        description: 'Verification token copied to clipboard',
      });
    }).catch(() => {
      toast({
        title: 'Error',
        description: 'Failed to copy token',
        variant: 'destructive',
      });
    });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { familyId: "", modelId: "", quantity: 1, unitPrice: 0 }],
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Update unit price if model is selected, convert to order currency
    if (field === "modelId" && value) {
      const model = models.find((m) => m.id === value);
      if (model?.basePrice && model.currency && formData.currency) {
        newItems[index].unitPrice = convertPrice(model.basePrice, model.currency, formData.currency, exchangeRates) || 0;
      }
    }

    // Clear model when family changes
    if (field === "familyId") {
      newItems[index].modelId = "";
      newItems[index].unitPrice = 0;
    }

    setFormData({ ...formData, items: newItems });
  };

  const getModelsByFamily = (familyId: string | null) => {
    if (!familyId) return [];
    return models.filter((m) => m.family?.id === familyId);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-500 hover:bg-gray-600 text-white";
      case "SENT":
        return "bg-blue-600 hover:bg-blue-700 text-white";
      case "PAID":
        return "bg-green-600 hover:bg-green-700 text-white";
      case "PARTIALLY_PAID":
        return "bg-amber-500 hover:bg-amber-600 text-white";
      case "DELAYED":
        return "bg-orange-600 hover:bg-orange-700 text-white";
      case "CANCELLED":
        return "bg-red-600 hover:bg-red-700 text-white";
      case "ACTIVE_ORDER":
        return "bg-purple-600 hover:bg-purple-700 text-white";
      default:
        return "bg-gray-500 hover:bg-gray-600 text-white";
    }
  };

  const getStatusLabel = (status: string) => {
    // Convert snake_case status to camelCase translation key
    const key = status.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    return t(key);
  };

  const getOrderTypeLabel = (type: string) => {
    switch (type) {
      case "INVOICE":
        return t("invoice");
      case "PROFORMA":
        return t("proforma");
      case "DELIVERY_NOTE":
        return t("deliveryNote");
      case "PURCHASE_ORDER":
        return t("purchaseOrder");
      default:
        return type;
    }
  };

  const calculateTotal = () => {
    let subtotal = 0;
    formData.items.forEach((item) => {
      subtotal += item.quantity * item.unitPrice;
    });
    const tax = subtotal * ((formData.taxRate || 0) / 100);
    return { subtotal, tax, total: subtotal + tax };
  };

  const totals = calculateTotal();

  const resetFormData = () => {
    setFormData({
      customerId: "",
      date: new Date().toISOString().split("T")[0],
      items: [{ familyId: "", modelId: "", quantity: 1, unitPrice: 0 }],
      currency: company?.currency || "EUR",
      documentLanguage: language || company?.defaultLanguage || "en",
      taxRate: 19,
      activityProfileId: company?.activeProfileId || undefined,
    });
    // Reset number selection
    setNumberOption('next');
    setCustomNumber(null);
    setSelectedReusableNumber(null);
    setReservationInfo(null);
    setReusableNumbers([]);
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/orders/${orderToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          allowReuse,
          allowInvoiceReuse,
          allowProformaReuse,
          allowDeliveryNoteReuse,
          allowPurchaseOrderReuse
        }),
      });

      if (response.ok) {
        toast({
          title: t("orderDeleted"),
          description: `${t("orderNumber")}: ${orderToDelete.fullNumber}`,
        });
        setDeleteDialogOpen(false);
        setOrderToDelete(null);
        setAllowReuse(false);
        setAllowInvoiceReuse(false);
        setAllowProformaReuse(false);
        setAllowDeliveryNoteReuse(false);
        setAllowPurchaseOrderReuse(false);
        fetchOrders();
      } else {
        let errorMessage = t("failedToDeleteOrder");
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
        }
        toast({
          title: t("error"),
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({
        title: t("error"),
        description: t("failedToDeleteOrder"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetOrders = async () => {
    setResetting(true);
    try {
      const response = await fetch("/api/orders/reset", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: t("success"),
          description: t("resetOrdersSuccess"),
        });
        setResetDialogOpen(false);
        setCountdown(10);
        fetchOrders();
      } else {
        toast({
          title: t("error"),
          description: t("failedToResetOrders"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error resetting orders:", error);
      toast({
        title: t("error"),
        description: t("failedToResetOrders"),
        variant: "destructive",
      });
    } finally {
      setResetting(false);
    }
  };

  const handleOpenResetDialog = () => {
    setCountdown(10);
    setResetDialogOpen(true);
  };

  const handleEditOrder = (order: Order) => {
    setOrderToEdit(order);
    setEditDialogOpen(true);
  };

  const handleOrderUpdated = () => {
    fetchOrders();
    setEditDialogOpen(false);
    setOrderToEdit(null);
  };

  return (
    <div className="w-full py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("orders")}</h1>
          <p className="text-muted-foreground mt-1">{t("ordersDescription")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetFormData}>
                <Plus className="mr-2 h-4 w-4" />
                {t("createOrder")}
              </Button>
            </DialogTrigger>
          </Dialog>
          <Button
            variant="destructive"
            onClick={handleOpenResetDialog}
            disabled={resetting}
            title="Clear all orders and order numbers to fresh initial state"
          >
            {resetting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="mr-2 h-4 w-4" />
            )}
            {resetting ? "Clearing..." : "Clear All Data"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setNumbersManagementOpen(true)}
            title="Manage order and invoice numbers"
          >
            <Settings className="mr-2 h-4 w-4" />
            Numbers Management
          </Button>
        </div>
        <OrderNumbersManagement open={numbersManagementOpen} onOpenChange={setNumbersManagementOpen} />

        {/* Reset Confirmation Dialog */}
        <Dialog open={resetDialogOpen} onOpenChange={(open) => {
          setResetDialogOpen(open);
          if (!open) setCountdown(10);
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <DialogTitle className="text-destructive">Confirm Clear All Data</DialogTitle>
              </div>
              <DialogDescription className="pt-2">
                This action cannot be undone. This will permanently delete:
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>All orders</li>
                <li>All order numbers and counters</li>
                <li>All invoice numbers</li>
                <li>All proforma invoice numbers</li>
                <li>All purchase order numbers</li>
                <li>All delivery note numbers</li>
                <li>All verification tokens</li>
              </ul>
              <div className="pt-3 border-t">
                <p className="text-sm font-semibold text-destructive">
                  Please wait {countdown} seconds before confirming
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setResetDialogOpen(false);
                  setCountdown(10);
                }}
                disabled={resetting}
              >
                {resetting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Canceling...
                  </>
                ) : (
                  "Cancel"
                )}
              </Button>
              <Button
                variant="destructive"
                onClick={handleResetOrders}
                disabled={countdown > 0 || resetting}
              >
                {resetting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Clearing...
                  </>
                ) : countdown > 0 ? (
                  `Wait ${countdown}s`
                ) : (
                  "Clear All Data"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetFormData}>
              <Plus className="mr-2 h-4 w-4" />
              {t("createOrder")}
            </Button>
          </DialogTrigger>
          <DialogContent className="!max-w-[90vw] !sm:max-w-[90vw] !w-[90vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("createOrder")}</DialogTitle>
              <DialogDescription>
                {t("createOrderDescription")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateOrder} className="space-y-6">
              {/* Order Number Selection */}
              <div className="space-y-3 p-6 border rounded-lg bg-muted/30">
                <label className="text-sm font-medium">{t("orderNumber") || "Order Number"}</label>

                {/* Number option selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      numberOption === 'next'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleNumberOptionChange('next')}
                  >
                    <div className="font-medium mb-1">Auto: Next Number</div>
                    <div className="text-xs text-muted-foreground">
 Automatically reserves the next available number
                    </div>
                  </div>

                  <div
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      numberOption === 'reuse'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleNumberOptionChange('reuse')}
                  >
                    <div className="font-medium mb-1">Reuse Number</div>
                    <div className="text-xs text-muted-foreground">
 Select from previously used numbers
                    </div>
                  </div>

                  <div
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      numberOption === 'custom'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleNumberOptionChange('custom')}
                  >
                    <div className="font-medium mb-1">Custom Number</div>
                    <div className="text-xs text-muted-foreground">
 Enter a new or reusable number
                    </div>
                  </div>
                </div>

                {/* Number-specific actions based on option */}
                {numberOption === 'next' && !reservationInfo && (
                  <Button type="button" onClick={handleReserveNext} className="w-full">
                    Reserve New Number
                  </Button>
                )}

                {numberOption === 'reuse' && (
                  <div className="space-y-3">
                    {reusableNumbers.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {reusableNumbers.map((num) => (
                          <div
                            key={num.seq}
                            className={`p-3 border rounded cursor-pointer transition-colors ${
                              selectedReusableNumber === num.seq
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50 hover:bg-muted/50'
                            }`}
                            onClick={() => handleReserveReusable(num.seq, num.year)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{String(num.seq).padStart(3, '0')}/{num.year}</span>
                              {num.deletedAt && (
                                <span className="text-xs text-muted-foreground">
                                  {new Date(num.deletedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {num.notes && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {num.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground text-center py-4">
                        No reusable numbers available
                      </div>
                    )}
                  </div>
                )}

                {numberOption === 'custom' && (
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Enter number (e.g., 15)"
                        value={customNumber || ''}
                        onChange={(e) => setCustomNumber(parseInt(e.target.value) || null)}
                        disabled={validatingNumber}
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={() => customNumber && handleValidateCustomNumber(customNumber)}
                      disabled={!customNumber || validatingNumber}
                    >
                      {validatingNumber ? 'Reserving...' : 'Reserve'}
                    </Button>
                  </div>
                )}

                {/* Reservation info display */}
                {reservationInfo && (
                  <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-green-800 dark:text-green-200">
                        Reserved: {String(reservationInfo.seq).padStart(3, '0')}/{reservationInfo.year}
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400">
                        Expires: {new Date(reservationInfo.expiresAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Date and Language - 2 columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("date")}</label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="h-auto min-h-[2.5rem]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("documentLanguage")}</label>
                  <Select
                    value={formData.documentLanguage}
                    onValueChange={(value) => setFormData({ ...formData, documentLanguage: value })}
                  >
                    <SelectTrigger className="h-auto min-h-[2.5rem]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="ar">العربية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Customer - Full width */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("customer")}</label>
                <Select
                  value={formData.customerId}
                  onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                >
                  <SelectTrigger className="h-auto min-h-[2.5rem]">
                    <SelectValue placeholder={t("selectCustomer")} />
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

              {/* Customer Snapshot Toggle */}
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!formData.customerSnapshot}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          customerSnapshot: {
                            fullName: "",
                            shortName: "",
                            email: "",
                            phone: "",
                          },
                        });
                      } else {
                        setFormData({
                          ...formData,
                          customerSnapshot: undefined,
                        });
                      }
                    }}
                    className="h-4 w-4"
                  />
                  <span>{t("useAdHocCustomer")}</span>
                </label>
                {formData.customerSnapshot && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <label className="text-xs font-medium">{t("fullName")}</label>
                      <Input
                        type="text"
                        value={formData.customerSnapshot.fullName || ""}
                        onChange={(e) => setFormData({
                          ...formData,
                          customerSnapshot: {
                            ...formData.customerSnapshot!,
                            fullName: e.target.value,
                          },
                        })}
                        placeholder={t("customerNamePlaceholder")}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium">{t("shortName")}</label>
                      <Input
                        type="text"
                        value={formData.customerSnapshot.shortName || ""}
                        onChange={(e) => setFormData({
                          ...formData,
                          customerSnapshot: {
                            ...formData.customerSnapshot!,
                            shortName: e.target.value,
                          },
                        })}
                        placeholder={t("customerShortNamePlaceholder")}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium">{t("phone")}</label>
                      <Input
                        type="text"
                        value={formData.customerSnapshot.phone || ""}
                        onChange={(e) => setFormData({
                          ...formData,
                          customerSnapshot: {
                            ...formData.customerSnapshot!,
                            phone: e.target.value,
                          },
                        })}
                        placeholder={t("customerPhonePlaceholder")}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium">{t("email")}</label>
                      <Input
                        type="email"
                        value={formData.customerSnapshot.email || ""}
                        onChange={(e) => setFormData({
                          ...formData,
                          customerSnapshot: {
                            ...formData.customerSnapshot!,
                            email: e.target.value,
                          },
                        })}
                        placeholder={t("customerEmailPlaceholder")}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Activity Profile */}
              {profiles.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("activityProfile")}</label>
                  <Select
                    value={formData.activityProfileId || ""}
                    onValueChange={(value) => setFormData({ ...formData, activityProfileId: value || undefined })}
                  >
                    <SelectTrigger className="h-auto min-h-[2.5rem]">
                      <SelectValue placeholder={t("selectProfile")} />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          #{profile.profileNumber} - {profile.profileName}
                          {profile.isActive && ` (${t("active")})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">{t("items")}</label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("addItem")}
                  </Button>
                </div>
                {formData.items.map((item, index) => {
                  const availableModels = item.familyId 
                    ? models.filter((m) => m.family?.id === item.familyId)
                    : models;
                  
                  return (
                    <div key={index} className="space-y-4 p-6 border rounded-lg">
                      {/* Family and Model selection - Wider layout */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t("family")}</label>
                          <Select
                            value={item.familyId || ""}
                            onValueChange={(value) => {
                              updateItem(index, "familyId", value);
                            }}
                          >
                            <SelectTrigger className="h-auto min-h-[2.75rem] w-full">
                              <SelectValue placeholder={t("selectFamily")} />
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
                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t("model")}</label>
                          <Select
                            value={item.modelId || ""}
                            onValueChange={(value) => updateItem(index, "modelId", value)}
                            disabled={!item.familyId}
                          >
                            <SelectTrigger className="h-auto min-h-[2.75rem] w-full">
                              <SelectValue placeholder={item.familyId ? t("selectModel") : t("selectFamily")} />
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
                      </div>
                      
                      {/* Quantity, Price, and Remove - 4 columns */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t("quantity")}</label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                            required
                            className="h-auto min-h-[2.75rem]"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t("unitPrice")} ({getCurrencySymbol(formData.currency)})</label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                            required
                            className="h-auto min-h-[2.75rem]"
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2 lg:col-span-2">
                          <label className="text-sm font-medium">{t("discount")} ({getCurrencySymbol(formData.currency)})</label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.discount || 0}
                            onChange={(e) => updateItem(index, "discount", parseFloat(e.target.value) || 0)}
                            className="h-auto min-h-[2.75rem]"
                          />
                        </div>
                      </div>

                      {/* Remove button - full width on mobile, inline on larger screens */}
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="default"
                          onClick={() => removeItem(index)}
                          disabled={formData.items.length === 1}
                          className="w-full sm:w-auto min-h-[2.5rem]"
                        >
                          {t("remove")}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Currency, Tax, and Notes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("currency")}</label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                  >
                    <SelectTrigger className="h-auto min-h-[2.5rem]">
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
                  <label className="text-sm font-medium">{t("taxRate")}: {formData.taxRate || 0}%</label>
                  <Input
                    type="range"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.taxRate || 0}
                    onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) })}
                    className="mt-2"
                  />
                </div>
                <div className="space-y-2 md:col-span-1">
                  <label className="text-sm font-medium">{t("notes")}</label>
                  <Input
                    value={formData.notes || ""}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder={t("notesPlaceholder")}
                    className="h-auto min-h-[2.5rem]"
                  />
                </div>
              </div>

              {/* Totals - Wider layout */}
              <div className="bg-muted p-6 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col space-y-2">
                    <span className="text-sm text-muted-foreground">{t("subtotal")}:</span>
                    <span className="text-2xl font-bold">{formatPrice(totals.subtotal, formData.currency)} {getCurrencySymbol(formData.currency)}</span>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <span className="text-sm text-muted-foreground">{t("tax")} ({formData.taxRate || 0}%):</span>
                    <span className="text-2xl font-bold">{formatPrice(totals.tax, formData.currency)} {getCurrencySymbol(formData.currency)}</span>
                  </div>
                  <div className="flex flex-col space-y-2 border-l-2 border-primary pl-4">
                    <span className="text-sm text-muted-foreground">{t("total")}:</span>
                    <span className="text-3xl font-bold text-primary">{formatPrice(totals.total, formData.currency)} {getCurrencySymbol(formData.currency)}</span>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={submitting || !formData.customerId}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("creating")}
                    </>
                  ) : (
                    t("createOrder")
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t("filters")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("searchOrders")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("allStatuses")}</SelectItem>
                <SelectItem value="DRAFT">{t("draft")}</SelectItem>
                <SelectItem value="SENT">{t("sent")}</SelectItem>
                <SelectItem value="PAID">{t("paid")}</SelectItem>
                <SelectItem value="PARTIALLY_PAID">{t("partiallyPaid")}</SelectItem>
                <SelectItem value="DELAYED">{t("delayed")}</SelectItem>
                <SelectItem value="CANCELLED">{t("cancelled")}</SelectItem>
                <SelectItem value="ACTIVE_ORDER">{t("activeOrder") || "Active Order"}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("allTypes")}</SelectItem>
                <SelectItem value="INVOICE">{t("invoice")}</SelectItem>
                <SelectItem value="PROFORMA">{t("proforma")}</SelectItem>
                <SelectItem value="DELIVERY_NOTE">{t("deliveryNote")}</SelectItem>
                <SelectItem value="PURCHASE_ORDER">{t("purchaseOrder")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("loading")}
          </CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t("noOrdersYet")}</h3>
            <p className="text-muted-foreground mb-4">{t("noOrdersDescription")}</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("createOrder")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <Card key={order.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href={`/orders/${order.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Order Number and Badges */}
                    <div className="flex items-center gap-2 min-w-[150px]">
                      <h3 className="text-lg font-semibold truncate">{order.fullNumber}</h3>
                      <Badge className={getStatusBadgeColor(order.status)}>{getStatusLabel(order.status)}</Badge>
                      {/* Show green invoice badge for ISSUED, PAID, and PARTIALLY_PAID */}
                      {order.invoiceStatus && order.invoiceStatus !== 'CANCELLED' && (
                        <Badge className="bg-green-600 hover:bg-green-700 text-white">{getOrderTypeLabel("INVOICE")}</Badge>
                      )}
                      {/* Show red invoice badge for CANCELLED */}
                      {order.invoiceStatus === 'CANCELLED' && (
                        <Badge className="bg-red-600 hover:bg-red-700 text-white">{getOrderTypeLabel("INVOICE")}</Badge>
                      )}
                      {/* Show order type badge only for non-INVOICE orders or when no invoice status */}
                      {order.type !== 'INVOICE' && !order.invoiceStatus && (
                        <Badge variant="outline">{getOrderTypeLabel(order.type)}</Badge>
                      )}
                    </div>
                    
                    {/* Customer Name */}
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-sm text-muted-foreground truncate">{order.customerName}</p>
                    </div>
                    
                    {/* Date */}
                    <div className="min-w-[100px]">
                      <p className="text-sm text-muted-foreground">{new Date(order.date).toLocaleDateString()}</p>
                    </div>
                    
                    {/* Total, Token Button, and Delete Button */}
                    <div className="flex items-center gap-2">
                      <div className="min-w-[120px]">
                        <span className="text-sm font-semibold">
                          {formatPrice(order.total, order.currency)} {getCurrencySymbol(order.currency)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleShowVerificationToken(order);
                        }}
                        title="Show Verification Token"
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleEditOrder(order);
                        }}
                        title="Edit Order"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOrderToDelete(order);
                          setAllowReuse(false); // Reset to false (block reuse - safer default)
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      )}

      {/* Verification Token Dialog */}
      <Dialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Verification Token</DialogTitle>
            <DialogDescription>
              {selectedOrderForToken ? `Order: ${selectedOrderForToken.fullNumber}` : 'Loading...'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {loadingToken ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">Loading verification token...</div>
              </div>
            ) : verificationToken ? (
              <>
                <div className="bg-muted p-4 rounded-md">
                  <div className="text-xs text-muted-foreground mb-2">Verification Token</div>
                  <div className="text-sm font-mono break-all">{verificationToken}</div>
                </div>
                <Button
                  onClick={handleCopyToken}
                  className="w-full"
                  variant="outline"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Token
                </Button>
              </>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                No verification token found for this order.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Order Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("deleteOrder")}</DialogTitle>
            <DialogDescription>
              {orderToDelete ? t("deleteOrderDescription", { orderNumber: orderToDelete.fullNumber }) : t("selectOrderToDelete")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              {t("deleteOrderWarning")}
            </p>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="allowReuse"
                checked={allowReuse}
                onCheckedChange={(checked) => setAllowReuse(checked === true)}
              />
              <div className="flex flex-col space-y-1 leading-none">
                <label
                  htmlFor="allowReuse"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Allow reuse of order number
                </label>
                <p className="text-xs text-muted-foreground">
                  {allowReuse
                    ? "New orders can use this number"
                    : "This number will be blocked and cannot be reused"}
                </p>
              </div>
            </div>

            {orderToDelete?.invoiceFullNumber && (
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="allowInvoiceReuse"
                  checked={allowInvoiceReuse}
                  onCheckedChange={(checked) => setAllowInvoiceReuse(checked === true)}
                />
                <div className="flex flex-col space-y-1 leading-none">
                  <label
                    htmlFor="allowInvoiceReuse"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Allow reuse of invoice number
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {allowInvoiceReuse
                      ? "New invoices can use this number"
                      : "This invoice number will be blocked and cannot be reused"}
                  </p>
                </div>
              </div>
            )}

            {orderToDelete?.proformaFullNumber && (
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="allowProformaReuse"
                  checked={allowProformaReuse}
                  onCheckedChange={(checked) => setAllowProformaReuse(checked === true)}
                />
                <div className="flex flex-col space-y-1 leading-none">
                  <label
                    htmlFor="allowProformaReuse"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Allow reuse of proforma invoice number
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {allowProformaReuse
                      ? "New proforma invoices can use this number"
                      : "This proforma invoice number will be blocked and cannot be reused"}
                  </p>
                </div>
              </div>
            )}

            {orderToDelete?.purchaseOrderFullNumber && (
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="allowPurchaseOrderReuse"
                  checked={allowPurchaseOrderReuse}
                  onCheckedChange={(checked) => setAllowPurchaseOrderReuse(checked === true)}
                />
                <div className="flex flex-col space-y-1 leading-none">
                  <label
                    htmlFor="allowPurchaseOrderReuse"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Allow reuse of purchase order number
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {allowPurchaseOrderReuse
                      ? "New purchase orders can use this number"
                      : "This purchase order number will be blocked and cannot be reused"}
                  </p>
                </div>
              </div>
            )}

            {orderToDelete?.deliveryNoteFullNumber && (
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="allowDeliveryNoteReuse"
                  checked={allowDeliveryNoteReuse}
                  onCheckedChange={(checked) => setAllowDeliveryNoteReuse(checked === true)}
                />
                <div className="flex flex-col space-y-1 leading-none">
                  <label
                    htmlFor="allowDeliveryNoteReuse"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Allow reuse of delivery note number
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {allowDeliveryNoteReuse
                      ? "New delivery notes can use this number"
                      : "This delivery note number will be blocked and cannot be reused"}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setOrderToDelete(null);
                }}
                className="flex-1"
              >
                {t("cancel")}
              </Button>

              <Button
                variant={allowReuse ? "default" : "destructive"}
                onClick={handleDeleteOrder}
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-2 border-primary" />
                    {t("deleting")}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    {allowReuse ? "Delete and Allow Reuse" : t("deleteOrder")}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      {orderToEdit && (
        <EditOrderDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          order={orderToEdit}
          onUpdate={handleOrderUpdated}
        />
      )}
      </div>
    );
}
