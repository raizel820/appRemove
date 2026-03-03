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
import ProformaPreviewDialog from "@/components/proforma/ProformaPreviewDialog";

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

  // Proforma Top Body Part
  proformaTopBodyDirection?: "LTR" | "RTL";
  // Title settings
  proformaTitlePosition?: "left" | "center" | "right";
  proformaTitleFontFamily?: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  proformaTitleFontSize?: number;
  proformaTitleTextColor?: string;
  proformaTitleLineSpacing?: number;
  proformaTitleLetterSpacing?: number;
  proformaTitleBold?: boolean;
  proformaTitleUnderline?: boolean;
  // Customer settings
  // Customer info position
  proformaClientInfoPosition?: "left" | "center" | "right";
  proformaClientLabelText?: string;

  // Customer info settings - Label
  proformaClientLabelFontFamily?: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  proformaClientLabelFontSize?: number;
  proformaClientLabelTextColor?: string;
  proformaClientLabelLineSpacing?: number;
  proformaClientLabelLetterSpacing?: number;
  proformaClientLabelBold?: boolean;
  proformaClientLabelUnderline?: boolean;

  // Customer info settings - Value
  proformaClientValueFontFamily?: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  proformaClientValueFontSize?: number;
  proformaClientValueTextColor?: string;
  proformaClientValueLineSpacing?: number;
  proformaClientValueLetterSpacing?: number;
  proformaClientValueBold?: boolean;
  proformaClientValueUnderline?: boolean;

  // Date settings
  proformaDatePosition?: "left" | "center" | "right";
  proformaLocationDateLabelText?: string;
  proformaDateFontFamily?: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  proformaDateFontSize?: number;
  proformaDateTextColor?: string;
  proformaDateLineSpacing?: number;
  proformaDateLetterSpacing?: number;
  proformaDateBold?: boolean;
  proformaDateUnderline?: boolean;

  // Table settings
  proformaTableTextAlignment?: "left" | "center" | "right";
  proformaTableDirection?: "LTR" | "RTL";
  // Table labels
  proformaTableLabelFontFamily?: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  proformaTableLabelFontSize?: number;
  proformaTableLabelTextColor?: string;
  proformaTableLabelLineSpacing?: number;
  proformaTableLabelLetterSpacing?: number;
  proformaTableLabelBold?: boolean;
  proformaTableLabelUnderline?: boolean;
  // Table values
  proformaTableValueFontFamily?: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  proformaTableValueFontSize?: number;
  proformaTableValueTextColor?: string;
  proformaTableValueLineSpacing?: number;
  proformaTableValueLetterSpacing?: number;
  proformaTableValueBold?: boolean;
  proformaTableValueUnderline?: boolean;
  proformaEmptyRows?: number;
  proformaFirstPageTableMaxHeight?: number;
  proformaSinglePageTableMaxHeight?: number;
  proformaLastPageTableMaxHeight?: number;
  proformaOtherPagesTableMaxHeight?: number;

  // Column-specific settings for items table
  proformaColNumberWidth?: number;
  proformaColNumberPadding?: number;
  proformaColFamilyWidth?: number;
  proformaColFamilyPadding?: number;
  proformaColModelWidth?: number;
  proformaColModelPadding?: number;
  proformaColBrandWidth?: number;
  proformaColBrandPadding?: number;
  proformaColQuantityWidth?: number;
  proformaColQuantityPadding?: number;
  proformaColPriceUnitWidth?: number;
  proformaColPriceUnitPadding?: number;
  proformaColPriceTotalWidth?: number;
  proformaColPriceTotalPadding?: number;

  // Footer terms settings
  proformaTermsPosition?: "left" | "center" | "right";
  proformaTermsTitle?: string;
  proformaTermsFontFamily?: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  proformaTermsFontSize?: number;
  proformaTermsTextColor?: string;
  proformaTermsLineSpacing?: number;
  proformaTermsLetterSpacing?: number;
  proformaTermsBold?: boolean;
  proformaTermsUnderline?: boolean;

  // Individual Terms Settings
  proformaTermsIncludeDelivery?: boolean;
  proformaTermsDeliveryType?: "fixed" | "range";
  proformaTermsDeliveryTimeFrom?: number;
  proformaTermsDeliveryTimeTo?: number | null;
  proformaTermsDeliveryTimeUnit?: "days" | "weeks" | "months" | "years";

  proformaTermsIncludeValidity?: boolean;
  proformaTermsValidityType?: "fixed" | "range";
  proformaTermsValidityTime?: number;
  proformaTermsValidityTimeTo?: number | null;
  proformaTermsValidityTimeUnit?: "days" | "weeks" | "months" | "years";

  proformaTermsIncludeWarranty?: boolean;
  proformaTermsWarrantyType?: "fixed" | "range";
  proformaTermsWarrantyTime?: number;
  proformaTermsWarrantyTimeTo?: number | null;
  proformaTermsWarrantyTimeUnit?: "days" | "weeks" | "months" | "years";

  proformaTermsIncludeConfirmation?: boolean;
  proformaTermsDeliveryCondition?: "after_order_confirmation" | "after_payment";

  proformaTermsIncludePayment?: boolean;
  proformaTermsPaymentMethod?: "online" | "website" | "check" | "cash" | "split_payment";
  proformaTermsSplitPaymentPercent?: number;
  proformaTermsIncludePriceInWords?: boolean;

  // Signature settings
  proformaSignatureCount?: number;
  proformaSignaturePosition?: "right" | "left" | "middle";
  proformaSignatureLeftLabelText?: string;
  proformaSignatureRightLabelText?: string;
  proformaSignatureLineWidth?: number;
  savedSignatureLabels?: string;

  // Individual signature controls
  proformaIncludeLeftSignature?: boolean;
  proformaLeftSignatureOffsetX?: number;
  proformaLeftSignatureOffsetY?: number;
  proformaIncludeRightSignature?: boolean;
  proformaRightSignatureOffsetX?: number;
  proformaRightSignatureOffsetY?: number;

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
  proformaPageNumberFontFamily?: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  proformaPageNumberFontSize?: number;
  proformaPageNumberTextColor?: string;
  proformaPageNumberPosition?: "left" | "center" | "right";
  proformaPageNumberOffsetX?: number;
  proformaPageNumberOffsetY?: number;

  // QR Code settings
  includeQrCode?: boolean;
  qrCodeSize?: number;
  qrCodeOffsetX?: number;
  qrCodeOffsetY?: number;

  // Proforma currency and language
  proformaCurrency?: string;
  proformaLanguage?: string;
}

export default function ProformaSettingsSection() {
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
    { id: 'client', key: 'client', translations: { en: 'Client', fr: 'Client', ar: 'العميل' } },
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
      setSelectedCurrency(config.proformaCurrency || "DZD");
      setSelectedLanguage(config.proformaLanguage || "FR");
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
    link.download = `proforma-qr-${Date.now()}.png`;
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

  const proformaTranslations = {
    FR: {
      proforma_number: "Facture Proforma N°",
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
        validityTitle: "Validité de la facture proforma",
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
      proforma_number: "Proforma Invoice N°",
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
        validityTitle: "Proforma invoice validity",
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
      proforma_number: "فاتورة شكلية رقم",
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
      signature: { manager: "المدير", client: "العميل" }
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
      proformaTranslations,
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
        proformaCurrency: selectedCurrency,
        proformaLanguage: selectedLanguage,
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
              <CardTitle>{t("pdfSettingsProforma", "Proforma Invoice")}</CardTitle>
              <CardDescription>{t("pdfSettingsProformaDescription", "Configure proforma invoice-specific PDF settings")}</CardDescription>
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
            The proforma invoice uses global PDF header. Configure header settings in Global Header tab.
          </p>

          {/* Top Body Part Settings */}
          <div className="space-y-4 pb-6 border-b">
            <h3 className="text-lg font-semibold mb-4">1. Top Body Part Settings</h3>

            {/* Writing Direction */}
            <div>
              <Label htmlFor="proforma-top-body-direction">Writing Direction</Label>
              <Select
                id="proforma-top-body-direction"
                value={config.proformaTopBodyDirection || "LTR"}
                onValueChange={(value: any) => setConfig({ ...config, proformaTopBodyDirection: value })}
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
                  <Label htmlFor="proforma-title-position">Position</Label>
                  <Select
                    id="proforma-title-position"
                    value={config.proformaTitlePosition || "center"}
                    onValueChange={(value: any) => setConfig({ ...config, proformaTitlePosition: value })}
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
                  <Label htmlFor="proforma-title-font-family">Font Family</Label>
                  <Select
                    id="proforma-title-font-family"
                    value={config.proformaTitleFontFamily || "HELVETICA"}
                    onValueChange={(value: any) => setConfig({ ...config, proformaTitleFontFamily: value })}
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
                  <Label htmlFor="proforma-title-font-size">Font Size (px)</Label>
                  <Input
                    id="proforma-title-font-size"
                    type="number"
                    min="8"
                    max="72"
                    value={config.proformaTitleFontSize || 16}
                    onChange={(e) => setConfig({ ...config, proformaTitleFontSize: parseInt(e.target.value) || 16 })}
                  />
                </div>
                <div>
                  <Label htmlFor="proforma-title-text-color">Color</Label>
                  <Input
                    id="proforma-title-text-color"
                    type="color"
                    value={config.proformaTitleTextColor || "#000000"}
                    onChange={(e) => setConfig({ ...config, proformaTitleTextColor: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="proforma-title-line-spacing">Line Spacing</Label>
                  <Input
                    id="proforma-title-line-spacing"
                    type="number"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={config.proformaTitleLineSpacing || 1}
                    onChange={(e) => setConfig({ ...config, proformaTitleLineSpacing: parseFloat(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label htmlFor="proforma-title-letter-spacing">Letter Spacing (px)</Label>
                  <Input
                    id="proforma-title-letter-spacing"
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={config.proformaTitleLetterSpacing || 0}
                    onChange={(e) => setConfig({ ...config, proformaTitleLetterSpacing: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="proforma-title-bold"
                    checked={config.proformaTitleBold || false}
                    onCheckedChange={(checked) => setConfig({ ...config, proformaTitleBold: checked })}
                  />
                  <Label htmlFor="proforma-title-bold" className="cursor-pointer">Bold</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="proforma-title-underline"
                    checked={config.proformaTitleUnderline || false}
                    onCheckedChange={(checked) => setConfig({ ...config, proformaTitleUnderline: checked })}
                  />
                  <Label htmlFor="proforma-title-underline" className="cursor-pointer">Underline</Label>
                </div>
              </div>
            </div>

            {/* Customer Settings */}
            <div className="space-y-4 pt-4">
              <h4 className="font-medium">Customer Info Settings</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="proforma-client-info-position">Position</Label>
                  <Select
                    id="proforma-client-info-position"
                    value={config.proformaClientInfoPosition || "left"}
                    onValueChange={(value: any) => setConfig({ ...config, proformaClientInfoPosition: value })}
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
                    <Label htmlFor="proforma-client-label-font-family">Font Family</Label>
                    <Select
                      id="proforma-client-label-font-family"
                      value={config.proformaClientLabelFontFamily || "HELVETICA"}
                      onValueChange={(value: any) => setConfig({ ...config, proformaClientLabelFontFamily: value })}
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
                    <Label htmlFor="proforma-client-label-font-size">Font Size (px)</Label>
                    <Input
                      id="proforma-client-label-font-size"
                      type="number"
                      min="8"
                      max="72"
                      value={config.proformaClientLabelFontSize || 12}
                      onChange={(e) => setConfig({ ...config, proformaClientLabelFontSize: parseInt(e.target.value) || 12 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="proforma-client-label-text-color">Color</Label>
                    <Input
                      id="proforma-client-label-text-color"
                      type="color"
                      value={config.proformaClientLabelTextColor || "#000000"}
                      onChange={(e) => setConfig({ ...config, proformaClientLabelTextColor: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="proforma-client-label-line-spacing">Line Spacing</Label>
                    <Input
                      id="proforma-client-label-line-spacing"
                      type="number"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={config.proformaClientLabelLineSpacing || 1}
                      onChange={(e) => setConfig({ ...config, proformaClientLabelLineSpacing: parseFloat(e.target.value) || 1 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="proforma-client-label-letter-spacing">Letter Spacing (px)</Label>
                    <Input
                      id="proforma-client-label-letter-spacing"
                      type="number"
                      min="0"
                      max="20"
                      step="0.1"
                      value={config.proformaClientLabelLetterSpacing || 0}
                      onChange={(e) => setConfig({ ...config, proformaClientLabelLetterSpacing: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="proforma-client-label-bold"
                      checked={config.proformaClientLabelBold || false}
                      onCheckedChange={(checked) => setConfig({ ...config, proformaClientLabelBold: checked })}
                    />
                    <Label htmlFor="proforma-client-label-bold" className="cursor-pointer">Bold</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="proforma-client-label-underline"
                      checked={config.proformaClientLabelUnderline || false}
                      onCheckedChange={(checked) => setConfig({ ...config, proformaClientLabelUnderline: checked })}
                    />
                    <Label htmlFor="proforma-client-label-underline" className="cursor-pointer">Underline</Label>
                  </div>
                </div>
              </div>

              {/* Value Settings */}
              <div className="border-t pt-4">
                <h5 className="font-medium mb-3">Value Settings</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="proforma-client-value-font-family">Font Family</Label>
                    <Select
                      id="proforma-client-value-font-family"
                      value={config.proformaClientValueFontFamily || "HELVETICA"}
                      onValueChange={(value: any) => setConfig({ ...config, proformaClientValueFontFamily: value })}
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
                    <Label htmlFor="proforma-client-value-font-size">Font Size (px)</Label>
                    <Input
                      id="proforma-client-value-font-size"
                      type="number"
                      min="8"
                      max="72"
                      value={config.proformaClientValueFontSize || 12}
                      onChange={(e) => setConfig({ ...config, proformaClientValueFontSize: parseInt(e.target.value) || 12 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="proforma-client-value-text-color">Color</Label>
                    <Input
                      id="proforma-client-value-text-color"
                      type="color"
                      value={config.proformaClientValueTextColor || "#000000"}
                      onChange={(e) => setConfig({ ...config, proformaClientValueTextColor: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="proforma-client-value-line-spacing">Line Spacing</Label>
                    <Input
                      id="proforma-client-value-line-spacing"
                      type="number"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={config.proformaClientValueLineSpacing || 1}
                      onChange={(e) => setConfig({ ...config, proformaClientValueLineSpacing: parseFloat(e.target.value) || 1 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="proforma-client-value-letter-spacing">Letter Spacing (px)</Label>
                    <Input
                      id="proforma-client-value-letter-spacing"
                      type="number"
                      min="0"
                      max="20"
                      step="0.1"
                      value={config.proformaClientValueLetterSpacing || 0}
                      onChange={(e) => setConfig({ ...config, proformaClientValueLetterSpacing: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="proforma-client-value-bold"
                      checked={config.proformaClientValueBold || false}
                      onCheckedChange={(checked) => setConfig({ ...config, proformaClientValueBold: checked })}
                    />
                    <Label htmlFor="proforma-client-value-bold" className="cursor-pointer">Bold</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="proforma-client-value-underline"
                      checked={config.proformaClientValueUnderline || false}
                      onCheckedChange={(checked) => setConfig({ ...config, proformaClientValueUnderline: checked })}
                    />
                    <Label htmlFor="proforma-client-value-underline" className="cursor-pointer">Underline</Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Date Settings */}
            <div className="space-y-4 pt-4">
              <h4 className="font-medium">Date/Location Settings</h4>

              <div>
                <Label htmlFor="proforma-date-position">Position</Label>
                <Select
                  id="proforma-date-position"
                  value={config.proformaDatePosition || "left"}
                  onValueChange={(value: any) => setConfig({ ...config, proformaDatePosition: value })}
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
                  <Label htmlFor="proforma-client-label-text">Label Text</Label>
                  <Input
                    id="proforma-client-label-text"
                    value={config.proformaLocationDateLabelText || "M'sila le"}
                    onChange={(e) => setConfig({ ...config, proformaLocationDateLabelText: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="proforma-date-font-family">Font Family</Label>
                  <Select
                    id="proforma-date-font-family"
                    value={config.proformaDateFontFamily || "HELVETICA"}
                    onValueChange={(value: any) => setConfig({ ...config, proformaDateFontFamily: value })}
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
                  <Label htmlFor="proforma-date-font-size">Font Size (px)</Label>
                  <Input
                    id="proforma-date-font-size"
                    type="number"
                    min="8"
                    max="72"
                    value={config.proformaDateFontSize || 12}
                    onChange={(e) => setConfig({ ...config, proformaDateFontSize: parseInt(e.target.value) || 12 })}
                  />
                </div>
                <div>
                  <Label htmlFor="proforma-date-text-color">Color</Label>
                  <Input
                    id="proforma-date-text-color"
                    type="color"
                    value={config.proformaDateTextColor || "#000000"}
                    onChange={(e) => setConfig({ ...config, proformaDateTextColor: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="proforma-date-line-spacing">Line Spacing</Label>
                  <Input
                    id="proforma-date-line-spacing"
                    type="number"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={config.proformaDateLineSpacing || 1}
                    onChange={(e) => setConfig({ ...config, proformaDateLineSpacing: parseFloat(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label htmlFor="proforma-date-letter-spacing">Letter Spacing (px)</Label>
                  <Input
                    id="proforma-date-letter-spacing"
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={config.proformaDateLetterSpacing || 0}
                    onChange={(e) => setConfig({ ...config, proformaDateLetterSpacing: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="proforma-date-bold"
                    checked={config.proformaDateBold || false}
                    onCheckedChange={(checked) => setConfig({ ...config, proformaDateBold: checked })}
                  />
                  <Label htmlFor="proforma-date-bold" className="cursor-pointer">Bold</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="proforma-date-underline"
                    checked={config.proformaDateUnderline || false}
                    onCheckedChange={(checked) => setConfig({ ...config, proformaDateUnderline: checked })}
                  />
                  <Label htmlFor="proforma-date-underline" className="cursor-pointer">Underline</Label>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table Settings */}
          <div className="space-y-4 pb-6 border-b">
            <h3 className="text-lg font-semibold mb-4">2. Items Table Settings</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="proforma-table-text-alignment">Table Text Alignment</Label>
                <Select
                  id="proforma-table-text-alignment"
                  value={config.proformaTableTextAlignment || "left"}
                  onValueChange={(value: any) => setConfig({ ...config, proformaTableTextAlignment: value })}
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
                <Label htmlFor="proforma-table-direction">Writing Direction</Label>
                <Select
                  id="proforma-table-direction"
                  value={config.proformaTableDirection || "LTR"}
                  onValueChange={(value: any) => setConfig({ ...config, proformaTableDirection: value })}
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
                  <Label htmlFor="proforma-table-label-font-family">Font Family</Label>
                  <Select
                    id="proforma-table-label-font-family"
                    value={config.proformaTableLabelFontFamily || "HELVETICA"}
                    onValueChange={(value: any) => setConfig({ ...config, proformaTableLabelFontFamily: value })}
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
                  <Label htmlFor="proforma-table-label-font-size">Font Size (px)</Label>
                  <Input
                    id="proforma-table-label-font-size"
                    type="number"
                    min="8"
                    max="72"
                    value={config.proformaTableLabelFontSize || 11}
                    onChange={(e) => setConfig({ ...config, proformaTableLabelFontSize: parseInt(e.target.value) || 11 })}
                  />
                </div>
                <div>
                  <Label htmlFor="proforma-table-label-text-color">Color</Label>
                  <Input
                    id="proforma-table-label-text-color"
                    type="color"
                    value={config.proformaTableLabelTextColor || "#000000"}
                    onChange={(e) => setConfig({ ...config, proformaTableLabelTextColor: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="proforma-table-label-line-spacing">Line Spacing</Label>
                  <Input
                    id="proforma-table-label-line-spacing"
                    type="number"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={config.proformaTableLabelLineSpacing || 1}
                    onChange={(e) => setConfig({ ...config, proformaTableLabelLineSpacing: parseFloat(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label htmlFor="proforma-table-label-letter-spacing">Letter Spacing (px)</Label>
                  <Input
                    id="proforma-table-label-letter-spacing"
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={config.proformaTableLabelLetterSpacing || 0}
                    onChange={(e) => setConfig({ ...config, proformaTableLabelLetterSpacing: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="proforma-table-label-bold"
                    checked={config.proformaTableLabelBold || false}
                    onCheckedChange={(checked) => setConfig({ ...config, proformaTableLabelBold: checked })}
                  />
                  <Label htmlFor="proforma-table-label-bold" className="cursor-pointer">Bold</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="proforma-table-label-underline"
                    checked={config.proformaTableLabelUnderline || false}
                    onCheckedChange={(checked) => setConfig({ ...config, proformaTableLabelUnderline: checked })}
                  />
                  <Label htmlFor="proforma-table-label-underline" className="cursor-pointer">Underline</Label>
                </div>
              </div>
            </div>

            {/* Table Values Settings */}
            <div className="space-y-4 pt-4">
              <h4 className="font-medium">Table Values (Rest of Table) Settings</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="proforma-table-value-font-family">Font Family</Label>
                  <Select
                    id="proforma-table-value-font-family"
                    value={config.proformaTableValueFontFamily || "HELVETICA"}
                    onValueChange={(value: any) => setConfig({ ...config, proformaTableValueFontFamily: value })}
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
                  <Label htmlFor="proforma-table-value-font-size">Font Size (px)</Label>
                  <Input
                    id="proforma-table-value-font-size"
                    type="number"
                    min="8"
                    max="72"
                    value={config.proformaTableValueFontSize || 11}
                    onChange={(e) => setConfig({ ...config, proformaTableValueFontSize: parseInt(e.target.value) || 11 })}
                  />
                </div>
                <div>
                  <Label htmlFor="proforma-table-value-text-color">Color</Label>
                  <Input
                    id="proforma-table-value-text-color"
                    type="color"
                    value={config.proformaTableValueTextColor || "#000000"}
                    onChange={(e) => setConfig({ ...config, proformaTableValueTextColor: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="proforma-table-value-line-spacing">Line Spacing</Label>
                  <Input
                    id="proforma-table-value-line-spacing"
                    type="number"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={config.proformaTableValueLineSpacing || 1}
                    onChange={(e) => setConfig({ ...config, proformaTableValueLineSpacing: parseFloat(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label htmlFor="proforma-table-value-letter-spacing">Letter Spacing (px)</Label>
                  <Input
                    id="proforma-table-value-letter-spacing"
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={config.proformaTableValueLetterSpacing || 0}
                    onChange={(e) => setConfig({ ...config, proformaTableValueLetterSpacing: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="proforma-table-value-bold"
                    checked={config.proformaTableValueBold || false}
                    onCheckedChange={(checked) => setConfig({ ...config, proformaTableValueBold: checked })}
                  />
                  <Label htmlFor="proforma-table-value-bold" className="cursor-pointer">Bold</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="proforma-table-value-underline"
                    checked={config.proformaTableValueUnderline || false}
                    onCheckedChange={(checked) => setConfig({ ...config, proformaTableValueUnderline: checked })}
                  />
                  <Label htmlFor="proforma-table-value-underline" className="cursor-pointer">Underline</Label>
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
                    <Label htmlFor="proforma-col-number-width">Width (mm)</Label>
                    <Input
                      id="proforma-col-number-width"
                      type="number"
                      min="5"
                      max="100"
                      step="0.01"
                      value={config.proformaColNumberWidth ?? 13.23}
                      onChange={(e) => setConfig({ ...config, proformaColNumberWidth: parseFloat(e.target.value) || 13.23 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="proforma-col-number-padding">Padding (mm)</Label>
                    <Input
                      id="proforma-col-number-padding"
                      type="number"
                      min="0"
                      max="20"
                      step="0.01"
                      value={config.proformaColNumberPadding ?? 5.61}
                      onChange={(e) => setConfig({ ...config, proformaColNumberPadding: parseFloat(e.target.value) || 5.61 })}
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
                    <Label htmlFor="proforma-col-family-width">Width (mm)</Label>
                    <Input
                      id="proforma-col-family-width"
                      type="number"
                      min="10"
                      max="150"
                      step="0.01"
                      value={config.proformaColFamilyWidth ?? 39.69}
                      onChange={(e) => setConfig({ ...config, proformaColFamilyWidth: parseFloat(e.target.value) || 39.69 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="proforma-col-family-padding">Padding (mm)</Label>
                    <Input
                      id="proforma-col-family-padding"
                      type="number"
                      min="0"
                      max="20"
                      step="0.01"
                      value={config.proformaColFamilyPadding ?? 5.61}
                      onChange={(e) => setConfig({ ...config, proformaColFamilyPadding: parseFloat(e.target.value) || 5.61 })}
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
                    <Label htmlFor="proforma-col-model-width">Width (mm)</Label>
                    <Input
                      id="proforma-col-model-width"
                      type="number"
                      min="10"
                      max="150"
                      step="0.01"
                      value={config.proformaColModelWidth ?? 39.69}
                      onChange={(e) => setConfig({ ...config, proformaColModelWidth: parseFloat(e.target.value) || 39.69 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="proforma-col-model-padding">Padding (mm)</Label>
                    <Input
                      id="proforma-col-model-padding"
                      type="number"
                      min="0"
                      max="20"
                      step="0.01"
                      value={config.proformaColModelPadding ?? 5.61}
                      onChange={(e) => setConfig({ ...config, proformaColModelPadding: parseFloat(e.target.value) || 5.61 })}
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
                    <Label htmlFor="proforma-col-brand-width">Width (mm)</Label>
                    <Input
                      id="proforma-col-brand-width"
                      type="number"
                      min="10"
                      max="150"
                      step="0.01"
                      value={config.proformaColBrandWidth ?? 31.75}
                      onChange={(e) => setConfig({ ...config, proformaColBrandWidth: parseFloat(e.target.value) || 31.75 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="proforma-col-brand-padding">Padding (mm)</Label>
                    <Input
                      id="proforma-col-brand-padding"
                      type="number"
                      min="0"
                      max="20"
                      step="0.01"
                      value={config.proformaColBrandPadding ?? 5.61}
                      onChange={(e) => setConfig({ ...config, proformaColBrandPadding: parseFloat(e.target.value) || 5.61 })}
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
                    <Label htmlFor="proforma-col-quantity-width">Width (mm)</Label>
                    <Input
                      id="proforma-col-quantity-width"
                      type="number"
                      min="10"
                      max="150"
                      step="0.01"
                      value={config.proformaColQuantityWidth ?? 21.17}
                      onChange={(e) => setConfig({ ...config, proformaColQuantityWidth: parseFloat(e.target.value) || 21.17 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="proforma-col-quantity-padding">Padding (mm)</Label>
                    <Input
                      id="proforma-col-quantity-padding"
                      type="number"
                      min="0"
                      max="20"
                      step="0.01"
                      value={config.proformaColQuantityPadding ?? 5.61}
                      onChange={(e) => setConfig({ ...config, proformaColQuantityPadding: parseFloat(e.target.value) || 5.61 })}
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
                    <Label htmlFor="proforma-col-price-unit-width">Width (mm)</Label>
                    <Input
                      id="proforma-col-price-unit-width"
                      type="number"
                      min="10"
                      max="150"
                      step="0.01"
                      value={config.proformaColPriceUnitWidth ?? 31.75}
                      onChange={(e) => setConfig({ ...config, proformaColPriceUnitWidth: parseFloat(e.target.value) || 31.75 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="proforma-col-price-unit-padding">Padding (mm)</Label>
                    <Input
                      id="proforma-col-price-unit-padding"
                      type="number"
                      min="0"
                      max="20"
                      step="0.01"
                      value={config.proformaColPriceUnitPadding ?? 5.61}
                      onChange={(e) => setConfig({ ...config, proformaColPriceUnitPadding: parseFloat(e.target.value) || 5.61 })}
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
                    <Label htmlFor="proforma-col-price-total-width">Width (mm)</Label>
                    <Input
                      id="proforma-col-price-total-width"
                      type="number"
                      min="10"
                      max="150"
                      step="0.01"
                      value={config.proformaColPriceTotalWidth ?? 31.75}
                      onChange={(e) => setConfig({ ...config, proformaColPriceTotalWidth: parseFloat(e.target.value) || 31.75 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="proforma-col-price-total-padding">Padding (mm)</Label>
                    <Input
                      id="proforma-col-price-total-padding"
                      type="number"
                      min="0"
                      max="20"
                      step="0.01"
                      value={config.proformaColPriceTotalPadding ?? 5.61}
                      onChange={(e) => setConfig({ ...config, proformaColPriceTotalPadding: parseFloat(e.target.value) || 5.61 })}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Empty Rows Settings */}
          <div className="space-y-4 pb-6 border-b">
            <div>
              <Label htmlFor="proforma-empty-rows">Empty Rows (number)</Label>
              <Input
                id="proforma-empty-rows"
                type="number"
                min="0"
                max="20"
                value={config.proformaEmptyRows ?? 8}
                onChange={(e) => setConfig({ ...config, proformaEmptyRows: parseInt(e.target.value) ?? 8 })}
              />
              <p className="text-xs text-muted-foreground mt-1">Number of extra empty rows to add at the bottom of the items table</p>
            </div>
            <div>
              <Label htmlFor="proforma-last-page-table-max-height">Last Page Table Max Height (mm)</Label>
              <Input
                id="proforma-last-page-table-max-height"
                type="number"
                min="50"
                max="250"
                value={config.proformaLastPageTableMaxHeight ?? 150}
                onChange={(e) => setConfig({ ...config, proformaLastPageTableMaxHeight: parseInt(e.target.value) ?? 150 })}
              />
              <p className="text-xs text-muted-foreground mt-1">Maximum height of items table on last page (page with summary + terms section)</p>
            </div>
            <div>
              <Label htmlFor="proforma-first-page-table-max-height">First Page Table Max Height (mm)</Label>
              <Input
                id="proforma-first-page-table-max-height"
                type="number"
                min="50"
                max="250"
                value={config.proformaFirstPageTableMaxHeight ?? 180}
                onChange={(e) => setConfig({ ...config, proformaFirstPageTableMaxHeight: parseInt(e.target.value) ?? 180 })}
              />
              <p className="text-xs text-muted-foreground mt-1">Maximum height of items table on first page (page with header and customer info)</p>
            </div>
            <div>
              <Label htmlFor="proforma-other-pages-table-max-height">Other Pages Table Max Height (mm)</Label>
              <Input
                id="proforma-other-pages-table-max-height"
                type="number"
                min="50"
                max="250"
                value={config.proformaOtherPagesTableMaxHeight ?? 180}
                onChange={(e) => setConfig({ ...config, proformaOtherPagesTableMaxHeight: parseInt(e.target.value) ?? 180 })}
              />
              <p className="text-xs text-muted-foreground mt-1">Maximum height of items table on other pages (pages without header and footer)</p>
            </div>
            <div>
              <Label htmlFor="proforma-single-page-table-max-height">Single Page Table Max Height (mm)</Label>
              <Input
                id="proforma-single-page-table-max-height"
                type="number"
                min="50"
                max="297"
                value={config.proformaSinglePageTableMaxHeight ?? 297}
                onChange={(e) => setConfig({ ...config, proformaSinglePageTableMaxHeight: parseInt(e.target.value) ?? 297 })}
              />
              <p className="text-xs text-muted-foreground mt-1">Maximum height of items table when proforma is single page (no height limit - full A4 height)</p>
            </div>
          </div>

          {/* Footer Settings */}
          <div className="space-y-4 pb-6 border-b">
            <h3 className="text-lg font-semibold mb-4">3. Footer Settings</h3>

            <div className="space-y-4 pt-4">
              <h4 className="font-medium">Terms & Conditions Settings</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="proforma-terms-position">Position</Label>
                  <Select
                    id="proforma-terms-position"
                    value={config.proformaTermsPosition || "left"}
                    onValueChange={(value: any) => setConfig({ ...config, proformaTermsPosition: value })}
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
                  <Label htmlFor="proforma-terms-title">Title Text</Label>
                  <Input
                    id="proforma-terms-title"
                    value={config.proformaTermsTitle || "Terms and conditions"}
                    onChange={(e) => setConfig({ ...config, proformaTermsTitle: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="proforma-terms-font-family">Font Family</Label>
                  <Select
                    id="proforma-terms-font-family"
                    value={config.proformaTermsFontFamily || "HELVETICA"}
                    onValueChange={(value: any) => setConfig({ ...config, proformaTermsFontFamily: value })}
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
                  <Label htmlFor="proforma-terms-font-size">Font Size (px)</Label>
                  <Input
                    id="proforma-terms-font-size"
                    type="number"
                    min="8"
                    max="72"
                    value={config.proformaTermsFontSize || 11}
                    onChange={(e) => setConfig({ ...config, proformaTermsFontSize: parseInt(e.target.value) || 11 })}
                  />
                </div>
                <div>
                  <Label htmlFor="proforma-terms-text-color">Color</Label>
                  <Input
                    id="proforma-terms-text-color"
                    type="color"
                    value={config.proformaTermsTextColor || "#000000"}
                    onChange={(e) => setConfig({ ...config, proformaTermsTextColor: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="proforma-terms-line-spacing">Line Spacing</Label>
                  <Input
                    id="proforma-terms-line-spacing"
                    type="number"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={config.proformaTermsLineSpacing || 1}
                    onChange={(e) => setConfig({ ...config, proformaTermsLineSpacing: parseFloat(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label htmlFor="proforma-terms-letter-spacing">Letter Spacing (px)</Label>
                  <Input
                    id="proforma-terms-letter-spacing"
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={config.proformaTermsLetterSpacing || 0}
                    onChange={(e) => setConfig({ ...config, proformaTermsLetterSpacing: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="proforma-terms-bold"
                    checked={config.proformaTermsBold || false}
                    onCheckedChange={(checked) => setConfig({ ...config, proformaTermsBold: checked })}
                  />
                  <Label htmlFor="proforma-terms-bold" className="cursor-pointer">Bold</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="proforma-terms-underline"
                    checked={config.proformaTermsUnderline || false}
                    onCheckedChange={(checked) => setConfig({ ...config, proformaTermsUnderline: checked })}
                  />
                  <Label htmlFor="proforma-terms-underline" className="cursor-pointer">Underline</Label>
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
                      checked={config.proformaTermsIncludeDelivery ?? true}
                      onCheckedChange={(checked) => setConfig({ ...config, proformaTermsIncludeDelivery: checked })}
                    />
                    <Label htmlFor="terms-include-delivery" className="cursor-pointer font-medium">Include Delivery Term</Label>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Time Type</Label>
                    <Select
                      value={config.proformaTermsDeliveryType || "range"}
                      onValueChange={(value: any) => setConfig({ ...config, proformaTermsDeliveryType: value })}
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
                      value={config.proformaTermsDeliveryTimeFrom ?? 3}
                      onChange={(e) => setConfig({ ...config, proformaTermsDeliveryTimeFrom: parseInt(e.target.value) || 3 })}
                    />
                  </div>
                  
                  {config.proformaTermsDeliveryType === "range" && (
                    <div>
                      <Label>Time To</Label>
                      <Input
                        type="number"
                        min="1"
                        value={config.proformaTermsDeliveryTimeTo ?? 4}
                        onChange={(e) => setConfig({ ...config, proformaTermsDeliveryTimeTo: parseInt(e.target.value) || 4 })}
                      />
                    </div>
                  )}
                  
                  <div>
                    <Label>Time Unit</Label>
                    <Select
                      value={config.proformaTermsDeliveryTimeUnit || "months"}
                      onValueChange={(value: any) => setConfig({ ...config, proformaTermsDeliveryTimeUnit: value })}
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
                      checked={config.proformaTermsIncludeValidity ?? true}
                      onCheckedChange={(checked) => setConfig({ ...config, proformaTermsIncludeValidity: checked })}
                    />
                    <Label htmlFor="terms-include-validity" className="cursor-pointer font-medium">Include Validity Term</Label>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Time Type</Label>
                    <Select
                      value={config.proformaTermsValidityType || "fixed"}
                      onValueChange={(value: any) => setConfig({ ...config, proformaTermsValidityType: value })}
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
                      value={config.proformaTermsValidityTime ?? 3}
                      onChange={(e) => setConfig({ ...config, proformaTermsValidityTime: parseInt(e.target.value) || 3 })}
                    />
                  </div>
                  
                  {config.proformaTermsValidityType === "range" && (
                    <div>
                      <Label>Time To</Label>
                      <Input
                        type="number"
                        min="1"
                        value={config.proformaTermsValidityTimeTo ?? 6}
                        onChange={(e) => setConfig({ ...config, proformaTermsValidityTimeTo: parseInt(e.target.value) || 6 })}
                      />
                    </div>
                  )}
                  
                  <div>
                    <Label>Time Unit</Label>
                    <Select
                      value={config.proformaTermsValidityTimeUnit || "months"}
                      onValueChange={(value: any) => setConfig({ ...config, proformaTermsValidityTimeUnit: value })}
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
                      checked={config.proformaTermsIncludeWarranty ?? true}
                      onCheckedChange={(checked) => setConfig({ ...config, proformaTermsIncludeWarranty: checked })}
                    />
                    <Label htmlFor="terms-include-warranty" className="cursor-pointer font-medium">Include Warranty Term</Label>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Time Type</Label>
                    <Select
                      value={config.proformaTermsWarrantyType || "fixed"}
                      onValueChange={(value: any) => setConfig({ ...config, proformaTermsWarrantyType: value })}
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
                      value={config.proformaTermsWarrantyTime ?? 12}
                      onChange={(e) => setConfig({ ...config, proformaTermsWarrantyTime: parseInt(e.target.value) || 12 })}
                    />
                  </div>
                  
                  {config.proformaTermsWarrantyType === "range" && (
                    <div>
                      <Label>Time To</Label>
                      <Input
                        type="number"
                        min="1"
                        value={config.proformaTermsWarrantyTimeTo ?? 24}
                        onChange={(e) => setConfig({ ...config, proformaTermsWarrantyTimeTo: parseInt(e.target.value) || 24 })}
                      />
                    </div>
                  )}
                  
                  <div>
                    <Label>Time Unit</Label>
                    <Select
                      value={config.proformaTermsWarrantyTimeUnit || "months"}
                      onValueChange={(value: any) => setConfig({ ...config, proformaTermsWarrantyTimeUnit: value })}
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
                      checked={config.proformaTermsIncludeConfirmation ?? true}
                      onCheckedChange={(checked) => setConfig({ ...config, proformaTermsIncludeConfirmation: checked })}
                    />
                    <Label htmlFor="terms-include-confirmation" className="cursor-pointer font-medium">Include Confirmation Term</Label>
                  </div>
                </div>
                
                <div>
                  <Label>Delivery Condition</Label>
                  <Select
                    value={config.proformaTermsDeliveryCondition || "after_order_confirmation"}
                    onValueChange={(value: any) => setConfig({ ...config, proformaTermsDeliveryCondition: value })}
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
                      checked={config.proformaTermsIncludePayment ?? true}
                      onCheckedChange={(checked) => setConfig({ ...config, proformaTermsIncludePayment: checked })}
                    />
                    <Label htmlFor="terms-include-payment" className="cursor-pointer font-medium">Include Payment Method Term</Label>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Payment Method</Label>
                    <Select
                      value={config.proformaTermsPaymentMethod || "split_payment"}
                      onValueChange={(value: any) => setConfig({ ...config, proformaTermsPaymentMethod: value })}
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
                  
                  {config.proformaTermsPaymentMethod === "split_payment" && (
                    <div>
                      <Label>Payment at Order (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={config.proformaTermsSplitPaymentPercent ?? 50}
                        onChange={(e) => setConfig({ ...config, proformaTermsSplitPaymentPercent: parseInt(e.target.value) || 50 })}
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
                    checked={config.proformaTermsIncludePriceInWords ?? true}
                    onCheckedChange={(checked) => setConfig({ ...config, proformaTermsIncludePriceInWords: checked })}
                  />
                  <Label htmlFor="terms-include-price-in-words" className="cursor-pointer font-medium">Include Total Price in Words</Label>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <h4 className="font-medium">Signature Settings</h4>
              
              {/* Signature Count */}
              <div className="space-y-4">
                <Label htmlFor="proforma-signature-count">Number of Signatures</Label>
                <Select
                  id="proforma-signature-count"
                  value={String(config.proformaSignatureCount || 2)}
                  onValueChange={(value: string) => setConfig({ ...config, proformaSignatureCount: parseInt(value) as 1 | 2 })}
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
              {config.proformaSignatureCount === 1 && (
                <div className="space-y-4">
                  <Label htmlFor="proforma-signature-position">Signature Position</Label>
                  <Select
                    id="proforma-signature-position"
                    value={config.proformaSignaturePosition || "right"}
                    onValueChange={(value: "right" | "left" | "middle") => setConfig({ ...config, proformaSignaturePosition: value })}
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
                <Label htmlFor="proforma-signature-line-width">Signature Line Width (px)</Label>
                <Input
                  id="proforma-signature-line-width"
                  type="number"
                  min="50"
                  max="300"
                  step="10"
                  value={config.proformaSignatureLineWidth || 150}
                  onChange={(e) => setConfig({ ...config, proformaSignatureLineWidth: parseInt(e.target.value) || 150 })}
                />
              </div>

              {/* Signature Labels */}
              <div className="space-y-4 pt-4">
                <h4 className="font-medium">Signature Labels</h4>
                <div className="grid grid-cols-2 gap-4">
                  {config.proformaSignatureCount === 1 ? (
                    <div className="col-span-2">
                      <Label htmlFor="proforma-signature-left-label">Signature Label</Label>
                      <Select
                        id="proforma-signature-left-label"
                        value={config.proformaSignatureLeftLabelText || "Gérant"}
                        onValueChange={(value: string) => setConfig({ ...config, proformaSignatureLeftLabelText: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select label" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border shadow-md rounded-lg" style={{ backgroundColor: theme === 'dark' ? 'black' : 'white' }}>
                          <SelectItem value="Manager">Manager</SelectItem>
                          <SelectItem value="Director">Director</SelectItem>
                          <SelectItem value="Client">Client</SelectItem>
                          <SelectItem value="Representative">Representative</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <>
                      <div>
                        <Label htmlFor="proforma-signature-left-label">Left Signature Label</Label>
                        <Select
                          id="proforma-signature-left-label"
                          value={config.proformaSignatureLeftLabelText || "Gérant"}
                          onValueChange={(value: string) => setConfig({ ...config, proformaSignatureLeftLabelText: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select label" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border shadow-md rounded-lg" style={{ backgroundColor: theme === 'dark' ? 'black' : 'white' }}>
                            <SelectItem value="Manager">Manager</SelectItem>
                            <SelectItem value="Director">Director</SelectItem>
                            <SelectItem value="Client">Client</SelectItem>
                            <SelectItem value="Representative">Representative</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="proforma-signature-right-label">Right Signature Label</Label>
                        <Select
                          id="proforma-signature-right-label"
                          value={config.proformaSignatureRightLabelText || "Client"}
                          onValueChange={(value: string) => setConfig({ ...config, proformaSignatureRightLabelText: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select label" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border shadow-md rounded-lg" style={{ backgroundColor: theme === 'dark' ? 'black' : 'white' }}>
                            <SelectItem value="Manager">Manager</SelectItem>
                            <SelectItem value="Director">Director</SelectItem>
                            <SelectItem value="Client">Client</SelectItem>
                            <SelectItem value="Representative">Representative</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Individual Signature Controls */}
              {config.proformaSignatureCount === 2 && (
                <div className="space-y-4 pt-4">
                  <h4 className="font-medium">Individual Signature Controls</h4>

                  {/* Left Signature Controls */}
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-left-signature"
                        checked={config.proformaIncludeLeftSignature !== false}
                        onCheckedChange={(checked) => setConfig({ ...config, proformaIncludeLeftSignature: checked as boolean })}
                      />
                      <Label htmlFor="include-left-signature" className="cursor-pointer font-medium">Include Left Signature</Label>
                    </div>

                    {config.proformaIncludeLeftSignature !== false && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="left-signature-offset-x">Horizontal Offset (px)</Label>
                          <Input
                            id="left-signature-offset-x"
                            type="number"
                            min="-100"
                            max="100"
                            step="1"
                            value={config.proformaLeftSignatureOffsetX || 0}
                            onChange={(e) => setConfig({ ...config, proformaLeftSignatureOffsetX: parseInt(e.target.value) || 0 })}
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
                            value={config.proformaLeftSignatureOffsetY || 0}
                            onChange={(e) => setConfig({ ...config, proformaLeftSignatureOffsetY: parseInt(e.target.value) || 0 })}
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
                        checked={config.proformaIncludeRightSignature !== false}
                        onCheckedChange={(checked) => setConfig({ ...config, proformaIncludeRightSignature: checked as boolean })}
                      />
                      <Label htmlFor="include-right-signature" className="cursor-pointer font-medium">Include Right Signature</Label>
                    </div>

                    {config.proformaIncludeRightSignature !== false && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="right-signature-offset-x">Horizontal Offset (px)</Label>
                          <Input
                            id="right-signature-offset-x"
                            type="number"
                            min="-100"
                            max="100"
                            step="1"
                            value={config.proformaRightSignatureOffsetX || 0}
                            onChange={(e) => setConfig({ ...config, proformaRightSignatureOffsetX: parseInt(e.target.value) || 0 })}
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
                            value={config.proformaRightSignatureOffsetY || 0}
                            onChange={(e) => setConfig({ ...config, proformaRightSignatureOffsetY: parseInt(e.target.value) || 0 })}
                          />
                          <p className="text-xs text-muted-foreground">Positive = down, Negative = up</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Single Signature Controls */}
              {config.proformaSignatureCount === 1 && (
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-single-signature"
                      checked={config.proformaIncludeLeftSignature !== false}
                      onCheckedChange={(checked) => setConfig({ ...config, proformaIncludeLeftSignature: checked as boolean })}
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
                    <p className="text-xs text-muted-foreground">{t("qrCodePreviewDesc", "Using proforma data and test verification token")}</p>
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
                  <Label htmlFor="proforma-page-number-position">Position</Label>
                  <Select
                    id="proforma-page-number-position"
                    value={config.proformaPageNumberPosition || "center"}
                    onValueChange={(value: any) => setConfig({ ...config, proformaPageNumberPosition: value })}
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
                  <Label htmlFor="proforma-page-number-font-family">Font Family</Label>
                  <Select
                    id="proforma-page-number-font-family"
                    value={config.proformaPageNumberFontFamily || "HELVETICA"}
                    onValueChange={(value: any) => setConfig({ ...config, proformaPageNumberFontFamily: value })}
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
                  <Label htmlFor="proforma-page-number-font-size">Font Size (px)</Label>
                  <Input
                    id="proforma-page-number-font-size"
                    type="number"
                    min="8"
                    max="24"
                    value={config.proformaPageNumberFontSize || 10}
                    onChange={(e) => setConfig({ ...config, proformaPageNumberFontSize: parseInt(e.target.value) || 10 })}
                  />
                </div>
                <div>
                  <Label htmlFor="proforma-page-number-text-color">Text Color</Label>
                  <Input
                    id="proforma-page-number-text-color"
                    type="color"
                    value={config.proformaPageNumberTextColor || "#666666"}
                    onChange={(e) => setConfig({ ...config, proformaPageNumberTextColor: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="proforma-page-number-offset-x">Horizontal Offset (px)</Label>
                  <Input
                    id="proforma-page-number-offset-x"
                    type="number"
                    min="-50"
                    max="50"
                    value={config.proformaPageNumberOffsetX || 0}
                    onChange={(e) => setConfig({ ...config, proformaPageNumberOffsetX: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="proforma-page-number-offset-y">Vertical Offset (mm)</Label>
                <Input
                  id="proforma-page-number-offset-y"
                  type="number"
                  min="-20"
                  max="20"
                  step="1"
                  value={config.proformaPageNumberOffsetY || 0}
                  onChange={(e) => setConfig({ ...config, proformaPageNumberOffsetY: parseFloat(e.target.value) || 0 })}
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
                  <Label htmlFor="client-info-margin">Client Info Margin (px)</Label>
                  <Input
                    id="client-info-margin"
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

      <ProformaPreviewDialog
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
