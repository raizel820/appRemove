"use client";

import { useState, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Printer, RefreshCw, ChevronDown, Minus, Plus, Loader2, Languages } from "lucide-react";
import { toast } from "sonner";
import { printHTMLWithIframe, printIframeContent } from "@/lib/printUtils";
import {
  generatePreviewHTML,
  arrayBufferToBase64,
  getQrCodeDataUrls,
  type Company as UtilCompany,
  type Customer as UtilCustomer,
  type MachineModel as UtilMachineModel,
  type PDFConfiguration as UtilPDFConfiguration,
} from "@/lib/technicalFilePreviewUtils";
import type { ExchangeRate } from "@/lib/currencyUtils";
import { defaultQRCodeConfig } from "@/lib/qrCodeUtils";

// Types for the preview data
export interface TechnicalFilePreviewData {
  config: UtilPDFConfiguration;
  company: UtilCompany;
  customer: UtilCustomer;
  machineModels: UtilMachineModel[];
  selectedLanguage: string;
  selectedCurrency: string;
  exchangeRates: ExchangeRate[];
  logoBase64?: string;
  qrCodeImageUrl?: string;
  activityProfile?: {
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
  };
  // Snapshot data from order
  snapshotCompany?: string;
  snapshotCustomer?: string;
  snapshotPdfConfig?: string;
  snapshotModels?: string[]; // Array of model snapshots per item
  // Verification token
  verificationToken?: string;
}

// Translation labels type
interface TranslationLabels {
  telephone: string;
  fax: string;
  address: string;
  email: string;
  rcn: string;
  nif: string;
  nis: string;
  rib: string;
  bankName: string;
  capitalSocial: string;
}

// Technical File translations type
interface TechnicalFileTranslations {
  client: string;
  noClient: string;
  address: string;
  phone: string;
  email: string;
  datePrefix: string;
  tableHeaders: {
    number: string;
    family: string;
    model: string;
    brand: string;
    quantity: string;
    priceUnit: string;
    priceTotal: string;
  };
  totals: {
    totalHT: string;
    tva: string;
    totalTTC: string;
  };
  terms: {
    title: string;
    deliveryAfterOrder: string;
    validityTitle: string;
    warrantyTitle: string;
    afterOrderConfirmation: string;
    afterPayment: string;
    paymentMethod: {
      online: string;
      website: string;
      check: string;
      cash: string;
      splitPayment: string;
    };
    splitPaymentText: string;
    priceInWords: string;
  };
  signature: { manager: string; client: string };
}

// Props for the dialog component
interface TechnicalFilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewData: TechnicalFilePreviewData | null;
  config?: UtilPDFConfiguration | null;
  onConfigChange?: (config: UtilPDFConfiguration) => void;
  showSettingsSidebar?: boolean;
}

// Default translation labels
const defaultLabelsFr: TranslationLabels = {
  telephone: "Téléphone",
  fax: "Fax",
  address: "Adresse",
  email: "Email",
  rcn: "RCN",
  nif: "NIF",
  nis: "NIS",
  rib: "RIB",
  bankName: "Banque",
  capitalSocial: "Capital Social",
};

const defaultLabelsAr: TranslationLabels = {
  telephone: "الهاتف",
  fax: "فاكس",
  address: "العنوان",
  email: "البريد الإلكتروني",
  rcn: "رقم السجل التجاري",
  nif: "الرقم الجبائي",
  nis: "الرقم الإحصائي",
  rib: "رقم الحساب البنكي",
  bankName: "الوكالة البنكية",
  capitalSocial: "رأس المال",
};

// Default technical file translations
const defaultTechnicalFileTranslations: Record<string, TechnicalFileTranslations> = {
  FR: {
    client: "Client",
    noClient: "Aucun client disponible",
    address: "Adresse",
    phone: "Tél",
    email: "Email",
    datePrefix: "M'sila le",
    tableHeaders: {
      number: "N°",
      family: "Item family",
      model: "Model",
      brand: "Brand",
      quantity: "Quantity",
      priceUnit: "Price per unit",
      priceTotal: "Price excluding tax"
    },
    totals: {
      totalHT: "Total HT",
      tva: "TVA 19%",
      totalTTC: "Total TTC"
    },
    terms: {
      title: "Conditions générales",
      deliveryAfterOrder: "Délai de livraison",
      validityTitle: "Validité de la fiche technique",
      warrantyTitle: "Garantie",
      afterOrderConfirmation: "Livraison après confirmation de commande",
      afterPayment: "Livraison après paiement",
      paymentMethod: {
        online: "Paiement en ligne",
        website: "Paiement sur le site web",
        check: "Paiement par chèque",
        cash: "Paiement en espèces",
        splitPayment: "Paiement fractionné"
      },
      splitPaymentText: "Payer {percent}% lors de la commande et le reste à la livraison",
      priceInWords: "Montant total en lettres"
    },
    signature: { manager: "Gérant", client: "Client" }
  },
  EN: {
    client: "Client",
    noClient: "No client available",
    address: "Address",
    phone: "Tel",
    email: "Email",
    datePrefix: "M'sila,",
    tableHeaders: {
      number: "N°",
      family: "Item family",
      model: "Model",
      brand: "Brand",
      quantity: "Quantity",
      priceUnit: "Price per unit",
      priceTotal: "Price excluding tax"
    },
    totals: {
      totalHT: "Total Excl. Tax",
      tva: "VAT 19%",
      totalTTC: "Total Incl. Tax"
    },
    terms: {
      title: "Terms and conditions",
      deliveryAfterOrder: "Delivery time",
      validityTitle: "Technical file validity",
      warrantyTitle: "Warranty",
      afterOrderConfirmation: "Delivery after order confirmation",
      afterPayment: "Delivery after payment",
      paymentMethod: {
        online: "Online payment",
        website: "Website payment",
        check: "Payment by check",
        cash: "Cash payment",
        splitPayment: "Split payment"
      },
      splitPaymentText: "Pay {percent}% when ordering and the rest upon delivery",
      priceInWords: "Total amount in words"
    },
    signature: { manager: "Manager", client: "Client" }
  },
  AR: {
    client: "العميل",
    noClient: "لا يوجد عميل متاح",
    address: "العنوان",
    phone: "الهاتف",
    email: "البريد الإلكتروني",
    datePrefix: "مسيلة،",
    tableHeaders: {
      number: "رقم",
      family: "عائلة الصنف",
      model: "الموديل",
      brand: "العلامة التجارية",
      quantity: "الكمية",
      priceUnit: "سعر الوحدة",
      priceTotal: "السعر بدون الضريبة"
    },
    totals: {
      totalHT: "المجموع بدون الضريبة",
      tva: "الضريبة 19%",
      totalTTC: "المجموع شامل الضريبة"
    },
    terms: {
      title: "الشروط والأحكام",
      deliveryAfterOrder: "وقت التسليم",
      validityTitle: "صلاحية الملف الفني",
      warrantyTitle: "الضمان",
      afterOrderConfirmation: "التسليم بعد تأكيد الطلب",
      afterPayment: "التسليم بعد الدفع",
      paymentMethod: {
        online: "الدفع الإلكتروني",
        website: "الدفع عبر الموقع",
        check: "الدفع بشيك",
        cash: "الدفع نقداً",
        splitPayment: "الدفع المقسم"
      },
      splitPaymentText: "ادفع {percent}% عند الطلب والباقي عند التسليم",
      priceInWords: "المبلغ الإجمالي بالأحرف"
    },
    signature: { manager: "المدير", client: "العميل" }
  }
};

export default function TechnicalFilePreviewDialog({
  open,
  onOpenChange,
  previewData,
  config,
  onConfigChange,
  showSettingsSidebar = false,
}: TechnicalFilePreviewDialogProps) {
  const { theme } = useTheme();
  const previewRef = useRef<HTMLIFrameElement>(null);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);

  // Preview controls state
  const [previewZoom, setPreviewZoom] = useState(100);
  const [previewWidth, setPreviewWidth] = useState(252);
  const [previewDialogBackgroundColor, setPreviewDialogBackgroundColor] = useState("transparent");

  // Language selector state
  const [selectedLanguage, setSelectedLanguage] = useState<string>("FR");

  // Calculated table height for live display
  const [calculatedTableHeight, setCalculatedTableHeight] = useState<number | null>(null);
  
  // Save loading state
  const [isSaving, setIsSaving] = useState(false);

  // Handle save to database
  const handleSave = async () => {
    if (!config) return;

    try {
      setIsSaving(true);

      const response = await fetch("/api/pdf-configuration", {
        method: config.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        const savedConfig = await response.json();
        // Update local config and notify parent
        if (onConfigChange) {
          onConfigChange(savedConfig);
        }
        toast.success("Configuration saved successfully");
      } else {
        toast.error("Failed to save configuration");
      }
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast.error("Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
  };

  // Reset iframe loaded state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setIsIframeLoaded(false);
    }
  }, [open]);

  // Initialize language from previewData when dialog opens
  useEffect(() => {
    if (previewData?.selectedLanguage) {
      setSelectedLanguage(previewData.selectedLanguage);
    }
  }, [previewData?.selectedLanguage, open]);

  // Calculate table height when config or machine models change
  useEffect(() => {
    const currentConfig = config || previewData?.config;
    const models = previewData?.machineModels || [];

    if (!currentConfig || !models.length) {
      setCalculatedTableHeight(null);
      return;
    }

    // Calculate total table height (real items + empty rows)
    const calculateTableHeight = async () => {
      try {
        // Import the utility function dynamically
        const { calculateTableTotalHeight } = await import('@/lib/technicalFilePreviewUtils');
        const height = calculateTableTotalHeight(currentConfig, models);
        setCalculatedTableHeight(height);
      } catch (error) {
        console.error('Error calculating table height:', error);
        setCalculatedTableHeight(null);
      }
    };

    calculateTableHeight();
  }, [config, previewData?.config, previewData?.machineModels]);

  // Generate preview HTML
  const getPreviewHTML = (): string => {
    if (!previewData) return "";

    // Use local selectedLanguage state instead of previewData.selectedLanguage
    const langKey = selectedLanguage.toUpperCase();

    return generatePreviewHTML({
      config: (config || previewData.config) as UtilPDFConfiguration,
      company: previewData.company,
      customers: [previewData.customer],
      machineModels: previewData.machineModels,
      selectedLanguage: langKey,
      selectedCurrency: previewData.selectedCurrency,
      exchangeRates: previewData.exchangeRates,
      logoBase64: previewData.logoBase64 || "",
      qrCodeImageUrl: previewData.qrCodeImageUrl || "",
      technicalFileTranslations: defaultTechnicalFileTranslations,
      labelsFr: defaultLabelsFr,
      labelsAr: defaultLabelsAr,
      activityProfile: previewData.activityProfile,
    });
  };

  // Handle print
  const handlePrint = async () => {
    try {
      const html = getPreviewHTML();
      await printHTMLWithIframe(html.replace('margin: 0 auto 20px auto;', 'margin: 0 auto 0 auto;'));
    } catch (error) {
      console.error("Error printing:", error);
    }
  };

  // Handle print from preview iframe
  const handlePrintPreview = () => {
    const iframe = previewRef.current;
    const success = printIframeContent(iframe, isIframeLoaded);
    if (!success) {
      console.error("Failed to print preview");
    }
  };

  // Preview control handlers
  const handleZoomIn = () => setPreviewZoom((prev) => Math.min(prev + 10, 200));
  const handleZoomOut = () => setPreviewZoom((prev) => Math.max(prev - 10, 50));
  const handleIncreaseWidth = () => setPreviewWidth((prev) => Math.min(prev + 10, 350));
  const handleDecreaseWidth = () => setPreviewWidth((prev) => Math.max(prev - 10, 210));
  const handleResetPreview = () => {
    setPreviewZoom(100);
    setPreviewWidth(252);
    setPreviewDialogBackgroundColor("transparent");
  };

  // Get dynamic styles based on theme and background color
  const getSidebarStyle = () => ({
    backgroundColor: previewDialogBackgroundColor === 'transparent'
      ? (theme === 'dark' ? '#1a1a1a' : '#f5f5f5')
      : '#2a2a2a'
  });

  const getTextColor = () => ({
    color: previewDialogBackgroundColor === 'transparent'
      ? (theme === 'dark' ? 'white' : 'black')
      : 'white'
  });

  const getMutedTextColor = () => ({
    color: previewDialogBackgroundColor === 'transparent'
      ? (theme === 'dark' ? '#ccc' : '#333')
      : '#ccc'
  });

  const getBorderColor = () => ({
    borderColor: previewDialogBackgroundColor === 'transparent' ? '#ddd' : '#444'
  });

  // Update config helper
  const updateConfig = (key: string, value: any) => {
    if (config && onConfigChange) {
      onConfigChange({ ...config, [key]: value });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="overflow-hidden p-0"
        style={{
          width: '95%',
          maxWidth: '95%',
          height: '95vh',
          backgroundColor: previewDialogBackgroundColor === 'transparent'
            ? (theme === 'dark' ? 'black' : 'white')
            : previewDialogBackgroundColor,
          color: previewDialogBackgroundColor === 'transparent'
            ? (theme === 'dark' ? 'white' : 'black')
            : 'white'
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Technical File Preview</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex flex-1 overflow-hidden min-h-0">
            {/* Settings Sidebar - Only shown when showSettingsSidebar is true */}
            {showSettingsSidebar && config && (
              <div className="w-80 border-r overflow-y-auto p-4 flex-shrink-0" style={getSidebarStyle()}>
                <h3 className="text-lg font-semibold mb-4 pb-2" style={{ ...getTextColor(), ...getSidebarStyle() }}>
                  Technical File Settings
                </h3>

                {/* Column Settings */}
                <div className="text-sm space-y-2">
                  <div className="font-semibold text-xs uppercase tracking-wide mb-3" style={getTextColor()}>
                    Column Settings
                  </div>

                  {/* Column 1: N° (Number) */}
                  <Collapsible defaultOpen={true}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between h-auto py-2 px-3 mb-1"
                        style={{ ...getBorderColor(), ...getTextColor() }}
                      >
                        <span className="font-medium text-xs">Col 1: N° (Number)</span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 p-2 border rounded" style={getBorderColor()}>
                      <div>
                        <label className="text-xs block mb-1" style={getMutedTextColor()}>Width (mm)</label>
                        <Input
                          type="number"
                          min="5"
                          max="100"
                          step="0.01"
                          className="h-8 text-xs"
                          value={config.technicalFileColNumberWidth ?? 13.23}
                          onChange={(e) => updateConfig('technicalFileColNumberWidth', parseFloat(e.target.value) || 13.23)}
                        />
                      </div>
                      <div>
                        <label className="text-xs block mb-1" style={getMutedTextColor()}>Padding (mm)</label>
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          step="0.01"
                          className="h-8 text-xs"
                          value={config.technicalFileColNumberPadding ?? 5.61}
                          onChange={(e) => updateConfig('technicalFileColNumberPadding', parseFloat(e.target.value) || 5.61)}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Column 2: Item Family */}
                  <Collapsible defaultOpen={false}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between h-auto py-2 px-3 mb-1"
                        style={{ ...getBorderColor(), ...getTextColor() }}
                      >
                        <span className="font-medium text-xs">Col 2: Item family</span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 p-2 border rounded" style={getBorderColor()}>
                      <div>
                        <label className="text-xs block mb-1" style={getMutedTextColor()}>Width (mm)</label>
                        <Input
                          type="number"
                          min="10"
                          max="150"
                          step="0.01"
                          className="h-8 text-xs"
                          value={config.technicalFileColFamilyWidth ?? 39.69}
                          onChange={(e) => updateConfig('technicalFileColFamilyWidth', parseFloat(e.target.value) || 39.69)}
                        />
                      </div>
                      <div>
                        <label className="text-xs block mb-1" style={getMutedTextColor()}>Padding (mm)</label>
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          step="0.01"
                          className="h-8 text-xs"
                          value={config.technicalFileColFamilyPadding ?? 5.61}
                          onChange={(e) => updateConfig('technicalFileColFamilyPadding', parseFloat(e.target.value) || 5.61)}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Column 3: Model */}
                  <Collapsible defaultOpen={false}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between h-auto py-2 px-3 mb-1"
                        style={{ ...getBorderColor(), ...getTextColor() }}
                      >
                        <span className="font-medium text-xs">Col 3: Model</span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 p-2 border rounded" style={getBorderColor()}>
                      <div>
                        <label className="text-xs block mb-1" style={getMutedTextColor()}>Width (mm)</label>
                        <Input
                          type="number"
                          min="10"
                          max="150"
                          step="0.01"
                          className="h-8 text-xs"
                          value={config.technicalFileColModelWidth ?? 39.69}
                          onChange={(e) => updateConfig('technicalFileColModelWidth', parseFloat(e.target.value) || 39.69)}
                        />
                      </div>
                      <div>
                        <label className="text-xs block mb-1" style={getMutedTextColor()}>Padding (mm)</label>
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          step="0.01"
                          className="h-8 text-xs"
                          value={config.technicalFileColModelPadding ?? 5.61}
                          onChange={(e) => updateConfig('technicalFileColModelPadding', parseFloat(e.target.value) || 5.61)}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Column 4: Brand */}
                  <Collapsible defaultOpen={false}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between h-auto py-2 px-3 mb-1"
                        style={{ ...getBorderColor(), ...getTextColor() }}
                      >
                        <span className="font-medium text-xs">Col 4: Brand</span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 p-2 border rounded" style={getBorderColor()}>
                      <div>
                        <label className="text-xs block mb-1" style={getMutedTextColor()}>Width (mm)</label>
                        <Input
                          type="number"
                          min="10"
                          max="150"
                          step="0.01"
                          className="h-8 text-xs"
                          value={config.technicalFileColBrandWidth ?? 31.75}
                          onChange={(e) => updateConfig('technicalFileColBrandWidth', parseFloat(e.target.value) || 31.75)}
                        />
                      </div>
                      <div>
                        <label className="text-xs block mb-1" style={getMutedTextColor()}>Padding (mm)</label>
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          step="0.01"
                          className="h-8 text-xs"
                          value={config.technicalFileColBrandPadding ?? 5.61}
                          onChange={(e) => updateConfig('technicalFileColBrandPadding', parseFloat(e.target.value) || 5.61)}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Column 5: Quantity */}
                  <Collapsible defaultOpen={false}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between h-auto py-2 px-3 mb-1"
                        style={{ ...getBorderColor(), ...getTextColor() }}
                      >
                        <span className="font-medium text-xs">Col 5: Quantity</span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 p-2 border rounded" style={getBorderColor()}>
                      <div>
                        <label className="text-xs block mb-1" style={getMutedTextColor()}>Width (mm)</label>
                        <Input
                          type="number"
                          min="10"
                          max="100"
                          step="0.01"
                          className="h-8 text-xs"
                          value={config.technicalFileColQuantityWidth ?? 21.17}
                          onChange={(e) => updateConfig('technicalFileColQuantityWidth', parseFloat(e.target.value) || 21.17)}
                        />
                      </div>
                      <div>
                        <label className="text-xs block mb-1" style={getMutedTextColor()}>Padding (mm)</label>
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          step="0.01"
                          className="h-8 text-xs"
                          value={config.technicalFileColQuantityPadding ?? 5.61}
                          onChange={(e) => updateConfig('technicalFileColQuantityPadding', parseFloat(e.target.value) || 5.61)}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Column 6: Price Unit */}
                  <Collapsible defaultOpen={false}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between h-auto py-2 px-3 mb-1"
                        style={{ ...getBorderColor(), ...getTextColor() }}
                      >
                        <span className="font-medium text-xs">Col 6: Price Unit</span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 p-2 border rounded" style={getBorderColor()}>
                      <div>
                        <label className="text-xs block mb-1" style={getMutedTextColor()}>Width (mm)</label>
                        <Input
                          type="number"
                          min="10"
                          max="150"
                          step="0.01"
                          className="h-8 text-xs"
                          value={config.technicalFileColPriceUnitWidth ?? 31.75}
                          onChange={(e) => updateConfig('technicalFileColPriceUnitWidth', parseFloat(e.target.value) || 31.75)}
                        />
                      </div>
                      <div>
                        <label className="text-xs block mb-1" style={getMutedTextColor()}>Padding (mm)</label>
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          step="0.01"
                          className="h-8 text-xs"
                          value={config.technicalFileColPriceUnitPadding ?? 5.61}
                          onChange={(e) => updateConfig('technicalFileColPriceUnitPadding', parseFloat(e.target.value) || 5.61)}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Column 7: Price Total */}
                  <Collapsible defaultOpen={false}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between h-auto py-2 px-3 mb-1"
                        style={{ ...getBorderColor(), ...getTextColor() }}
                      >
                        <span className="font-medium text-xs">Col 7: Price Total</span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 p-2 border rounded" style={getBorderColor()}>
                      <div>
                        <label className="text-xs block mb-1" style={getMutedTextColor()}>Width (mm)</label>
                        <Input
                          type="number"
                          min="10"
                          max="150"
                          step="0.01"
                          className="h-8 text-xs"
                          value={config.technicalFileColPriceTotalWidth ?? 31.75}
                          onChange={(e) => updateConfig('technicalFileColPriceTotalWidth', parseFloat(e.target.value) || 31.75)}
                        />
                      </div>
                      <div>
                        <label className="text-xs block mb-1" style={getMutedTextColor()}>Padding (mm)</label>
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          step="0.01"
                          className="h-8 text-xs"
                          value={config.technicalFileColPriceTotalPadding ?? 5.61}
                          onChange={(e) => updateConfig('technicalFileColPriceTotalPadding', parseFloat(e.target.value) || 5.61)}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>

                {/* Line Spacing Settings */}
                <div className="font-semibold text-xs uppercase tracking-wide mb-3 mt-6" style={getTextColor()}>
                  Line Spacing Settings
                </div>

                {/* Items Table Line Spacing */}
                <Collapsible defaultOpen={true}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between h-auto py-2 px-3 mb-1"
                      style={{ ...getBorderColor(), ...getTextColor() }}
                    >
                      <span className="font-medium text-xs">Items Table</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 p-2 border rounded" style={getBorderColor()}>
                    <div>
                      <label className="text-xs block mb-1" style={getMutedTextColor()}>Labels Line Spacing</label>
                      <Input
                        type="number"
                        min="0"
                        max="3"
                        step="0.1"
                        className="h-8 text-xs"
                        value={config.technicalFileTableLabelLineSpacing ?? 1}
                        onChange={(e) => updateConfig('technicalFileTableLabelLineSpacing', parseFloat(e.target.value) || 1)}
                      />
                    </div>
                    <div>
                      <label className="text-xs block mb-1" style={getMutedTextColor()}>Values Line Spacing</label>
                      <Input
                        type="number"
                        min="0"
                        max="3"
                        step="0.1"
                        className="h-8 text-xs"
                        value={config.technicalFileTableValueLineSpacing ?? 1}
                        onChange={(e) => updateConfig('technicalFileTableValueLineSpacing', parseFloat(e.target.value) || 1)}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Customer Section Line Spacing */}
                <Collapsible defaultOpen={true}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between h-auto py-2 px-3 mb-1"
                      style={{ ...getBorderColor(), ...getTextColor() }}
                    >
                      <span className="font-medium text-xs">Customer Section</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 p-2 border rounded" style={getBorderColor()}>
                    <div>
                      <label className="text-xs block mb-1" style={getMutedTextColor()}>Labels Line Spacing</label>
                      <Input
                        type="number"
                        min="0"
                        max="3"
                        step="0.1"
                        className="h-8 text-xs"
                        value={config.technicalFileClientLabelLineSpacing ?? 0.5}
                        onChange={(e) => updateConfig('technicalFileClientLabelLineSpacing', parseFloat(e.target.value) || 0.5)}
                      />
                    </div>
                    <div>
                      <label className="text-xs block mb-1" style={getMutedTextColor()}>Values Line Spacing</label>
                      <Input
                        type="number"
                        min="0"
                        max="3"
                        step="0.1"
                        className="h-8 text-xs"
                        value={config.technicalFileClientValueLineSpacing ?? 0.5}
                        onChange={(e) => updateConfig('technicalFileClientValueLineSpacing', parseFloat(e.target.value) || 0.5)}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Table Height Settings */}
                <div className="font-semibold text-xs uppercase tracking-wide mb-3 mt-6" style={getTextColor()}>
                  Table Height Settings
                </div>

                {/* Live Table Height Display */}
                <div className="p-3 rounded mb-3" style={{
                  backgroundColor: previewDialogBackgroundColor === 'transparent'
                    ? (theme === 'dark' ? '#2a2a2a' : '#e0e0e0')
                    : '#3a3a3a'
                }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium" style={getMutedTextColor()}>
                      Current Table Height:
                    </span>
                    <span className="text-xs font-bold" style={getTextColor()}>
                      {calculatedTableHeight?.toFixed(2) || "N/A"}mm
                    </span>
                  </div>
                </div>

                {/* Empty Rows */}
                <div className="mb-3">
                  <label className="text-xs block mb-1" style={getMutedTextColor()}>
                    Empty Rows
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="20"
                    step="1"
                    className="h-8 text-xs"
                    value={config.technicalFileEmptyRows ?? 8}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      updateConfig('technicalFileEmptyRows', isNaN(value) ? 8 : value);
                    }}
                  />
                  <p className="text-[10px] mt-1" style={getMutedTextColor()}>
                    Number of extra empty rows at bottom
                  </p>
                </div>

                {/* Single Page Table Max Height */}
                <div className="mb-3">
                  <label className="text-xs block mb-1" style={getMutedTextColor()}>
                    Single Page Max Height (mm)
                  </label>
                  <Input
                    type="number"
                    min="30"
                    max="297"
                    step="1"
                    className="h-8 text-xs"
                    value={config.technicalFileSinglePageTableMaxHeight ?? 297}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      updateConfig('technicalFileSinglePageTableMaxHeight', isNaN(value) ? 297 : value);
                    }}
                  />
                  <p className="text-[10px] mt-1" style={getMutedTextColor()}>
                    Max height when technical file fits on one page
                  </p>
                </div>

                {/* Last Page Table Max Height */}
                <div className="mb-3">
                  <label className="text-xs block mb-1" style={getMutedTextColor()}>
                    Last Page Max Height (mm)
                  </label>
                  <Input
                    type="number"
                    min="50"
                    max="250"
                    step="1"
                    className="h-8 text-xs"
                    value={config.technicalFileLastPageTableMaxHeight ?? 150}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      updateConfig('technicalFileLastPageTableMaxHeight', isNaN(value) ? 150 : value);
                    }}
                  />
                  <p className="text-[10px] mt-1" style={getMutedTextColor()}>
                    Max height on page with summary + terms
                  </p>
                </div>

                {/* Other Pages Table Max Height */}
                <div className="mb-3">
                  <label className="text-xs block mb-1" style={getMutedTextColor()}>
                    Other Pages Max Height (mm)
                  </label>
                  <Input
                    type="number"
                    min="50"
                    max="250"
                    step="1"
                    className="h-8 text-xs"
                    value={config.technicalFileOtherPagesTableMaxHeight ?? 180}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      updateConfig('technicalFileOtherPagesTableMaxHeight', isNaN(value) ? 180 : value);
                    }}
                  />
                  <p className="text-[10px] mt-1" style={getMutedTextColor()}>
                    Max height on pages without summary + terms
                  </p>
                </div>

                {/* First Page Table Max Height */}
                <div className="mb-3">
                  <label className="text-xs block mb-1" style={getMutedTextColor()}>
                    First Page Max Height (mm)
                  </label>
                  <Input
                    type="number"
                    min="50"
                    max="250"
                    step="1"
                    className="h-8 text-xs"
                    value={config.technicalFileFirstPageTableMaxHeight ?? 180}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      updateConfig('technicalFileFirstPageTableMaxHeight', isNaN(value) ? 180 : value);
                    }}
                  />
                  <p className="text-[10px mt-1" style={getMutedTextColor()}>
                    Max height on first page (with header and customer info)
                  </p>
                </div>

                {/* Save Button */}
                {onConfigChange && (
                  <Button
                    className="w-full mt-4 border-2 border-primary"
                    disabled={isSaving}
                    onClick={handleSave}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                )}
              </div>
            )}

            {/* Preview Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Preview Controls */}
              <div className="flex items-center justify-between p-2 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Preview</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Language Selector */}
                  <div className="flex items-center gap-2">
                    <Languages className="h-4 w-4 text-muted-foreground" />
                    <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                      <SelectTrigger size="sm" className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FR">Français</SelectItem>
                        <SelectItem value="EN">English</SelectItem>
                        <SelectItem value="AR">العربية</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Zoom Controls */}
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-8 w-8">
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-xs w-12 text-center">{previewZoom}%</span>
                    <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-8 w-8">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Width Controls */}
                  <div className="flex items-center gap-1 border-l pl-2">
                    <Button variant="ghost" size="icon" onClick={handleDecreaseWidth} className="h-8 w-8">
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-xs w-16 text-center">{previewWidth}mm</span>
                    <Button variant="ghost" size="icon" onClick={handleIncreaseWidth} className="h-8 w-8">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Reset Button */}
                  <Button variant="ghost" size="icon" onClick={handleResetPreview} title="Reset Preview" className="h-8 w-8">
                    <RefreshCw className="h-4 w-4" />
                  </Button>

                  {/* Print Button */}
                  <Button variant="outline" size="sm" onClick={handlePrint} className="ml-2">
                    <Printer className="h-4 w-4 mr-1" />
                    Print
                  </Button>
                </div>
              </div>

              {/* Preview iframe */}
              <div className="flex-1 overflow-auto p-4 bg-gray-100 dark:bg-gray-900 min-h-0">
                <div
                  className="mx-auto bg-white"
                  style={{
                    width: `${previewWidth}mm`,
                    transform: `scale(${previewZoom / 100})`,
                    transformOrigin: 'top center',
                  }}
                >
                  {previewData && (
                    <iframe
                      ref={previewRef}
                      srcDoc={getPreviewHTML()}
                      onLoad={() => setIsIframeLoaded(true)}
                      className="border rounded"
                      style={{
                        width: `${previewWidth}mm`,
                        minHeight: '800px',
                      }}
                      title="Technical File Preview"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Utility function to prepare preview data from order
export async function prepareTechnicalFilePreviewData(
  order: {
    id: string;
    customerId?: string;
    customerName: string;
    customerAddress?: string;
    customerCity?: string;
    customerPhone?: string;
    customerEmail?: string;
    currency: string;
    documentLanguage: string;
    items: Array<{
      modelId?: string;
      description?: string;
      unitPrice: number;
      model?: {
        id?: string;
        name?: string;
        code?: string;
        isManufactured?: boolean;
        family?: { code?: string; name?: string };
      };
      snapshotModel?: string; // Stored model snapshot
    }>;
    // Snapshot fields
    snapshotCompany?: string;
    snapshotCustomer?: string;
    snapshotPdfConfig?: string;
    // Verification token
    verificationToken?: string;
    // Activity profile ID
    activityProfileId?: string | null;
    // Full customer data from relation (if available)
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
): Promise<TechnicalFilePreviewData | null> {
  try {
    let company: UtilCompany | null = null;
    let config: UtilPDFConfiguration | null = null;
    let exchangeRates: ExchangeRate[] = [];
    let logoBase64 = "";

    // Try to use snapshot data first
    if (order.snapshotCompany) {
      try {
        company = JSON.parse(order.snapshotCompany) as UtilCompany;
      } catch (e) {
        console.error("Error parsing company snapshot:", e);
      }
    }

    if (order.snapshotPdfConfig) {
      try {
        config = JSON.parse(order.snapshotPdfConfig) as UtilPDFConfiguration;
      } catch (e) {
        console.error("Error parsing PDF config snapshot:", e);
      }
    }

    // Fall back to fetching fresh data if snapshots not available
    if (!company || !config) {
      const [companyRes, configRes, exchangeRatesRes] = await Promise.all([
        company ? Promise.resolve(null) : fetch("/api/company"),
        config ? Promise.resolve(null) : fetch("/api/pdf-configuration"),
        fetch("/api/exchange-rates"),
      ]);

      if (!company && companyRes) {
        const companyData = companyRes.ok ? await companyRes.json() : null;
        company = companyData as UtilCompany;
      }

      if (!config && configRes) {
        const configData = configRes.ok ? await configRes.json() : null;
        config = configData as UtilPDFConfiguration;
      }

      exchangeRates = exchangeRatesRes.ok ? await exchangeRatesRes.json() : [];
    } else {
      // Still need exchange rates
      const exchangeRatesRes = await fetch("/api/exchange-rates");
      exchangeRates = exchangeRatesRes.ok ? await exchangeRatesRes.json() : [];
    }

    // Fetch activity profile if specified
    let activityProfile: TechnicalFilePreviewData['activityProfile'] | undefined = undefined;
    if (order.activityProfileId) {
      try {
        const profileRes = await fetch(`/api/company-profiles/${order.activityProfileId}`);
        if (profileRes.ok) {
          activityProfile = await profileRes.json();
        }
      } catch (error) {
        console.error("Error fetching activity profile:", error);
      }
    }

    if (!company || !config) {
      return null;
    }

    // Prepare customer data from order (prefer snapshot if available)
    let customer: UtilCustomer;
    
    // First try snapshot
    if (order.snapshotCustomer) {
      try {
        const snapshotCustomer = JSON.parse(order.snapshotCustomer);
        customer = {
          id: snapshotCustomer.id || order.customerId || "",
          fullName: snapshotCustomer.fullName || order.customerName,
          shortName: snapshotCustomer.shortName || order.customerName?.split(' ')[0],
          address: snapshotCustomer.address || order.customerAddress,
          city: snapshotCustomer.city || order.customerCity,
          phone: snapshotCustomer.phone || order.customerPhone,
          email: snapshotCustomer.email || order.customerEmail,
          nif: snapshotCustomer.nif,
          nis: snapshotCustomer.nis,
          rcn: snapshotCustomer.rcn,
          rib: snapshotCustomer.rib,
        };
      } catch (e) {
        console.error("Error parsing customer snapshot:", e);
        // Fall back to customer relation or order data
        if (order.customer) {
          customer = {
            id: order.customer.id,
            fullName: order.customer.fullName || order.customerName,
            shortName: order.customer.shortName || order.customerName?.split(' ')[0],
            address: order.customer.address || order.customerAddress,
            city: order.customer.city || order.customerCity,
            phone: order.customer.phone || order.customerPhone,
            email: order.customer.email || order.customerEmail,
            nif: order.customer.nif,
            nis: order.customer.nis,
            rcn: order.customer.rcn,
            rib: order.customer.rib,
          };
        } else {
          // Use order data
          customer = {
            id: order.customerId || "",
            fullName: order.customerName,
            shortName: order.customerName?.split(' ')[0],
            address: order.customerAddress,
            city: order.customerCity,
            phone: order.customerPhone,
            email: order.customerEmail,
          };
        }
      }
    } else {
      // No snapshot, try customer relation or use order data
      if (order.customer) {
        customer = {
          id: order.customer.id,
          fullName: order.customer.fullName || order.customerName,
          shortName: order.customer.shortName || order.customerName?.split(' ')[0],
          address: order.customer.address || order.customerAddress,
          city: order.customer.city || order.customerCity,
          phone: order.customer.phone || order.customerPhone,
          email: order.customer.email || order.customerEmail,
          nif: order.customer.nif,
          nis: order.customer.nis,
          rcn: order.customer.rcn,
          rib: order.customer.rib,
        };
      } else {
        // Use order data
        customer = {
          id: order.customerId || "",
          fullName: order.customerName,
          shortName: order.customerName?.split(' ')[0],
          address: order.customerAddress,
          city: order.customerCity,
          phone: order.customerPhone,
          email: order.customerEmail,
        };
      }
    }

    // Prepare machine models from order items
    const machineModels: UtilMachineModel[] = order.items.map((item) => {
      // First try snapshot if available
      if (item.snapshotModel) {
        try {
          const snapshotModel = JSON.parse(item.snapshotModel);
          return {
            id: snapshotModel.id || item.modelId || "",
            name: snapshotModel.name || item.description || "",
            code: snapshotModel.code || "",
            description: snapshotModel.description || item.description || "",
            basePrice: item.unitPrice,
            currency: order.currency,
            isManufactured: snapshotModel.isManufactured !== undefined ? snapshotModel.isManufactured : true,
            family: snapshotModel.family,
          };
        } catch (e) {
          console.error("Error parsing model snapshot:", e);
          // Fall back to model relation or create from item data
        }
      }

      // Fall back to model relation or create from item data
      if (item.model) {
        return {
          id: item.model.id || "",
          name: item.model.name || item.description || "",
          code: item.model.code || "",
          description: item.model.description || item.description || "",
          basePrice: item.unitPrice,
          currency: order.currency,
          isManufactured: item.model.isManufactured !== undefined ? item.model.isManufactured : true,
          family: item.model.family,
        };
      }
      
      // Create from item data only
      return {
        id: item.modelId || "",
        name: item.description || "",
        code: "",
        description: item.description || "",
        basePrice: item.unitPrice,
        currency: order.currency,
        isManufactured: true,
      };
    });

    // Get logo base64 if available
    if (company.logos && company.logos.length > 0) {
      const activeLogo = company.logos.find(logo => logo.isActive) || company.logos[0];
      if (activeLogo) {
        try {
          const logoRes = await fetch(`/api/logos/${activeLogo.id}/file`);
          if (logoRes.ok) {
            const buffer = await logoRes.arrayBuffer();
            logoBase64 = arrayBufferToBase64(buffer);
          }
        } catch (e) {
          console.error("Error loading logo:", e);
        }
      }
    }

    // Prepare verification token and QR code if available
    let qrCodeImageUrl: string | undefined;
    if (order.verificationToken && config.includeQrCode) {
      try {
        // Fetch QR code settings
        const qrSettingsRes = await fetch('/api/qr/settings');
        let qrCodeSettings = defaultQRCodeConfig;
        
        if (qrSettingsRes.ok) {
          const qrSettingsData = await qrSettingsRes.json();
          if (qrSettingsData.success && qrSettingsData.data) {
            qrCodeSettings = qrSettingsData.data;
          }
        }

        // Generate QR code using the utility function (no number for technical files)
        const result = await getQrCodeDataUrls(
          config,
          company,
          [customer],
          machineModels,
          order.verificationToken,
          qrCodeSettings,
          undefined, // No number for technical files
          undefined, // No year for technical files
          activityProfile
        );

        if (result) {
          qrCodeImageUrl = result.qrUrl;
        }
      } catch (error) {
        console.error("Error generating QR code:", error);
      }
    }

    return {
      config,
      company,
      customer,
      machineModels,
      selectedLanguage: order.documentLanguage || "FR",
      selectedCurrency: order.currency,
      exchangeRates,
      logoBase64,
      qrCodeImageUrl,
      activityProfile,
      snapshotCompany: order.snapshotCompany,
      snapshotCustomer: order.snapshotCustomer,
      snapshotPdfConfig: order.snapshotPdfConfig,
      verificationToken: order.verificationToken,
    };
  } catch (error) {
    console.error("Error preparing technical file preview data:", error);
    return null;
  }
}
