/**
 * DocumentSection Component
 * Reusable component to display a document section (invoice, proforma, purchase-order, delivery-note)
 * with all features including preview, print, QR code, verification token, and split functionality
 */

"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  Eye, 
  Printer, 
  QrCode, 
  Scissors, 
  ChevronDown 
} from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";

interface OrderItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

interface DocumentSectionProps {
  order: {
    id: string;
    fullNumber: string;
    customerName: string;
    date?: string;
    currency: string;
    total: number;
    items: OrderItem[];
    invoiceFullNumber?: string | null;
    invoiceDate?: string | null;
    invoiceStatus?: string | null;
    invoiceVerificationToken?: string | null;
    proformaFullNumber?: string | null;
    proformaDate?: string | null;
    proformaStatus?: string | null;
    proformaVerificationToken?: string | null;
    purchaseOrderFullNumber?: string | null;
    purchaseOrderDate?: string | null;
    purchaseOrderStatus?: string | null;
    purchaseOrderVerificationToken?: string | null;
    deliveryNoteFullNumber?: string | null;
    deliveryNoteDate?: string | null;
    deliveryNoteStatus?: string | null;
    deliveryNoteVerificationToken?: string | null;
    isSplit?: boolean;
    splitIndex?: number;
  };
  documentType: 'invoice' | 'proforma' | 'purchase-order' | 'delivery-note';
  documentNumber?: string | null;
  documentDate?: string | null;
  documentStatus?: string | null;
  verificationToken?: string | null;
  onGeneratePreview?: () => Promise<void>;
  onGenerateToken?: () => Promise<void>;
  onSplit?: () => void;
  isSplitDocument?: boolean;
}

export default function DocumentSection({
  order,
  documentType,
  documentNumber,
  documentDate,
  documentStatus,
  verificationToken,
  onGeneratePreview,
  onGenerateToken,
  onSplit,
  isSplitDocument = false,
}: DocumentSectionProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);

  const documentLabels: Record<string, string> = {
    invoice: 'Invoice',
    proforma: 'Proforma Invoice',
    'purchase-order': 'Purchase Order',
    'delivery-note': 'Delivery Note',
  };

  const getDocumentLabel = () => documentLabels[documentType] || 'Document';

  const handleGeneratePreview = async () => {
    if (!onGeneratePreview) return;
    setLoadingPreview(true);
    try {
      await onGeneratePreview();
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

  const handleGenerateToken = async () => {
    if (!onGenerateToken) return;
    setGeneratingToken(true);
    try {
      await onGenerateToken();
    } catch (error) {
      console.error("Error generating token:", error);
      toast({
        title: t("error"),
        description: "Failed to generate verification token",
        variant: "destructive",
      });
    } finally {
      setGeneratingToken(false);
    }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={isSplitDocument ? "ml-4 md:ml-8 border-l-2 border-primary pl-4" : ""}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {isSplitDocument && (
                    <Badge variant="outline" className="text-xs">
                      Split {order.splitIndex}
                    </Badge>
                  )}
                  {documentStatus === 'ISSUED' ? (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">{t("documentIssued") || `${getDocumentLabel()} Has Been Issued`}</span>
                    </div>
                  ) : documentStatus === 'DRAFT' ? (
                    <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                      <Clock className="h-5 w-5" />
                      <span className="font-medium">{t("documentDraft") || `${getDocumentLabel()} is Draft`}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{getDocumentLabel()}</span>
                    </div>
                  )}
                </div>
                <CardDescription className="text-sm">
                  {documentNumber || `No ${getDocumentLabel()} Generated`}
                </CardDescription>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-4">
            {/* Document Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Document Number</p>
                <p className="font-medium">{documentNumber || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">
                  {documentDate ? new Date(documentDate).toLocaleDateString() : "-"}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {verificationToken ? (
                  <Badge variant="secondary" className="text-green-600">
                    <QrCode className="h-3 w-3 mr-1" />
                    QR Code Generated
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    <QrCode className="h-3 w-3 mr-1" />
                    No QR Code
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!isSplitDocument && onSplit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onSplit}
                  >
                    <Scissors className="h-4 w-4 mr-2" />
                    Split
                  </Button>
                )}
                {documentNumber && onGeneratePreview && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGeneratePreview}
                    disabled={loadingPreview}
                  >
                    {loadingPreview ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      <Eye className="h-4 w-4 mr-2" />
                    )}
                    Preview
                  </Button>
                )}
                {documentNumber && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGeneratePreview}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                )}
                {documentNumber && !verificationToken && onGenerateToken && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateToken}
                    disabled={generatingToken}
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    Generate QR
                  </Button>
                )}
              </div>
            </div>

            {/* Items Summary */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">Items ({order.items.length})</p>
              <div className="text-sm text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                {order.items.slice(0, 3).map((item, index) => (
                  <p key={index}>
                    {item.quantity}x {item.description} - {order.currency} {item.totalPrice.toFixed(2)}
                  </p>
                ))}
                {order.items.length > 3 && (
                  <p className="italic">... and {order.items.length - 3} more items</p>
                )}
              </div>
            </div>

            {/* Total */}
            <div className="border-t pt-4 bg-muted p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total</span>
                <span className="text-xl font-bold text-primary">
                  {order.total.toFixed(2)} {order.currency}
                </span>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
