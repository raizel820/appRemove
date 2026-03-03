"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTranslation } from "@/hooks/use-translation";
import { Eye, Loader2, Check, Minus, Plus, RefreshCw, ChevronDown, ChevronUp, QrCode, Copy, Shield, Download } from "lucide-react";
import { toast } from "sonner";
import { CURRENCIES, convertPrice, formatPrice, getCurrencySymbol, type ExchangeRate } from "@/lib/currencyUtils";
import { numberToWords, currencyToWords, formatTimePeriod } from "@/lib/numberToWords";
import type { QRCodeConfig, QRCodeData, CompanyInfo, CustomerInfo, FileInfo, ItemData } from "@/lib/qrCodeUtils";
import { generateQRCodeData, generateQRCodeDataURL, defaultQRCodeConfig } from "@/lib/qrCodeUtils";
import { generateVerificationToken, type FileVerificationData } from "@/lib/hashedTokenUtil";

// Import from the new util file
import {
  type Company as UtilCompany,
  type Customer as UtilCustomer,
  type MachineModel as UtilMachineModel,
  type PDFConfiguration as UtilPDFConfiguration,
  arrayBufferToBase64 as utilArrayBufferToBase64,
  getQrCodeDataUrls,
  generatePreviewHTML
} from "@/lib/proformaPreviewUtils";
import PurchaseOrderPreviewDialog from "@/components/purchase-order/PurchaseOrderPreviewDialog";

interface Company {
  id: string;
  name: string;
  phoneNumbers?: string[];
  faxNumbers?: string[];
  emails?: string[];
  address?: string;
  nif?: string;
  nis?: string;
  rib?: string;
  rcn?: string;
  bankName?: string;
  fundCapital?: number;
  activityDescriptionAr?: string;
  activityDescriptionFr?: string;
  activeLogoId?: string;
  logos?: Array<{
    id: string;
    filename: string;
    originalName: string;
    fileType: string;
    fileSize: number;
    isActive: boolean;
    createdAt: string;
    url: string;
  }>;
}

interface Customer {
  id: string;
  fullName: string;
  shortName?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
}

interface MachineModel {
  id: string;
  name: string;
  code?: string;
  description?: string;
  basePrice?: number;
  currency?: string;
  isManufactured?: boolean;
  family?: {
    id: string;
    name: string;
  };
}

interface PDFConfiguration {
  id: string;
  // Global header settings
  descriptionLanguage: "FRENCH" | "ENGLISH";
  includeTelephone: boolean;
  includeFax: boolean;
  includeAddress: boolean;
  includeEmail: boolean;
  includeRcn: boolean;
  includeNif: boolean;
  includeNis: boolean;
  includeRib: boolean;
  includeBankName: boolean;
  includeCapitalSocial: boolean;
  includeArabicDescription: boolean;
  includeFrenchDescription: boolean;
  headerLineSpacing: number;
  companyNameFontFamily: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  companyNameFontSize: number;
  companyNameTextColor: string;
  companyNameLineSpacing: number;
  descriptionFontFamily: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  descriptionFontSize: number;
  descriptionTextColor: string;
  descriptionLineSpacing: number;
  logoScaling: number;
  logoOffsetX: number;
  logoOffsetY: number;
  labelFontFamily: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  labelFontSize: number;
  labelTextColor: string;
  labelLineSpacing: number;
  dataFontFamily: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  dataFontSize: number;
  dataTextColor: string;
  dataLineSpacing: number;
  leftPartDirection: "LTR" | "RTL";
  rightPartDirection: "LTR" | "RTL";

  // Purchase Order Top Body Part
  purchaseOrderTopBodyDirection?: "LTR" | "RTL";
  // Title settings
  purchaseOrderTitlePosition?: "left" | "center" | "right";
  purchaseOrderTitleFontFamily?: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  purchaseOrderTitleFontSize?: number;
  purchaseOrderTitleTextColor?: string;
  purchaseOrderTitleLineSpacing?: number;
  purchaseOrderTitleLetterSpacing?: number;
  purchaseOrderTitleBold?: boolean;
  purchaseOrderTitleUnderline?: boolean;
  // Supplier settings
  // Supplier info position
  purchaseOrderClientInfoPosition?: "left" | "center" | "right";
  purchaseOrderClientLabelText?: string;

  // Supplier info settings - Label
  purchaseOrderClientLabelFontFamily?: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  purchaseOrderClientLabelFontSize?: number;
  purchaseOrderClientLabelTextColor?: string;
  purchaseOrderClientLabelLineSpacing?: number;
  purchaseOrderClientLabelLetterSpacing?: number;
  purchaseOrderClientLabelBold?: boolean;
  purchaseOrderClientLabelUnderline?: boolean;

  // Supplier info settings - Value
  purchaseOrderClientValueFontFamily?: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  purchaseOrderClientValueFontSize?: number;
  purchaseOrderClientValueTextColor?: string;
  purchaseOrderClientValueLineSpacing?: number;
  purchaseOrderClientValueLetterSpacing?: number;
  purchaseOrderClientValueBold?: boolean;
  purchaseOrderClientValueUnderline?: boolean;

  // Date settings
  purchaseOrderDatePosition?: "left" | "center" | "right";
  purchaseOrderLocationDateLabelText?: string;
  purchaseOrderDateFontFamily?: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  purchaseOrderDateFontSize?: number;
  purchaseOrderDateTextColor?: string;
  purchaseOrderDateLineSpacing?: number;
  purchaseOrderDateLetterSpacing?: number;
  purchaseOrderDateBold?: boolean;
  purchaseOrderDateUnderline?: boolean;

  // Table settings
  purchaseOrderTableTextAlignment?: "left" | "center" | "right";
  purchaseOrderTableDirection?: "LTR" | "RTL";
  // Table labels
  purchaseOrderTableLabelFontFamily?: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  purchaseOrderTableLabelFontSize?: number;
  purchaseOrderTableLabelTextColor?: string;
  purchaseOrderTableLabelLineSpacing?: number;
  purchaseOrderTableLabelLetterSpacing?: number;
  purchaseOrderTableLabelBold?: boolean;
  purchaseOrderTableLabelUnderline?: boolean;
  // Table values
  purchaseOrderTableValueFontFamily?: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  purchaseOrderTableValueFontSize?: number;
  purchaseOrderTableValueTextColor?: string;
  purchaseOrderTableValueLineSpacing?: number;
  purchaseOrderTableValueLetterSpacing?: number;
  purchaseOrderTableValueBold?: boolean;
  purchaseOrderTableValueUnderline?: boolean;
  purchaseOrderEmptyRows?: number;
  purchaseOrderFirstPageTableMaxHeight?: number;
  purchaseOrderSinglePageTableMaxHeight?: number;
  purchaseOrderLastPageTableMaxHeight?: number;
  purchaseOrderOtherPagesTableMaxHeight?: number;

  // Column-specific settings for items table
  purchaseOrderColNumberWidth?: number;
  purchaseOrderColNumberPadding?: number;
  purchaseOrderColFamilyWidth?: number;
  purchaseOrderColFamilyPadding?: number;
  purchaseOrderColModelWidth?: number;
  purchaseOrderColModelPadding?: number;
  purchaseOrderColBrandWidth?: number;
  purchaseOrderColBrandPadding?: number;
  purchaseOrderColQuantityWidth?: number;
  purchaseOrderColQuantityPadding?: number;
  purchaseOrderColPriceUnitWidth?: number;
  purchaseOrderColPriceUnitPadding?: number;
  purchaseOrderColPriceTotalWidth?: number;
  purchaseOrderColPriceTotalPadding?: number;

  // Footer terms settings
  purchaseOrderTermsPosition?: "left" | "center" | "right";
  purchaseOrderTermsTitle?: string;
  purchaseOrderTermsFontFamily?: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  purchaseOrderTermsFontSize?: number;
  purchaseOrderTermsTextColor?: string;
  purchaseOrderTermsLineSpacing?: number;
  purchaseOrderTermsLetterSpacing?: number;
  purchaseOrderTermsBold?: boolean;
  purchaseOrderTermsUnderline?: boolean;

  // Individual Terms Settings
  purchaseOrderTermsIncludeDelivery?: boolean;
  purchaseOrderTermsDeliveryType?: "fixed" | "range";
  purchaseOrderTermsDeliveryTimeFrom?: number;
  purchaseOrderTermsDeliveryTimeTo?: number | null;
  purchaseOrderTermsDeliveryTimeUnit?: "days" | "weeks" | "months" | "years";

  purchaseOrderTermsIncludeValidity?: boolean;
  purchaseOrderTermsValidityType?: "fixed" | "range";
  purchaseOrderTermsValidityTime?: number;
  purchaseOrderTermsValidityTimeTo?: number | null;
  purchaseOrderTermsValidityTimeUnit?: "days" | "weeks" | "months" | "years";

  purchaseOrderTermsIncludeWarranty?: boolean;
  purchaseOrderTermsWarrantyType?: "fixed" | "range";
  purchaseOrderTermsWarrantyTime?: number;
  purchaseOrderTermsWarrantyTimeTo?: number | null;
  purchaseOrderTermsWarrantyTimeUnit?: "days" | "weeks" | "months" | "years";

  purchaseOrderTermsIncludeConfirmation?: boolean;
  purchaseOrderTermsDeliveryCondition?: "after_order_confirmation" | "after_payment";

  purchaseOrderTermsIncludePayment?: boolean;
  purchaseOrderTermsPaymentMethod?: "online" | "website" | "check" | "cash" | "split_payment";
  purchaseOrderTermsSplitPaymentPercent?: number;
  purchaseOrderTermsIncludePriceInWords?: boolean;

  // Signature settings
  purchaseOrderSignatureCount?: number;
  purchaseOrderSignaturePosition?: "right" | "left" | "middle";
  purchaseOrderSignatureLeftLabelText?: string;
  purchaseOrderSignatureRightLabelText?: string;
  purchaseOrderSignatureLineWidth?: number;
  savedSignatureLabels?: string;

  // Individual signature controls
  purchaseOrderIncludeLeftSignature?: boolean;
  purchaseOrderLeftSignatureOffsetX?: number;
  purchaseOrderLeftSignatureOffsetY?: number;
  purchaseOrderIncludeRightSignature?: boolean;
  purchaseOrderRightSignatureOffsetX?: number;
  purchaseOrderRightSignatureOffsetY?: number;

  // Margins
  pageBorderMargin?: number;
  headerSectionMargin?: number;
  factureNumberMargin?: number;
  clientInfoMargin?: number;
  dateMargin?: number;
  itemTableMargin?: number;
  summaryTableMargin?: number;
  termsSectionMargin?: number;
  signatureSectionMargin?: number;
  pageNumberMargin?: number;

  // Page number settings
  purchaseOrderPageNumberFontFamily?: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  purchaseOrderPageNumberFontSize?: number;
  purchaseOrderPageNumberTextColor?: string;
  purchaseOrderPageNumberPosition?: "left" | "center" | "right";
  purchaseOrderPageNumberOffsetX?: number;
  purchaseOrderPageNumberOffsetY?: number;

  // QR Code settings
  includeQrCode?: boolean;
  qrCodeSize?: number;
  qrCodeOffsetX?: number;
  qrCodeOffsetY?: number;

  // Purchase Order currency and language
  purchaseOrderCurrency?: string;
  purchaseOrderLanguage?: string;
}

export default function PurchaseOrderSettingsSection() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [config, setConfig] = useState<PDFConfiguration | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [machineModels, setMachineModels] = useState<MachineModel[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string>("");
  const previewRef = useRef<HTMLIFrameElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string>("DZD");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("FR");
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);

  // Track if currency and language have been initialized from config
  const isCurrencyLanguageInitialized = useRef(false);

  // QR Code related state
  const [qrCodeSettings, setQrCodeSettings] = useState<QRCodeConfig>(defaultQRCodeConfig);
  const [testVerificationToken, setTestVerificationToken] = useState<string>("");
  const [qrCodePreviewUrl, setQrCodePreviewUrl] = useState<string>("");
  const [qrCodeImageUrl, setQrCodeImageUrl] = useState<string>("");

  // Preview dialog controls state
  const [previewZoom, setPreviewZoom] = useState(100);
  const [previewWidth, setPreviewWidth] = useState(252); // A4 width (210mm) + 20%

  // Default signature labels with translations
  const defaultSignatureLabels = [
    { id: 'manager', key: 'manager', translations: { en: 'Manager', fr: 'Gérant', ar: 'المدير' } },
    { id: 'director', key: 'director', translations: { en: 'Director', fr: 'Directeur', ar: 'المدير العام' } },
    { id: 'supplier', key: 'supplier', translations: { en: 'Supplier', fr: 'Supplier', ar: 'العميل' } },
    { id: 'representer', key: 'representer', translations: { en: 'Representative', fr: 'Représentant', ar: 'الممثل' } },
  ];

  // Get saved signature labels from config or use defaults
  const getSavedSignatureLabels = () => {
    if (!config?.savedSignatureLabels) {
      return defaultSignatureLabels;
    }
    try {
      return JSON.parse(config.savedSignatureLabels);
    } catch {
      return defaultSignatureLabels;
    }
  };

  const savedSignatureLabels = getSavedSignatureLabels();

  useEffect(() => {
    loadData();
    loadExchangeRates();
  }, []);

  useEffect(() => {
    if (company?.activeLogoId && company.logos) {
      const activeLogo = company.logos.find(logo => logo.isActive || logo.id === company.activeLogoId);
      if (activeLogo?.url) {
        fetchLogoAsBase64(activeLogo.url);
      }
    }
  }, [company?.activeLogoId, company?.logos]);

  // Load QR code settings and test token
  useEffect(() => {
    const loadQrCodeData = async () => {
      try {
        // Load QR code settings
        const qrSettingsRes = await fetch('/api/qr/settings');
        if (qrSettingsRes.ok) {
          const qrSettingsData = await qrSettingsRes.json();
          if (qrSettingsData.success && qrSettingsData.data) {
            setQrCodeSettings(qrSettingsData.data);
          }
        }

        // Load test verification tokens from database
        const tokensRes = await fetch('/api/qr/tokens?limit=1&search=test');
        if (tokensRes.ok) {
          const tokensData = await tokensRes.json();
          if (tokensData.success && tokensData.data && tokensData.data.length > 0) {
            setTestVerificationToken(tokensData.data[0].token);
          }
        }
      } catch (error) {
        console.error('Error loading QR code data:', error);
      }
    };

    loadQrCodeData();
  }, []);

  // Initialize currency and language from config (only on initial load)
  useEffect(() => {
    if (config && !isCurrencyLanguageInitialized.current) {
      setSelectedCurrency(config.purchaseOrderCurrency || "DZD");
      setSelectedLanguage(config.purchaseOrderLanguage || "FR");
      isCurrencyLanguageInitialized.current = true;
    }
  }, [config]);

  // Regenerate QR code preview when data changes
  useEffect(() => {
    if (config?.includeQrCode && company && customers.length > 0 && machineModels.length > 0) {
      generateQrCodePreview();
    }
  }, [config?.includeQrCode, company, customers, machineModels, testVerificationToken, qrCodeSettings]);

  const fetchLogoAsBase64 = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = utilArrayBufferToBase64(arrayBuffer);
      const mimeType = blob.type.split('/')[1] || 'png';
      setLogoBase64(`data:image/${mimeType};base64,${base64}`);
    } catch (error) {
      console.error("Error fetching logo:", error);
    }
  };

  // Generate QR code preview using utility function
  const generateQrCodePreview = async () => {
    if (!config || !company || !customers.length || !machineModels.length) {
      return;
    }

    try {
      const result = await getQrCodeDataUrls(config, company, customers, machineModels, testVerificationToken, qrCodeSettings);
      if (result) {
        setQrCodePreviewUrl(result.qrUrl);
        setQrCodeImageUrl(result.placeholderQrUrl);
      }
    } catch (error) {
      console.error('Error generating QR code preview:', error);
    }
  };

  const handleCopyTestToken = () => {
    if (!testVerificationToken) return;
    navigator.clipboard.writeText(testVerificationToken).then(() => {
      toast.success(t("copied", "Copied"));
    }).catch(() => {
      toast.error(t("failedToCopy", "Failed to copy"));
    });
  };

  const handleDownloadQrCode = () => {
    if (!qrCodePreviewUrl) {
      toast.error("No QR code to download");
      return;
    }
    
    const link = document.createElement('a');
    link.href = qrCodePreviewUrl;
    link.download = `purchase-order-qr-${Date.now()}.png`;
    link.click();
    toast.success("QR code downloaded");
  };

  const loadData = async () => {
    try {
      setIsLoading(true);

      const companyRes = await fetch("/api/company");
      if (companyRes.ok) {
        const companyData = await companyRes.json();
        setCompany(companyData);
      }

      const customersRes = await fetch("/api/customers");
      if (customersRes.ok) {
        const customersData = await customersRes.json();
        setCustomers(customersData);
      }

      const modelsRes = await fetch("/api/machines/models");
      if (modelsRes.ok) {
        const modelsData = await modelsRes.json();
        setMachineModels(modelsData);
      }

      const configRes = await fetch("/api/pdf-configuration");
      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error(t("pdfSettingsLoadError", "Failed to load configuration"));
    } finally {
      setIsLoading(false);
    }
  };

  const loadExchangeRates = async () => {
    try {
      const ratesRes = await fetch("/api/exchange-rates");
      if (ratesRes.ok) {
        const ratesData = await ratesRes.json();
        setExchangeRates(ratesData);
      }
    } catch (error) {
      console.error("Error loading exchange rates:", error);
    }
  };

  // Translation Objects to pass to Utils
  const labelsFr = {
    telephone: t("telephone", "Telephone"),
    fax: t("fax", "Fax"),
    address: t("address", "Address"),
    email: t("email", "Email"),
    rcn: t("rcn", "Trade Register Number (RC)"),
    nif: t("nif", "Tax Identification Number (NIF)"),
    nis: t("nis", "Statistical Number (NIS)"),
    rib: t("rib", "Bank Account Number (RIB)"),
    bankName: t("bankAgency", "Bank Agency"),
    capitalSocial: t("capitalSocial", "Capital Social"),
  };

  const labelsAr = {
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

  const purchaseOrderTranslations = {
    FR: {
      purchaseOrder_number: "Facture Purchase Order N°",
      supplier: "Supplier",
      noSupplier: "Aucun supplier disponible",
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
        validityTitle: "Validité de la facture purchaseOrder",
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
      signature: { manager: "Gérant", supplier: "Supplier" }
    },
    EN: {
      purchaseOrder_number: "Purchase Order Invoice N°",
      supplier: "Supplier",
      noSupplier: "No supplier available",
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
        validityTitle: "Purchase Order invoice validity",
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
      signature: { manager: "Manager", supplier: "Supplier" }
    },
    AR: {
      purchaseOrder_number: "فاتورة شكلية رقم",
      supplier: "العميل",
      noSupplier: "لا يوجد عميل متاح",
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
        validityTitle: "صلاحية الفاتورة الشكلية",
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
      signature: { manager: "المدير", supplier: "العميل" }
    }
  };

  // Prepare data for the utility functions
  const preparePreviewData = () => {
    return {
      config: config!,
      company: company!,
      customers,
      machineModels,
      selectedLanguage,
      selectedCurrency,
      exchangeRates,
      logoBase64,
      qrCodeImageUrl,
      purchaseOrderTranslations,
      labelsFr,
      labelsAr
    };
  };

  // Wrapper function to generate preview HTML using the utility
  const getPreviewHTML = (): string => {
    if (!config || !company) return "";
    return generatePreviewHTML(preparePreviewData());
  };

  const handleSave = async () => {
    if (!config) return;

    try {
      setIsSaving(true);

      // Include current currency and language in the config
      const configToSave = {
        ...config,
        purchaseOrderCurrency: selectedCurrency,
        purchaseOrderLanguage: selectedLanguage,
      };

      const response = await fetch("/api/pdf-configuration", {
        method: config.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configToSave),
      });

      if (response.ok) {
        const savedConfig = await response.json();
        setConfig(savedConfig);
        toast.success(t("pdfSettingsSaveSuccess", "Configuration saved successfully"));
      } else {
        toast.error("Failed to save configuration");
      }
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast.error(t("pdfSettingsSaveError", "Failed to save configuration"));
    } finally {
      setIsSaving(false);
    }
  };

  const openPreview = () => {
    setIsIframeLoaded(false);
    setIsPreviewOpen(true);
  };

  // Preview dialog control handlers
  const handleZoomIn = () => {
    setPreviewZoom((prev) => Math.min(prev + 10, 200));
  };

  const handleZoomOut = () => {
    setPreviewZoom((prev) => Math.max(prev - 10, 50));
  };

  const handleIncreaseWidth = () => {
    setPreviewWidth((prev) => Math.min(prev + 10, 350));
  };

  const handleDecreaseWidth = () => {
    setPreviewWidth((prev) => Math.max(prev - 10, 210));
  };

  const handleResetPreview = () => {
    setPreviewZoom(100);
    setPreviewWidth(252); // A4 width (210mm) + 20%
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!config || !company) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t("pdfSettingsNoConfig", "No configuration found")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("pdfSettingsPurchaseOrder", "Purchase Order")}</CardTitle>
              <CardDescription>{t("pdfSettingsPurchaseOrderDescription", "Configure purchase order-specific PDF settings")}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(true)}>
                <Eye className="h-4 w-4 mr-2" />
                {t("pdfSettingsPreview", "Preview")}
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("commonSaving", "Saving...")}
                  </>
                ) : (
                  <>
                    <span>SAVE</span>
                  </>
                )}
              </Button>
              <div className="flex items-center gap-2">
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FR">Français</SelectItem>
                    <SelectItem value="EN">English</SelectItem>
                    <SelectItem value="AR">العربية</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((curr) => (
                      <SelectItem key={curr.value} value={curr.value}>
                        {curr.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground mb-4">
            The purchaseOrder uses global PDF header. Configure header settings in Global Header tab.
          </p>

          {/* Top Body Part Settings */}
          <div className="space-y-4 pb-6 border-b">
            <h3 className="text-lg font-semibold mb-4">1. Top Body Part Settings</h3>

            {/* Writing Direction */}
            <div>
              <Label htmlFor="purchaseOrder-top-body-direction">Writing Direction</Label>
              <Select
                id="purchaseOrder-top-body-direction"
                value={config.purchaseOrderTopBodyDirection || "LTR"}
                onValueChange={(value: any) => setConfig({ ...config, purchaseOrderTopBodyDirection: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LTR">Left to Right (LTR)</SelectItem>
                  <SelectItem value="RTL">Right to Left (RTL)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title Settings */}
            <div className="space-y-4 pt-4">
              <h4 className="font-medium">Title Font Settings</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchaseOrder-title-position">Position</Label>
                  <Select
                    id="purchaseOrder-title-position"
                    value={config.purchaseOrderTitlePosition || "center"}
                    onValueChange={(value: any) => setConfig({ ...config, purchaseOrderTitlePosition: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border shadow-md rounded-lg" style={{ backgroundColor: theme === 'dark' ? 'black' : 'white' }}>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="purchaseOrder-title-font-family">Font Family</Label>
                  <Select
                    id="purchaseOrder-title-font-family"
                    value={config.purchaseOrderTitleFontFamily || "HELVETICA"}
                    onValueChange={(value: any) => setConfig({ ...config, purchaseOrderTitleFontFamily: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border shadow-md rounded-lg" style={{ backgroundColor: theme === 'dark' ? 'black' : 'white' }}>
                      <SelectItem value="HELVETICA">Helvetica</SelectItem>
                      <SelectItem value="TIMES_ROMAN">Times Roman</SelectItem>
                      <SelectItem value="COURIER">Courier</SelectItem>
                      <SelectItem value="ARIAL">Arial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="purchaseOrder-title-font-size">Font Size (px)</Label>
                  <Input
                    id="purchaseOrder-title-font-size"
                    type="number"
                    min="8"
                    max="72"
                    value={config.purchaseOrderTitleFontSize || 16}
                    onChange={(e) => setConfig({ ...config, purchaseOrderTitleFontSize: parseInt(e.target.value) || 16 })}
                  />
                </div>
                <div>
                  <Label htmlFor="purchaseOrder-title-text-color">Color</Label>
                  <Input
                    id="purchaseOrder-title-text-color"
                    type="color"
                    value={config.purchaseOrderTitleTextColor || "#000000"}
                    onChange={(e) => setConfig({ ...config, purchaseOrderTitleTextColor: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="purchaseOrder-title-line-spacing">Line Spacing</Label>
                  <Input
                    id="purchaseOrder-title-line-spacing"
                    type="number"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={config.purchaseOrderTitleLineSpacing || 1}
                    onChange={(e) => setConfig({ ...config, purchaseOrderTitleLineSpacing: parseFloat(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label htmlFor="purchaseOrder-title-letter-spacing">Letter Spacing (px)</Label>
                  <Input
                    id="purchaseOrder-title-letter-spacing"
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={config.purchaseOrderTitleLetterSpacing || 0}
                    onChange={(e) => setConfig({ ...config, purchaseOrderTitleLetterSpacing: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="purchaseOrder-title-bold"
                    checked={config.purchaseOrderTitleBold || false}
                    onCheckedChange={(checked) => setConfig({ ...config, purchaseOrderTitleBold: checked })}
                  />
                  <Label htmlFor="purchaseOrder-title-bold" className="cursor-pointer">Bold</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="purchaseOrder-title-underline"
                    checked={config.purchaseOrderTitleUnderline || false}
                    onCheckedChange={(checked) => setConfig({ ...config, purchaseOrderTitleUnderline: checked })}
                  />
                  <Label htmlFor="purchaseOrder-title-underline" className="cursor-pointer">Underline</Label>
                </div>
              </div>
            </div>

            {/* Supplier Settings */}
            <div className="space-y-4 pt-4">
              <h4 className="font-medium">Supplier Info Settings</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchaseOrder-supplier-info-position">Position</Label>
                  <Select
                    id="purchaseOrder-supplier-info-position"
                    value={config.purchaseOrderClientInfoPosition || "left"}
                    onValueChange={(value: any) => setConfig({ ...config, purchaseOrderClientInfoPosition: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border shadow-md rounded-lg" style={{ backgroundColor: theme === 'dark' ? 'black' : 'white' }}>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Label Settings */}
              <div className="border-t pt-4">
                <h5 className="font-medium mb-3">Label Settings</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="purchaseOrder-supplier-label-font-family">Font Family</Label>
                    <Select
                      id="purchaseOrder-supplier-label-font-family"
                      value={config.purchaseOrderClientLabelFontFamily || "HELVETICA"}
                      onValueChange={(value: any) => setConfig({ ...config, purchaseOrderClientLabelFontFamily: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border shadow-md rounded-lg" style={{ backgroundColor: theme === 'dark' ? 'black' : 'white' }}>
                        <SelectItem value="HELVETICA">Helvetica</SelectItem>
                        <SelectItem value="TIMES_ROMAN">Times Roman</SelectItem>
                        <SelectItem value="COURIER">Courier</SelectItem>
                        <SelectItem value="ARIAL">Arial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="purchaseOrder-supplier-label-font-size">Font Size (px)</Label>
                    <Input
                      id="purchaseOrder-supplier-label-font-size"
                      type="number"
                      min="8"
                      max="72"
                      value={config.purchaseOrderClientLabelFontSize || 12}
                      onChange={(e) => setConfig({ ...config, purchaseOrderClientLabelFontSize: parseInt(e.target.value) || 12 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="purchaseOrder-supplier-label-text-color">Color</Label>
                    <Input
                      id="purchaseOrder-supplier-label-text-color"
                      type="color"
                      value={config.purchaseOrderClientLabelTextColor || "#000000"}
                      onChange={(e) => setConfig({ ...config, purchaseOrderClientLabelTextColor: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="purchaseOrder-supplier-label-line-spacing">Line Spacing</Label>
                    <Input
                      id="purchaseOrder-supplier-label-line-spacing"
                      type="number"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={config.purchaseOrderClientLabelLineSpacing || 1}
                      onChange={(e) => setConfig({ ...config, purchaseOrderClientLabelLineSpacing: parseFloat(e.target.value) || 1 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="purchaseOrder-supplier-label-letter-spacing">Letter Spacing (px)</Label>
                    <Input
                      id="purchaseOrder-supplier-label-letter-spacing"
                      type="number"
                      min="0"
                      max="20"
                      step="0.1"
                      value={config.purchaseOrderClientLabelLetterSpacing || 0}
                      onChange={(e) => setConfig({ ...config, purchaseOrderClientLabelLetterSpacing: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="purchaseOrder-supplier-label-bold"
                      checked={config.purchaseOrderClientLabelBold || false}
                      onCheckedChange={(checked) => setConfig({ ...config, purchaseOrderClientLabelBold: checked })}
                    />
                    <Label htmlFor="purchaseOrder-supplier-label-bold" className="cursor-pointer">Bold</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="purchaseOrder-supplier-label-underline"
                      checked={config.purchaseOrderClientLabelUnderline || false}
                      onCheckedChange={(checked) => setConfig({ ...config, purchaseOrderClientLabelUnderline: checked })}
                    />
                    <Label htmlFor="purchaseOrder-supplier-label-underline" className="cursor-pointer">Underline</Label>
                  </div>
                </div>
              </div>

              {/* Value Settings */}
              <div className="border-t pt-4">
                <h5 className="font-medium mb-3">Value Settings</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="purchaseOrder-supplier-value-font-family">Font Family</Label>
                    <Select
                      id="purchaseOrder-supplier-value-font-family"
                      value={config.purchaseOrderClientValueFontFamily || "HELVETICA"}
                      onValueChange={(value: any) => setConfig({ ...config, purchaseOrderClientValueFontFamily: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border shadow-md rounded-lg" style={{ backgroundColor: theme === 'dark' ? 'black' : 'white' }}>
                        <SelectItem value="HELVETICA">Helvetica</SelectItem>
                        <SelectItem value="TIMES_ROMAN">Times Roman</SelectItem>
                        <SelectItem value="COURIER">Courier</SelectItem>
                        <SelectItem value="ARIAL">Arial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="purchaseOrder-supplier-value-font-size">Font Size (px)</Label>
                    <Input
                      id="purchaseOrder-supplier-value-font-size"
                      type="number"
                      min="8"
                      max="72"
                      value={config.purchaseOrderClientValueFontSize || 12}
                      onChange={(e) => setConfig({ ...config, purchaseOrderClientValueFontSize: parseInt(e.target.value) || 12 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="purchaseOrder-supplier-value-text-color">Color</Label>
                    <Input
                      id="purchaseOrder-supplier-value-text-color"
                      type="color"
                      value={config.purchaseOrderClientValueTextColor || "#000000"}
                      onChange={(e) => setConfig({ ...config, purchaseOrderClientValueTextColor: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="purchaseOrder-supplier-value-line-spacing">Line Spacing</Label>
                    <Input
                      id="purchaseOrder-supplier-value-line-spacing"
                      type="number"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={config.purchaseOrderClientValueLineSpacing || 1}
                      onChange={(e) => setConfig({ ...config, purchaseOrderClientValueLineSpacing: parseFloat(e.target.value) || 1 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="purchaseOrder-supplier-value-letter-spacing">Letter Spacing (px)</Label>
                    <Input
                      id="purchaseOrder-supplier-value-letter-spacing"
                      type="number"
                      min="0"
                      max="20"
                      step="0.1"
                      value={config.purchaseOrderClientValueLetterSpacing || 0}
                      onChange={(e) => setConfig({ ...config, purchaseOrderClientValueLetterSpacing: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="purchaseOrder-supplier-value-bold"
                      checked={config.purchaseOrderClientValueBold || false}
                      onCheckedChange={(checked) => setConfig({ ...config, purchaseOrderClientValueBold: checked })}
                    />
                    <Label htmlFor="purchaseOrder-supplier-value-bold" className="cursor-pointer">Bold</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="purchaseOrder-supplier-value-underline"
                      checked={config.purchaseOrderClientValueUnderline || false}
                      onCheckedChange={(checked) => setConfig({ ...config, purchaseOrderClientValueUnderline: checked })}
                    />
                    <Label htmlFor="purchaseOrder-supplier-value-underline" className="cursor-pointer">Underline</Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Date Settings */}
            <div className="space-y-4 pt-4">
              <h4 className="font-medium">Date/Location Settings</h4>

              <div>
                <Label htmlFor="purchaseOrder-date-position">Position</Label>
                <Select
                  id="purchaseOrder-date-position"
                  value={config.purchaseOrderDatePosition || "left"}
                  onValueChange={(value: any) => setConfig({ ...config, purchaseOrderDatePosition: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border shadow-md rounded-lg" style={{ backgroundColor: theme === 'dark' ? 'black' : 'white' }}>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchaseOrder-supplier-label-text">Label Text</Label>
                  <Input
                    id="purchaseOrder-supplier-label-text"
                    value={config.purchaseOrderLocationDateLabelText || "M'sila le"}
                    onChange={(e) => setConfig({ ...config, purchaseOrderLocationDateLabelText: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="purchaseOrder-date-font-family">Font Family</Label>
                  <Select
                    id="purchaseOrder-date-font-family"
                    value={config.purchaseOrderDateFontFamily || "HELVETICA"}
                    onValueChange={(value: any) => setConfig({ ...config, purchaseOrderDateFontFamily: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border shadow-md rounded-lg" style={{ backgroundColor: theme === 'dark' ? 'black' : 'white' }}>
                      <SelectItem value="HELVETICA">Helvetica</SelectItem>
                      <SelectItem value="TIMES_ROMAN">Times Roman</SelectItem>
                      <SelectItem value="COURIER">Courier</SelectItem>
                      <SelectItem value="ARIAL">Arial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="purchaseOrder-date-font-size">Font Size (px)</Label>
                  <Input
                    id="purchaseOrder-date-font-size"
                    type="number"
                    min="8"
                    max="72"
                    value={config.purchaseOrderDateFontSize || 12}
                    onChange={(e) => setConfig({ ...config, purchaseOrderDateFontSize: parseInt(e.target.value) || 12 })}
                  />
                </div>
                <div>
                  <Label htmlFor="purchaseOrder-date-text-color">Color</Label>
                  <Input
                    id="purchaseOrder-date-text-color"
                    type="color"
                    value={config.purchaseOrderDateTextColor || "#000000"}
                    onChange={(e) => setConfig({ ...config, purchaseOrderDateTextColor: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="purchaseOrder-date-line-spacing">Line Spacing</Label>
                  <Input
                    id="purchaseOrder-date-line-spacing"
                    type="number"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={config.purchaseOrderDateLineSpacing || 1}
                    onChange={(e) => setConfig({ ...config, purchaseOrderDateLineSpacing: parseFloat(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label htmlFor="purchaseOrder-date-letter-spacing">Letter Spacing (px)</Label>
                  <Input
                    id="purchaseOrder-date-letter-spacing"
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={config.purchaseOrderDateLetterSpacing || 0}
                    onChange={(e) => setConfig({ ...config, purchaseOrderDateLetterSpacing: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="purchaseOrder-date-bold"
                    checked={config.purchaseOrderDateBold || false}
                    onCheckedChange={(checked) => setConfig({ ...config, purchaseOrderDateBold: checked })}
                  />
                  <Label htmlFor="purchaseOrder-date-bold" className="cursor-pointer">Bold</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="purchaseOrder-date-underline"
                    checked={config.purchaseOrderDateUnderline || false}
                    onCheckedChange={(checked) => setConfig({ ...config, purchaseOrderDateUnderline: checked })}
                  />
                  <Label htmlFor="purchaseOrder-date-underline" className="cursor-pointer">Underline</Label>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table Settings */}
          <div className="space-y-4 pb-6 border-b">
            <h3 className="text-lg font-semibold mb-4">2. Items Table Settings</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="purchaseOrder-table-text-alignment">Table Text Alignment</Label>
                <Select
                  id="purchaseOrder-table-text-alignment"
                  value={config.purchaseOrderTableTextAlignment || "left"}
                  onValueChange={(value: any) => setConfig({ ...config, purchaseOrderTableTextAlignment: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border shadow-md rounded-lg" style={{ backgroundColor: theme === 'dark' ? 'black' : 'white' }}>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="purchaseOrder-table-direction">Writing Direction</Label>
                <Select
                  id="purchaseOrder-table-direction"
                  value={config.purchaseOrderTableDirection || "LTR"}
                  onValueChange={(value: any) => setConfig({ ...config, purchaseOrderTableDirection: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border shadow-md rounded-lg" style={{ backgroundColor: theme === 'dark' ? 'black' : 'white' }}>
                    <SelectItem value="LTR">Left to Right (LTR)</SelectItem>
                    <SelectItem value="RTL">Right to Left (RTL)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table Labels Settings */}
            <div className="space-y-4 pt-4">
              <h4 className="font-medium">Table Labels (Header Row) Settings</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchaseOrder-table-label-font-family">Font Family</Label>
                  <Select
                    id="purchaseOrder-table-label-font-family"
                    value={config.purchaseOrderTableLabelFontFamily || "HELVETICA"}
                    onValueChange={(value: any) => setConfig({ ...config, purchaseOrderTableLabelFontFamily: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border shadow-md rounded-lg" style={{ backgroundColor: theme === 'dark' ? 'black' : 'white' }}>
                      <SelectItem value="HELVETICA">Helvetica</SelectItem>
                      <SelectItem value="TIMES_ROMAN">Times Roman</SelectItem>
                      <SelectItem value="COURIER">Courier</SelectItem>
                      <SelectItem value="ARIAL">Arial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="purchaseOrder-table-label-font-size">Font Size (px)</Label>
                  <Input
                    id="purchaseOrder-table-label-font-size"
                    type="number"
                    min="8"
                    max="72"
                    value={config.purchaseOrderTableLabelFontSize || 11}
                    onChange={(e) => setConfig({ ...config, purchaseOrderTableLabelFontSize: parseInt(e.target.value) || 11 })}
                  />
                </div>
                <div>
                  <Label htmlFor="purchaseOrder-table-label-text-color">Color</Label>
                  <Input
                    id="purchaseOrder-table-label-text-color"
                    type="color"
                    value={config.purchaseOrderTableLabelTextColor || "#000000"}
                    onChange={(e) => setConfig({ ...config, purchaseOrderTableLabelTextColor: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="purchaseOrder-table-label-line-spacing">Line Spacing</Label>
                  <Input
                    id="purchaseOrder-table-label-line-spacing"
                    type="number"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={config.purchaseOrderTableLabelLineSpacing || 1}
                    onChange={(e) => setConfig({ ...config, purchaseOrderTableLabelLineSpacing: parseFloat(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label htmlFor="purchaseOrder-table-label-letter-spacing">Letter Spacing (px)</Label>
                  <Input
                    id="purchaseOrder-table-label-letter-spacing"
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={config.purchaseOrderTableLabelLetterSpacing || 0}
                    onChange={(e) => setConfig({ ...config, purchaseOrderTableLabelLetterSpacing: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="purchaseOrder-table-label-bold"
                    checked={config.purchaseOrderTableLabelBold || false}
                    onCheckedChange={(checked) => setConfig({ ...config, purchaseOrderTableLabelBold: checked })}
                  />
                  <Label htmlFor="purchaseOrder-table-label-bold" className="cursor-pointer">Bold</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="purchaseOrder-table-label-underline"
                    checked={config.purchaseOrderTableLabelUnderline || false}
                    onCheckedChange={(checked) => setConfig({ ...config, purchaseOrderTableLabelUnderline: checked })}
                  />
                  <Label htmlFor="purchaseOrder-table-label-underline" className="cursor-pointer">Underline</Label>
                </div>
              </div>
            </div>

            {/* Table Values Settings */}
            <div className="space-y-4 pt-4">
              <h4 className="font-medium">Table Values (Rest of Table) Settings</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchaseOrder-table-value-font-family">Font Family</Label>
                  <Select
                    id="purchaseOrder-table-value-font-family"
                    value={config.purchaseOrderTableValueFontFamily || "HELVETICA"}
                    onValueChange={(value: any) => setConfig({ ...config, purchaseOrderTableValueFontFamily: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border shadow-md rounded-lg" style={{ backgroundColor: theme === 'dark' ? 'black' : 'white' }}>
                      <SelectItem value="HELVETICA">Helvetica</SelectItem>
                      <SelectItem value="TIMES_ROMAN">Times Roman</SelectItem>
                      <SelectItem value="COURIER">Courier</SelectItem>
                      <SelectItem value="ARIAL">Arial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="purchaseOrder-table-value-font-size">Font Size (px)</Label>
                  <Input
                    id="purchaseOrder-table-value-font-size"
                    type="number"
                    min="8"
                    max="72"
                    value={config.purchaseOrderTableValueFontSize || 11}
                    onChange={(e) => setConfig({ ...config, purchaseOrderTableValueFontSize: parseInt(e.target.value) || 11 })}
                  />
                </div>
                <div>
                  <Label htmlFor="purchaseOrder-table-value-text-color">Color</Label>
                  <Input
                    id="purchaseOrder-table-value-text-color"
                    type="color"
                    value={config.purchaseOrderTableValueTextColor || "#000000"}
                    onChange={(e) => setConfig({ ...config, purchaseOrderTableValueTextColor: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="purchaseOrder-table-value-line-spacing">Line Spacing</Label>
                  <Input
                    id="purchaseOrder-table-value-line-spacing"
                    type="number"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={config.purchaseOrderTableValueLineSpacing || 1}
                    onChange={(e) => setConfig({ ...config, purchaseOrderTableValueLineSpacing: parseFloat(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label htmlFor="purchaseOrder-table-value-letter-spacing">Letter Spacing (px)</Label>
                  <Input
                    id="purchaseOrder-table-value-letter-spacing"
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={config.purchaseOrderTableValueLetterSpacing || 0}
                    onChange={(e) => setConfig({ ...config, purchaseOrderTableValueLetterSpacing: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="purchaseOrder-table-value-bold"
                    checked={config.purchaseOrderTableValueBold || false}
                    onCheckedChange={(checked) => setConfig({ ...config, purchaseOrderTableValueBold: checked })}
                  />
                  <Label htmlFor="purchaseOrder-table-value-bold" className="cursor-pointer">Bold</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="purchaseOrder-table-value-underline"
                    checked={config.purchaseOrderTableValueUnderline || false}
                    onCheckedChange={(checked) => setConfig({ ...config, purchaseOrderTableValueUnderline: checked })}
                  />
                  <Label htmlFor="purchaseOrder-table-value-underline" className="cursor-pointer">Underline</Label>
                </div>
              </div>
            </div>
          </div>

          {/* Column-Specific Settings */}
          <div className="space-y-4 pb-6 border-b">
            <h3 className="text-lg font-semibold mb-4">2.1 Column Settings</h3>
            <p className="text-sm text-muted-foreground mb-4">Configure width and padding for each column in the items table</p>

            <div className="space-y-4">
              {/* Column 1: N° (Number) */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Column 1: N° (Number)</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="purchaseOrder-col-number-width">Width (mm)</Label>
                    <Input
                      id="purchaseOrder-col-number-width"
                      type="number"
                      min="5"
                      max="100"
                      step="0.01"
                      value={config.purchaseOrderColNumberWidth ?? 13.23}
                      onChange={(e) => setConfig({ ...config, purchaseOrderColNumberWidth: parseFloat(e.target.value) || 13.23 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="purchaseOrder-col-number-padding">Padding (mm)</Label>
                    <Input
                      id="purchaseOrder-col-number-padding"
                      type="number"
                      min="0"
                      max="20"
                      step="0.01"
                      value={config.purchaseOrderColNumberPadding ?? 5.61}
                      onChange={(e) => setConfig({ ...config, purchaseOrderColNumberPadding: parseFloat(e.target.value) || 5.61 })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Column 2: Item family */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Column 2: Item family</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="purchaseOrder-col-family-width">Width (mm)</Label>
                    <Input
                      id="purchaseOrder-col-family-width"
                      type="number"
                      min="10"
                      max="150"
                      step="0.01"
                      value={config.purchaseOrderColFamilyWidth ?? 39.69}
                      onChange={(e) => setConfig({ ...config, purchaseOrderColFamilyWidth: parseFloat(e.target.value) || 39.69 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="purchaseOrder-col-family-padding">Padding (mm)</Label>
                    <Input
                      id="purchaseOrder-col-family-padding"
                      type="number"
                      min="0"
                      max="20"
                      step="0.01"
                      value={config.purchaseOrderColFamilyPadding ?? 5.61}
                      onChange={(e) => setConfig({ ...config, purchaseOrderColFamilyPadding: parseFloat(e.target.value) || 5.61 })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Column 3: Model */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Column 3: Model</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="purchaseOrder-col-model-width">Width (mm)</Label>
                    <Input
                      id="purchaseOrder-col-model-width"
                      type="number"
                      min="10"
                      max="150"
                      step="0.01"
                      value={config.purchaseOrderColModelWidth ?? 39.69}
                      onChange={(e) => setConfig({ ...config, purchaseOrderColModelWidth: parseFloat(e.target.value) || 39.69 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="purchaseOrder-col-model-padding">Padding (mm)</Label>
                    <Input
                      id="purchaseOrder-col-model-padding"
                      type="number"
                      min="0"
                      max="20"
                      step="0.01"
                      value={config.purchaseOrderColModelPadding ?? 5.61}
                      onChange={(e) => setConfig({ ...config, purchaseOrderColModelPadding: parseFloat(e.target.value) || 5.61 })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Column 4: Brand */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Column 4: Brand</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="purchaseOrder-col-brand-width">Width (mm)</Label>
                    <Input
                      id="purchaseOrder-col-brand-width"
                      type="number"
                      min="10"
                      max="150"
                      step="0.01"
                      value={config.purchaseOrderColBrandWidth ?? 31.75}
                      onChange={(e) => setConfig({ ...config, purchaseOrderColBrandWidth: parseFloat(e.target.value) || 31.75 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="purchaseOrder-col-brand-padding">Padding (mm)</Label>
                    <Input
                      id="purchaseOrder-col-brand-padding"
                      type="number"
                      min="0"
                      max="20"
                      step="0.01"
                      value={config.purchaseOrderColBrandPadding ?? 5.61}
                      onChange={(e) => setConfig({ ...config, purchaseOrderColBrandPadding: parseFloat(e.target.value) || 5.61 })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Column 5: Quantity */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Column 5: Quantity</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="purchaseOrder-col-quantity-width">Width (mm)</Label>
                    <Input
                      id="purchaseOrder-col-quantity-width"
                      type="number"
                      min="10"
                      max="150"
                      step="0.01"
                      value={config.purchaseOrderColQuantityWidth ?? 21.17}
                      onChange={(e) => setConfig({ ...config, purchaseOrderColQuantityWidth: parseFloat(e.target.value) || 21.17 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="purchaseOrder-col-quantity-padding">Padding (mm)</Label>
                    <Input
                      id="purchaseOrder-col-quantity-padding"
                      type="number"
                      min="0"
                      max="20"
                      step="0.01"
                      value={config.purchaseOrderColQuantityPadding ?? 5.61}
                      onChange={(e) => setConfig({ ...config, purchaseOrderColQuantityPadding: parseFloat(e.target.value) || 5.61 })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Column 6: Price per unit */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Column 6: Price per unit</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="purchaseOrder-col-price-unit-width">Width (mm)</Label>
                    <Input
                      id="purchaseOrder-col-price-unit-width"
                      type="number"
                      min="10"
                      max="150"
                      step="0.01"
                      value={config.purchaseOrderColPriceUnitWidth ?? 31.75}
                      onChange={(e) => setConfig({ ...config, purchaseOrderColPriceUnitWidth: parseFloat(e.target.value) || 31.75 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="purchaseOrder-col-price-unit-padding">Padding (mm)</Label>
                    <Input
                      id="purchaseOrder-col-price-unit-padding"
                      type="number"
                      min="0"
                      max="20"
                      step="0.01"
                      value={config.purchaseOrderColPriceUnitPadding ?? 5.61}
                      onChange={(e) => setConfig({ ...config, purchaseOrderColPriceUnitPadding: parseFloat(e.target.value) || 5.61 })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Column 7: Price excluding tax */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Column 7: Price excluding tax</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="purchaseOrder-col-price-total-width">Width (mm)</Label>
                    <Input
                      id="purchaseOrder-col-price-total-width"
                      type="number"
                      min="10"
                      max="150"
                      step="0.01"
                      value={config.purchaseOrderColPriceTotalWidth ?? 31.75}
                      onChange={(e) => setConfig({ ...config, purchaseOrderColPriceTotalWidth: parseFloat(e.target.value) || 31.75 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="purchaseOrder-col-price-total-padding">Padding (mm)</Label>
                    <Input
                      id="purchaseOrder-col-price-total-padding"
                      type="number"
                      min="0"
                      max="20"
                      step="0.01"
                      value={config.purchaseOrderColPriceTotalPadding ?? 5.61}
                      onChange={(e) => setConfig({ ...config, purchaseOrderColPriceTotalPadding: parseFloat(e.target.value) || 5.61 })}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Empty Rows Settings */}
          <div className="space-y-4 pb-6 border-b">
            <div>
              <Label htmlFor="purchaseOrder-empty-rows">Empty Rows (number)</Label>
              <Input
                id="purchaseOrder-empty-rows"
                type="number"
                min="0"
                max="20"
                value={config.purchaseOrderEmptyRows ?? 8}
                onChange={(e) => setConfig({ ...config, purchaseOrderEmptyRows: parseInt(e.target.value) ?? 8 })}
              />
              <p className="text-xs text-muted-foreground mt-1">Number of extra empty rows to add at the bottom of the items table</p>
            </div>
            <div>
              <Label htmlFor="purchaseOrder-last-page-table-max-height">Last Page Table Max Height (mm)</Label>
              <Input
                id="purchaseOrder-last-page-table-max-height"
                type="number"
                min="50"
                max="250"
                value={config.purchaseOrderLastPageTableMaxHeight ?? 150}
                onChange={(e) => setConfig({ ...config, purchaseOrderLastPageTableMaxHeight: parseInt(e.target.value) ?? 150 })}
              />
              <p className="text-xs text-muted-foreground mt-1">Maximum height of items table on last page (page with summary + terms section)</p>
            </div>
            <div>
              <Label htmlFor="purchaseOrder-first-page-table-max-height">First Page Table Max Height (mm)</Label>
              <Input
                id="purchaseOrder-first-page-table-max-height"
                type="number"
                min="50"
                max="250"
                value={config.purchaseOrderFirstPageTableMaxHeight ?? 180}
                onChange={(e) => setConfig({ ...config, purchaseOrderFirstPageTableMaxHeight: parseInt(e.target.value) ?? 180 })}
              />
              <p className="text-xs text-muted-foreground mt-1">Maximum height of items table on first page (page with header and customer info)</p>
            </div>
            <div>
              <Label htmlFor="purchaseOrder-other-pages-table-max-height">Other Pages Table Max Height (mm)</Label>
              <Input
                id="purchaseOrder-other-pages-table-max-height"
                type="number"
                min="50"
                max="250"
                value={config.purchaseOrderOtherPagesTableMaxHeight ?? 180}
                onChange={(e) => setConfig({ ...config, purchaseOrderOtherPagesTableMaxHeight: parseInt(e.target.value) ?? 180 })}
              />
              <p className="text-xs text-muted-foreground mt-1">Maximum height of items table on other pages (pages without header and footer)</p>
            </div>
            <div>
              <Label htmlFor="purchaseOrder-single-page-table-max-height">Single Page Table Max Height (mm)</Label>
              <Input
                id="purchaseOrder-single-page-table-max-height"
                type="number"
                min="50"
                max="297"
                value={config.purchaseOrderSinglePageTableMaxHeight ?? 297}
                onChange={(e) => setConfig({ ...config, purchaseOrderSinglePageTableMaxHeight: parseInt(e.target.value) ?? 297 })}
              />
              <p className="text-xs text-muted-foreground mt-1">Maximum height of items table when purchaseOrder is single page (no height limit - full A4 height)</p>
            </div>
          </div>

          {/* Footer Settings */}
          <div className="space-y-4 pb-6 border-b">
            <h3 className="text-lg font-semibold mb-4">3. Footer Settings</h3>

            <div className="space-y-4 pt-4">
              <h4 className="font-medium">Terms & Conditions Settings</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchaseOrder-terms-position">Position</Label>
                  <Select
                    id="purchaseOrder-terms-position"
                    value={config.purchaseOrderTermsPosition || "left"}
                    onValueChange={(value: any) => setConfig({ ...config, purchaseOrderTermsPosition: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border shadow-md rounded-lg" style={{ backgroundColor: theme === 'dark' ? 'black' : 'white' }}>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="purchaseOrder-terms-title">Title Text</Label>
                  <Input
                    id="purchaseOrder-terms-title"
                    value={config.purchaseOrderTermsTitle || "Terms and conditions"}
                    onChange={(e) => setConfig({ ...config, purchaseOrderTermsTitle: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="purchaseOrder-terms-font-family">Font Family</Label>
                  <Select
                    id="purchaseOrder-terms-font-family"
                    value={config.purchaseOrderTermsFontFamily || "HELVETICA"}
                    onValueChange={(value: any) => setConfig({ ...config, purchaseOrderTermsFontFamily: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border shadow-md rounded-lg" style={{ backgroundColor: theme === 'dark' ? 'black' : 'white' }}>
                      <SelectItem value="HELVETICA">Helvetica</SelectItem>
                      <SelectItem value="TIMES_ROMAN">Times Roman</SelectItem>
                      <SelectItem value="COURIER">Courier</SelectItem>
                      <SelectItem value="ARIAL">Arial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="purchaseOrder-terms-font-size">Font Size (px)</Label>
                  <Input
                    id="purchaseOrder-terms-font-size"
                    type="number"
                    min="8"
                    max="72"
                    value={config.purchaseOrderTermsFontSize || 11}
                    onChange={(e) => setConfig({ ...config, purchaseOrderTermsFontSize: parseInt(e.target.value) || 11 })}
                  />
                </div>
                <div>
                  <Label htmlFor="purchaseOrder-terms-text-color">Color</Label>
                  <Input
                    id="purchaseOrder-terms-text-color"
                    type="color"
                    value={config.purchaseOrderTermsTextColor || "#000000"}
                    onChange={(e) => setConfig({ ...config, purchaseOrderTermsTextColor: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="purchaseOrder-terms-line-spacing">Line Spacing</Label>
                  <Input
                    id="purchaseOrder-terms-line-spacing"
                    type="number"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={config.purchaseOrderTermsLineSpacing || 1}
                    onChange={(e) => setConfig({ ...config, purchaseOrderTermsLineSpacing: parseFloat(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label htmlFor="purchaseOrder-terms-letter-spacing">Letter Spacing (px)</Label>
                  <Input
                    id="purchaseOrder-terms-letter-spacing"
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={config.purchaseOrderTermsLetterSpacing || 0}
                    onChange={(e) => setConfig({ ...config, purchaseOrderTermsLetterSpacing: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="purchaseOrder-terms-bold"
                    checked={config.purchaseOrderTermsBold || false}
                    onCheckedChange={(checked) => setConfig({ ...config, purchaseOrderTermsBold: checked })}
                  />
                  <Label htmlFor="purchaseOrder-terms-bold" className="cursor-pointer">Bold</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="purchaseOrder-terms-underline"
                    checked={config.purchaseOrderTermsUnderline || false}
                    onCheckedChange={(checked) => setConfig({ ...config, purchaseOrderTermsUnderline: checked })}
                  />
                  <Label htmlFor="purchaseOrder-terms-underline" className="cursor-pointer">Underline</Label>
                </div>
              </div>
            </div>

            {/* Individual Terms Settings */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-semibold">Terms Content</h4>

              {/* Delivery Term */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="terms-include-delivery"
                      checked={config.purchaseOrderTermsIncludeDelivery ?? true}
                      onCheckedChange={(checked) => setConfig({ ...config, purchaseOrderTermsIncludeDelivery: checked })}
                    />
                    <Label htmlFor="terms-include-delivery" className="cursor-pointer font-medium">Include Delivery Term</Label>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Time Type</Label>
                    <Select
                      value={config.purchaseOrderTermsDeliveryType || "range"}
                      onValueChange={(value: any) => setConfig({ ...config, purchaseOrderTermsDeliveryType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Time</SelectItem>
                        <SelectItem value="range">Time Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Time From</Label>
                    <Input
                      type="number"
                      min="1"
                      value={config.purchaseOrderTermsDeliveryTimeFrom ?? 3}
                      onChange={(e) => setConfig({ ...config, purchaseOrderTermsDeliveryTimeFrom: parseInt(e.target.value) || 3 })}
                    />
                  </div>
                  
                  {config.purchaseOrderTermsDeliveryType === "range" && (
                    <div>
                      <Label>Time To</Label>
                      <Input
                        type="number"
                        min="1"
                        value={config.purchaseOrderTermsDeliveryTimeTo ?? 4}
                        onChange={(e) => setConfig({ ...config, purchaseOrderTermsDeliveryTimeTo: parseInt(e.target.value) || 4 })}
                      />
                    </div>
                  )}
                  
                  <div>
                    <Label>Time Unit</Label>
                    <Select
                      value={config.purchaseOrderTermsDeliveryTimeUnit || "months"}
                      onValueChange={(value: any) => setConfig({ ...config, purchaseOrderTermsDeliveryTimeUnit: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">Days</SelectItem>
                        <SelectItem value="weeks">Weeks</SelectItem>
                        <SelectItem value="months">Months</SelectItem>
                        <SelectItem value="years">Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Validity Term */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="terms-include-validity"
                      checked={config.purchaseOrderTermsIncludeValidity ?? true}
                      onCheckedChange={(checked) => setConfig({ ...config, purchaseOrderTermsIncludeValidity: checked })}
                    />
                    <Label htmlFor="terms-include-validity" className="cursor-pointer font-medium">Include Validity Term</Label>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Time Type</Label>
                    <Select
                      value={config.purchaseOrderTermsValidityType || "fixed"}
                      onValueChange={(value: any) => setConfig({ ...config, purchaseOrderTermsValidityType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Time</SelectItem>
                        <SelectItem value="range">Time Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Time</Label>
                    <Input
                      type="number"
                      min="1"
                      value={config.purchaseOrderTermsValidityTime ?? 3}
                      onChange={(e) => setConfig({ ...config, purchaseOrderTermsValidityTime: parseInt(e.target.value) || 3 })}
                    />
                  </div>
                  
                  {config.purchaseOrderTermsValidityType === "range" && (
                    <div>
                      <Label>Time To</Label>
                      <Input
                        type="number"
                        min="1"
                        value={config.purchaseOrderTermsValidityTimeTo ?? 6}
                        onChange={(e) => setConfig({ ...config, purchaseOrderTermsValidityTimeTo: parseInt(e.target.value) || 6 })}
                      />
                    </div>
                  )}
                  
                  <div>
                    <Label>Time Unit</Label>
                    <Select
                      value={config.purchaseOrderTermsValidityTimeUnit || "months"}
                      onValueChange={(value: any) => setConfig({ ...config, purchaseOrderTermsValidityTimeUnit: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">Days</SelectItem>
                        <SelectItem value="weeks">Weeks</SelectItem>
                        <SelectItem value="months">Months</SelectItem>
                        <SelectItem value="years">Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Warranty Term */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="terms-include-warranty"
                      checked={config.purchaseOrderTermsIncludeWarranty ?? true}
                      onCheckedChange={(checked) => setConfig({ ...config, purchaseOrderTermsIncludeWarranty: checked })}
                    />
                    <Label htmlFor="terms-include-warranty" className="cursor-pointer font-medium">Include Warranty Term</Label>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Time Type</Label>
                    <Select
                      value={config.purchaseOrderTermsWarrantyType || "fixed"}
                      onValueChange={(value: any) => setConfig({ ...config, purchaseOrderTermsWarrantyType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Time</SelectItem>
                        <SelectItem value="range">Time Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Time</Label>
                    <Input
                      type="number"
                      min="1"
                      value={config.purchaseOrderTermsWarrantyTime ?? 12}
                      onChange={(e) => setConfig({ ...config, purchaseOrderTermsWarrantyTime: parseInt(e.target.value) || 12 })}
                    />
                  </div>
                  
                  {config.purchaseOrderTermsWarrantyType === "range" && (
                    <div>
                      <Label>Time To</Label>
                      <Input
                        type="number"
                        min="1"
                        value={config.purchaseOrderTermsWarrantyTimeTo ?? 24}
                        onChange={(e) => setConfig({ ...config, purchaseOrderTermsWarrantyTimeTo: parseInt(e.target.value) || 24 })}
                      />
                    </div>
                  )}
                  
                  <div>
                    <Label>Time Unit</Label>
                    <Select
                      value={config.purchaseOrderTermsWarrantyTimeUnit || "months"}
                      onValueChange={(value: any) => setConfig({ ...config, purchaseOrderTermsWarrantyTimeUnit: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">Days</SelectItem>
                        <SelectItem value="weeks">Weeks</SelectItem>
                        <SelectItem value="months">Months</SelectItem>
                        <SelectItem value="years">Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Confirmation Term */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="terms-include-confirmation"
                      checked={config.purchaseOrderTermsIncludeConfirmation ?? true}
                      onCheckedChange={(checked) => setConfig({ ...config, purchaseOrderTermsIncludeConfirmation: checked })}
                    />
                    <Label htmlFor="terms-include-confirmation" className="cursor-pointer font-medium">Include Confirmation Term</Label>
                  </div>
                </div>
                
                <div>
                  <Label>Delivery Condition</Label>
                  <Select
                    value={config.purchaseOrderTermsDeliveryCondition || "after_order_confirmation"}
                    onValueChange={(value: any) => setConfig({ ...config, purchaseOrderTermsDeliveryCondition: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="after_order_confirmation">After Order Confirmation</SelectItem>
                      <SelectItem value="after_payment">After Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Payment Method Term */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="terms-include-payment"
                      checked={config.purchaseOrderTermsIncludePayment ?? true}
                      onCheckedChange={(checked) => setConfig({ ...config, purchaseOrderTermsIncludePayment: checked })}
                    />
                    <Label htmlFor="terms-include-payment" className="cursor-pointer font-medium">Include Payment Method Term</Label>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Payment Method</Label>
                    <Select
                      value={config.purchaseOrderTermsPaymentMethod || "split_payment"}
                      onValueChange={(value: any) => setConfig({ ...config, purchaseOrderTermsPaymentMethod: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="online">Online Payment</SelectItem>
                        <SelectItem value="website">Website Payment</SelectItem>
                        <SelectItem value="check">Payment by Check</SelectItem>
                        <SelectItem value="cash">Cash Payment</SelectItem>
                        <SelectItem value="split_payment">Split Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {config.purchaseOrderTermsPaymentMethod === "split_payment" && (
                    <div>
                      <Label>Payment at Order (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={config.purchaseOrderTermsSplitPaymentPercent ?? 50}
                        onChange={(e) => setConfig({ ...config, purchaseOrderTermsSplitPaymentPercent: parseInt(e.target.value) || 50 })}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Price in Words Term */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms-include-price-in-words"
                    checked={config.purchaseOrderTermsIncludePriceInWords ?? true}
                    onCheckedChange={(checked) => setConfig({ ...config, purchaseOrderTermsIncludePriceInWords: checked })}
                  />
                  <Label htmlFor="terms-include-price-in-words" className="cursor-pointer font-medium">Include Total Price in Words</Label>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <h4 className="font-medium">Signature Settings</h4>
              
              {/* Signature Count */}
              <div className="space-y-4">
                <Label htmlFor="purchaseOrder-signature-count">Number of Signatures</Label>
                <Select
                  id="purchaseOrder-signature-count"
                  value={String(config.purchaseOrderSignatureCount || 2)}
                  onValueChange={(value: string) => setConfig({ ...config, purchaseOrderSignatureCount: parseInt(value) as 1 | 2 })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border shadow-md rounded-lg" style={{ backgroundColor: theme === 'dark' ? 'black' : 'white' }}>
                    <SelectItem value="1">1 Signature</SelectItem>
                    <SelectItem value="2">2 Signatures</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Single Signature Position */}
              {config.purchaseOrderSignatureCount === 1 && (
                <div className="space-y-4">
                  <Label htmlFor="purchaseOrder-signature-position">Signature Position</Label>
                  <Select
                    id="purchaseOrder-signature-position"
                    value={config.purchaseOrderSignaturePosition || "right"}
                    onValueChange={(value: "right" | "left" | "middle") => setConfig({ ...config, purchaseOrderSignaturePosition: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border shadow-md rounded-lg" style={{ backgroundColor: theme === 'dark' ? 'black' : 'white' }}>
                      <SelectItem value="right">Right (Default)</SelectItem>
                      <SelectItem value="middle">Middle</SelectItem>
                      <SelectItem value="left">Left</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Signature Line Width */}
              <div className="space-y-4">
                <Label htmlFor="purchaseOrder-signature-line-width">Signature Line Width (px)</Label>
                <Input
                  id="purchaseOrder-signature-line-width"
                  type="number"
                  min="50"
                  max="300"
                  step="10"
                  value={config.purchaseOrderSignatureLineWidth || 150}
                  onChange={(e) => setConfig({ ...config, purchaseOrderSignatureLineWidth: parseInt(e.target.value) || 150 })}
                />
              </div>

              {/* Signature Labels */}
              <div className="space-y-4 pt-4">
                <h4 className="font-medium">Signature Labels</h4>
                <div className="grid grid-cols-2 gap-4">
                  {config.purchaseOrderSignatureCount === 1 ? (
                    <div className="col-span-2">
                      <Label htmlFor="purchaseOrder-signature-left-label">Signature Label</Label>
                      <Select
                        id="purchaseOrder-signature-left-label"
                        value={config.purchaseOrderSignatureLeftLabelText || "Gérant"}
                        onValueChange={(value: string) => setConfig({ ...config, purchaseOrderSignatureLeftLabelText: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select label" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border shadow-md rounded-lg" style={{ backgroundColor: theme === 'dark' ? 'black' : 'white' }}>
                          <SelectItem value="Manager">Manager</SelectItem>
                          <SelectItem value="Director">Director</SelectItem>
                          <SelectItem value="Supplier">Supplier</SelectItem>
                          <SelectItem value="Representative">Representative</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <>
                      <div>
                        <Label htmlFor="purchaseOrder-signature-left-label">Left Signature Label</Label>
                        <Select
                          id="purchaseOrder-signature-left-label"
                          value={config.purchaseOrderSignatureLeftLabelText || "Gérant"}
                          onValueChange={(value: string) => setConfig({ ...config, purchaseOrderSignatureLeftLabelText: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select label" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border shadow-md rounded-lg" style={{ backgroundColor: theme === 'dark' ? 'black' : 'white' }}>
                            <SelectItem value="Manager">Manager</SelectItem>
                            <SelectItem value="Director">Director</SelectItem>
                            <SelectItem value="Supplier">Supplier</SelectItem>
                            <SelectItem value="Representative">Representative</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="purchaseOrder-signature-right-label">Right Signature Label</Label>
                        <Select
                          id="purchaseOrder-signature-right-label"
                          value={config.purchaseOrderSignatureRightLabelText || "Supplier"}
                          onValueChange={(value: string) => setConfig({ ...config, purchaseOrderSignatureRightLabelText: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select label" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border shadow-md rounded-lg" style={{ backgroundColor: theme === 'dark' ? 'black' : 'white' }}>
                            <SelectItem value="Manager">Manager</SelectItem>
                            <SelectItem value="Director">Director</SelectItem>
                            <SelectItem value="Supplier">Supplier</SelectItem>
                            <SelectItem value="Representative">Representative</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Individual Signature Controls */}
              {config.purchaseOrderSignatureCount === 2 && (
                <div className="space-y-4 pt-4">
                  <h4 className="font-medium">Individual Signature Controls</h4>

                  {/* Left Signature Controls */}
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-left-signature"
                        checked={config.purchaseOrderIncludeLeftSignature !== false}
                        onCheckedChange={(checked) => setConfig({ ...config, purchaseOrderIncludeLeftSignature: checked as boolean })}
                      />
                      <Label htmlFor="include-left-signature" className="cursor-pointer font-medium">Include Left Signature</Label>
                    </div>

                    {config.purchaseOrderIncludeLeftSignature !== false && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="left-signature-offset-x">Horizontal Offset (px)</Label>
                          <Input
                            id="left-signature-offset-x"
                            type="number"
                            min="-100"
                            max="100"
                            step="1"
                            value={config.purchaseOrderLeftSignatureOffsetX || 0}
                            onChange={(e) => setConfig({ ...config, purchaseOrderLeftSignatureOffsetX: parseInt(e.target.value) || 0 })}
                          />
                          <p className="text-xs text-muted-foreground">Positive = right, Negative = left</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="left-signature-offset-y">Vertical Offset (px)</Label>
                          <Input
                            id="left-signature-offset-y"
                            type="number"
                            min="-100"
                            max="100"
                            step="1"
                            value={config.purchaseOrderLeftSignatureOffsetY || 0}
                            onChange={(e) => setConfig({ ...config, purchaseOrderLeftSignatureOffsetY: parseInt(e.target.value) || 0 })}
                          />
                          <p className="text-xs text-muted-foreground">Positive = down, Negative = up</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Signature Controls */}
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-right-signature"
                        checked={config.purchaseOrderIncludeRightSignature !== false}
                        onCheckedChange={(checked) => setConfig({ ...config, purchaseOrderIncludeRightSignature: checked as boolean })}
                      />
                      <Label htmlFor="include-right-signature" className="cursor-pointer font-medium">Include Right Signature</Label>
                    </div>

                    {config.purchaseOrderIncludeRightSignature !== false && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="right-signature-offset-x">Horizontal Offset (px)</Label>
                          <Input
                            id="right-signature-offset-x"
                            type="number"
                            min="-100"
                            max="100"
                            step="1"
                            value={config.purchaseOrderRightSignatureOffsetX || 0}
                            onChange={(e) => setConfig({ ...config, purchaseOrderRightSignatureOffsetX: parseInt(e.target.value) || 0 })}
                          />
                          <p className="text-xs text-muted-foreground">Positive = right, Negative = left</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="right-signature-offset-y">Vertical Offset (px)</Label>
                          <Input
                            id="right-signature-offset-y"
                            type="number"
                            min="-100"
                            max="100"
                            step="1"
                            value={config.purchaseOrderRightSignatureOffsetY || 0}
                            onChange={(e) => setConfig({ ...config, purchaseOrderRightSignatureOffsetY: parseInt(e.target.value) || 0 })}
                          />
                          <p className="text-xs text-muted-foreground">Positive = down, Negative = up</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Single Signature Controls */}
              {config.purchaseOrderSignatureCount === 1 && (
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-single-signature"
                      checked={config.purchaseOrderIncludeLeftSignature !== false}
                      onCheckedChange={(checked) => setConfig({ ...config, purchaseOrderIncludeLeftSignature: checked as boolean })}
                    />
                    <Label htmlFor="include-single-signature" className="cursor-pointer font-medium">Include Signature</Label>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 pt-4">
              <h4 className="font-medium">QR Code Settings</h4>

              {/* Include QR Code */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-qr-code"
                  checked={config.includeQrCode || false}
                  onCheckedChange={(checked) => setConfig({ ...config, includeQrCode: checked as boolean })}
                />
                <Label htmlFor="include-qr-code">Show QR Code Placeholder</Label>
              </div>

              {config.includeQrCode && (
                <>
                  {/* QR Code Size */}
                  <div className="space-y-2">
                    <Label htmlFor="qr-code-size">QR Code Size (px)</Label>
                    <Input
                      id="qr-code-size"
                      type="number"
                      min="30"
                      max="150"
                      step="5"
                      value={config.qrCodeSize || 50}
                      onChange={(e) => setConfig({ ...config, qrCodeSize: parseInt(e.target.value) || 50 })}
                    />
                  </div>

                  {/* QR Code Position X */}
                  <div className="space-y-2">
                    <Label htmlFor="qr-code-offset-x">Horizontal Offset (px)</Label>
                    <Input
                      id="qr-code-offset-x"
                      type="number"
                      min="-100"
                      max="100"
                      step="1"
                      value={config.qrCodeOffsetX || 0}
                      onChange={(e) => setConfig({ ...config, qrCodeOffsetX: parseInt(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-muted-foreground">Positive moves right, negative moves left</p>
                  </div>

                  {/* QR Code Position Y */}
                  <div className="space-y-2">
                    <Label htmlFor="qr-code-offset-y">Vertical Offset (px)</Label>
                    <Input
                      id="qr-code-offset-y"
                      type="number"
                      min="-100"
                      max="100"
                      step="1"
                      value={config.qrCodeOffsetY || 0}
                      onChange={(e) => setConfig({ ...config, qrCodeOffsetY: parseInt(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-muted-foreground">Positive moves up, negative moves down</p>
                  </div>
                </>
              )}
            </div>

            {/* Verification Token Preview */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    {t("verificationToken", "Verification Token")}
                  </h4>
                  <p className="text-xs text-muted-foreground">{t("verificationTokenDesc", "Test token from QR code settings")}</p>
                </div>
              </div>
              
              {testVerificationToken ? (
                <div className="p-3 bg-muted/50 rounded-lg border">
                  <div className="flex items-center justify-between gap-3">
                    <code className="text-xs bg-background px-2 py-1 rounded font-mono truncate max-w-[200px]">
                      {testVerificationToken.substring(0, 32)}...
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCopyTestToken}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t("qrCodeDataPreview", "Will be encoded in QR code")}</p>
                </div>
              ) : (
                <div className="p-3 bg-muted/30 rounded-lg border border-dashed">
                  <p className="text-xs text-muted-foreground text-center">
                    {t("noTestToken", "No test token found")}
                  </p>
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    {t("generateTestTokenInQrSettings", "Generate in QR Code Settings")}
                  </p>
                </div>
              )}
            </div>

            {/* QR Code Preview */}
            {config.includeQrCode && qrCodePreviewUrl && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium flex items-center gap-2">
                      <QrCode className="h-4 w-4 text-primary" />
                      {t("qrCodePreview", "QR Code Preview")}
                    </h4>
                    <p className="text-xs text-muted-foreground">{t("qrCodePreviewDesc", "Using purchaseOrder data and test verification token")}</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  {/* QR Code Image */}
                  <div className="flex-shrink-0">
                    <div className="p-4 bg-background rounded-lg border">
                      <img
                        src={qrCodePreviewUrl}
                        alt="QR Code Preview"
                        className="border rounded-lg"
                        style={{
                          maxWidth: '150px',
                          maxHeight: '150px',
                        }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex-1 space-y-2">
                    <Button
                      onClick={generateQrCodePreview}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {t("refresh", "Refresh")}
                    </Button>
                    <Button
                      onClick={handleDownloadQrCode}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {t("download", "Download")}
                    </Button>
                  </div>
                </div>

                {/* QR Code Settings Info */}
                <div className="p-3 bg-muted/30 rounded-lg border text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("qrCodeSize", "Size")}:</span>
                    <span className="font-medium">{qrCodeSettings.size}px</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("errorCorrectionLevel", "Error Correction")}:</span>
                    <span className="font-medium">{qrCodeSettings.errorCorrectionLevel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("foregroundColor", "Foreground")}:</span>
                    <span className="font-medium font-mono">{qrCodeSettings.foregroundColor}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4 pt-4">
              <h4 className="font-medium">Page Number Settings</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchaseOrder-page-number-position">Position</Label>
                  <Select
                    id="purchaseOrder-page-number-position"
                    value={config.purchaseOrderPageNumberPosition || "center"}
                    onValueChange={(value: any) => setConfig({ ...config, purchaseOrderPageNumberPosition: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border shadow-md rounded-lg" style={{ backgroundColor: theme === 'dark' ? 'black' : 'white' }}>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="purchaseOrder-page-number-font-family">Font Family</Label>
                  <Select
                    id="purchaseOrder-page-number-font-family"
                    value={config.purchaseOrderPageNumberFontFamily || "HELVETICA"}
                    onValueChange={(value: any) => setConfig({ ...config, purchaseOrderPageNumberFontFamily: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border shadow-md rounded-lg" style={{ backgroundColor: theme === 'dark' ? 'black' : 'white' }}>
                      <SelectItem value="HELVETICA">Helvetica</SelectItem>
                      <SelectItem value="TIMES_ROMAN">Times Roman</SelectItem>
                      <SelectItem value="COURIER">Courier</SelectItem>
                      <SelectItem value="ARIAL">Arial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="purchaseOrder-page-number-font-size">Font Size (px)</Label>
                  <Input
                    id="purchaseOrder-page-number-font-size"
                    type="number"
                    min="8"
                    max="24"
                    value={config.purchaseOrderPageNumberFontSize || 10}
                    onChange={(e) => setConfig({ ...config, purchaseOrderPageNumberFontSize: parseInt(e.target.value) || 10 })}
                  />
                </div>
                <div>
                  <Label htmlFor="purchaseOrder-page-number-text-color">Text Color</Label>
                  <Input
                    id="purchaseOrder-page-number-text-color"
                    type="color"
                    value={config.purchaseOrderPageNumberTextColor || "#666666"}
                    onChange={(e) => setConfig({ ...config, purchaseOrderPageNumberTextColor: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="purchaseOrder-page-number-offset-x">Horizontal Offset (px)</Label>
                  <Input
                    id="purchaseOrder-page-number-offset-x"
                    type="number"
                    min="-50"
                    max="50"
                    value={config.purchaseOrderPageNumberOffsetX || 0}
                    onChange={(e) => setConfig({ ...config, purchaseOrderPageNumberOffsetX: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="purchaseOrder-page-number-offset-y">Vertical Offset (mm)</Label>
                <Input
                  id="purchaseOrder-page-number-offset-y"
                  type="number"
                  min="-20"
                  max="20"
                  step="1"
                  value={config.purchaseOrderPageNumberOffsetY || 0}
                  onChange={(e) => setConfig({ ...config, purchaseOrderPageNumberOffsetY: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Margin Settings */}
            <div className="space-y-4 pt-4">
              <h4 className="font-medium">Margin Settings</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="page-border-margin">Page Border Margin (px)</Label>
                  <Input
                    id="page-border-margin"
                    type="number"
                    min="0"
                    max="50"
                    value={config.pageBorderMargin || 10}
                    onChange={(e) => setConfig({ ...config, pageBorderMargin: parseInt(e.target.value) || 10 })}
                  />
                </div>
                <div>
                  <Label htmlFor="header-section-margin">Header Section Margin (px)</Label>
                  <Input
                    id="header-section-margin"
                    type="number"
                    min="0"
                    max="50"
                    value={config.headerSectionMargin || 0}
                    onChange={(e) => setConfig({ ...config, headerSectionMargin: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="facture-number-margin">Facture Number Margin (px)</Label>
                  <Input
                    id="facture-number-margin"
                    type="number"
                    min="0"
                    max="50"
                    value={config.factureNumberMargin || 0}
                    onChange={(e) => setConfig({ ...config, factureNumberMargin: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="supplier-info-margin">Supplier Info Margin (px)</Label>
                  <Input
                    id="supplier-info-margin"
                    type="number"
                    min="0"
                    max="50"
                    value={config.clientInfoMargin || 5}
                    onChange={(e) => setConfig({ ...config, clientInfoMargin: parseInt(e.target.value) || 5 })}
                  />
                </div>
                <div>
                  <Label htmlFor="date-margin">Date Margin (px)</Label>
                  <Input
                    id="date-margin"
                    type="number"
                    min="0"
                    max="50"
                    value={config.dateMargin || 5}
                    onChange={(e) => setConfig({ ...config, dateMargin: parseInt(e.target.value) || 5 })}
                  />
                </div>
                <div>
                  <Label htmlFor="item-table-margin">Item Table Margin (px)</Label>
                  <Input
                    id="item-table-margin"
                    type="number"
                    min="0"
                    max="50"
                    value={config.itemTableMargin || 5}
                    onChange={(e) => setConfig({ ...config, itemTableMargin: parseInt(e.target.value) || 5 })}
                  />
                </div>
                <div>
                  <Label htmlFor="summary-table-margin">Summary Table Margin (px)</Label>
                  <Input
                    id="summary-table-margin"
                    type="number"
                    min="0"
                    max="50"
                    value={config.summaryTableMargin || 5}
                    onChange={(e) => setConfig({ ...config, summaryTableMargin: parseInt(e.target.value) || 5 })}
                  />
                </div>
                <div>
                  <Label htmlFor="terms-section-margin">Terms Section Margin (px)</Label>
                  <Input
                    id="terms-section-margin"
                    type="number"
                    min="0"
                    max="50"
                    value={config.termsSectionMargin || 5}
                    onChange={(e) => setConfig({ ...config, termsSectionMargin: parseInt(e.target.value) || 5 })}
                  />
                </div>
                <div>
                  <Label htmlFor="signature-section-margin">Signature Section Margin (px)</Label>
                  <Input
                    id="signature-section-margin"
                    type="number"
                    min="0"
                    max="50"
                    value={config.signatureSectionMargin || 10}
                    onChange={(e) => setConfig({ ...config, signatureSectionMargin: parseInt(e.target.value) || 10 })}
                  />
                </div>
                <div>
                  <Label htmlFor="page-number-margin">Page Number Margin (px)</Label>
                  <Input
                    id="page-number-margin"
                    type="number"
                    min="0"
                    max="50"
                    value={config.pageNumberMargin || 5}
                    onChange={(e) => setConfig({ ...config, pageNumberMargin: parseInt(e.target.value) || 5 })}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <PurchaseOrderPreviewDialog
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        previewData={
          config && company && customers.length > 0 && machineModels.length > 0 ? {
            config: config as UtilPDFConfiguration,
            company: company as UtilCompany,
            customer: customers[0] as UtilCustomer,
            machineModels: machineModels as UtilMachineModel[],
            selectedLanguage,
            selectedCurrency,
            exchangeRates,
            logoBase64,
            qrCodeImageUrl,
          } : null
        }
        config={config as UtilPDFConfiguration}
        onConfigChange={setConfig}
        showSettingsSidebar={true}
      />

    </div>
  );
}
