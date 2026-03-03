"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ArrowLeft, ChevronDown, FileText, CheckCircle, Clock, Loader2, RefreshCcw, Eye, Printer, QrCode, AlertTriangle, ShoppingBasket, Copy, X, Pencil, Scissors } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { useToast } from "@/hooks/use-toast";
import InvoicePreviewDialog, {
  prepareInvoicePreviewData,
  type InvoicePreviewData
} from "@/components/invoice/InvoicePreviewDialog";
import ProformaPreviewDialog, {
  prepareProformaPreviewData,
  type ProformaPreviewData
} from "@/components/proforma/ProformaPreviewDialog";
import PurchaseOrderPreviewDialog, {
  preparePurchaseOrderPreviewData,
  type PurchaseOrderPreviewData
} from "@/components/purchase-order/PurchaseOrderPreviewDialog";
import DeliveryNotePreviewDialog, {
  prepareDeliveryNotePreviewData,
  type DeliveryNotePreviewData
} from "@/components/delivery-note/DeliveryNotePreviewDialog";
import EditOrderDialog from "@/components/EditOrderDialog";
import SplitDocumentDialog from "@/components/SplitDocumentDialog";

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
    isManufactured?: boolean;
    family?: {
      code: string;
      name: string;
    };
  };
  snapshotModel?: string;
}

interface InvoiceInfo {
  number: number | null;
  year: number | null;
  sequence: number | null;
  fullNumber: string | null;
  date: string | null;
  status: string | null;
}

interface PaymentRecord {
  amount: number;
  date: string;
  notes?: string;
}

interface DocumentSplit {
  id: string;
  orderId: string;
  documentType: string;
  splitIndex: number;
  itemIds: string;
  number: string | null;
  sequence: number | null;
  year: number | null;
  date: string | null;
  status: string;
  verificationToken: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Order {
  id: string;
  type: string;
  fullNumber: string;
  customerId?: string;
  customerName: string;
  customerAddress?: string;
  customerCity?: string;
  customerPhone?: string;
  customerEmail?: string;
  date: string;
  dueDate?: string;
  status: string;
  currency: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes?: string;
  documentLanguage: string;
  items: OrderItem[];
  invoiceYear?: number | null;
  invoiceSequence?: number | null;
  invoiceFullNumber?: string | null;
  invoiceDate?: string | null;
  invoiceStatus?: string | null;
  proformaYear?: number | null;
  proformaSequence?: number | null;
  proformaFullNumber?: string | null;
  proformaDate?: string | null;
  proformaStatus?: string | null;
  purchaseOrderYear?: number | null;
  purchaseOrderSequence?: number | null;
  purchaseOrderFullNumber?: string | null;
  purchaseOrderDate?: string | null;
  purchaseOrderStatus?: string | null;
  deliveryNoteYear?: number | null;
  deliveryNoteSequence?: number | null;
  deliveryNoteFullNumber?: string | null;
  deliveryNoteDate?: string | null;
  deliveryNoteStatus?: string | null;
  payments?: string | null; // JSON string of payment records
  activityProfileId?: string | null; // Selected activity profile for this order
  createdAt: string;
  // Snapshot fields
  snapshotCompany?: string;
  snapshotCustomer?: string;
  snapshotPdfConfig?: string;
  // Verification tokens
  invoiceVerificationToken?: string;
  proformaVerificationToken?: string;
  purchaseOrderVerificationToken?: string;
  deliveryNoteVerificationToken?: string;
  // Full customer relation
  customer?: {
    id: string;
    fullName: string;
    shortName?: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
    nif?: string;
    nis?: string;
    rcn?: string;
    rib?: string;
  };
}

export default function OrderDetailPage() {
  // Force rebuild - split feature implemented
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Invoice section state
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  // Items & Totals section state
  const [itemsTotalsOpen, setItemsTotalsOpen] = useState(true);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [reservedInvoice, setReservedInvoice] = useState<{
    seq: number;
    year: number;
    reservationId: string;
    expiresAt: string;
    fullNumber: string;
  } | null>(null);
  const [reservingInvoice, setReservingInvoice] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceInfo | null>(null);

  // Invoice number reuse state
  const [invoiceNumberOption, setInvoiceNumberOption] = useState<'next' | 'reuse' | 'custom'>('next');
  const [reusableInvoiceNumbers, setReusableInvoiceNumbers] = useState<Array<{seq: number; year: number; deletedAt: string | null; notes: string | null}>>([]);
  const [fetchingReusableInvoices, setFetchingReusableInvoices] = useState(false);
  const [selectedReusableInvoice, setSelectedReusableInvoice] = useState<number | null>(null);
  const [customInvoiceNumber, setCustomInvoiceNumber] = useState<number | null>(null);
  const [validatingCustomInvoice, setValidatingCustomInvoice] = useState(false);

  // Invoice preview state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<InvoicePreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewConfig, setPreviewConfig] = useState<any>(null);
  const [previewDocumentType, setPreviewDocumentType] = useState<'invoice' | 'proforma' | 'purchase-order' | 'delivery-note' | null>(null);

  // Verification token state
  const [generatingToken, setGeneratingToken] = useState(false);
  const [hasVerificationToken, setHasVerificationToken] = useState(false);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [currentTokenType, setCurrentTokenType] = useState<'invoice' | 'proforma' | 'purchase-order' | 'delivery-note'>('invoice');
  const [currentTokenValue, setCurrentTokenValue] = useState<string | null>(null); // For split tokens

  // Proforma section state
  const [proformaOpen, setProformaOpen] = useState(false);
  const [proformaDate, setProformaDate] = useState(new Date().toISOString().split("T")[0]);
  const [reservedProforma, setReservedProforma] = useState<{
    seq: number;
    year: number;
    reservationId: string;
    expiresAt: string;
    fullNumber: string;
  } | null>(null);
  const [reservingProforma, setReservingProforma] = useState(false);
  const [creatingProforma, setCreatingProforma] = useState(false);
  const [proforma, setProforma] = useState<InvoiceInfo | null>(null);

  // Proforma number reuse state
  const [proformaNumberOption, setProformaNumberOption] = useState<'next' | 'reuse' | 'custom'>('next');
  const [reusableProformaNumbers, setReusableProformaNumbers] = useState<Array<{seq: number; year: number; deletedAt: string | null; notes: string | null}>>([]);
  const [fetchingReusableProformas, setFetchingReusableProformas] = useState(false);
  const [selectedReusableProforma, setSelectedReusableProforma] = useState<number | null>(null);
  const [customProformaNumber, setCustomProformaNumber] = useState<number | null>(null);
  const [validatingCustomProforma, setValidatingCustomProforma] = useState(false);

  // Proforma preview state
  const [isProformaPreviewOpen, setIsProformaPreviewOpen] = useState(false);
  const [proformaPreviewData, setProformaPreviewData] = useState<ProformaPreviewData | null>(null);
  const [loadingProformaPreview, setLoadingProformaPreview] = useState(false);
  const [hasProformaVerificationToken, setHasProformaVerificationToken] = useState(false);
  const [showProformaTokenDialog, setShowProformaTokenDialog] = useState(false);

  // Purchase Order section state
  const [purchaseOrderOpen, setPurchaseOrderOpen] = useState(false);
  const [purchaseOrderDate, setPurchaseOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [reservedPurchaseOrder, setReservedPurchaseOrder] = useState<{
    seq: number;
    year: number;
    reservationId: string;
    expiresAt: string;
    fullNumber: string;
  } | null>(null);
  const [reservingPurchaseOrder, setReservingPurchaseOrder] = useState(false);
  const [creatingPurchaseOrder, setCreatingPurchaseOrder] = useState(false);
  const [purchaseOrder, setPurchaseOrder] = useState<InvoiceInfo | null>(null);

  // Purchase Order number reuse state
  const [purchaseOrderNumberOption, setPurchaseOrderNumberOption] = useState<'next' | 'reuse' | 'custom'>('next');
  const [reusablePurchaseOrderNumbers, setReusablePurchaseOrderNumbers] = useState<Array<{seq: number; year: number; deletedAt: string | null; notes: string | null}>>([]);
  const [fetchingReusablePurchaseOrders, setFetchingReusablePurchaseOrders] = useState(false);
  const [selectedReusablePurchaseOrder, setSelectedReusablePurchaseOrder] = useState<number | null>(null);
  const [customPurchaseOrderNumber, setCustomPurchaseOrderNumber] = useState<number | null>(null);
  const [validatingCustomPurchaseOrder, setValidatingCustomPurchaseOrder] = useState(false);

  // Purchase Order preview state
  const [isPurchaseOrderPreviewOpen, setIsPurchaseOrderPreviewOpen] = useState(false);
  const [purchaseOrderPreviewData, setPurchaseOrderPreviewData] = useState<PurchaseOrderPreviewData | null>(null);
  const [loadingPurchaseOrderPreview, setLoadingPurchaseOrderPreview] = useState(false);
  const [hasPurchaseOrderVerificationToken, setHasPurchaseOrderVerificationToken] = useState(false);
  const [showPurchaseOrderTokenDialog, setShowPurchaseOrderTokenDialog] = useState(false);

  // Delivery Note section state
  const [deliveryNoteOpen, setDeliveryNoteOpen] = useState(false);
  const [deliveryNoteDate, setDeliveryNoteDate] = useState(new Date().toISOString().split("T")[0]);
  const [reservedDeliveryNote, setReservedDeliveryNote] = useState<{
    seq: number;
    year: number;
    reservationId: string;
    expiresAt: string;
    fullNumber: string;
  } | null>(null);
  const [reservingDeliveryNote, setReservingDeliveryNote] = useState(false);
  const [creatingDeliveryNote, setCreatingDeliveryNote] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState<InvoiceInfo | null>(null);

  // Delivery Note number reuse state
  const [deliveryNoteNumberOption, setDeliveryNoteNumberOption] = useState<'next' | 'reuse' | 'custom'>('next');
  const [reusableDeliveryNoteNumbers, setReusableDeliveryNoteNumbers] = useState<Array<{seq: number; year: number; deletedAt: string | null; notes: string | null}>>([]);
  const [fetchingReusableDeliveryNotes, setFetchingReusableDeliveryNotes] = useState(false);
  const [selectedReusableDeliveryNote, setSelectedReusableDeliveryNote] = useState<number | null>(null);
  const [customDeliveryNoteNumber, setCustomDeliveryNoteNumber] = useState<number | null>(null);
  const [validatingCustomDeliveryNote, setValidatingCustomDeliveryNote] = useState(false);

  // Delivery Note preview state
  const [isDeliveryNotePreviewOpen, setIsDeliveryNotePreviewOpen] = useState(false);
  const [deliveryNotePreviewData, setDeliveryNotePreviewData] = useState<DeliveryNotePreviewData | null>(null);
  const [loadingDeliveryNotePreview, setLoadingDeliveryNotePreview] = useState(false);
  const [hasDeliveryNoteVerificationToken, setHasDeliveryNoteVerificationToken] = useState(false);
  const [showDeliveryNoteTokenDialog, setShowDeliveryNoteTokenDialog] = useState(false);

  // Status management state
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);

  // Edit order dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Split document dialog states
  const [invoiceSplitOpen, setInvoiceSplitOpen] = useState(false);
  const [proformaSplitOpen, setProformaSplitOpen] = useState(false);
  const [purchaseOrderSplitOpen, setPurchaseOrderSplitOpen] = useState(false);
  const [deliveryNoteSplitOpen, setDeliveryNoteSplitOpen] = useState(false);

  // Split documents state
  const [invoiceSplits, setInvoiceSplits] = useState<DocumentSplit[]>([]);
  const [proformaSplits, setProformaSplits] = useState<DocumentSplit[]>([]);
  const [purchaseOrderSplits, setPurchaseOrderSplits] = useState<DocumentSplit[]>([]);
  const [deliveryNoteSplits, setDeliveryNoteSplits] = useState<DocumentSplit[]>([]);

  // State for managing split operations
  const [splitReservations, setSplitReservations] = useState<{
    [key: string]: {
      seq: number;
      year: number;
      reservationId: string;
      expiresAt: string;
      fullNumber: string;
    };
  }>({});
  const [splitReserving, setSplitReserving] = useState<{ [key: string]: boolean }>({});
  const [splitIssuing, setSplitIssuing] = useState<{ [key: string]: boolean }>({});
  const [splitDates, setSplitDates] = useState<{ [key: string]: string }>({});
  const [splitNumberOptions, setSplitNumberOptions] = useState<{ [key: string]: 'next' | 'reuse' | 'custom' }>({});
  const [splitReusableNumbers, setSplitReusableNumbers] = useState<{
    [key: string]: Array<{seq: number; year: number; deletedAt: string | null; notes: string | null}>;
  }>({});
  const [splitFetchingReusable, setSplitFetchingReusable] = useState<{ [key: string]: boolean }>({});
  const [splitSelectedReusable, setSplitSelectedReusable] = useState<{ [key: string]: number | null }>({});
  const [splitCustomNumbers, setSplitCustomNumbers] = useState<{ [key: string]: number | null }>({});
  const [splitValidatingCustom, setSplitValidatingCustom] = useState<{ [key: string]: boolean }>({});
  const [openSplitIds, setOpenSplitIds] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (orderId) {
      fetchOrder();
      fetchInvoiceInfo();
      fetchProformaInfo();
      fetchPurchaseOrderInfo();
      fetchDeliveryNoteInfo();
      fetchSplitDocuments();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      if (response.ok) {
        const data = await response.json();
        setOrder(data);

        // If order already has invoice, set invoice info
        if (data.invoiceFullNumber) {
          setInvoice({
            number: null,
            year: data.invoiceYear,
            sequence: data.invoiceSequence,
            fullNumber: data.invoiceFullNumber,
            date: data.invoiceDate,
            status: data.invoiceStatus,
          });
        }

        // If order already has proforma, set proforma info
        if (data.proformaFullNumber) {
          setProforma({
            number: null,
            year: data.proformaYear,
            sequence: data.proformaSequence,
            fullNumber: data.proformaFullNumber,
            date: data.proformaDate,
            status: data.proformaStatus,
          });
        }

        // If order already has purchase order, set purchase order info
        if (data.purchaseOrderFullNumber) {
          setPurchaseOrder({
            number: null,
            year: data.purchaseOrderYear,
            sequence: data.purchaseOrderSequence,
            fullNumber: data.purchaseOrderFullNumber,
            date: data.purchaseOrderDate,
            status: data.purchaseOrderStatus,
          });
        }

        // If order already has delivery note, set delivery note info
        if (data.deliveryNoteFullNumber) {
          setDeliveryNote({
            number: null,
            year: data.deliveryNoteYear,
            sequence: data.deliveryNoteSequence,
            fullNumber: data.deliveryNoteFullNumber,
            date: data.deliveryNoteDate,
            status: data.deliveryNoteStatus,
          });
        }

        // Check if order has verification token
        setHasVerificationToken(!!data.invoiceVerificationToken);
        setHasProformaVerificationToken(!!data.proformaVerificationToken);
        setHasPurchaseOrderVerificationToken(!!data.purchaseOrderVerificationToken);
        setHasDeliveryNoteVerificationToken(!!data.deliveryNoteVerificationToken);

        // Parse payment history
        if (data.payments) {
          try {
            const parsedPayments = JSON.parse(data.payments);
            setPaymentHistory(parsedPayments);
          } catch (e) {
            console.error("Error parsing payments:", e);
            setPaymentHistory([]);
          }
        } else {
          setPaymentHistory([]);
        }
      } else if (response.status === 404) {
        toast({
          title: t("error"),
          description: t("orderNotFound"),
          variant: "destructive",
        });
        router.push("/orders");
      } else {
        console.error("Failed to fetch order:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("Error fetching order:", error);
      // Don't show toast on network errors, just log
    } finally {
      setLoading(false);
    }
  };

  const handleOrderUpdated = () => {
    fetchOrder();
    setEditDialogOpen(false);
  };

  const handleSplitComplete = () => {
    fetchOrder();
    fetchSplitDocuments();
  };

  // Generate verification token
  const handleGenerateVerificationToken = async () => {
    if (!order || !invoice?.fullNumber) return;
    
    setGeneratingToken(true);
    try {
      const response = await fetch('/api/invoices/verification-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          qrJsonData: {
            invoiceNumber: invoice.fullNumber,
            orderNumber: order.fullNumber,
            customerName: order.customerName,
            total: order.total,
            currency: order.currency,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setHasVerificationToken(true);
        toast({
          title: "Verification Token Generated",
          description: "QR code can now be included in the invoice preview",
        });
        // Refresh order to get the token
        fetchOrder();
      } else {
        const error = await response.json();
        toast({
          title: t("error"),
          description: error.error || "Failed to generate verification token",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating verification token:", error);
      toast({
        title: t("error"),
        description: "Failed to generate verification token",
        variant: "destructive",
      });
    } finally {
      setGeneratingToken(false);
    }
  };

  const fetchInvoiceInfo = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}/invoice`);
      if (response.ok) {
        const data = await response.json();
        if (data.invoice) {
          setInvoice(data.invoice);
        }
      }
      // Silently ignore non-200 responses for document info fetches
      // as they may not exist yet
    } catch (error) {
      console.error("Error fetching invoice info:", error);
      // Silently ignore network errors for optional data
    }
  };

  const fetchProformaInfo = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}/proforma`);
      if (response.ok) {
        const data = await response.json();
        if (data.proforma) {
          setProforma(data.proforma);
        }
      }
      // Silently ignore non-200 responses for document info fetches
    } catch (error) {
      console.error("Error fetching proforma info:", error);
      // Silently ignore network errors for optional data
    }
  };

  const fetchPurchaseOrderInfo = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}/purchase-order`);
      if (response.ok) {
        const data = await response.json();
        if (data.purchaseOrder) {
          setPurchaseOrder(data.purchaseOrder);
        }
      }
      // Silently ignore non-200 responses for document info fetches
    } catch (error) {
      console.error("Error fetching purchase order info:", error);
      // Silently ignore network errors for optional data
    }
  };

  const fetchDeliveryNoteInfo = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}/delivery-note`);
      if (response.ok) {
        const data = await response.json();
        if (data.deliveryNote) {
          setDeliveryNote(data.deliveryNote);
        }
      }
      // Silently ignore non-200 responses for document info fetches
    } catch (error) {
      console.error("Error fetching delivery note info:", error);
      // Silently ignore network errors for optional data
    }
  };

  // Fetch split documents
  const fetchSplitDocuments = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}/splits`);
      if (response.ok) {
        const data = await response.json();
        setInvoiceSplits(data.invoiceSplits || []);
        setProformaSplits(data.proformaSplits || []);
        setPurchaseOrderSplits(data.purchaseOrderSplits || []);
        setDeliveryNoteSplits(data.deliveryNoteSplits || []);
        
        // Initialize dates for all splits
        const initialDates: { [key: string]: string } = {};
        [...(data.invoiceSplits || []), ...(data.proformaSplits || []), ...(data.purchaseOrderSplits || []), ...(data.deliveryNoteSplits || [])].forEach((split: DocumentSplit) => {
          if (!split.date) {
            initialDates[split.id] = new Date().toISOString().split("T")[0];
          } else {
            initialDates[split.id] = split.date.split('T')[0];
          }
          initialDates[split.id] = initialDates[split.id] || new Date().toISOString().split("T")[0];
        });
        setSplitDates(initialDates);
      }
    } catch (error) {
      console.error("Error fetching split documents:", error);
    }
  };

  // Helper function to get document name for API calls
  const getDocumentApiName = (documentType: string): string => {
    switch (documentType) {
      case 'invoice': return 'invoices';
      case 'proforma': return 'proformas';
      case 'purchase-order': return 'purchase-orders';
      case 'delivery-note': return 'delivery-notes';
      default: return documentType;
    }
  };

  // Helper function to get document label
  const getDocumentLabel = (documentType: string): string => {
    switch (documentType) {
      case 'invoice': return t('invoice') || 'Invoice';
      case 'proforma': return t('proforma') || 'Proforma Invoice';
      case 'purchase-order': return t('purchaseOrder') || 'Purchase Order';
      case 'delivery-note': return t('deliveryNote') || 'Delivery Note';
      default: return documentType;
    }
  };

  // Helper to check if document can be split
  const canSplitDocument = (documentType: string): boolean => {
    switch (documentType) {
      case 'invoice':
        const invoiceStatus = invoice?.status;
        const invoiceSplitsExist = invoiceSplits.length > 0;
        return !invoiceSplitsExist && !['ISSUED', 'PAID', 'PARTIALLY_PAID'].includes(invoiceStatus || '');
      case 'proforma':
        const proformaStatus = proforma?.status;
        const proformaSplitsExist = proformaSplits.length > 0;
        return !proformaSplitsExist && !['ISSUED', 'PAID', 'PARTIALLY_PAID'].includes(proformaStatus || '');
      case 'purchase-order':
        const poStatus = purchaseOrder?.status;
        const poSplitsExist = purchaseOrderSplits.length > 0;
        return !poSplitsExist && !['ISSUED', 'PAID', 'PARTIALLY_PAID'].includes(poStatus || '');
      case 'delivery-note':
        const dnStatus = deliveryNote?.status;
        const dnSplitsExist = deliveryNoteSplits.length > 0;
        return !dnSplitsExist && !['ISSUED', 'PAID', 'PARTIALLY_PAID'].includes(dnStatus || '');
      default:
        return true;
    }
  };

  // Split number reservation
  const handleReserveSplitNumber = async (splitId: string, documentType: string) => {
    const apiName = getDocumentApiName(documentType);
    const date = splitDates[splitId] || new Date().toISOString().split("T")[0];
    const year = new Date(date).getFullYear();
    
    setSplitReserving(prev => ({ ...prev, [splitId]: true }));
    try {
      const response = await fetch(`/api/${apiName}/numbers/next`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          reservedBy: `split-${splitId}-${Date.now()}`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSplitReservations(prev => ({
          ...prev,
          [splitId]: {
            seq: data.seq,
            year: data.year,
            reservationId: data.reservationId,
            expiresAt: data.expiresAt,
            fullNumber: data.fullNumber,
          },
        }));
        toast({
          title: "Number Reserved",
          description: data.fullNumber,
        });
      } else {
        const error = await response.json();
        toast({
          title: t("error"),
          description: error.error || "Failed to reserve number",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error reserving split number:", error);
      toast({
        title: t("error"),
        description: "Failed to reserve number",
        variant: "destructive",
      });
    } finally {
      setSplitReserving(prev => ({ ...prev, [splitId]: false }));
    }
  };

  // Fetch reusable numbers for a split
  const handleFetchSplitReusableNumbers = async (splitId: string, documentType: string) => {
    const apiName = getDocumentApiName(documentType);
    const date = splitDates[splitId] || new Date().toISOString().split("T")[0];
    const year = new Date(date).getFullYear();
    
    setSplitFetchingReusable(prev => ({ ...prev, [splitId]: true }));
    try {
      const response = await fetch(`/api/${apiName}/numbers/available?year=${year}`);
      if (response.ok) {
        const data = await response.json();
        setSplitReusableNumbers(prev => ({
          ...prev,
          [splitId]: data.numbers || [],
        }));
      } else {
        console.error('Error fetching reusable numbers');
      }
    } catch (error) {
      console.error('Error fetching reusable numbers:', error);
    } finally {
      setSplitFetchingReusable(prev => ({ ...prev, [splitId]: false }));
    }
  };

  // Reserve a reusable number for a split
  const handleReserveSplitReusableNumber = async (splitId: string, documentType: string, seq: number, year: number) => {
    const apiName = getDocumentApiName(documentType);
    
    setSplitReserving(prev => ({ ...prev, [splitId]: true }));
    try {
      const response = await fetch(`/api/${apiName}/numbers/reuse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          seq,
          reservedBy: `split-${splitId}-reuse-${Date.now()}`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSplitReservations(prev => ({
          ...prev,
          [splitId]: {
            seq: data.seq,
            year: data.year,
            reservationId: data.reservationId,
            expiresAt: data.expiresAt,
            fullNumber: data.fullNumber,
          },
        }));
        setSplitSelectedReusable(prev => ({ ...prev, [splitId]: seq }));
        toast({
          title: "Number Reserved",
          description: data.fullNumber,
        });
      } else {
        const error = await response.json();
        toast({
          title: t("error"),
          description: error.error || "Failed to reserve number",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error reserving reusable number:', error);
      toast({
        title: t("error"),
        description: "Failed to reserve number",
        variant: "destructive",
      });
    } finally {
      setSplitReserving(prev => ({ ...prev, [splitId]: false }));
    }
  };

  // Validate and reserve custom number for a split
  const handleValidateSplitCustomNumber = async (splitId: string, documentType: string, number: number) => {
    if (!number || number < 1) return;

    const apiName = getDocumentApiName(documentType);
    const date = splitDates[splitId] || new Date().toISOString().split("T")[0];
    const year = new Date(date).getFullYear();

    setSplitValidatingCustom(prev => ({ ...prev, [splitId]: true }));
    try {
      const response = await fetch(`/api/${apiName}/numbers/custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          seq: number,
          reservedBy: `split-${splitId}-custom-${Date.now()}`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSplitReservations(prev => ({
          ...prev,
          [splitId]: {
            seq: data.seq,
            year: data.year,
            reservationId: data.reservationId,
            expiresAt: data.expiresAt,
            fullNumber: data.fullNumber,
          },
        }));
        setSplitCustomNumbers(prev => ({ ...prev, [splitId]: number }));
        toast({
          title: 'Success',
          description: `Custom number ${number}/${year} reserved successfully`,
        });
      } else {
        const error = await response.json();
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
      setSplitValidatingCustom(prev => ({ ...prev, [splitId]: false }));
    }
  };

  // Handle split number option change
  const handleSplitNumberOptionChange = async (splitId: string, option: 'next' | 'reuse' | 'custom', documentType: string) => {
    setSplitNumberOptions(prev => ({ ...prev, [splitId]: option }));
    setSplitReservations(prev => ({ ...prev, [splitId]: undefined }));
    setSplitSelectedReusable(prev => ({ ...prev, [splitId]: null }));
    setSplitCustomNumbers(prev => ({ ...prev, [splitId]: null }));

    if (option === 'reuse') {
      await handleFetchSplitReusableNumbers(splitId, documentType);
    }
  };

  // Issue split (update with number, date, and status)
  const handleIssueSplit = async (split: DocumentSplit) => {
    console.log('handleIssueSplit called with split:', split);
    const reservation = splitReservations[split.id];
    console.log('Reservation:', reservation);

    if (!reservation) {
      console.error('No reservation found');
      toast({
        title: t("error"),
        description: "Please reserve a number first",
        variant: "destructive",
      });
      return;
    }

    // Check if reservation has expired
    if (new Date() > new Date(reservation.expiresAt)) {
      toast({
        title: t("error"),
        description: "Number reservation has expired. Please reserve again.",
        variant: "destructive",
      });
      setSplitReservations(prev => ({ ...prev, [split.id]: undefined }));
      return;
    }

    setSplitIssuing(prev => ({ ...prev, [split.id]: true }));
    const requestBody = {
      number: reservation.fullNumber,
      sequence: reservation.seq,
      year: reservation.year,
      date: splitDates[split.id] || new Date().toISOString().split("T")[0],
      status: 'ISSUED',
      reservationId: reservation.reservationId,
    };
    console.log('Sending POST request to:', `/api/splits/${split.id}`, 'with body:', requestBody);

    try {
      const response = await fetch(`/api/splits/${split.id}`, {
        method: "POST", // Changed from PATCH to POST due to gateway restrictions
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        const updatedSplit = data.split;
        console.log('Updated split from response:', updatedSplit);
        // Update the split in the appropriate state array
        if (split.documentType === 'invoice') {
          setInvoiceSplits(prev => prev.map(s => s.id === split.id ? updatedSplit : s));
        } else if (split.documentType === 'proforma') {
          setProformaSplits(prev => prev.map(s => s.id === split.id ? updatedSplit : s));
        } else if (split.documentType === 'purchase-order') {
          setPurchaseOrderSplits(prev => prev.map(s => s.id === split.id ? updatedSplit : s));
        } else if (split.documentType === 'delivery-note') {
          setDeliveryNoteSplits(prev => prev.map(s => s.id === split.id ? updatedSplit : s));
        }
        setSplitReservations(prev => ({ ...prev, [split.id]: undefined }));
        toast({
          title: "Document Issued",
          description: reservation.fullNumber,
        });
      } else {
        console.error('Error response:', data);
        toast({
          title: t("error"),
          description: data.error || "Failed to issue document",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error issuing split:", error);
      toast({
        title: t("error"),
        description: "Failed to issue document",
        variant: "destructive",
      });
    } finally {
      setSplitIssuing(prev => ({ ...prev, [split.id]: false }));
    }
  };

  // Generate verification token for a split
  const handleGenerateSplitVerificationToken = async (split: DocumentSplit) => {
    if (!split.number) {
      toast({
        title: t("error"),
        description: "Document must be issued first",
        variant: "destructive",
      });
      return;
    }

    setGeneratingToken(true);
    try {
      // Call the API endpoint to generate a unique verification token
      const response = await fetch(`/api/splits/${split.id}/generate-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        // Update split with verification token
        const updatedSplit = data.split;
        if (split.documentType === 'invoice') {
          setInvoiceSplits(prev => prev.map(s => s.id === split.id ? updatedSplit : s));
        } else if (split.documentType === 'proforma') {
          setProformaSplits(prev => prev.map(s => s.id === split.id ? updatedSplit : s));
        } else if (split.documentType === 'purchase-order') {
          setPurchaseOrderSplits(prev => prev.map(s => s.id === split.id ? updatedSplit : s));
        } else if (split.documentType === 'delivery-note') {
          setDeliveryNoteSplits(prev => prev.map(s => s.id === split.id ? updatedSplit : s));
        }
        toast({
          title: "Verification Token Generated",
          description: "QR code can now be included in the document preview",
        });
      } else {
        const error = await response.json();
        toast({
          title: t("error"),
          description: error.error || "Failed to generate verification token",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating verification token for split:", error);
      toast({
        title: t("error"),
        description: "Failed to generate verification token",
        variant: "destructive",
      });
    } finally {
      setGeneratingToken(false);
    }
  };

  // Calculate total for a split based on its items
  const calculateSplitTotal = (split: DocumentSplit): number => {
    if (!order) return 0;
    const splitItemIds = JSON.parse(split.itemIds);
    const splitItems = order.items.filter(item => splitItemIds.includes(item.id));
    return splitItems.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  // Generate preview data for a split
  const handleGenerateSplitPreview = async (split: DocumentSplit) => {
    if (!order || !split.number) return;

    setLoadingPreview(true);
    try {
      // Load PDF config if not already loaded
      if (!previewConfig) {
        await loadPdfConfig();
      }

      // Parse item IDs
      const splitItemIds = JSON.parse(split.itemIds);
      const splitItems = order.items.filter(item => splitItemIds.includes(item.id));
      const splitTotal = calculateSplitTotal(split);

      // Create a proper order object with document-specific fields for the split
      const splitOrder = {
        ...order,
        customer: order.customer, // Explicitly include customer relation
        items: splitItems,
        total: splitTotal,
        subtotal: splitItems.reduce((sum, item) => sum + (item.totalPrice / (1 + order.taxRate / 100)), 0),
        taxAmount: splitItems.reduce((sum, item) => {
          const itemSubtotal = item.totalPrice / (1 + order.taxRate / 100);
          return sum + (item.totalPrice - itemSubtotal);
        }, 0),
      };

      // Add document-specific fields based on split type
      if (split.documentType === 'invoice') {
        (splitOrder as any).invoiceFullNumber = split.number;
        (splitOrder as any).invoiceNumber = split.sequence;
        (splitOrder as any).invoiceYear = split.year;
        (splitOrder as any).invoiceDate = split.date ? new Date(split.date) : new Date();
        (splitOrder as any).invoiceStatus = split.status;
        (splitOrder as any).invoiceVerificationToken = split.verificationToken;
      } else if (split.documentType === 'proforma') {
        (splitOrder as any).proformaFullNumber = split.number;
        (splitOrder as any).proformaNumber = split.sequence;
        (splitOrder as any).proformaYear = split.year;
        (splitOrder as any).proformaDate = split.date ? new Date(split.date) : new Date();
        (splitOrder as any).proformaStatus = split.status;
        (splitOrder as any).proformaVerificationToken = split.verificationToken;
      } else if (split.documentType === 'purchase-order') {
        (splitOrder as any).purchaseOrderFullNumber = split.number;
        (splitOrder as any).purchaseOrderNumber = split.sequence;
        (splitOrder as any).purchaseOrderYear = split.year;
        (splitOrder as any).purchaseOrderDate = split.date ? new Date(split.date) : new Date();
        (splitOrder as any).purchaseOrderStatus = split.status;
        (splitOrder as any).purchaseOrderVerificationToken = split.verificationToken;
      } else if (split.documentType === 'delivery-note') {
        (splitOrder as any).deliveryNoteFullNumber = split.number;
        (splitOrder as any).deliveryNoteNumber = split.sequence;
        (splitOrder as any).deliveryNoteYear = split.year;
        (splitOrder as any).deliveryNoteDate = split.date ? new Date(split.date) : new Date();
        (splitOrder as any).deliveryNoteStatus = split.status;
        (splitOrder as any).deliveryNoteVerificationToken = split.verificationToken;
      }

      let data;
      if (split.documentType === 'invoice') {
        data = await prepareInvoicePreviewData(splitOrder, {
          invoiceNumber: split.sequence ? String(split.sequence) : undefined,
          invoiceYear: split.year || undefined,
        });
        if (data && data.config) {
          data.config.invoiceEmptyRows = 0;
        }
      } else if (split.documentType === 'proforma') {
        data = await prepareProformaPreviewData(splitOrder, {
          proformaNumber: split.sequence ? String(split.sequence) : undefined,
          proformaYear: split.year || new Date().getFullYear(),
        });
        if (data && data.config) {
          data.config.proformaEmptyRows = 0;
        }
      } else if (split.documentType === 'purchase-order') {
        data = await preparePurchaseOrderPreviewData(splitOrder, {
          purchaseOrderNumber: split.sequence ? String(split.sequence) : undefined,
          purchaseOrderYear: split.year || new Date().getFullYear(),
        });
        if (data && data.config) {
          data.config.purchaseOrderEmptyRows = 0;
        }
      } else if (split.documentType === 'delivery-note') {
        data = await prepareDeliveryNotePreviewData(splitOrder, {
          deliveryNoteNumber: split.sequence ? String(split.sequence) : undefined,
          deliveryNoteYear: split.year || new Date().getFullYear(),
        });
        if (data && data.config) {
          data.config.deliveryNoteEmptyRows = 0;
        }
      }

      // Set preview config from data if available
      if (data && data.config) {
        setPreviewConfig(data.config);
      }

      if (data) {
        setPreviewData(data);
        setPreviewDocumentType(split.documentType); // Set the document type for the preview
        setIsPreviewOpen(true);
      } else {
        toast({
          title: t("error"),
          description: "Failed to load preview data",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating split preview:", error);
      toast({
        title: t("error"),
        description: "Failed to generate preview",
        variant: "destructive",
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  // Generate proforma verification token
  const handleGenerateProformaVerificationToken = async () => {
    if (!order || !proforma?.fullNumber) return;
    
    setGeneratingToken(true);
    try {
      const response = await fetch('/api/proformas/verification-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          qrJsonData: {
            proformaNumber: proforma.fullNumber,
            orderNumber: order.fullNumber,
            customerName: order.customerName,
            total: order.total,
            currency: order.currency,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setHasProformaVerificationToken(true);
        toast({
          title: "Verification Token Generated",
          description: "QR code can now be included in the proforma invoice preview",
        });
        // Refresh order to get the token
        fetchOrder();
      } else {
        const error = await response.json();
        toast({
          title: t("error"),
          description: error.error || t("failedToGenerateVerificationToken"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating proforma verification token:", error);
      toast({
        title: t("error"),
        description: t("failedToGenerateVerificationToken"),
        variant: "destructive",
      });
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleReserveProformaNumber = async () => {
    setReservingProforma(true);
    try {
      const year = new Date(proformaDate).getFullYear();
      const response = await fetch("/api/proformas/numbers/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          reservedBy: `order-${orderId}-proforma-${Date.now()}`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setReservedProforma(data);
        toast({
          title: t("proformaNumberReserved") || "Proforma Invoice Number Reserved",
          description: `${data.fullNumber}`,
        });
      } else {
        const error = await response.json();
        toast({
          title: t("error"),
          description: error.error || "Failed to Reserve Proforma Invoice Number",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error reserving proforma number:", error);
      toast({
        title: t("error"),
        description: "Failed to Reserve Proforma Number",
        variant: "destructive",
      });
    } finally {
      setReservingProforma(false);
    }
  };

  const handleCreateProforma = async () => {
    if (!reservedProforma) {
      toast({
        title: t("error"),
        description: t("pleaseReserveProformaNumberFirst"),
        variant: "destructive",
      });
      return;
    }

    // Check if reservation has expired
    if (new Date() > new Date(reservedProforma.expiresAt)) {
      toast({
        title: t("error"),
        description: t("proformaNumberReservationHasExpired"),
        variant: "destructive",
      });
      setReservedProforma(null);
      return;
    }

    setCreatingProforma(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/proforma`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proformaDate,
          reservedYear: reservedProforma.year,
          reservedSeq: reservedProforma.seq,
          reservationId: reservedProforma.reservationId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProforma(data.proforma);
        setReservedProforma(null);
        toast({
          title: t("proformaCreated") || "Proforma Invoice Created",
          description: `${data.proforma.fullNumber}`,
        });
        // Refresh order to show updated proforma info
        fetchOrder();
      } else {
        const error = await response.json();
        toast({
          title: t("error"),
          description: error.error || t("failedToCreateProforma"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating proforma:", error);
      toast({
        title: t("error"),
        description: t("failedToCreateProforma"),
        variant: "destructive",
      });
    } finally {
      setCreatingProforma(false);
    }
  };

  // Fetch reusable proforma numbers
  const fetchReusableProformaNumbers = async () => {
    setFetchingReusableProformas(true);
    try {
      const year = new Date(proformaDate).getFullYear();
      const response = await fetch(`/api/proformas/numbers/available?year=${year}`);
      if (response.ok) {
        const data = await response.json();
        setReusableProformaNumbers(data.numbers || []);
      } else {
        console.error('Error fetching reusable proforma numbers');
      }
    } catch (error) {
      console.error('Error fetching reusable proforma numbers:', error);
    } finally {
      setFetchingReusableProformas(false);
    }
  };

  // Handle proforma number option change
  const handleProformaNumberOptionChange = async (option: 'next' | 'reuse' | 'custom') => {
    setProformaNumberOption(option);
    setReservedProforma(null);
    setSelectedReusableProforma(null);
    setCustomProformaNumber(null);

    if (option === 'reuse') {
      await fetchReusableProformaNumbers();
    }
  };

  // Reserve a specific reusable proforma number
  const handleReserveReusableProformaNumber = async (seq: number, year: number) => {
    setReservingProforma(true);
    try {
      const response = await fetch('/api/proformas/numbers/reuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          seq,
          reservedBy: `order-${orderId}-proforma-reuse-${Date.now()}`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setReservedProforma({
          seq: data.seq,
          year: data.year,
          reservationId: data.reservationId,
          expiresAt: data.expiresAt,
          fullNumber: data.fullNumber,
        });
        setSelectedReusableProforma(seq);
        toast({
          title: t("proformaNumberReserved") || "Proforma Invoice Number Reserved",
          description: data.fullNumber,
        });
      } else {
        const error = await response.json();
        toast({
          title: t("error"),
          description: error.error || "Failed to Reserve Proforma Invoice Number",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error reserving reusable proforma number:', error);
      toast({
        title: t("error"),
        description: t("failedToReserveProformaNumber"),
        variant: "destructive",
      });
    } finally {
      setReservingProforma(false);
    }
  };

  // Handle custom proforma number validation
  const handleValidateCustomProformaNumber = async (number: number) => {
    if (!number || number < 1) return;

    setValidatingCustomProforma(true);
    try {
      const year = new Date(proformaDate).getFullYear();

      const reserveResponse = await fetch('/api/proformas/numbers/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          seq: number,
          reservedBy: 'order-proforma-custom-' + Date.now(),
        }),
      });

      if (reserveResponse.ok) {
        const reserveData = await reserveResponse.json();
        setReservedProforma({
          seq: reserveData.seq,
          year: reserveData.year,
          reservationId: reserveData.reservationId,
          expiresAt: reserveData.expiresAt,
          fullNumber: reserveData.fullNumber,
        });
        setCustomProformaNumber(number);
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
      console.error('Error validating/reserving custom proforma number:', error);
      toast({
        title: 'Error',
        description: 'Failed to reserve custom number',
        variant: 'destructive',
      });
    } finally {
      setValidatingCustomProforma(false);
    }
  };

  // Generate proforma preview
  const handleGenerateProformaPreview = async () => {
    if (!order || !proforma?.fullNumber) return;

    setLoadingProformaPreview(true);
    try {
      // Load PDF config if not already loaded
      if (!previewConfig) {
        await loadPdfConfig();
      }

      // Extract the sequence number from the proforma for the preview
      const proformaSequence = proforma.sequence;
      const proformaYear = proforma.year;

      // Use proforma-specific preview function
      const proformaData = await prepareProformaPreviewData(order, {
        proformaNumber: proformaSequence ? String(proformaSequence) : undefined,
        proformaYear: proformaYear || undefined,
      });

      // Override empty rows to always be 0 for order details preview
      if (proformaData && proformaData.config) {
        proformaData.config.proformaEmptyRows = 0;
      }

      // Set preview config from data if available
      if (proformaData && proformaData.config) {
        setPreviewConfig(proformaData.config);
      }

      if (proformaData) {
        setProformaPreviewData(proformaData);
        setPreviewDocumentType(null); // Reset to use main order dialogs
        setIsProformaPreviewOpen(true);
      } else {
        toast({
          title: t("error"),
          description: "Failed to load preview data",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating proforma preview:", error);
      toast({
        title: t("error"),
        description: "Failed to generate proforma invoice preview",
        variant: "destructive",
      });
    } finally {
      setLoadingProformaPreview(false);
    }
  };

  // Generate purchase order verification token
  const handleGeneratePurchaseOrderVerificationToken = async () => {
    if (!order || !purchaseOrder?.fullNumber) return;
    
    setGeneratingToken(true);
    try {
      const response = await fetch('/api/purchase-orders/verification-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          qrJsonData: {
            purchaseOrderNumber: purchaseOrder.fullNumber,
            orderNumber: order.fullNumber,
            customerName: order.customerName,
            total: order.total,
            currency: order.currency,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setHasPurchaseOrderVerificationToken(true);
        toast({
          title: "Verification Token Generated",
          description: "QR code can now be included in the purchase order preview",
        });
        // Refresh order to get the token
        fetchOrder();
      } else {
        const error = await response.json();
        toast({
          title: t("error"),
          description: error.error || t("failedToGenerateVerificationToken"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating purchase order verification token:", error);
      toast({
        title: t("error"),
        description: t("failedToGenerateVerificationToken"),
        variant: "destructive",
      });
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleReservePurchaseOrderNumber = async () => {
    setReservingPurchaseOrder(true);
    try {
      const year = new Date(purchaseOrderDate).getFullYear();
      const response = await fetch("/api/purchase-orders/numbers/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          reservedBy: `order-${orderId}-purchase-order-${Date.now()}`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setReservedPurchaseOrder(data);
        toast({
          title: t("purchaseOrderNumberReserved") || "Purchase Order Number Reserved",
          description: `${data.fullNumber}`,
        });
      } else {
        const error = await response.json();
        toast({
          title: t("error"),
          description: error.error || "Failed to Reserve Purchase Order Number",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error reserving purchase order number:", error);
      toast({
        title: t("error"),
        description: "Failed to Reserve Purchase Order Number",
        variant: "destructive",
      });
    } finally {
      setReservingPurchaseOrder(false);
    }
  };

  const handleCreatePurchaseOrder = async () => {
    if (!reservedPurchaseOrder) {
      toast({
        title: t("error"),
        description: t("pleaseReservePurchaseOrderNumberFirst"),
        variant: "destructive",
      });
      return;
    }

    // Check if reservation has expired
    if (new Date() > new Date(reservedPurchaseOrder.expiresAt)) {
      toast({
        title: t("error"),
        description: t("purchaseOrderNumberReservationHasExpired"),
        variant: "destructive",
      });
      setReservedPurchaseOrder(null);
      return;
    }

    setCreatingPurchaseOrder(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/purchase-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseOrderDate,
          reservedYear: reservedPurchaseOrder.year,
          reservedSeq: reservedPurchaseOrder.seq,
          reservationId: reservedPurchaseOrder.reservationId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPurchaseOrder(data.purchaseOrder);
        setReservedPurchaseOrder(null);
        toast({
          title: t("purchaseOrderCreated") || "Purchase Order Created",
          description: `${data.purchaseOrder.fullNumber}`,
        });
        // Refresh order to show updated purchase order info
        fetchOrder();
      } else {
        const error = await response.json();
        toast({
          title: t("error"),
          description: error.error || t("failedToCreatePurchaseOrder"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating purchase order:", error);
      toast({
        title: t("error"),
        description: t("failedToCreatePurchaseOrder"),
        variant: "destructive",
      });
    } finally {
      setCreatingPurchaseOrder(false);
    }
  };

  // Fetch reusable purchase order numbers
  const fetchReusablePurchaseOrderNumbers = async () => {
    setFetchingReusablePurchaseOrders(true);
    try {
      const year = new Date(purchaseOrderDate).getFullYear();
      const response = await fetch(`/api/purchase-orders/numbers/available?year=${year}`);
      if (response.ok) {
        const data = await response.json();
        setReusablePurchaseOrderNumbers(data.numbers || []);
      } else {
        console.error('Error fetching reusable purchase order numbers');
      }
    } catch (error) {
      console.error('Error fetching reusable purchase order numbers:', error);
    } finally {
      setFetchingReusablePurchaseOrders(false);
    }
  };

  // Handle purchase order number option change
  const handlePurchaseOrderNumberOptionChange = async (option: 'next' | 'reuse' | 'custom') => {
    setPurchaseOrderNumberOption(option);
    setReservedPurchaseOrder(null);
    setSelectedReusablePurchaseOrder(null);
    setCustomPurchaseOrderNumber(null);

    if (option === 'reuse') {
      await fetchReusablePurchaseOrderNumbers();
    }
  };

  // Reserve a specific reusable purchase order number
  const handleReserveReusablePurchaseOrderNumber = async (seq: number, year: number) => {
    setReservingPurchaseOrder(true);
    try {
      const response = await fetch('/api/purchase-orders/numbers/reuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          seq,
          reservedBy: `order-${orderId}-purchase-order-reuse-${Date.now()}`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setReservedPurchaseOrder({
          seq: data.seq,
          year: data.year,
          reservationId: data.reservationId,
          expiresAt: data.expiresAt,
          fullNumber: data.fullNumber,
        });
        setSelectedReusablePurchaseOrder(seq);
        toast({
          title: t("purchaseOrderNumberReserved") || "Purchase Order Number Reserved",
          description: data.fullNumber,
        });
      } else {
        const error = await response.json();
        toast({
          title: t("error"),
          description: error.error || "Failed to Reserve Purchase Order Number",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error reserving reusable purchase order number:', error);
      toast({
        title: t("error"),
        description: t("failedToReservePurchaseOrderNumber"),
        variant: "destructive",
      });
    } finally {
      setReservingPurchaseOrder(false);
    }
  };

  // Handle custom purchase order number validation
  const handleValidateCustomPurchaseOrderNumber = async (number: number) => {
    if (!number || number < 1) return;

    setValidatingCustomPurchaseOrder(true);
    try {
      const year = new Date(purchaseOrderDate).getFullYear();

      const reserveResponse = await fetch('/api/purchase-orders/numbers/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          seq: number,
          reservedBy: 'order-purchase-order-custom-' + Date.now(),
        }),
      });

      if (reserveResponse.ok) {
        const reserveData = await reserveResponse.json();
        setReservedPurchaseOrder({
          seq: reserveData.seq,
          year: reserveData.year,
          reservationId: reserveData.reservationId,
          expiresAt: reserveData.expiresAt,
          fullNumber: reserveData.fullNumber,
        });
        setCustomPurchaseOrderNumber(number);
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
      console.error('Error validating/reserving custom purchase order number:', error);
      toast({
        title: 'Error',
        description: 'Failed to reserve custom number',
        variant: 'destructive',
      });
    } finally {
      setValidatingCustomPurchaseOrder(false);
    }
  };

  // Generate purchase order preview
  const handleGeneratePurchaseOrderPreview = async () => {
    if (!order || !purchaseOrder?.fullNumber) return;

    setLoadingPurchaseOrderPreview(true);
    try {
      // Load PDF config if not already loaded
      if (!previewConfig) {
        await loadPdfConfig();
      }

      // Extract the sequence number from the purchase order for the preview
      const purchaseOrderSequence = purchaseOrder.sequence;
      const purchaseOrderYear = purchaseOrder.year;

      // Use purchase order-specific preview function
      const purchaseOrderData = await preparePurchaseOrderPreviewData(order, {
        purchaseOrderNumber: purchaseOrderSequence ? String(purchaseOrderSequence) : undefined,
        purchaseOrderYear: purchaseOrderYear || undefined,
      });

      // Override empty rows to always be 0 for order details preview
      if (purchaseOrderData && purchaseOrderData.config) {
        purchaseOrderData.config.purchaseOrderEmptyRows = 0;
      }

      // Set preview config from data if available
      if (purchaseOrderData && purchaseOrderData.config) {
        setPreviewConfig(purchaseOrderData.config);
      }

      if (purchaseOrderData) {
        setPurchaseOrderPreviewData(purchaseOrderData);
        setPreviewDocumentType(null); // Reset to use main order dialogs
        setIsPurchaseOrderPreviewOpen(true);
      } else {
        toast({
          title: t("error"),
          description: "Failed to load preview data",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating purchase order preview:", error);
      toast({
        title: t("error"),
        description: "Failed to generate purchase order preview",
        variant: "destructive",
      });
    } finally {
      setLoadingPurchaseOrderPreview(false);
    }
  };

  // Generate delivery note verification token
  const handleGenerateDeliveryNoteVerificationToken = async () => {
    if (!order || !deliveryNote?.fullNumber) return;

    setGeneratingToken(true);
    try {
      const response = await fetch('/api/delivery-notes/verification-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          qrJsonData: {
            deliveryNoteNumber: deliveryNote.fullNumber,
            deliveryNoteSequence: deliveryNote.sequence || order.deliveryNoteSequence || 0,
            deliveryNoteYear: deliveryNote.year || order.deliveryNoteYear || new Date().getFullYear(),
            orderNumber: order.fullNumber,
            customerName: order.customerName,
            total: order.total,
            currency: order.currency,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setHasDeliveryNoteVerificationToken(true);
        toast({
          title: "Verification Token Generated",
          description: "QR code can now be included in the delivery note preview",
        });
        // Refresh order to get the token
        fetchOrder();
      } else {
        const error = await response.json();
        toast({
          title: t("error"),
          description: error.error || t("failedToGenerateVerificationToken"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating delivery note verification token:", error);
      toast({
        title: t("error"),
        description: t("failedToGenerateVerificationToken"),
        variant: "destructive",
      });
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleReserveDeliveryNoteNumber = async () => {
    setReservingDeliveryNote(true);
    try {
      const year = new Date(deliveryNoteDate).getFullYear();
      const response = await fetch("/api/delivery-notes/numbers/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          reservedBy: `order-${orderId}-delivery-note-${Date.now()}`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setReservedDeliveryNote(data);
        toast({
          title: t("deliveryNoteNumberReserved") || "Delivery Note Number Reserved",
          description: `${data.fullNumber}`,
        });
      } else {
        const error = await response.json();
        toast({
          title: t("error"),
          description: error.error || "Failed to Reserve Delivery Note Number",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error reserving delivery note number:", error);
      toast({
        title: t("error"),
        description: "Failed to Reserve Delivery Note Number",
        variant: "destructive",
      });
    } finally {
      setReservingDeliveryNote(false);
    }
  };

  const handleCreateDeliveryNote = async () => {
    if (!reservedDeliveryNote) {
      toast({
        title: t("error"),
        description: t("pleaseReserveDeliveryNoteNumberFirst") || "Please Reserve a Delivery Note Number First",
        variant: "destructive",
      });
      return;
    }

    // Check if reservation has expired
    if (new Date() > new Date(reservedDeliveryNote.expiresAt)) {
      toast({
        title: t("error"),
        description: t("deliveryNoteNumberReservationHasExpired") || "Delivery Note Number Reservation Has Expired",
        variant: "destructive",
      });
      setReservedDeliveryNote(null);
      return;
    }

    setCreatingDeliveryNote(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/delivery-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryNoteDate,
          reservedYear: reservedDeliveryNote.year,
          reservedSeq: reservedDeliveryNote.seq,
          reservationId: reservedDeliveryNote.reservationId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setDeliveryNote(data.deliveryNote);
        setReservedDeliveryNote(null);
        toast({
          title: t("deliveryNoteCreated") || "Delivery Note Created",
          description: `${data.deliveryNote.fullNumber}`,
        });
        // Refresh order to show updated delivery note info
        fetchOrder();
      } else {
        const error = await response.json();
        toast({
          title: t("error"),
          description: error.error || t("failedToCreateDeliveryNote") || "Failed to Create Delivery Note",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating delivery note:", error);
      toast({
        title: t("error"),
        description: t("failedToCreateDeliveryNote") || "Failed to Create Delivery Note",
        variant: "destructive",
      });
    } finally {
      setCreatingDeliveryNote(false);
    }
  };

  // Fetch reusable delivery note numbers
  const fetchReusableDeliveryNoteNumbers = async () => {
    setFetchingReusableDeliveryNotes(true);
    try {
      const year = new Date(deliveryNoteDate).getFullYear();
      const response = await fetch(`/api/delivery-notes/numbers/available?year=${year}`);
      if (response.ok) {
        const data = await response.json();
        setReusableDeliveryNoteNumbers(data.numbers || []);
      } else {
        console.error('Error fetching reusable delivery note numbers');
      }
    } catch (error) {
      console.error('Error fetching reusable delivery note numbers:', error);
    } finally {
      setFetchingReusableDeliveryNotes(false);
    }
  };

  // Handle delivery note number option change
  const handleDeliveryNoteNumberOptionChange = async (option: 'next' | 'reuse' | 'custom') => {
    setDeliveryNoteNumberOption(option);
    setReservedDeliveryNote(null);
    setSelectedReusableDeliveryNote(null);
    setCustomDeliveryNoteNumber(null);

    if (option === 'reuse') {
      await fetchReusableDeliveryNoteNumbers();
    }
  };

  // Reserve a specific reusable delivery note number
  const handleReserveReusableDeliveryNoteNumber = async (seq: number, year: number) => {
    setReservingDeliveryNote(true);
    try {
      const response = await fetch('/api/delivery-notes/numbers/reuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          seq,
          reservedBy: `order-${orderId}-delivery-note-reuse-${Date.now()}`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setReservedDeliveryNote({
          seq: data.seq,
          year: data.year,
          reservationId: data.reservationId,
          expiresAt: data.expiresAt,
          fullNumber: data.fullNumber,
        });
        setSelectedReusableDeliveryNote(seq);
        toast({
          title: t("deliveryNoteNumberReserved") || "Delivery Note Number Reserved",
          description: data.fullNumber,
        });
      } else {
        const error = await response.json();
        toast({
          title: t("error"),
          description: error.error || "Failed to Reserve Delivery Note Number",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error reserving reusable delivery note number:', error);
      toast({
        title: t("error"),
        description: t("failedToReserveDeliveryNoteNumber") || "Failed to Reserve Delivery Note Number",
        variant: "destructive",
      });
    } finally {
      setReservingDeliveryNote(false);
    }
  };

  // Handle custom delivery note number validation
  const handleValidateCustomDeliveryNoteNumber = async (number: number) => {
    if (!number || number < 1) return;

    setValidatingCustomDeliveryNote(true);
    try {
      const year = new Date(deliveryNoteDate).getFullYear();

      const reserveResponse = await fetch('/api/delivery-notes/numbers/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          seq: number,
          reservedBy: 'order-delivery-note-custom-' + Date.now(),
        }),
      });

      if (reserveResponse.ok) {
        const reserveData = await reserveResponse.json();
        setReservedDeliveryNote({
          seq: reserveData.seq,
          year: reserveData.year,
          reservationId: reserveData.reservationId,
          expiresAt: reserveData.expiresAt,
          fullNumber: reserveData.fullNumber,
        });
        setCustomDeliveryNoteNumber(number);
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
      console.error('Error validating/reserving custom delivery note number:', error);
      toast({
        title: 'Error',
        description: 'Failed to reserve custom number',
        variant: 'destructive',
      });
    } finally {
      setValidatingCustomDeliveryNote(false);
    }
  };

  // Generate delivery note preview
  const handleGenerateDeliveryNotePreview = async () => {
    if (!order || !deliveryNote?.fullNumber) return;

    setLoadingDeliveryNotePreview(true);
    try {
      // Load PDF config if not already loaded
      if (!previewConfig) {
        await loadPdfConfig();
      }

      // Extract the sequence number from the delivery note for the preview
      const deliveryNoteSequence = deliveryNote.sequence;
      const deliveryNoteYear = deliveryNote.year;

      // Use delivery note-specific preview function
      const deliveryNoteData = await prepareDeliveryNotePreviewData(order, {
        deliveryNoteNumber: deliveryNoteSequence ? String(deliveryNoteSequence) : undefined,
        deliveryNoteYear: deliveryNoteYear || undefined,
      });

      // Override empty rows to always be 0 for order details preview
      if (deliveryNoteData && deliveryNoteData.config) {
        deliveryNoteData.config.deliveryNoteEmptyRows = 0;
      }

      // Set preview config from data if available
      if (deliveryNoteData && deliveryNoteData.config) {
        setPreviewConfig(deliveryNoteData.config);
      }

      if (deliveryNoteData) {
        setDeliveryNotePreviewData(deliveryNoteData);
        setPreviewDocumentType(null); // Reset to use main order dialogs
        setIsDeliveryNotePreviewOpen(true);
      } else {
        toast({
          title: t("error"),
          description: "Failed to load preview data",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating delivery note preview:", error);
      toast({
        title: t("error"),
        description: "Failed to generate delivery note preview",
        variant: "destructive",
      });
    } finally {
      setLoadingDeliveryNotePreview(false);
    }
  };

  const handleReserveInvoiceNumber = async () => {
    setReservingInvoice(true);
    try {
      const year = new Date(invoiceDate).getFullYear();
      const response = await fetch("/api/invoices/numbers/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          reservedBy: `order-${orderId}-invoice-${Date.now()}`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setReservedInvoice(data);
        toast({
          title: t("invoiceNumberReserved") || "Invoice Number Reserved",
          description: `${data.fullNumber}`,
        });
      } else {
        const error = await response.json();
        toast({
          title: t("error"),
          description: error.error || "Failed to Reserve Invoice Number",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error reserving invoice number:", error);
      toast({
        title: t("error"),
        description: "Failed to Reserve Invoice Number",
        variant: "destructive",
      });
    } finally {
      setReservingInvoice(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!reservedInvoice) {
      toast({
        title: t("error"),
        description: "Please Reserve an Invoice Number First",
        variant: "destructive",
      });
      return;
    }

    // Check if reservation has expired
    if (new Date() > new Date(reservedInvoice.expiresAt)) {
      toast({
        title: t("error"),
        description: "Invoice Number Reservation Has Expired. Please Reserve Again.",
        variant: "destructive",
      });
      setReservedInvoice(null);
      return;
    }

    setCreatingInvoice(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceDate,
          reservedYear: reservedInvoice.year,
          reservedSeq: reservedInvoice.seq,
          reservationId: reservedInvoice.reservationId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setInvoice(data.invoice);
        setReservedInvoice(null);
        toast({
          title: t("invoiceCreated") || "Invoice Created",
          description: `${data.invoice.fullNumber}`,
        });
        // Refresh order to show updated invoice info
        fetchOrder();
      } else {
        const error = await response.json();
        toast({
          title: t("error"),
          description: error.error || "Failed to Create Invoice",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast({
        title: t("error"),
        description: "Failed to Create Invoice",
        variant: "destructive",
      });
    } finally {
      setCreatingInvoice(false);
    }
  };

  // Fetch reusable invoice numbers
  const fetchReusableInvoiceNumbers = async () => {
    setFetchingReusableInvoices(true);
    try {
      const year = new Date(invoiceDate).getFullYear();
      const response = await fetch(`/api/invoices/numbers/available?year=${year}`);
      if (response.ok) {
        const data = await response.json();
        setReusableInvoiceNumbers(data.numbers || []);
      } else {
        console.error('Error fetching reusable invoice numbers');
      }
    } catch (error) {
      console.error('Error fetching reusable invoice numbers:', error);
    } finally {
      setFetchingReusableInvoices(false);
    }
  };

  // Handle invoice number option change
  const handleInvoiceNumberOptionChange = async (option: 'next' | 'reuse' | 'custom') => {
    setInvoiceNumberOption(option);
    setReservedInvoice(null);
    setSelectedReusableInvoice(null);
    setCustomInvoiceNumber(null);

    if (option === 'reuse') {
      await fetchReusableInvoiceNumbers();
    }
  };

  // Reserve a specific reusable invoice number
  const handleReserveReusableInvoiceNumber = async (seq: number, year: number) => {
    setReservingInvoice(true);
    try {
      const response = await fetch('/api/invoices/numbers/reuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          seq,
          reservedBy: `order-${orderId}-invoice-reuse-${Date.now()}`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setReservedInvoice({
          seq: data.seq,
          year: data.year,
          reservationId: data.reservationId,
          expiresAt: data.expiresAt,
          fullNumber: data.fullNumber,
        });
        setSelectedReusableInvoice(seq);
        toast({
          title: t("invoiceNumberReserved") || "Invoice Number Reserved",
          description: data.fullNumber,
        });
      } else {
        const error = await response.json();
        toast({
          title: t("error"),
          description: error.error || "Failed to Reserve Invoice Number",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error reserving reusable invoice number:', error);
      toast({
        title: t("error"),
        description: "Failed to Reserve Invoice Number",
        variant: "destructive",
      });
    } finally {
      setReservingInvoice(false);
    }
  };

  // Handle custom invoice number validation
  const handleValidateCustomInvoiceNumber = async (number: number) => {
    if (!number || number < 1) return;

    setValidatingCustomInvoice(true);
    try {
      const year = new Date(invoiceDate).getFullYear();

      const reserveResponse = await fetch('/api/invoices/numbers/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          seq: number,
          reservedBy: 'order-invoice-custom-' + Date.now(),
        }),
      });

      if (reserveResponse.ok) {
        const reserveData = await reserveResponse.json();
        setReservedInvoice({
          seq: reserveData.seq,
          year: reserveData.year,
          reservationId: reserveData.reservationId,
          expiresAt: reserveData.expiresAt,
          fullNumber: reserveData.fullNumber,
        });
        setCustomInvoiceNumber(number);
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
      console.error('Error validating/reserving custom invoice number:', error);
      toast({
        title: 'Error',
        description: 'Failed to reserve custom number',
        variant: 'destructive',
      });
    } finally {
      setValidatingCustomInvoice(false);
    }
  };

  // Load PDF configuration
  const loadPdfConfig = async () => {
    try {
      const response = await fetch('/api/pdf-configuration');
      if (response.ok) {
        const config = await response.json();
        setPreviewConfig(config);
      }
    } catch (error) {
      console.error('Error loading PDF config:', error);
    }
  };

  // Save PDF configuration
  const handleSavePdfConfig = async (updatedConfig: any) => {
    try {
      const response = await fetch('/api/pdf-configuration', {
        method: updatedConfig.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig),
      });

      if (response.ok) {
        const savedConfig = await response.json();
        setPreviewConfig(savedConfig);
        toast({
          title: "Settings Saved",
          description: "Invoice settings have been updated",
        });
      } else {
        toast({
          title: t("error"),
          description: "Failed to save settings",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving PDF config:', error);
      toast({
        title: t("error"),
        description: "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  // Generate invoice preview
  const handleGeneratePreview = async () => {
    if (!order || !invoice?.fullNumber) return;

    setLoadingPreview(true);
    try {
      // Load PDF config if not already loaded
      if (!previewConfig) {
        await loadPdfConfig();
      }

      // Extract the sequence number from the invoice for the preview
      const invoiceSequence = invoice.sequence;
      const invoiceYear = invoice.year;
      
      const data = await prepareInvoicePreviewData(order, {
        invoiceNumber: invoiceSequence ? String(invoiceSequence) : undefined,
        invoiceYear: invoiceYear || undefined,
      });

      // Override empty rows to always be 0 for order details preview
      if (data && data.config) {
        data.config.invoiceEmptyRows = 0;
      }

      // Set preview config from data if available
      if (data && data.config) {
        setPreviewConfig(data.config);
      }

      if (data) {
        setPreviewData(data);
        setPreviewDocumentType(null); // Reset to use main order dialogs
        setIsPreviewOpen(true);
      } else {
        toast({
          title: t("error"),
          description: "Failed to load preview data",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating preview:", error);
      toast({
        title: t("error"),
        description: "Failed to generate preview",
        variant: "destructive",
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  // Handle invoice status update
  const handleUpdateInvoiceStatus = async (newStatus: string, includePayment = false, autoPay = false) => {
    if (!order) return;

    // Validate for paid status
    if (newStatus === "PAID" && !includePayment) {
      // Check if total already paid
      const totalPaid = paymentHistory.reduce((sum, p) => sum + p.amount, 0);
      if (totalPaid < order.total) {
        toast({
          title: t("error"),
          description: "Total payments must equal the invoice amount to mark as paid",
          variant: "destructive",
        });
        return;
      }
    }

    // Handle auto-pay: calculate amount to pay
    let finalPaymentAmount = paymentAmount;
    if (autoPay && order) {
      const totalPaid = paymentHistory.reduce((sum, p) => sum + p.amount, 0);
      const remainingAmount = order.total - totalPaid;
      if (remainingAmount > 0) {
        finalPaymentAmount = remainingAmount.toFixed(2);
        setPaymentAmount(finalPaymentAmount);
      }
    }

    // Validate payment data if included
    if (includePayment && (!finalPaymentAmount || parseFloat(finalPaymentAmount) <= 0)) {
      toast({
        title: t("error"),
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    setUpdatingStatus(true);
    try {
      const body: any = {
        invoiceStatus: newStatus,
      };

      // Add payment data if needed
      if (includePayment && finalPaymentAmount && newStatus !== "CANCELLED") {
        body.payment = {
          amount: parseFloat(finalPaymentAmount),
          date: paymentDate,
          notes: paymentNotes || (autoPay ? "Full payment" : undefined),
        };
      }

      const response = await fetch(`/api/orders/${orderId}/invoice-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Status Updated",
          description: `Invoice status changed to ${getInvoiceStatusLabel(newStatus)}`,
        });

        // Refresh order to get updated data
        await fetchOrder();
        setPaymentAmount("");
        setPaymentNotes("");
      } else {
        const error = await response.json();
        toast({
          title: t("error"),
          description: error.error || "Failed to update status",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating invoice status:", error);
      toast({
        title: t("error"),
        description: "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
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

  const getStatusLabel = (status: string) => {
    // Convert snake_case status to camelCase translation key
    const key = status.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    return t(key);
  };

  const getInvoiceStatusLabel = (status: string | null | undefined) => {
    if (!status) return "";
    switch (status) {
      case "DRAFT":
        return t("draft") || "Draft";
      case "ISSUED":
        return t("issued") || "Issued";
      case "PARTIALLY_PAID":
        return t("partiallyPaid") || "Partially Paid";
      case "PAID":
        return t("paid") || "Paid";
      case "CANCELLED":
        return t("cancelled") || "Cancelled";
      default:
        return status;
    }
  };

  const getProformaStatusLabel = (status: string | null | undefined) => {
    if (!status) return "";
    switch (status) {
      case "DRAFT":
        return t("draft") || "Draft";
      case "ISSUED":
        return t("issued") || "Issued";
      case "CANCELLED":
        return t("cancelled") || "Cancelled";
      default:
        return status;
    }
  };

  const getPurchaseOrderStatusLabel = (status: string | null | undefined) => {
    if (!status) return "";
    switch (status) {
      case "DRAFT":
        return t("draft") || "Draft";
      case "ISSUED":
        return t("issued") || "Issued";
      case "CANCELLED":
        return t("cancelled") || "Cancelled";
      default:
        return status;
    }
  };

  const getDeliveryNoteStatusLabel = (status: string | null | undefined) => {
    if (!status) return "";
    switch (status) {
      case "DRAFT":
        return t("draft") || "Draft";
      case "ISSUED":
        return t("issued") || "Issued";
      case "CANCELLED":
        return t("cancelled") || "Cancelled";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="w-full py-6">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("loading")}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className="w-full py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{order.fullNumber}</h1>
            <p className="text-muted-foreground mt-1">{getOrderTypeLabel(order.type)}</p>
          </div>
        </div>
        <Button onClick={() => setEditDialogOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit Order
        </Button>
      </div>

      {/* Order Details */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t("customer")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{order.customerName}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("dates")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">{t("orderDate")}</p>
              <p className="font-semibold">{new Date(order.date).toLocaleDateString()}</p>
            </div>
            {order.dueDate && (
              <div>
                <p className="text-sm text-muted-foreground">{t("dueDate")}</p>
                <p className="font-semibold">{new Date(order.dueDate).toLocaleDateString()}</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("status")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge>{getStatusLabel(order.status)}</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Items and Totals Section - Collapsible Dropdown */}
      <Collapsible open={itemsTotalsOpen} onOpenChange={setItemsTotalsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBasket className="h-5 w-5" />
                  <CardTitle>{t("itemsAndTotals")}</CardTitle>
                  <Badge variant="secondary" className="ml-2">
                    {order.items.length} {t("items")}
                  </Badge>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${itemsTotalsOpen ? "rotate-180" : ""}`} />
              </div>
              <CardDescription>
                {t("viewOrderItemsAndTotalAmounts")}
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-4">
              {/* Items */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{t("items")}</h3>
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-start p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-semibold">{item.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.model && `${item.model.family?.code || ""} ${item.model.name} (${item.model.code})`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("quantity")}: {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {item.totalPrice.toFixed(2)} {order.currency}
                      </p>
                      {item.discount > 0 && (
                        <p className="text-sm text-muted-foreground">
                          -{item.discount.toFixed(2)} {order.currency} {t("discount")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">{t("totals")}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>{t("subtotal")}:</span>
                    <span>{order.subtotal.toFixed(2)} {order.currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("tax")} ({order.taxRate}%):</span>
                    <span>{order.taxAmount.toFixed(2)} {order.currency}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>{t("total")}:</span>
                    <span>{order.total.toFixed(2)} {order.currency}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Invoice Section - Collapsible Dropdown - Only show if no splits exist */}
      {invoiceSplits.length === 0 && (
      <Collapsible open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <CardTitle>{t("invoice") || "Invoice"}</CardTitle>
                  {invoice?.fullNumber && (
                    <Badge variant="secondary" className="ml-2">
                      {invoice.fullNumber}
                    </Badge>
                  )}
                  {invoice?.status && (
                    <Badge className={
                      invoice.status === "CANCELLED"
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    }>
                      {getInvoiceStatusLabel(invoice.status)}
                    </Badge>
                  )}
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${invoiceOpen ? "rotate-180" : ""}`} />
              </div>
              <CardDescription>
                {invoice?.fullNumber 
                  ? `${t("invoiceNumber") || "Invoice Number"}: ${invoice.fullNumber}`
                  : t("createInvoiceDescription") || "Create an Invoice for This Order"
                }
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-4">
              {invoice?.fullNumber ? (
                /* Invoice already created - show info */
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        {t("invoiceNumber") || "Invoice Number"}
                      </label>
                      <p className="font-semibold text-lg">{invoice.fullNumber}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        {t("invoiceDate") || "Invoice Date"}
                      </label>
                      <p className="font-semibold">
                        {invoice.date ? new Date(invoice.date).toLocaleDateString() : "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">{t("invoiceIssued") || "Invoice Has Been Issued"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {canSplitDocument('invoice') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setInvoiceSplitOpen(true)}
                        >
                          <Scissors className="h-4 w-4 mr-2" />
                          Split
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGeneratePreview}
                        disabled={loadingPreview}
                      >
                        {loadingPreview ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4 mr-2" />
                        )}
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGeneratePreview}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                      </Button>
                    </div>
                  </div>
                  
                  {/* QR Code / Verification Token Section */}
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <QrCode className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium">Verification QR Code</span>
                      </div>
                      {hasVerificationToken ? (
                        <Badge variant="secondary" className="text-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Token Generated
                        </Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleGenerateVerificationToken}
                          disabled={generatingToken}
                        >
                          {generatingToken ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <QrCode className="h-4 w-4 mr-2" />
                          )}
                          Generate Token
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {hasVerificationToken
                        ? "QR code will be included in the invoice preview with verification data."
                        : "Generate a verification token to include a QR code in the invoice."}
                    </p>
                    {hasVerificationToken && (
                      <div className="mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCurrentTokenType('invoice');
                            setShowTokenDialog(true);
                          }}
                          className="text-xs h-7"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Show Verification Token
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Status Management Section */}
                  <div className="border-t pt-4 mt-4 space-y-4">
                    <h3 className="text-lg font-semibold">Invoice Status Management</h3>

                    {/* Current Status */}
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Current Status</p>
                        <p className="text-lg font-semibold">{getInvoiceStatusLabel(invoice?.status || "ISSUED")}</p>
                      </div>
                      {order && (
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Order Total</p>
                          <p className="text-lg font-semibold">{order.total.toFixed(2)} {order.currency}</p>
                        </div>
                      )}
                    </div>

                    {/* Payment Summary */}
                    {order && paymentHistory.length > 0 && (
                      <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-xs text-muted-foreground">Total Paid</p>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">
                              {paymentHistory.reduce((sum, p) => sum + p.amount, 0).toFixed(2)} {order.currency}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Remaining</p>
                            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                              {Math.max(0, order.total - paymentHistory.reduce((sum, p) => sum + p.amount, 0)).toFixed(2)} {order.currency}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Progress</p>
                            <p className="text-lg font-bold">
                              {Math.min(100, (paymentHistory.reduce((sum, p) => sum + p.amount, 0) / order.total) * 100).toFixed(0)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Payment Entry Form */}
                    {invoice?.status !== "CANCELLED" && invoice?.status !== "PAID" && (
                      <div className="space-y-3 p-4 border rounded-lg">
                        <h4 className="font-medium">Add Payment</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-sm text-muted-foreground">Amount</label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-sm text-muted-foreground">Date</label>
                            <Input
                              type="date"
                              value={paymentDate}
                              onChange={(e) => setPaymentDate(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-sm text-muted-foreground">Notes (optional)</label>
                            <Input
                              type="text"
                              placeholder="Payment notes"
                              value={paymentNotes}
                              onChange={(e) => setPaymentNotes(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Status Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {invoice?.status === "ISSUED" && (
                        <>
                          {order && (
                            <Button
                              variant="default"
                              onClick={() => handleUpdateInvoiceStatus("PARTIALLY_PAID", true, true)}
                              disabled={updatingStatus}
                            >
                              {updatingStatus ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4 mr-2" />
                              )}
                              Pay Full Amount ({order.total.toFixed(2)} {order.currency})
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            onClick={() => handleUpdateInvoiceStatus("PARTIALLY_PAID", true)}
                            disabled={updatingStatus || !paymentAmount}
                          >
                            {updatingStatus ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            Mark Partially Paid
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleUpdateInvoiceStatus("CANCELLED", false)}
                            disabled={updatingStatus}
                          >
                            {updatingStatus ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 mr-2" />
                            )}
                            Cancel Invoice
                          </Button>
                        </>
                      )}

                      {invoice?.status === "PARTIALLY_PAID" && order && (
                        <>
                          {(() => {
                            const totalPaid = paymentHistory.reduce((sum, p) => sum + p.amount, 0);
                            const remainingAmount = order.total - totalPaid;
                            return remainingAmount > 0 && (
                              <Button
                                variant="default"
                                onClick={() => handleUpdateInvoiceStatus("PAID", true, true)}
                                disabled={updatingStatus}
                              >
                                {updatingStatus ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                )}
                                Pay Remaining ({remainingAmount.toFixed(2)} {order.currency})
                              </Button>
                            );
                          })()}
                          <Button
                            variant="outline"
                            onClick={() => handleUpdateInvoiceStatus("PARTIALLY_PAID", true)}
                            disabled={updatingStatus || !paymentAmount}
                          >
                            {updatingStatus ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            Add Payment
                          </Button>
                          {/* Cannot cancel invoice when partially paid */}
                        </>
                      )}

                      {invoice?.status === "PAID" && (
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-medium">Invoice is fully paid</span>
                        </div>
                      )}

                      {invoice?.status === "CANCELLED" && (
                        <div className="flex items-center gap-2 text-destructive">
                          <AlertTriangle className="h-5 w-5" />
                          <span className="font-medium">Invoice has been cancelled</span>
                        </div>
                      )}
                    </div>

                    {/* Payment History */}
                    {paymentHistory.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Payment History</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {paymentHistory.map((payment, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                              <div>
                                <p className="font-semibold">{payment.amount.toFixed(2)} {order?.currency}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(payment.date).toLocaleDateString()}
                                  {payment.notes && ` - ${payment.notes}`}
                                </p>
                              </div>
                              <Badge variant="secondary" className="text-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Paid
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* No invoice yet - show creation form */
                <div className="space-y-4">
                  {/* Invoice Date */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {t("invoiceDate") || "Invoice Date"}
                    </label>
                    <Input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => {
                        setInvoiceDate(e.target.value);
                        setReservedInvoice(null); // Reset reservation when date changes
                        setReusableInvoiceNumbers([]);
                        setSelectedReusableInvoice(null);
                        setCustomInvoiceNumber(null);
                      }}
                    />
                  </div>

                  {/* Invoice Number Option Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">{t("invoiceNumber") || "Invoice Number"}</label>
                    <div className="grid grid-cols-3 gap-3">
                      <div
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          invoiceNumberOption === 'next'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => handleInvoiceNumberOptionChange('next')}
                      >
                        <div className="font-medium text-sm mb-1">Next Number</div>
                        <div className="text-xs text-muted-foreground">
                          Reserve the next available number
                        </div>
                      </div>

                      <div
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          invoiceNumberOption === 'reuse'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => handleInvoiceNumberOptionChange('reuse')}
                      >
                        <div className="font-medium text-sm mb-1 flex items-center gap-1">
                          <RefreshCcw className="h-3 w-3" />
                          Reuse a Number
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Select from reusable numbers
                        </div>
                      </div>

                      <div
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          invoiceNumberOption === 'custom'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => handleInvoiceNumberOptionChange('custom')}
                      >
                        <div className="font-medium text-sm mb-1">Custom Number</div>
                        <div className="text-xs text-muted-foreground">
                          Enter a specific number
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reserve Invoice Number Section */}
                  <div className="space-y-3">
                    {invoiceNumberOption === 'next' && (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleReserveInvoiceNumber}
                          disabled={reservingInvoice || !invoiceDate}
                        >
                          {reservingInvoice ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {t("reserving") || "Reserving..."}
                            </>
                          ) : (
                            t("reserveInvoiceNumber") || "Reserve Invoice Number"
                          )}
                        </Button>
                      </div>
                    )}

                    {invoiceNumberOption === 'reuse' && (
                      <div className="space-y-3">
                        {fetchingReusableInvoices ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            <span className="text-sm text-muted-foreground">{t("loading") || "Loading..."}</span>
                          </div>
                        ) : reusableInvoiceNumbers.length > 0 ? (
                          <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                            {reusableInvoiceNumbers.map((num) => (
                              <div
                                key={num.seq}
                                className={`p-3 border rounded cursor-pointer transition-colors ${
                                  selectedReusableInvoice === num.seq
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                }`}
                                onClick={() => handleReserveReusableInvoiceNumber(num.seq, num.year)}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">INV-{String(num.seq).padStart(3, '0')}/{num.year}</span>
                                  {num.deletedAt && (
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(num.deletedAt).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground text-center py-4 border rounded-md">
                            No reusable numbers available for this year
                          </div>
                        )}
                      </div>
                    )}

                    {invoiceNumberOption === 'custom' && (
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <Input
                            type="number"
                            min="1"
                            placeholder="Enter number (e.g., 15)"
                            value={customInvoiceNumber || ''}
                            onChange={(e) => setCustomInvoiceNumber(parseInt(e.target.value) || null)}
                            disabled={validatingCustomInvoice}
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={() => customInvoiceNumber && handleValidateCustomInvoiceNumber(customInvoiceNumber)}
                          disabled={!customInvoiceNumber || validatingCustomInvoice}
                        >
                          {validatingCustomInvoice ? 'Reserving...' : 'Reserve'}
                        </Button>
                      </div>
                    )}

                    {/* Reserved Number Display */}
                    {reservedInvoice && (
                      <div className="bg-muted p-3 rounded-md space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {t("reservedNumber") || "Reserved Number"}:
                          </span>
                          <span className="font-semibold">{reservedInvoice.fullNumber}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {t("expiresAt") || "Expires At"}:
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(reservedInvoice.expiresAt).toLocaleTimeString()}
                          </span>
                        </div>
                        {new Date() > new Date(reservedInvoice.expiresAt) && (
                          <p className="text-sm text-destructive">
                            {t("reservationExpired") || "Reservation Has Expired"}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Next Available Number Preview */}
                    {!reservedInvoice && invoiceNumberOption === 'next' && (
                      <p className="text-sm text-muted-foreground">
                        {t("clickReserveToSeeNextNumber") || "Click 'Reserve Invoice Number' to See the Next Available Number"}
                      </p>
                    )}
                  </div>

                  {/* Create/Issue Invoice Button */}
                  <div className="flex justify-end gap-2 pt-2">
                    {canSplitDocument('invoice') && (
                      <Button
                        variant="outline"
                        onClick={() => setInvoiceSplitOpen(true)}
                      >
                        <Scissors className="h-4 w-4 mr-2" />
                        Split Instead
                      </Button>
                    )}
                    <Button
                      onClick={handleCreateInvoice}
                      disabled={!reservedInvoice || creatingInvoice || new Date() > new Date(reservedInvoice?.expiresAt || "")}
                    >
                      {creatingInvoice ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("creating") || "Creating..."}
                        </>
                      ) : (
                        t("createInvoice") || "Create Invoice"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
      )}

      {/* Invoice Splits Section - Show instead of main invoice section when splits exist */}
      {invoiceSplits.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <h3 className="text-lg font-semibold">{t("invoice") || "Invoice"}</h3>
            <Badge variant="secondary" className="ml-2">
              {invoiceSplits.length} {invoiceSplits.length === 1 ? 'split' : 'splits'}
            </Badge>
          </div>
          {invoiceSplits
            .sort((a, b) => a.splitIndex - b.splitIndex)
            .map((split) => {
              const splitItemIds = JSON.parse(split.itemIds);
              const splitItems = order?.items.filter(item => splitItemIds.includes(item.id)) || [];
              const splitTotal = calculateSplitTotal(split);
              const reservation = splitReservations[split.id];
              const numberOption = splitNumberOptions[split.id] || 'next';
              const reusableNumbers = splitReusableNumbers[split.id] || [];
              const fetchingReusable = splitFetchingReusable[split.id] || false;
              const selectedReusable = splitSelectedReusable[split.id] || null;
              const customNumber = splitCustomNumbers[split.id] || null;
              const validatingCustom = splitValidatingCustom[split.id] || false;
              const reserving = splitReserving[split.id] || false;
              const issuing = splitIssuing[split.id] || false;
              const date = splitDates[split.id] || new Date().toISOString().split("T")[0];

              return (
                <Collapsible
                  key={split.id}
                  open={openSplitIds[split.id] || false}
                  onOpenChange={(open) => setOpenSplitIds(prev => ({ ...prev, [split.id]: open }))}
                >
                  <Card className="border-blue-200 dark:border-blue-900">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base flex items-center gap-2">
                                {split.number || `Invoice Split ${split.splitIndex + 1}`}
                                {split.number && (
                                  <Badge variant="secondary">
                                    #{split.splitIndex + 1}
                                  </Badge>
                                )}
                              </CardTitle>
                              <ChevronDown className={`h-4 w-4 transition-transform ${openSplitIds[split.id] ? 'rotate-180' : ''}`} />
                            </div>
                            <CardDescription className="mt-1">
                              {splitItems.length} {splitItems.length === 1 ? 'item' : 'items'} • {splitTotal.toFixed(2)} {order?.currency}
                            </CardDescription>
                          </div>
                          <Badge className={
                            split.status === "CANCELLED"
                              ? "bg-red-600 hover:bg-red-700 text-white"
                              : split.status === "ISSUED"
                              ? "bg-green-600 hover:bg-green-700 text-white"
                              : split.status === "RESERVED"
                              ? "bg-blue-600 hover:bg-blue-700 text-white"
                              : "bg-yellow-600 hover:bg-yellow-700 text-white"
                          }>
                            {split.status || "DRAFT"}
                          </Badge>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="space-y-4 pt-4">
                    {/* Items preview */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Items in this split:</p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {splitItems.map(item => (
                          <div key={item.id} className="flex justify-between text-sm p-2 bg-muted rounded">
                            <span>{item.description}</span>
                            <span className="font-medium">{item.totalPrice.toFixed(2)} {order?.currency}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between font-semibold mt-2 pt-2 border-t">
                        <span>Total:</span>
                        <span>{splitTotal.toFixed(2)} {order?.currency}</span>
                      </div>
                    </div>

                    {split.status === 'DRAFT' ? (
                      /* Draft state - show number reservation and issue controls */
                      <div className="space-y-4">
                        {/* Date selection */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Date</label>
                          <Input
                            type="date"
                            value={date}
                            onChange={(e) => setSplitDates(prev => ({ ...prev, [split.id]: e.target.value }))}
                          />
                        </div>

                        {/* Number selection */}
                        <div className="space-y-3">
                          <label className="text-sm font-medium">Invoice Number</label>
                          <div className="grid grid-cols-3 gap-3">
                            <div
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                numberOption === 'next'
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => handleSplitNumberOptionChange(split.id, 'next', 'invoice')}
                            >
                              <div className="font-medium text-sm mb-1">Next Number</div>
                              <div className="text-xs text-muted-foreground">
                                Reserve the next available number
                              </div>
                            </div>

                            <div
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                numberOption === 'reuse'
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => handleSplitNumberOptionChange(split.id, 'reuse', 'invoice')}
                            >
                              <div className="font-medium text-sm mb-1 flex items-center gap-1">
                                <RefreshCcw className="h-3 w-3" />
                                Reuse a Number
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Select from reusable numbers
                              </div>
                            </div>

                            <div
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                numberOption === 'custom'
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => handleSplitNumberOptionChange(split.id, 'custom', 'invoice')}
                            >
                              <div className="font-medium text-sm mb-1">Custom Number</div>
                              <div className="text-xs text-muted-foreground">
                                Enter a specific number
                              </div>
                            </div>
                          </div>

                          {/* Reserve/Select number */}
                          {numberOption === 'next' && (
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleReserveSplitNumber(split.id, 'invoice')}
                                disabled={reserving || !date}
                              >
                                {reserving ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Reserving...
                                  </>
                                ) : (
                                  "Reserve Invoice Number"
                                )}
                              </Button>
                            </div>
                          )}

                          {numberOption === 'reuse' && (
                            <div className="space-y-2">
                              {fetchingReusable ? (
                                <div className="flex items-center justify-center py-4">
                                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                  <span className="text-sm text-muted-foreground">Loading...</span>
                                </div>
                              ) : reusableNumbers.length > 0 ? (
                                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                                  {reusableNumbers.map((num) => (
                                    <div
                                      key={num.seq}
                                      className={`p-3 border rounded cursor-pointer transition-colors ${
                                        selectedReusable === num.seq
                                          ? 'border-primary bg-primary/10'
                                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                      }`}
                                      onClick={() => handleReserveSplitReusableNumber(split.id, 'invoice', num.seq, num.year)}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium">INV-{String(num.seq).padStart(3, '0')}/{num.year}</span>
                                        {num.deletedAt && (
                                          <span className="text-xs text-muted-foreground">
                                            {new Date(num.deletedAt).toLocaleDateString()}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground text-center py-4 border rounded-md">
                                  No reusable numbers available for this year
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
                                  onChange={(e) => setSplitCustomNumbers(prev => ({ ...prev, [split.id]: parseInt(e.target.value) || null }))}
                                  disabled={validatingCustom}
                                />
                              </div>
                              <Button
                                type="button"
                                onClick={() => customNumber && handleValidateSplitCustomNumber(split.id, 'invoice', customNumber)}
                                disabled={!customNumber || validatingCustom}
                              >
                                {validatingCustom ? 'Reserving...' : 'Reserve'}
                              </Button>
                            </div>
                          )}

                          {/* Reserved number display */}
                          {reservation && (
                            <div className="bg-muted p-3 rounded-md space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Reserved Number:</span>
                                <span className="font-semibold">{reservation.fullNumber}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Expires At:</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(reservation.expiresAt).toLocaleTimeString()}
                                </span>
                              </div>
                              {new Date() > new Date(reservation.expiresAt) && (
                                <p className="text-sm text-destructive">
                                  Reservation has expired
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Issue button */}
                        <Button
                          onClick={() => handleIssueSplit(split)}
                          disabled={!reservation || issuing || new Date() > new Date(reservation?.expiresAt || "")}
                          className="w-full"
                        >
                          {issuing ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Issuing...
                            </>
                          ) : (
                            "Issue Invoice"
                          )}
                        </Button>
                      </div>
                    ) : (
                      /* Issued/Reserved state - show info and actions */
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Invoice Number</label>
                            <p className="font-semibold text-lg">{split.number || '-'}</p>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Date</label>
                            <p className="font-semibold">
                              {split.date ? new Date(split.date).toLocaleDateString() : '-'}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateSplitPreview(split)}
                            disabled={loadingPreview || !split.number}
                          >
                            {loadingPreview ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Eye className="h-4 w-4 mr-2" />
                            )}
                            Preview
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateSplitPreview(split)}
                            disabled={!split.number}
                          >
                            <Printer className="h-4 w-4 mr-2" />
                            Print
                          </Button>
                          {split.status === 'ISSUED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGenerateSplitVerificationToken(split)}
                              disabled={generatingToken || !!split.verificationToken}
                            >
                              {generatingToken ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <QrCode className="h-4 w-4 mr-2" />
                              )}
                              {split.verificationToken ? 'Token Generated' : 'Generate Token'}
                            </Button>
                          )}
                        </div>

                        {/* Verification token info */}
                        {split.verificationToken && (
                          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium">Verification Token Generated</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setCurrentTokenType('invoice');
                                setCurrentTokenValue(split.verificationToken);
                                setShowTokenDialog(true);
                              }}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View Token
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
                </Card>
              </Collapsible>
              );
            })}
        </div>
      )}

      {/* Proforma Section - Collapsible Dropdown - Only show if no splits exist */}
      {proformaSplits.length === 0 && (
      <Collapsible open={proformaOpen} onOpenChange={setProformaOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <CardTitle>{t("proforma") || "Proforma Invoice"}</CardTitle>
                  {proforma?.fullNumber && (
                    <Badge variant="secondary" className="ml-2">
                      {proforma.fullNumber}
                    </Badge>
                  )}
                  {proforma?.status && (
                    <Badge className={
                      proforma.status === "CANCELLED"
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    }>
                      {getProformaStatusLabel(proforma.status)}
                    </Badge>
                  )}
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${proformaOpen ? "rotate-180" : ""}`} />
              </div>
              <CardDescription>
                {proforma?.fullNumber 
                  ? `${t("proformaNumber") || "Proforma Invoice Number"}: ${proforma.fullNumber}`
                  : t("createProformaDescription")
                }
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-4">
              {proforma?.fullNumber ? (
                /* Proforma already created - show info */
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        {t("proformaNumber") || "Proforma Invoice Number"}
                      </label>
                      <p className="font-semibold text-lg">{proforma.fullNumber}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        {t("proformaDate") || "Proforma Invoice Date"}
                      </label>
                      <p className="font-semibold">
                        {proforma.date ? new Date(proforma.date).toLocaleDateString() : "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">{t("proformaIssued")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {canSplitDocument('proforma') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setProformaSplitOpen(true)}
                        >
                          <Scissors className="h-4 w-4 mr-2" />
                          Split
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateProformaPreview}
                        disabled={loadingProformaPreview}
                      >
                        {loadingProformaPreview ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4 mr-2" />
                        )}
                        {t("preview")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateProformaPreview}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        {t("print")}
                      </Button>
                    </div>
                  </div>
                  
                  {/* QR Code / Verification Token Section */}
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <QrCode className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium">{t("verificationQRCode")}</span>
                      </div>
                      {hasProformaVerificationToken ? (
                        <Badge variant="secondary" className="text-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {t("tokenGenerated")}
                        </Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleGenerateProformaVerificationToken}
                          disabled={generatingToken}
                        >
                          {generatingToken ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <QrCode className="h-4 w-4 mr-2" />
                          )}
                          {t("generateToken")}
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {hasProformaVerificationToken
                        ? t("qrCodeWillBeIncludedInProforma")
                        : t("generateVerificationTokenToInclude")}
                    </p>
                    {hasProformaVerificationToken && (
                      <div className="mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowProformaTokenDialog(true)}
                          className="text-xs h-7"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Show Verification Token
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Proforma not created - show creation form */
                <div className="space-y-4">
                  {/* Date Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("proformaDate") || "Proforma Invoice Date"}</label>
                    <Input
                      type="date"
                      value={proformaDate}
                      onChange={(e) => {
                        setProformaDate(e.target.value);
                        // Reset reserved proforma when date changes
                        setReservedProforma(null);
                        setCustomProformaNumber(null);
                      }}
                    />
                  </div>

                  {/* Number Selection - Next, Reuse, or Custom */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium">{t("proformaNumber")}</label>
                      <div className="flex items-center gap-4">
                        <Button
                          variant={proformaNumberOption === 'next' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleProformaNumberOptionChange('next')}
                        >
                          {t("nextNumber")}
                        </Button>
                        <Button
                          variant={proformaNumberOption === 'reuse' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleProformaNumberOptionChange('reuse')}
                        >
                          {t("reuseNumber")}
                        </Button>
                        <Button
                          variant={proformaNumberOption === 'custom' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleProformaNumberOptionChange('custom')}
                        >
                          Custom Number
                        </Button>
                      </div>
                    </div>

                    {/* Reserve Proforma Number Section */}
                    <div className="space-y-3">
                      {proformaNumberOption === 'next' && (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleReserveProformaNumber}
                            disabled={reservingProforma || !proformaDate}
                          >
                            {reservingProforma ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t("reserving")}
                              </>
                            ) : (
                              t("reserveProformaNumber")
                            )}
                          </Button>
                        </div>
                      )}

                      {proformaNumberOption === 'reuse' && (
                      <div className="space-y-3">
                        {fetchingReusableProformas ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        ) : (
                          <>
                            {reusableProformaNumbers.length > 0 ? (
                              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                {reusableProformaNumbers.map((num) => (
                                  <div
                                    key={`${num.year}-${num.seq}`}
                                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                                      selectedReusableProforma === num.seq ? 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700' : ''
                                    }`}
                                    onClick={() => handleReserveReusableProformaNumber(num.seq, num.year)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">PRO-{String(num.seq).padStart(3, '0')}/{num.year}</span>
                                      {num.deletedAt && (
                                        <span className="text-xs text-muted-foreground">
                                          {new Date(num.deletedAt).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground text-center py-4 border rounded-md">
                                {t("noReusableNumbersAvailableForThisYear")}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {proformaNumberOption === 'custom' && (
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <Input
                            type="number"
                            min="1"
                            placeholder="Enter number (e.g., 15)"
                            value={customProformaNumber || ''}
                            onChange={(e) => setCustomProformaNumber(parseInt(e.target.value) || null)}
                            disabled={validatingCustomProforma}
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={() => customProformaNumber && handleValidateCustomProformaNumber(customProformaNumber)}
                          disabled={!customProformaNumber || validatingCustomProforma}
                        >
                          {validatingCustomProforma ? 'Reserving...' : 'Reserve'}
                        </Button>
                      </div>
                    )}

                    {/* Reserved Number Display */}
                    {reservedProforma && (
                      <div className="bg-muted p-3 rounded-md space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {t("reservedNumber") || "Reserved Number"}:
                          </span>
                          <span className="font-semibold">{reservedProforma.fullNumber}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {t("expiresAt") || "Expires At"}:
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(reservedProforma.expiresAt).toLocaleTimeString()}
                          </span>
                        </div>
                        {new Date() > new Date(reservedProforma.expiresAt) && (
                          <p className="text-sm text-destructive">
                            {t("reservationExpired") || "Reservation Has Expired"}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Next Available Number Preview */}
                    {!reservedProforma && proformaNumberOption === 'next' && (
                      <p className="text-sm text-muted-foreground">
                        {t("clickReserveToSeeNextNumber")}
                      </p>
                    )}
                    </div>
                  </div>

                  {/* Create/Issue Proforma Button */}
                  <div className="flex justify-end gap-2 pt-2">
                    {canSplitDocument('proforma') && (
                      <Button
                        variant="outline"
                        onClick={() => setProformaSplitOpen(true)}
                      >
                        <Scissors className="h-4 w-4 mr-2" />
                        Split Instead
                      </Button>
                    )}
                    <Button
                      onClick={handleCreateProforma}
                      disabled={!reservedProforma || creatingProforma || new Date() > new Date(reservedProforma?.expiresAt || "")}
                    >
                      {creatingProforma ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("creating") || "Creating..."}
                        </>
                      ) : (
                        t("createProforma")
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
      )}

      {/* Proforma Splits Section - Show instead of main proforma section when splits exist */}
      {proformaSplits.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <h3 className="text-lg font-semibold">{t("proforma") || "Proforma Invoice"}</h3>
            <Badge variant="secondary" className="ml-2">
              {proformaSplits.length} {proformaSplits.length === 1 ? 'split' : 'splits'}
            </Badge>
          </div>
          {proformaSplits
            .sort((a, b) => a.splitIndex - b.splitIndex)
            .map((split) => {
              const splitItemIds = JSON.parse(split.itemIds);
              const splitItems = order?.items.filter(item => splitItemIds.includes(item.id)) || [];
              const splitTotal = calculateSplitTotal(split);
              const reservation = splitReservations[split.id];
              const numberOption = splitNumberOptions[split.id] || 'next';
              const reusableNumbers = splitReusableNumbers[split.id] || [];
              const fetchingReusable = splitFetchingReusable[split.id] || false;
              const selectedReusable = splitSelectedReusable[split.id] || null;
              const customNumber = splitCustomNumbers[split.id] || null;
              const validatingCustom = splitValidatingCustom[split.id] || false;
              const reserving = splitReserving[split.id] || false;
              const issuing = splitIssuing[split.id] || false;
              const date = splitDates[split.id] || new Date().toISOString().split("T")[0];

              return (
                <Collapsible
                  key={split.id}
                  open={openSplitIds[split.id] || false}
                  onOpenChange={(open) => setOpenSplitIds(prev => ({ ...prev, [split.id]: open }))}
                >
                  <Card className="border-purple-200 dark:border-purple-900">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base flex items-center gap-2">
                                {split.number || `Proforma Split ${split.splitIndex + 1}`}
                                {split.number && (
                                  <Badge variant="secondary">
                                    #{split.splitIndex + 1}
                                  </Badge>
                                )}
                              </CardTitle>
                              <ChevronDown className={`h-4 w-4 transition-transform ${openSplitIds[split.id] ? 'rotate-180' : ''}`} />
                            </div>
                            <CardDescription className="mt-1">
                              {splitItems.length} {splitItems.length === 1 ? 'item' : 'items'} • {splitTotal.toFixed(2)} {order?.currency}
                            </CardDescription>
                          </div>
                          <Badge className={
                            split.status === "CANCELLED"
                              ? "bg-red-600 hover:bg-red-700 text-white"
                              : split.status === "ISSUED"
                              ? "bg-green-600 hover:bg-green-700 text-white"
                              : split.status === "RESERVED"
                              ? "bg-blue-600 hover:bg-blue-700 text-white"
                              : "bg-yellow-600 hover:bg-yellow-700 text-white"
                          }>
                            {split.status || "DRAFT"}
                          </Badge>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="space-y-4 pt-4">
                    {/* Items preview */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Items in this split:</p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {splitItems.map(item => (
                          <div key={item.id} className="flex justify-between text-sm p-2 bg-muted rounded">
                            <span>{item.description}</span>
                            <span className="font-medium">{item.totalPrice.toFixed(2)} {order?.currency}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between font-semibold mt-2 pt-2 border-t">
                        <span>Total:</span>
                        <span>{splitTotal.toFixed(2)} {order?.currency}</span>
                      </div>
                    </div>

                    {split.status === 'DRAFT' ? (
                      /* Draft state - show number reservation and issue controls */
                      <div className="space-y-4">
                        {/* Date selection */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Date</label>
                          <Input
                            type="date"
                            value={date}
                            onChange={(e) => setSplitDates(prev => ({ ...prev, [split.id]: e.target.value }))}
                          />
                        </div>

                        {/* Number selection */}
                        <div className="space-y-3">
                          <label className="text-sm font-medium">Proforma Number</label>
                          <div className="grid grid-cols-3 gap-3">
                            <div
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                numberOption === 'next'
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => handleSplitNumberOptionChange(split.id, 'next', 'proforma')}
                            >
                              <div className="font-medium text-sm mb-1">Next Number</div>
                              <div className="text-xs text-muted-foreground">
                                Reserve the next available number
                              </div>
                            </div>

                            <div
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                numberOption === 'reuse'
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => handleSplitNumberOptionChange(split.id, 'reuse', 'proforma')}
                            >
                              <div className="font-medium text-sm mb-1 flex items-center gap-1">
                                <RefreshCcw className="h-3 w-3" />
                                Reuse a Number
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Select from reusable numbers
                              </div>
                            </div>

                            <div
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                numberOption === 'custom'
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => handleSplitNumberOptionChange(split.id, 'custom', 'proforma')}
                            >
                              <div className="font-medium text-sm mb-1">Custom Number</div>
                              <div className="text-xs text-muted-foreground">
                                Enter a specific number
                              </div>
                            </div>
                          </div>

                          {/* Reserve/Select number */}
                          {numberOption === 'next' && (
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleReserveSplitNumber(split.id, 'proforma')}
                                disabled={reserving || !date}
                              >
                                {reserving ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Reserving...
                                  </>
                                ) : (
                                  "Reserve Proforma Number"
                                )}
                              </Button>
                            </div>
                          )}

                          {numberOption === 'reuse' && (
                            <div className="space-y-2">
                              {fetchingReusable ? (
                                <div className="flex items-center justify-center py-4">
                                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                  <span className="text-sm text-muted-foreground">Loading...</span>
                                </div>
                              ) : reusableNumbers.length > 0 ? (
                                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                                  {reusableNumbers.map((num) => (
                                    <div
                                      key={num.seq}
                                      className={`p-3 border rounded cursor-pointer transition-colors ${
                                        selectedReusable === num.seq
                                          ? 'border-primary bg-primary/10'
                                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                      }`}
                                      onClick={() => handleReserveSplitReusableNumber(split.id, 'proforma', num.seq, num.year)}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium">PRO-{String(num.seq).padStart(3, '0')}/{num.year}</span>
                                        {num.deletedAt && (
                                          <span className="text-xs text-muted-foreground">
                                            {new Date(num.deletedAt).toLocaleDateString()}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground text-center py-4 border rounded-md">
                                  No reusable numbers available for this year
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
                                  onChange={(e) => setSplitCustomNumbers(prev => ({ ...prev, [split.id]: parseInt(e.target.value) || null }))}
                                  disabled={validatingCustom}
                                />
                              </div>
                              <Button
                                type="button"
                                onClick={() => customNumber && handleValidateSplitCustomNumber(split.id, 'proforma', customNumber)}
                                disabled={!customNumber || validatingCustom}
                              >
                                {validatingCustom ? 'Reserving...' : 'Reserve'}
                              </Button>
                            </div>
                          )}

                          {/* Reserved number display */}
                          {reservation && (
                            <div className="bg-muted p-3 rounded-md space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Reserved Number:</span>
                                <span className="font-semibold">{reservation.fullNumber}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Expires At:</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(reservation.expiresAt).toLocaleTimeString()}
                                </span>
                              </div>
                              {new Date() > new Date(reservation.expiresAt) && (
                                <p className="text-sm text-destructive">
                                  Reservation has expired
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Issue button */}
                        <Button
                          onClick={() => handleIssueSplit(split)}
                          disabled={!reservation || issuing || new Date() > new Date(reservation?.expiresAt || "")}
                          className="w-full"
                        >
                          {issuing ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Issuing...
                            </>
                          ) : (
                            "Issue Proforma"
                          )}
                        </Button>
                      </div>
                    ) : (
                      /* Issued/Reserved state - show info and actions */
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Proforma Number</label>
                            <p className="font-semibold text-lg">{split.number || '-'}</p>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Date</label>
                            <p className="font-semibold">
                              {split.date ? new Date(split.date).toLocaleDateString() : '-'}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateSplitPreview(split)}
                            disabled={loadingPreview || !split.number}
                          >
                            {loadingPreview ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Eye className="h-4 w-4 mr-2" />
                            )}
                            Preview
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateSplitPreview(split)}
                            disabled={!split.number}
                          >
                            <Printer className="h-4 w-4 mr-2" />
                            Print
                          </Button>
                          {split.status === 'ISSUED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGenerateSplitVerificationToken(split)}
                              disabled={generatingToken || !!split.verificationToken}
                            >
                              {generatingToken ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <QrCode className="h-4 w-4 mr-2" />
                              )}
                              {split.verificationToken ? 'Token Generated' : 'Generate Token'}
                            </Button>
                          )}
                        </div>

                        {/* Verification token info */}
                        {split.verificationToken && (
                          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium">Verification Token Generated</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setCurrentTokenType('proforma');
                                setCurrentTokenValue(split.verificationToken);
                                setShowTokenDialog(true);
                              }}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View Token
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
                </Card>
              </Collapsible>
              );
            })}
        </div>
      )}

      {/* Purchase Order Section - Collapsible Dropdown - Only show if no splits exist */}
      {purchaseOrderSplits.length === 0 && (
      <Collapsible open={purchaseOrderOpen} onOpenChange={setPurchaseOrderOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <CardTitle>{t("purchaseOrder") || "Purchase Order"}</CardTitle>
                  {purchaseOrder?.fullNumber && (
                    <Badge variant="secondary" className="ml-2">
                      {purchaseOrder.fullNumber}
                    </Badge>
                  )}
                  {purchaseOrder?.status && (
                    <Badge className={
                      purchaseOrder.status === "CANCELLED"
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    }>
                      {getPurchaseOrderStatusLabel(purchaseOrder.status)}
                    </Badge>
                  )}
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${purchaseOrderOpen ? "rotate-180" : ""}`} />
              </div>
              <CardDescription>
                {purchaseOrder?.fullNumber 
                  ? `${t("purchaseOrderNumber") || "Purchase Order Number"}: ${purchaseOrder.fullNumber}`
                  : t("createPurchaseOrderDescription")
                }
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-4">
              {purchaseOrder?.fullNumber ? (
                /* Purchase Order already created - show info */
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        {t("purchaseOrderNumber") || "Purchase Order Number"}
                      </label>
                      <p className="font-semibold text-lg">{purchaseOrder.fullNumber}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        {t("purchaseOrderDate") || "Purchase Order Date"}
                      </label>
                      <p className="font-semibold">
                        {purchaseOrder.date ? new Date(purchaseOrder.date).toLocaleDateString() : "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">{t("purchaseOrderIssued")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {canSplitDocument('purchase-order') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPurchaseOrderSplitOpen(true)}
                        >
                          <Scissors className="h-4 w-4 mr-2" />
                          Split
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGeneratePurchaseOrderPreview}
                        disabled={loadingPurchaseOrderPreview}
                      >
                        {loadingPurchaseOrderPreview ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4 mr-2" />
                        )}
                        {t("preview")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGeneratePurchaseOrderPreview}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        {t("print")}
                      </Button>
                    </div>
                  </div>
                  
                  {/* QR Code / Verification Token Section */}
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <QrCode className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium">{t("verificationQRCode")}</span>
                      </div>
                      {hasPurchaseOrderVerificationToken ? (
                        <Badge variant="secondary" className="text-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {t("tokenGenerated")}
                        </Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleGeneratePurchaseOrderVerificationToken}
                          disabled={generatingToken}
                        >
                          {generatingToken ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <QrCode className="h-4 w-4 mr-2" />
                          )}
                          {t("generateToken")}
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {hasPurchaseOrderVerificationToken
                        ? t("qrCodeWillBeIncludedInPurchaseOrder")
                        : t("generateVerificationTokenToInclude")}
                    </p>
                    {hasPurchaseOrderVerificationToken && (
                      <div className="mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowPurchaseOrderTokenDialog(true)}
                          className="text-xs h-7"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Show Verification Token
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Purchase Order not created - show creation form */
                <div className="space-y-4">
                  {/* Date Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("purchaseOrderDate") || "Purchase Order Date"}</label>
                    <Input
                      type="date"
                      value={purchaseOrderDate}
                      onChange={(e) => {
                        setPurchaseOrderDate(e.target.value);
                        // Reset reserved purchase order when date changes
                        setReservedPurchaseOrder(null);
                        setCustomPurchaseOrderNumber(null);
                      }}
                    />
                  </div>

                  {/* Number Selection - Next, Reuse, or Custom */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium">{t("purchaseOrderNumber")}</label>
                      <div className="flex items-center gap-4">
                        <Button
                          variant={purchaseOrderNumberOption === 'next' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePurchaseOrderNumberOptionChange('next')}
                        >
                          {t("nextNumber")}
                        </Button>
                        <Button
                          variant={purchaseOrderNumberOption === 'reuse' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePurchaseOrderNumberOptionChange('reuse')}
                        >
                          {t("reuseNumber")}
                        </Button>
                        <Button
                          variant={purchaseOrderNumberOption === 'custom' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePurchaseOrderNumberOptionChange('custom')}
                        >
                          Custom Number
                        </Button>
                      </div>
                    </div>

                    {/* Reserve Purchase Order Number Section */}
                    <div className="space-y-3">
                      {purchaseOrderNumberOption === 'next' && (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleReservePurchaseOrderNumber}
                            disabled={reservingPurchaseOrder || !purchaseOrderDate}
                          >
                            {reservingPurchaseOrder ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t("reserving")}
                              </>
                            ) : (
                              t("reservePurchaseOrderNumber")
                            )}
                          </Button>
                        </div>
                      )}

                      {purchaseOrderNumberOption === 'reuse' && (
                      <div className="space-y-3">
                        {fetchingReusablePurchaseOrders ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        ) : (
                          <>
                            {reusablePurchaseOrderNumbers.length > 0 ? (
                              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                {reusablePurchaseOrderNumbers.map((num) => (
                                  <div
                                    key={`${num.year}-${num.seq}`}
                                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                                      selectedReusablePurchaseOrder === num.seq ? 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700' : ''
                                    }`}
                                    onClick={() => handleReserveReusablePurchaseOrderNumber(num.seq, num.year)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">PO-{String(num.seq).padStart(3, '0')}/{num.year}</span>
                                      {num.deletedAt && (
                                        <span className="text-xs text-muted-foreground">
                                          {new Date(num.deletedAt).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground text-center py-4 border rounded-md">
                                {t("noReusableNumbersAvailableForThisYear")}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {purchaseOrderNumberOption === 'custom' && (
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <Input
                            type="number"
                            min="1"
                            placeholder="Enter number (e.g., 15)"
                            value={customPurchaseOrderNumber || ''}
                            onChange={(e) => setCustomPurchaseOrderNumber(parseInt(e.target.value) || null)}
                            disabled={validatingCustomPurchaseOrder}
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={() => customPurchaseOrderNumber && handleValidateCustomPurchaseOrderNumber(customPurchaseOrderNumber)}
                          disabled={!customPurchaseOrderNumber || validatingCustomPurchaseOrder}
                        >
                          {validatingCustomPurchaseOrder ? 'Reserving...' : 'Reserve'}
                        </Button>
                      </div>
                    )}

                    {/* Reserved Number Display */}
                    {reservedPurchaseOrder && (
                      <div className="bg-muted p-3 rounded-md space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {t("reservedNumber") || "Reserved Number"}:
                          </span>
                          <span className="font-semibold">{reservedPurchaseOrder.fullNumber}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {t("expiresAt") || "Expires At"}:
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(reservedPurchaseOrder.expiresAt).toLocaleTimeString()}
                          </span>
                        </div>
                        {new Date() > new Date(reservedPurchaseOrder.expiresAt) && (
                          <p className="text-sm text-destructive">
                            {t("reservationExpired") || "Reservation Has Expired"}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Next Available Number Preview */}
                    {!reservedPurchaseOrder && purchaseOrderNumberOption === 'next' && (
                      <p className="text-sm text-muted-foreground">
                        {t("clickReserveToSeeNextNumber")}
                      </p>
                    )}
                    </div>
                  </div>

                  {/* Create/Issue Purchase Order Button */}
                  <div className="flex justify-end gap-2 pt-2">
                    {canSplitDocument('purchase-order') && (
                      <Button
                        variant="outline"
                        onClick={() => setPurchaseOrderSplitOpen(true)}
                      >
                        <Scissors className="h-4 w-4 mr-2" />
                        Split Instead
                      </Button>
                    )}
                    <Button
                      onClick={handleCreatePurchaseOrder}
                      disabled={!reservedPurchaseOrder || creatingPurchaseOrder || new Date() > new Date(reservedPurchaseOrder?.expiresAt || "")}
                    >
                      {creatingPurchaseOrder ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("creating") || "Creating..."}
                        </>
                      ) : (
                        t("createPurchaseOrder")
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
      )}

      {/* Purchase Order Splits Section - Show instead of main PO section when splits exist */}
      {purchaseOrderSplits.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <h3 className="text-lg font-semibold">{t("purchaseOrder") || "Purchase Order"}</h3>
            <Badge variant="secondary" className="ml-2">
              {purchaseOrderSplits.length} {purchaseOrderSplits.length === 1 ? 'split' : 'splits'}
            </Badge>
          </div>
          {purchaseOrderSplits
            .sort((a, b) => a.splitIndex - b.splitIndex)
            .map((split) => {
              const splitItemIds = JSON.parse(split.itemIds);
              const splitItems = order?.items.filter(item => splitItemIds.includes(item.id)) || [];
              const splitTotal = calculateSplitTotal(split);
              const reservation = splitReservations[split.id];
              const numberOption = splitNumberOptions[split.id] || 'next';
              const reusableNumbers = splitReusableNumbers[split.id] || [];
              const fetchingReusable = splitFetchingReusable[split.id] || false;
              const selectedReusable = splitSelectedReusable[split.id] || null;
              const customNumber = splitCustomNumbers[split.id] || null;
              const validatingCustom = splitValidatingCustom[split.id] || false;
              const reserving = splitReserving[split.id] || false;
              const issuing = splitIssuing[split.id] || false;
              const date = splitDates[split.id] || new Date().toISOString().split("T")[0];

              return (
                <Collapsible
                  key={split.id}
                  open={openSplitIds[split.id] || false}
                  onOpenChange={(open) => setOpenSplitIds(prev => ({ ...prev, [split.id]: open }))}
                >
                  <Card className="border-orange-200 dark:border-orange-900">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base flex items-center gap-2">
                                {split.number || `Purchase Order Split ${split.splitIndex + 1}`}
                                {split.number && (
                                  <Badge variant="secondary">
                                    #{split.splitIndex + 1}
                                  </Badge>
                                )}
                              </CardTitle>
                              <ChevronDown className={`h-4 w-4 transition-transform ${openSplitIds[split.id] ? 'rotate-180' : ''}`} />
                            </div>
                            <CardDescription className="mt-1">
                              {splitItems.length} {splitItems.length === 1 ? 'item' : 'items'} • {splitTotal.toFixed(2)} {order?.currency}
                            </CardDescription>
                          </div>
                          <Badge className={
                            split.status === "CANCELLED"
                              ? "bg-red-600 hover:bg-red-700 text-white"
                              : split.status === "ISSUED"
                              ? "bg-green-600 hover:bg-green-700 text-white"
                              : split.status === "RESERVED"
                              ? "bg-blue-600 hover:bg-blue-700 text-white"
                              : "bg-yellow-600 hover:bg-yellow-700 text-white"
                          }>
                            {split.status || "DRAFT"}
                          </Badge>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="space-y-4 pt-4">
                    {/* Items preview */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Items in this split:</p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {splitItems.map(item => (
                          <div key={item.id} className="flex justify-between text-sm p-2 bg-muted rounded">
                            <span>{item.description}</span>
                            <span className="font-medium">{item.totalPrice.toFixed(2)} {order?.currency}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between font-semibold mt-2 pt-2 border-t">
                        <span>Total:</span>
                        <span>{splitTotal.toFixed(2)} {order?.currency}</span>
                      </div>
                    </div>

                    {split.status === 'DRAFT' ? (
                      /* Draft state - show number reservation and issue controls */
                      <div className="space-y-4">
                        {/* Date selection */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Date</label>
                          <Input
                            type="date"
                            value={date}
                            onChange={(e) => setSplitDates(prev => ({ ...prev, [split.id]: e.target.value }))}
                          />
                        </div>

                        {/* Number selection */}
                        <div className="space-y-3">
                          <label className="text-sm font-medium">Purchase Order Number</label>
                          <div className="grid grid-cols-3 gap-3">
                            <div
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                numberOption === 'next'
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => handleSplitNumberOptionChange(split.id, 'next', 'purchase-order')}
                            >
                              <div className="font-medium text-sm mb-1">Next Number</div>
                              <div className="text-xs text-muted-foreground">
                                Reserve the next available number
                              </div>
                            </div>

                            <div
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                numberOption === 'reuse'
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => handleSplitNumberOptionChange(split.id, 'reuse', 'purchase-order')}
                            >
                              <div className="font-medium text-sm mb-1 flex items-center gap-1">
                                <RefreshCcw className="h-3 w-3" />
                                Reuse a Number
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Select from reusable numbers
                              </div>
                            </div>

                            <div
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                numberOption === 'custom'
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => handleSplitNumberOptionChange(split.id, 'custom', 'purchase-order')}
                            >
                              <div className="font-medium text-sm mb-1">Custom Number</div>
                              <div className="text-xs text-muted-foreground">
                                Enter a specific number
                              </div>
                            </div>
                          </div>

                          {/* Reserve/Select number */}
                          {numberOption === 'next' && (
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleReserveSplitNumber(split.id, 'purchase-order')}
                                disabled={reserving || !date}
                              >
                                {reserving ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Reserving...
                                  </>
                                ) : (
                                  "Reserve Purchase Order Number"
                                )}
                              </Button>
                            </div>
                          )}

                          {numberOption === 'reuse' && (
                            <div className="space-y-2">
                              {fetchingReusable ? (
                                <div className="flex items-center justify-center py-4">
                                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                  <span className="text-sm text-muted-foreground">Loading...</span>
                                </div>
                              ) : reusableNumbers.length > 0 ? (
                                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                                  {reusableNumbers.map((num) => (
                                    <div
                                      key={num.seq}
                                      className={`p-3 border rounded cursor-pointer transition-colors ${
                                        selectedReusable === num.seq
                                          ? 'border-primary bg-primary/10'
                                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                      }`}
                                      onClick={() => handleReserveSplitReusableNumber(split.id, 'purchase-order', num.seq, num.year)}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium">PO-{String(num.seq).padStart(3, '0')}/{num.year}</span>
                                        {num.deletedAt && (
                                          <span className="text-xs text-muted-foreground">
                                            {new Date(num.deletedAt).toLocaleDateString()}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground text-center py-4 border rounded-md">
                                  No reusable numbers available for this year
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
                                  onChange={(e) => setSplitCustomNumbers(prev => ({ ...prev, [split.id]: parseInt(e.target.value) || null }))}
                                  disabled={validatingCustom}
                                />
                              </div>
                              <Button
                                type="button"
                                onClick={() => customNumber && handleValidateSplitCustomNumber(split.id, 'purchase-order', customNumber)}
                                disabled={!customNumber || validatingCustom}
                              >
                                {validatingCustom ? 'Reserving...' : 'Reserve'}
                              </Button>
                            </div>
                          )}

                          {/* Reserved number display */}
                          {reservation && (
                            <div className="bg-muted p-3 rounded-md space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Reserved Number:</span>
                                <span className="font-semibold">{reservation.fullNumber}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Expires At:</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(reservation.expiresAt).toLocaleTimeString()}
                                </span>
                              </div>
                              {new Date() > new Date(reservation.expiresAt) && (
                                <p className="text-sm text-destructive">
                                  Reservation has expired
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Issue button */}
                        <Button
                          onClick={() => handleIssueSplit(split)}
                          disabled={!reservation || issuing || new Date() > new Date(reservation?.expiresAt || "")}
                          className="w-full"
                        >
                          {issuing ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Issuing...
                            </>
                          ) : (
                            "Issue Purchase Order"
                          )}
                        </Button>
                      </div>
                    ) : (
                      /* Issued/Reserved state - show info and actions */
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Purchase Order Number</label>
                            <p className="font-semibold text-lg">{split.number || '-'}</p>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Date</label>
                            <p className="font-semibold">
                              {split.date ? new Date(split.date).toLocaleDateString() : '-'}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateSplitPreview(split)}
                            disabled={loadingPreview || !split.number}
                          >
                            {loadingPreview ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Eye className="h-4 w-4 mr-2" />
                            )}
                            Preview
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateSplitPreview(split)}
                            disabled={!split.number}
                          >
                            <Printer className="h-4 w-4 mr-2" />
                            Print
                          </Button>
                          {split.status === 'ISSUED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGenerateSplitVerificationToken(split)}
                              disabled={generatingToken || !!split.verificationToken}
                            >
                              {generatingToken ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <QrCode className="h-4 w-4 mr-2" />
                              )}
                              {split.verificationToken ? 'Token Generated' : 'Generate Token'}
                            </Button>
                          )}
                        </div>

                        {/* Verification token info */}
                        {split.verificationToken && (
                          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium">Verification Token Generated</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setCurrentTokenType('purchase-order');
                                setCurrentTokenValue(split.verificationToken);
                                setShowTokenDialog(true);
                              }}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View Token
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
                </Card>
              </Collapsible>
              );
            })}
        </div>
      )}

      {/* Delivery Note Section - Collapsible Dropdown - Only show if no splits exist */}
      {deliveryNoteSplits.length === 0 && (
      <Collapsible open={deliveryNoteOpen} onOpenChange={setDeliveryNoteOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <CardTitle>{t("pdfSettingsDeliveryNote") || "Delivery Note"}</CardTitle>
                  {deliveryNote?.fullNumber && (
                    <Badge variant="secondary" className="ml-2">
                      {deliveryNote.fullNumber}
                    </Badge>
                  )}
                  {deliveryNote?.status && (
                    <Badge className={
                      deliveryNote.status === "CANCELLED"
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    }>
                      {getDeliveryNoteStatusLabel(deliveryNote.status)}
                    </Badge>
                  )}
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${deliveryNoteOpen ? "rotate-180" : ""}`} />
              </div>
              <CardDescription>
                {deliveryNote?.fullNumber
                  ? `${t("deliveryNoteNumber") || "Delivery Note Number"}: ${deliveryNote.fullNumber}`
                  : t("createDeliveryNoteDescription") || "Create a delivery note for this order"
                }
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-4">
              {deliveryNote?.fullNumber ? (
                /* Delivery Note already created - show info */
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        {t("deliveryNoteNumber") || "Delivery Note Number"}
                      </label>
                      <p className="font-semibold text-lg">{deliveryNote.fullNumber}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        {t("deliveryNoteDate") || "Delivery Note Date"}
                      </label>
                      <p className="font-semibold">
                        {deliveryNote.date ? new Date(deliveryNote.date).toLocaleDateString() : "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">{t("deliveryNoteIssued") || "Delivery Note Issued"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {canSplitDocument('delivery-note') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeliveryNoteSplitOpen(true)}
                        >
                          <Scissors className="h-4 w-4 mr-2" />
                          Split
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateDeliveryNotePreview}
                        disabled={loadingDeliveryNotePreview}
                      >
                        {loadingDeliveryNotePreview ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4 mr-2" />
                        )}
                        {t("preview")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateDeliveryNotePreview}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        {t("print")}
                      </Button>
                    </div>
                  </div>

                  {/* QR Code / Verification Token Section */}
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <QrCode className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium">{t("verificationQRCode")}</span>
                      </div>
                      {hasDeliveryNoteVerificationToken ? (
                        <Badge variant="secondary" className="text-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {t("tokenGenerated")}
                        </Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleGenerateDeliveryNoteVerificationToken}
                          disabled={generatingToken}
                        >
                          {generatingToken ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <QrCode className="h-4 w-4 mr-2" />
                          )}
                          {t("generateToken")}
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {hasDeliveryNoteVerificationToken
                        ? t("qrCodeWillBeIncludedInDeliveryNote") || "QR code will be included in the delivery note"
                        : t("generateVerificationTokenToInclude") || "Generate a verification token to include in the delivery note"}
                    </p>
                    {hasDeliveryNoteVerificationToken && (
                      <div className="mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDeliveryNoteTokenDialog(true)}
                          className="text-xs h-7"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Show Verification Token
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Delivery Note not created - show creation form */
                <div className="space-y-4">
                  {/* Date Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("deliveryNoteDate") || "Delivery Note Date"}</label>
                    <Input
                      type="date"
                      value={deliveryNoteDate}
                      onChange={(e) => {
                        setDeliveryNoteDate(e.target.value);
                        // Reset reserved delivery note when date changes
                        setReservedDeliveryNote(null);
                        setCustomDeliveryNoteNumber(null);
                      }}
                    />
                  </div>

                  {/* Number Selection - Next, Reuse, or Custom */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium">{t("deliveryNoteNumber") || "Delivery Note Number"}</label>
                      <div className="flex items-center gap-4">
                        <Button
                          variant={deliveryNoteNumberOption === 'next' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleDeliveryNoteNumberOptionChange('next')}
                        >
                          {t("nextNumber")}
                        </Button>
                        <Button
                          variant={deliveryNoteNumberOption === 'reuse' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleDeliveryNoteNumberOptionChange('reuse')}
                        >
                          {t("reuseNumber")}
                        </Button>
                        <Button
                          variant={deliveryNoteNumberOption === 'custom' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleDeliveryNoteNumberOptionChange('custom')}
                        >
                          Custom Number
                        </Button>
                      </div>
                    </div>

                    {/* Reserve Delivery Note Number Section */}
                    <div className="space-y-3">
                      {deliveryNoteNumberOption === 'next' && (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleReserveDeliveryNoteNumber}
                            disabled={reservingDeliveryNote || !deliveryNoteDate}
                          >
                            {reservingDeliveryNote ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t("reserving")}
                              </>
                            ) : (
                              t("reserveDeliveryNoteNumber") || "Reserve Delivery Note Number"
                            )}
                          </Button>
                        </div>
                      )}

                      {deliveryNoteNumberOption === 'reuse' && (
                      <div className="space-y-3">
                        {fetchingReusableDeliveryNotes ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        ) : (
                          <>
                            {reusableDeliveryNoteNumbers.length > 0 ? (
                              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                {reusableDeliveryNoteNumbers.map((num) => (
                                  <div
                                    key={`${num.year}-${num.seq}`}
                                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                                      selectedReusableDeliveryNote === num.seq ? 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700' : ''
                                    }`}
                                    onClick={() => handleReserveReusableDeliveryNoteNumber(num.seq, num.year)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">BL-{String(num.seq).padStart(3, '0')}/{num.year}</span>
                                      {num.deletedAt && (
                                        <span className="text-xs text-muted-foreground">
                                          {new Date(num.deletedAt).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground text-center py-4 border rounded-md">
                                {t("noReusableNumbersAvailableForThisYear")}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {deliveryNoteNumberOption === 'custom' && (
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <Input
                            type="number"
                            min="1"
                            placeholder="Enter number (e.g., 15)"
                            value={customDeliveryNoteNumber || ''}
                            onChange={(e) => setCustomDeliveryNoteNumber(parseInt(e.target.value) || null)}
                            disabled={validatingCustomDeliveryNote}
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={() => customDeliveryNoteNumber && handleValidateCustomDeliveryNoteNumber(customDeliveryNoteNumber)}
                          disabled={!customDeliveryNoteNumber || validatingCustomDeliveryNote}
                        >
                          {validatingCustomDeliveryNote ? 'Reserving...' : 'Reserve'}
                        </Button>
                      </div>
                    )}

                    {/* Reserved Number Display */}
                    {reservedDeliveryNote && (
                      <div className="bg-muted p-3 rounded-md space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {t("reservedNumber") || "Reserved Number"}:
                          </span>
                          <span className="font-semibold">{reservedDeliveryNote.fullNumber}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {t("expiresAt") || "Expires At"}:
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(reservedDeliveryNote.expiresAt).toLocaleTimeString()}
                          </span>
                        </div>
                        {new Date() > new Date(reservedDeliveryNote.expiresAt) && (
                          <p className="text-sm text-destructive">
                            {t("reservationExpired") || "Reservation Has Expired"}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Next Available Number Preview */}
                    {!reservedDeliveryNote && deliveryNoteNumberOption === 'next' && (
                      <p className="text-sm text-muted-foreground">
                        {t("clickReserveToSeeNextNumber")}
                      </p>
                    )}
                    </div>
                  </div>

                  {/* Create/Issue Delivery Note Button */}
                  <div className="flex justify-end gap-2 pt-2">
                    {canSplitDocument('delivery-note') && (
                      <Button
                        variant="outline"
                        onClick={() => setDeliveryNoteSplitOpen(true)}
                      >
                        <Scissors className="h-4 w-4 mr-2" />
                        Split Instead
                      </Button>
                    )}
                    <Button
                      onClick={handleCreateDeliveryNote}
                      disabled={!reservedDeliveryNote || creatingDeliveryNote || new Date() > new Date(reservedDeliveryNote?.expiresAt || "")}
                    >
                      {creatingDeliveryNote ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("creating") || "Creating..."}
                        </>
                      ) : (
                        t("createDeliveryNote") || "Create Delivery Note"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
      )}

      {/* Delivery Note Splits Section - Show instead of main DN section when splits exist */}
      {deliveryNoteSplits.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <h3 className="text-lg font-semibold">{t("deliveryNote") || "Delivery Note"}</h3>
            <Badge variant="secondary" className="ml-2">
              {deliveryNoteSplits.length} {deliveryNoteSplits.length === 1 ? 'split' : 'splits'}
            </Badge>
          </div>
          {deliveryNoteSplits
            .sort((a, b) => a.splitIndex - b.splitIndex)
            .map((split) => {
              const splitItemIds = JSON.parse(split.itemIds);
              const splitItems = order?.items.filter(item => splitItemIds.includes(item.id)) || [];
              const splitTotal = calculateSplitTotal(split);
              const reservation = splitReservations[split.id];
              const numberOption = splitNumberOptions[split.id] || 'next';
              const reusableNumbers = splitReusableNumbers[split.id] || [];
              const fetchingReusable = splitFetchingReusable[split.id] || false;
              const selectedReusable = splitSelectedReusable[split.id] || null;
              const customNumber = splitCustomNumbers[split.id] || null;
              const validatingCustom = splitValidatingCustom[split.id] || false;
              const reserving = splitReserving[split.id] || false;
              const issuing = splitIssuing[split.id] || false;
              const date = splitDates[split.id] || new Date().toISOString().split("T")[0];

              return (
                <Collapsible
                  key={split.id}
                  open={openSplitIds[split.id] || false}
                  onOpenChange={(open) => setOpenSplitIds(prev => ({ ...prev, [split.id]: open }))}
                >
                  <Card className="border-green-200 dark:border-green-900">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base flex items-center gap-2">
                                {split.number || `Delivery Note Split ${split.splitIndex + 1}`}
                                {split.number && (
                                  <Badge variant="secondary">
                                    #{split.splitIndex + 1}
                                  </Badge>
                                )}
                              </CardTitle>
                              <ChevronDown className={`h-4 w-4 transition-transform ${openSplitIds[split.id] ? 'rotate-180' : ''}`} />
                            </div>
                            <CardDescription className="mt-1">
                              {splitItems.length} {splitItems.length === 1 ? 'item' : 'items'} • {splitTotal.toFixed(2)} {order?.currency}
                            </CardDescription>
                          </div>
                          <Badge className={
                            split.status === "CANCELLED"
                              ? "bg-red-600 hover:bg-red-700 text-white"
                              : split.status === "ISSUED"
                              ? "bg-green-600 hover:bg-green-700 text-white"
                              : split.status === "RESERVED"
                              ? "bg-blue-600 hover:bg-blue-700 text-white"
                              : "bg-yellow-600 hover:bg-yellow-700 text-white"
                          }>
                            {split.status || "DRAFT"}
                          </Badge>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="space-y-4 pt-4">
                    {/* Items preview */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Items in this split:</p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {splitItems.map(item => (
                          <div key={item.id} className="flex justify-between text-sm p-2 bg-muted rounded">
                            <span>{item.description}</span>
                            <span className="font-medium">{item.totalPrice.toFixed(2)} {order?.currency}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between font-semibold mt-2 pt-2 border-t">
                        <span>Total:</span>
                        <span>{splitTotal.toFixed(2)} {order?.currency}</span>
                      </div>
                    </div>

                    {split.status === 'DRAFT' ? (
                      /* Draft state - show number reservation and issue controls */
                      <div className="space-y-4">
                        {/* Date selection */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Date</label>
                          <Input
                            type="date"
                            value={date}
                            onChange={(e) => setSplitDates(prev => ({ ...prev, [split.id]: e.target.value }))}
                          />
                        </div>

                        {/* Number selection */}
                        <div className="space-y-3">
                          <label className="text-sm font-medium">Delivery Note Number</label>
                          <div className="grid grid-cols-3 gap-3">
                            <div
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                numberOption === 'next'
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => handleSplitNumberOptionChange(split.id, 'next', 'delivery-note')}
                            >
                              <div className="font-medium text-sm mb-1">Next Number</div>
                              <div className="text-xs text-muted-foreground">
                                Reserve the next available number
                              </div>
                            </div>

                            <div
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                numberOption === 'reuse'
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => handleSplitNumberOptionChange(split.id, 'reuse', 'delivery-note')}
                            >
                              <div className="font-medium text-sm mb-1 flex items-center gap-1">
                                <RefreshCcw className="h-3 w-3" />
                                Reuse a Number
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Select from reusable numbers
                              </div>
                            </div>

                            <div
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                numberOption === 'custom'
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => handleSplitNumberOptionChange(split.id, 'custom', 'delivery-note')}
                            >
                              <div className="font-medium text-sm mb-1">Custom Number</div>
                              <div className="text-xs text-muted-foreground">
                                Enter a specific number
                              </div>
                            </div>
                          </div>

                          {/* Reserve/Select number */}
                          {numberOption === 'next' && (
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleReserveSplitNumber(split.id, 'delivery-note')}
                                disabled={reserving || !date}
                              >
                                {reserving ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Reserving...
                                  </>
                                ) : (
                                  "Reserve Delivery Note Number"
                                )}
                              </Button>
                            </div>
                          )}

                          {numberOption === 'reuse' && (
                            <div className="space-y-2">
                              {fetchingReusable ? (
                                <div className="flex items-center justify-center py-4">
                                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                  <span className="text-sm text-muted-foreground">Loading...</span>
                                </div>
                              ) : reusableNumbers.length > 0 ? (
                                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                                  {reusableNumbers.map((num) => (
                                    <div
                                      key={num.seq}
                                      className={`p-3 border rounded cursor-pointer transition-colors ${
                                        selectedReusable === num.seq
                                          ? 'border-primary bg-primary/10'
                                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                      }`}
                                      onClick={() => handleReserveSplitReusableNumber(split.id, 'delivery-note', num.seq, num.year)}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium">DN-{String(num.seq).padStart(3, '0')}/{num.year}</span>
                                        {num.deletedAt && (
                                          <span className="text-xs text-muted-foreground">
                                            {new Date(num.deletedAt).toLocaleDateString()}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground text-center py-4 border rounded-md">
                                  No reusable numbers available for this year
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
                                  onChange={(e) => setSplitCustomNumbers(prev => ({ ...prev, [split.id]: parseInt(e.target.value) || null }))}
                                  disabled={validatingCustom}
                                />
                              </div>
                              <Button
                                type="button"
                                onClick={() => customNumber && handleValidateSplitCustomNumber(split.id, 'delivery-note', customNumber)}
                                disabled={!customNumber || validatingCustom}
                              >
                                {validatingCustom ? 'Reserving...' : 'Reserve'}
                              </Button>
                            </div>
                          )}

                          {/* Reserved number display */}
                          {reservation && (
                            <div className="bg-muted p-3 rounded-md space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Reserved Number:</span>
                                <span className="font-semibold">{reservation.fullNumber}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Expires At:</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(reservation.expiresAt).toLocaleTimeString()}
                                </span>
                              </div>
                              {new Date() > new Date(reservation.expiresAt) && (
                                <p className="text-sm text-destructive">
                                  Reservation has expired
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Issue button */}
                        <Button
                          onClick={() => handleIssueSplit(split)}
                          disabled={!reservation || issuing || new Date() > new Date(reservation?.expiresAt || "")}
                          className="w-full"
                        >
                          {issuing ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Issuing...
                            </>
                          ) : (
                            "Issue Delivery Note"
                          )}
                        </Button>
                      </div>
                    ) : (
                      /* Issued/Reserved state - show info and actions */
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Delivery Note Number</label>
                            <p className="font-semibold text-lg">{split.number || '-'}</p>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Date</label>
                            <p className="font-semibold">
                              {split.date ? new Date(split.date).toLocaleDateString() : '-'}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateSplitPreview(split)}
                            disabled={loadingPreview || !split.number}
                          >
                            {loadingPreview ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Eye className="h-4 w-4 mr-2" />
                            )}
                            Preview
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateSplitPreview(split)}
                            disabled={!split.number}
                          >
                            <Printer className="h-4 w-4 mr-2" />
                            Print
                          </Button>
                          {split.status === 'ISSUED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGenerateSplitVerificationToken(split)}
                              disabled={generatingToken || !!split.verificationToken}
                            >
                              {generatingToken ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <QrCode className="h-4 w-4 mr-2" />
                              )}
                              {split.verificationToken ? 'Token Generated' : 'Generate Token'}
                            </Button>
                          )}
                        </div>

                        {/* Verification token info */}
                        {split.verificationToken && (
                          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium">Verification Token Generated</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setCurrentTokenType('delivery-note');
                                setCurrentTokenValue(split.verificationToken);
                                setShowTokenDialog(true);
                              }}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View Token
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
                </Card>
              </Collapsible>
              );
            })}
        </div>
      )}

      {/* Notes */}
      {order.notes && (
        <Card>
          <CardHeader>
            <CardTitle>{t("notes")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{order.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Invoice Preview Dialog - For main order only (not splits) */}
      {previewDocumentType === null && (
        <InvoicePreviewDialog
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          previewData={previewData}
          config={previewConfig}
          onConfigChange={handleSavePdfConfig}
          showSettingsSidebar={true}
        />
      )}

      {/* Split Preview Dialogs - Show the correct dialog based on document type */}
      {previewDocumentType === 'invoice' && (
        <InvoicePreviewDialog
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          previewData={previewData}
          config={previewConfig}
          onConfigChange={handleSavePdfConfig}
          showSettingsSidebar={true}
        />
      )}
      {previewDocumentType === 'proforma' && (
        <ProformaPreviewDialog
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          previewData={previewData}
          config={previewConfig}
          onConfigChange={handleSavePdfConfig}
          showSettingsSidebar={true}
        />
      )}
      {previewDocumentType === 'purchase-order' && (
        <PurchaseOrderPreviewDialog
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          previewData={previewData}
          config={previewConfig}
          onConfigChange={handleSavePdfConfig}
          showSettingsSidebar={true}
        />
      )}
      {previewDocumentType === 'delivery-note' && (
        <DeliveryNotePreviewDialog
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          previewData={previewData}
          config={previewConfig}
          onConfigChange={handleSavePdfConfig}
          showSettingsSidebar={true}
        />
      )}

      {/* Proforma Preview Dialog - For main order only (not splits) */}
      {previewDocumentType === null && (
        <ProformaPreviewDialog
          open={isProformaPreviewOpen}
          onOpenChange={setIsProformaPreviewOpen}
          previewData={proformaPreviewData}
          config={previewConfig}
          onConfigChange={handleSavePdfConfig}
          showSettingsSidebar={true}
        />
      )}

      {/* Purchase Order Preview Dialog - For main order only (not splits) */}
      {previewDocumentType === null && (
        <PurchaseOrderPreviewDialog
          open={isPurchaseOrderPreviewOpen}
          onOpenChange={setIsPurchaseOrderPreviewOpen}
          previewData={purchaseOrderPreviewData}
          config={previewConfig}
          onConfigChange={handleSavePdfConfig}
          showSettingsSidebar={true}
        />
      )}

      {/* Delivery Note Preview Dialog - For main order only (not splits) */}
      {previewDocumentType === null && (
        <DeliveryNotePreviewDialog
          open={isDeliveryNotePreviewOpen}
          onOpenChange={setIsDeliveryNotePreviewOpen}
          previewData={deliveryNotePreviewData}
          config={previewConfig}
          onConfigChange={handleSavePdfConfig}
          showSettingsSidebar={true}
        />
      )}

      {/* Verification Token Dialogs */}
      <TokenDialog
        open={showTokenDialog}
        onOpenChange={(open) => {
          setShowTokenDialog(open);
          if (!open) setCurrentTokenValue(null); // Reset when closed
        }}
        token={currentTokenValue ?? (currentTokenType === 'invoice' ? order?.invoiceVerificationToken : null)}
        documentType={currentTokenType === 'invoice' ? 'Invoice' : currentTokenType === 'proforma' ? 'Proforma Invoice' : currentTokenType === 'purchase-order' ? 'Purchase Order' : 'Delivery Note'}
        documentNumber={currentTokenType === 'invoice' ? invoice?.fullNumber : currentTokenType === 'proforma' ? proforma?.fullNumber : currentTokenType === 'purchase-order' ? purchaseOrder?.fullNumber : deliveryNote?.fullNumber}
      />

      <TokenDialog
        open={showProformaTokenDialog}
        onOpenChange={setShowProformaTokenDialog}
        token={order?.proformaVerificationToken}
        documentType="Proforma Invoice"
        documentNumber={proforma?.fullNumber}
      />

      <TokenDialog
        open={showPurchaseOrderTokenDialog}
        onOpenChange={setShowPurchaseOrderTokenDialog}
        token={order?.purchaseOrderVerificationToken}
        documentType="Purchase Order"
        documentNumber={purchaseOrder?.fullNumber}
      />

      <TokenDialog
        open={showDeliveryNoteTokenDialog}
        onOpenChange={setShowDeliveryNoteTokenDialog}
        token={order?.deliveryNoteVerificationToken}
        documentType="Delivery Note"
        documentNumber={deliveryNote?.fullNumber}
      />

      {/* Edit Order Dialog */}
      {order && (
        <EditOrderDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          order={order}
          onUpdate={handleOrderUpdated}
        />
      )}

      {/* Split Document Dialogs */}
      {order && (
        <>
          <SplitDocumentDialog
            open={invoiceSplitOpen}
            onOpenChange={setInvoiceSplitOpen}
            documentType="invoice"
            documentNumber={invoice?.fullNumber}
            documentYear={invoice?.year}
            items={order.items}
            currency={order.currency}
            baseTaxRate={order.taxRate}
            orderId={order.id}
            customerName={order.customerName}
            totalAmount={order.total}
            onSplitComplete={handleSplitComplete}
          />
          <SplitDocumentDialog
            open={proformaSplitOpen}
            onOpenChange={setProformaSplitOpen}
            documentType="proforma"
            documentNumber={proforma?.fullNumber}
            documentYear={proforma?.year}
            items={order.items}
            currency={order.currency}
            baseTaxRate={order.taxRate}
            orderId={order.id}
            customerName={order.customerName}
            totalAmount={order.total}
            onSplitComplete={handleSplitComplete}
          />
          <SplitDocumentDialog
            open={purchaseOrderSplitOpen}
            onOpenChange={setPurchaseOrderSplitOpen}
            documentType="purchase-order"
            documentNumber={purchaseOrder?.fullNumber}
            documentYear={purchaseOrder?.year}
            items={order.items}
            currency={order.currency}
            baseTaxRate={order.taxRate}
            orderId={order.id}
            customerName={order.customerName}
            totalAmount={order.total}
            onSplitComplete={handleSplitComplete}
          />
          <SplitDocumentDialog
            open={deliveryNoteSplitOpen}
            onOpenChange={setDeliveryNoteSplitOpen}
            documentType="delivery-note"
            documentNumber={deliveryNote?.fullNumber}
            documentYear={deliveryNote?.year}
            items={order.items}
            currency={order.currency}
            baseTaxRate={order.taxRate}
            orderId={order.id}
            customerName={order.customerName}
            totalAmount={order.total}
            onSplitComplete={handleSplitComplete}
          />
        </>
      )}
    </div>
  );
}

// Token Dialog Component
interface TokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token?: string | null;
  documentType: string;
  documentNumber?: string | null;
}

function TokenDialog({ open, onOpenChange, token, documentType, documentNumber }: TokenDialogProps) {
  const { toast } = useToast();

  const handleCopyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      toast({
        title: "Copied to clipboard",
        description: "Verification token has been copied to clipboard",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {documentType} Verification Token
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Document Number
            </label>
            <p className="text-sm font-semibold mt-1">{documentNumber || "N/A"}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Verification Token
            </label>
            <div className="mt-1 flex gap-2">
              <Input
                value={token || ""}
                readOnly
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyToken}
                disabled={!token}
                title="Copy token"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            This token is embedded in the QR code for document verification. You can share it with customers or use it for verification purposes.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
