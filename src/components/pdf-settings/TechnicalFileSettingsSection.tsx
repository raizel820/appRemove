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

// Import from the technical file util file
import {
  type Company as UtilCompany,
  type Customer as UtilCustomer,
  type MachineModel as UtilMachineModel,
  type PDFConfiguration as UtilPDFConfiguration,
  arrayBufferToBase64 as utilArrayBufferToBase64,
  getQrCodeDataUrls,
  generatePreviewHTML
} from "@/lib/technicalFilePreviewUtils";
import TechnicalFilePreviewDialog from "@/components/technical-file/TechnicalFilePreviewDialog";

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

  // Technical File Top Body Part
  technicalFileTopBodyDirection?: "LTR" | "RTL";
  // Title settings
  technicalFileTitlePosition?: "left" | "center" | "right";
  technicalFileTitleFontFamily?: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  technicalFileTitleFontSize?: number;
  technicalFileTitleTextColor?: string;
  technicalFileTitleLineSpacing?: number;
  technicalFileTitleLetterSpacing?: number;
  technicalFileTitleBold?: boolean;
  technicalFileTitleUnderline?: boolean;
  // Customer settings
  // Customer info position
  technicalFileClientInfoPosition?: "left" | "center" | "right";
  technicalFileClientLabelText?: string;

  // Customer info settings - Label
  technicalFileClientLabelFontFamily?: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  technicalFileClientLabelFontSize?: number;
  technicalFileClientLabelTextColor?: string;
  technicalFileClientLabelLineSpacing?: number;
  technicalFileClientLabelLetterSpacing?: number;
  technicalFileClientLabelBold?: boolean;
  technicalFileClientLabelUnderline?: boolean;

  // Customer info settings - Value
  technicalFileClientValueFontFamily?: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  technicalFileClientValueFontSize?: number;
  technicalFileClientValueTextColor?: string;
  technicalFileClientValueLineSpacing?: number;
  technicalFileClientValueLetterSpacing?: number;
  technicalFileClientValueBold?: boolean;
  technicalFileClientValueUnderline?: boolean;

  // Date settings
  technicalFileDatePosition?: "left" | "center" | "right";
  technicalFileLocationDateLabelText?: string;
  technicalFileDateFontFamily?: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  technicalFileDateFontSize?: number;
  technicalFileDateTextColor?: string;
  technicalFileDateLineSpacing?: number;
  technicalFileDateLetterSpacing?: number;
  technicalFileDateBold?: boolean;
  technicalFileDateUnderline?: boolean;

  // Table settings
  technicalFileTableTextAlignment?: "left" | "center" | "right";
  technicalFileTableDirection?: "LTR" | "RTL";
  // Table labels
  technicalFileTableLabelFontFamily?: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  technicalFileTableLabelFontSize?: number;
  technicalFileTableLabelTextColor?: string;
  technicalFileTableLabelLineSpacing?: number;
  technicalFileTableLabelLetterSpacing?: number;
  technicalFileTableLabelBold?: boolean;
  technicalFileTableLabelUnderline?: boolean;
  // Table values
  technicalFileTableValueFontFamily?: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  technicalFileTableValueFontSize?: number;
  technicalFileTableValueTextColor?: string;
  technicalFileTableValueLineSpacing?: number;
  technicalFileTableValueLetterSpacing?: number;
  technicalFileTableValueBold?: boolean;
  technicalFileTableValueUnderline?: boolean;
  technicalFileEmptyRows?: number;
  technicalFileFirstPageTableMaxHeight?: number;
  technicalFileSinglePageTableMaxHeight?: number;
  technicalFileLastPageTableMaxHeight?: number;
  technicalFileOtherPagesTableMaxHeight?: number;

  // Column-specific settings for items table (NO NUMBER COLUMN for technical files)
  technicalFileColFamilyWidth?: number;
  technicalFileColFamilyPadding?: number;
  technicalFileColModelWidth?: number;
  technicalFileColModelPadding?: number;
  technicalFileColBrandWidth?: number;
  technicalFileColBrandPadding?: number;
  technicalFileColQuantityWidth?: number;
  technicalFileColQuantityPadding?: number;
  technicalFileColPriceUnitWidth?: number;
  technicalFileColPriceUnitPadding?: number;
  technicalFileColPriceTotalWidth?: number;
  technicalFileColPriceTotalPadding?: number;

  // Footer terms settings
  technicalFileTermsPosition?: "left" | "center" | "right";
  technicalFileTermsTitle?: string;
  technicalFileTermsFontFamily?: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  technicalFileTermsFontSize?: number;
  technicalFileTermsTextColor?: string;
  technicalFileTermsLineSpacing?: number;
  technicalFileTermsLetterSpacing?: number;
  technicalFileTermsBold?: boolean;
  technicalFileTermsUnderline?: boolean;

  // Individual Terms Settings
  technicalFileTermsIncludeDelivery?: boolean;
  technicalFileTermsDeliveryType?: "fixed" | "range";
  technicalFileTermsDeliveryTimeFrom?: number;
  technicalFileTermsDeliveryTimeTo?: number | null;
  technicalFileTermsDeliveryTimeUnit?: "days" | "weeks" | "months" | "years";

  technicalFileTermsIncludeValidity?: boolean;
  technicalFileTermsValidityType?: "fixed" | "range";
  technicalFileTermsValidityTime?: number;
  technicalFileTermsValidityTimeTo?: number | null;
  technicalFileTermsValidityTimeUnit?: "days" | "weeks" | "months" | "years";

  technicalFileTermsIncludeWarranty?: boolean;
  technicalFileTermsWarrantyType?: "fixed" | "range";
  technicalFileTermsWarrantyTime?: number;
  technicalFileTermsWarrantyTimeTo?: number | null;
  technicalFileTermsWarrantyTimeUnit?: "days" | "weeks" | "months" | "years";

  technicalFileTermsIncludeConfirmation?: boolean;
  technicalFileTermsDeliveryCondition?: "after_order_confirmation" | "after_payment";

  technicalFileTermsIncludePayment?: boolean;
  technicalFileTermsPaymentMethod?: "online" | "website" | "check" | "cash" | "split_payment";
  technicalFileTermsSplitPaymentPercent?: number;
  technicalFileTermsIncludePriceInWords?: boolean;

  // Signature settings
  technicalFileSignatureCount?: number;
  technicalFileSignaturePosition?: "right" | "left" | "middle";
  technicalFileSignatureLeftLabelText?: string;
  technicalFileSignatureRightLabelText?: string;
  technicalFileSignatureLineWidth?: number;
  savedSignatureLabels?: string;

  // Individual signature controls
  technicalFileIncludeLeftSignature?: boolean;
  technicalFileLeftSignatureOffsetX?: number;
  technicalFileLeftSignatureOffsetY?: number;
  technicalFileIncludeRightSignature?: boolean;
  technicalFileRightSignatureOffsetX?: number;
  technicalFileRightSignatureOffsetY?: number;

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
  technicalFilePageNumberFontFamily?: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  technicalFilePageNumberFontSize?: number;
  technicalFilePageNumberTextColor?: string;
  technicalFilePageNumberPosition?: "left" | "center" | "right";
  technicalFilePageNumberOffsetX?: number;
  technicalFilePageNumberOffsetY?: number;

  // QR Code settings
  includeQrCode?: boolean;
  qrCodeSize?: number;
  qrCodeOffsetX?: number;
  qrCodeOffsetY?: number;

  // Technical File currency and language
  technicalFileCurrency?: string;
  technicalFileLanguage?: string;
}

export default function TechnicalFileSettingsSection() {
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
      setSelectedCurrency(config.technicalFileCurrency || "DZD");
      setSelectedLanguage(config.technicalFileLanguage || "FR");
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
    link.download = `technical-file-qr-${Date.now()}.png`;
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

  const technicalFileTranslations = {
    FR: {
      client: "Client",
      noClient: "Aucun client disponible",
      address: "Adresse",
      phone: "Tél",
      email: "Email",
      datePrefix: "M'sila le",
      tableHeaders: {
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
        validityTitle: "Validité du fichier technique",
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
        validityTitle: "صلاحية الملف التقني",
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
      technicalFileTranslations,
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
        technicalFileCurrency: selectedCurrency,
        technicalFileLanguage: selectedLanguage,
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
              <CardTitle>{t("pdfSettingsTechnicalFile", "Technical File")}</CardTitle>
              <CardDescription>{t("pdfSettingsTechnicalFileDescription", "Configure technical file-specific PDF settings")}</CardDescription>
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
            The technical file uses global PDF header. Configure header settings in Global Header tab.
          </p>

          {/* Top Body Part Settings */}
          <div className="space-y-4 pb-6 border-b">
            <h3 className="text-lg font-semibold mb-4">1. Top Body Part Settings</h3>

            {/* Writing Direction */}
            <div>
              <Label htmlFor="technical-file-top-body-direction">Writing Direction</Label>
              <Select
                id="technical-file-top-body-direction"
                value={config.technicalFileTopBodyDirection || "LTR"}
                onValueChange={(value: any) => setConfig({ ...config, technicalFileTopBodyDirection: value })}
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
                  <Label htmlFor="technical-file-title-position">Position</Label>
                  <Select
                    id="technical-file-title-position"
                    value={config.technicalFileTitlePosition || "center"}
                    onValueChange={(value: any) => setConfig({ ...config, technicalFileTitlePosition: value })}
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
                  <Label htmlFor="technical-file-title-font-family">Font Family</Label>
                  <Select
                    id="technical-file-title-font-family"
                    value={config.technicalFileTitleFontFamily || "HELVETICA"}
                    onValueChange={(value: any) => setConfig({ ...config, technicalFileTitleFontFamily: value })}
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
                  <Label htmlFor="technical-file-title-font-size">Font Size (px)</Label>
                  <Input
                    id="technical-file-title-font-size"
                    type="number"
                    min="8"
                    max="72"
                    value={config.technicalFileTitleFontSize || 16}
                    onChange={(e) => setConfig({ ...config, technicalFileTitleFontSize: parseInt(e.target.value) || 16 })}
                  />
                </div>
                <div>
                  <Label htmlFor="technical-file-title-text-color">Color</Label>
                  <Input
                    id="technical-file-title-text-color"
                    type="color"
                    value={config.technicalFileTitleTextColor || "#000000"}
                    onChange={(e) => setConfig({ ...config, technicalFileTitleTextColor: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="technical-file-title-line-spacing">Line Spacing</Label>
                  <Input
                    id="technical-file-title-line-spacing"
                    type="number"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={config.technicalFileTitleLineSpacing || 1}
                    onChange={(e) => setConfig({ ...config, technicalFileTitleLineSpacing: parseFloat(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label htmlFor="technical-file-title-letter-spacing">Letter Spacing (px)</Label>
                  <Input
                    id="technical-file-title-letter-spacing"
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={config.technicalFileTitleLetterSpacing || 0}
                    onChange={(e) => setConfig({ ...config, technicalFileTitleLetterSpacing: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="technical-file-title-bold"
                    checked={config.technicalFileTitleBold || false}
                    onCheckedChange={(checked) => setConfig({ ...config, technicalFileTitleBold: checked })}
                  />
                  <Label htmlFor="technical-file-title-bold" className="cursor-pointer">Bold</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="technical-file-title-underline"
                    checked={config.technicalFileTitleUnderline || false}
                    onCheckedChange={(checked) => setConfig({ ...config, technicalFileTitleUnderline: checked })}
                  />
                  <Label htmlFor="technical-file-title-underline" className="cursor-pointer">Underline</Label>
                </div>
              </div>
            </div>

            {/* Customer Settings */}
            <div className="space-y-4 pt-4">
              <h4 className="font-medium">Customer Info Settings</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="technical-file-client-info-position">Position</Label>
                  <Select
                    id="technical-file-client-info-position"
                    value={config.technicalFileClientInfoPosition || "left"}
                    onValueChange={(value: any) => setConfig({ ...config, technicalFileClientInfoPosition: value })}
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
                    <Label htmlFor="technical-file-client-label-font-family">Font Family</Label>
                    <Select
                      id="technical-file-client-label-font-family"
                      value={config.technicalFileClientLabelFontFamily || "HELVETICA"}
                      onValueChange={(value: any) => setConfig({ ...config, technicalFileClientLabelFontFamily: value })}
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
                    <Label htmlFor="technical-file-client-label-font-size">Font Size (px)</Label>
                    <Input
                      id="technical-file-client-label-font-size"
                      type="number"
                      min="8"
                      max="72"
                      value={config.technicalFileClientLabelFontSize || 12}
                      onChange={(e) => setConfig({ ...config, technicalFileClientLabelFontSize: parseInt(e.target.value) || 12 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="technical-file-client-label-text-color">Color</Label>
                    <Input
                      id="technical-file-client-label-text-color"
                      type="color"
                      value={config.technicalFileClientLabelTextColor || "#000000"}
                      onChange={(e) => setConfig({ ...config, technicalFileClientLabelTextColor: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="technical-file-client-label-line-spacing">Line Spacing</Label>
                    <Input
                      id="technical-file-client-label-line-spacing"
                      type="number"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={config.technicalFileClientLabelLineSpacing || 1}
                      onChange={(e) => setConfig({ ...config, technicalFileClientLabelLineSpacing: parseFloat(e.target.value) || 1 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="technical-file-client-label-letter-spacing">Letter Spacing (px)</Label>
                    <Input
                      id="technical-file-client-label-letter-spacing"
                      type="number"
                      min="0"
                      max="20"
                      step="0.1"
                      value={config.technicalFileClientLabelLetterSpacing || 0}
                      onChange={(e) => setConfig({ ...config, technicalFileClientLabelLetterSpacing: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="technical-file-client-label-bold"
                      checked={config.technicalFileClientLabelBold || false}
                      onCheckedChange={(checked) => setConfig({ ...config, technicalFileClientLabelBold: checked })}
                    />
                    <Label htmlFor="technical-file-client-label-bold" className="cursor-pointer">Bold</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="technical-file-client-label-underline"
                      checked={config.technicalFileClientLabelUnderline || false}
                      onCheckedChange={(checked) => setConfig({ ...config, technicalFileClientLabelUnderline: checked })}
                    />
                    <Label htmlFor="technical-file-client-label-underline" className="cursor-pointer">Underline</Label>
                  </div>
                </div>
              </div>

              {/* Value Settings */}
              <div className="border-t pt-4">
                <h5 className="font-medium mb-3">Value Settings</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="technical-file-client-value-font-family">Font Family</Label>
                    <Select
                      id="technical-file-client-value-font-family"
                      value={config.technicalFileClientValueFontFamily || "HELVETICA"}
                      onValueChange={(value: any) => setConfig({ ...config, technicalFileClientValueFontFamily: value })}
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
                    <Label htmlFor="technical-file-client-value-font-size">Font Size (px)</Label>
                    <Input
                      id="technical-file-client-value-font-size"
                      type="number"
                      min="8"
                      max="72"
                      value={config.technicalFileClientValueFontSize || 12}
                      onChange={(e) => setConfig({ ...config, technicalFileClientValueFontSize: parseInt(e.target.value) || 12 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="technical-file-client-value-text-color">Color</Label>
                    <Input
                      id="technical-file-client-value-text-color"
                      type="color"
                      value={config.technicalFileClientValueTextColor || "#000000"}
                      onChange={(e) => setConfig({ ...config, technicalFileClientValueTextColor: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="technical-file-client-value-line-spacing">Line Spacing</Label>
                    <Input
                      id="technical-file-client-value-line-spacing"
                      type="number"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={config.technicalFileClientValueLineSpacing || 1}
                      onChange={(e) => setConfig({ ...config, technicalFileClientValueLineSpacing: parseFloat(e.target.value) || 1 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="technical-file-client-value-letter-spacing">Letter Spacing (px)</Label>
                    <Input
                      id="technical-file-client-value-letter-spacing"
                      type="number"
                      min="0"
                      max="20"
                      step="0.1"
                      value={config.technicalFileClientValueLetterSpacing || 0}
                      onChange={(e) => setConfig({ ...config, technicalFileClientValueLetterSpacing: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="technical-file-client-value-bold"
                      checked={config.technicalFileClientValueBold || false}
                      onCheckedChange={(checked) => setConfig({ ...config, technicalFileClientValueBold: checked })}
                    />
                    <Label htmlFor="technical-file-client-value-bold" className="cursor-pointer">Bold</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="technical-file-client-value-underline"
                      checked={config.technicalFileClientValueUnderline || false}
                      onCheckedChange={(checked) => setConfig({ ...config, technicalFileClientValueUnderline: checked })}
                    />
                    <Label htmlFor="technical-file-client-value-underline" className="cursor-pointer">Underline</Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Date Settings */}
            <div className="space-y-4 pt-4">
              <h4 className="font-medium">Date/Location Settings</h4>

              <div>
                <Label htmlFor="technical-file-date-position">Position</Label>
                <Select
                  id="technical-file-date-position"
                  value={config.technicalFileDatePosition || "left"}
                  onValueChange={(value: any) => setConfig({ ...config, technicalFileDatePosition: value })}
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
                  <Label htmlFor="technical-file-client-label-text">Label Text</Label>
                  <Input
                    id="technical-file-client-label-text"
                    value={config.technicalFileLocationDateLabelText || "M'sila le"}
                    onChange={(e) => setConfig({ ...config, technicalFileLocationDateLabelText: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="technical-file-date-font-family">Font Family</Label>
                  <Select
                    id="technical-file-date-font-family"
                    value={config.technicalFileDateFontFamily || "HELVETICA"}
                    onValueChange={(value: any) => setConfig({ ...config, technicalFileDateFontFamily: value })}
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
                  <Label htmlFor="technical-file-date-font-size">Font Size (px)</Label>
                  <Input
                    id="technical-file-date-font-size"
                    type="number"
                    min="8"
                    max="72"
                    value={config.technicalFileDateFontSize || 12}
                    onChange={(e) => setConfig({ ...config, technicalFileDateFontSize: parseInt(e.target.value) || 12 })}
                  />
                </div>
                <div>
                  <Label htmlFor="technical-file-date-text-color">Color</Label>
                  <Input
                    id="technical-file-date-text-color"
                    type="color"
                    value={config.technicalFileDateTextColor || "#000000"}
                    onChange={(e) => setConfig({ ...config, technicalFileDateTextColor: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="technical-file-date-line-spacing">Line Spacing</Label>
                  <Input
                    id="technical-file-date-line-spacing"
                    type="number"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={config.technicalFileDateLineSpacing || 1}
                    onChange={(e) => setConfig({ ...config, technicalFileDateLineSpacing: parseFloat(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label htmlFor="technical-file-date-letter-spacing">Letter Spacing (px)</Label>
                  <Input
                    id="technical-file-date-letter-spacing"
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={config.technicalFileDateLetterSpacing || 0}
                    onChange={(e) => setConfig({ ...config, technicalFileDateLetterSpacing: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="technical-file-date-bold"
                    checked={config.technicalFileDateBold || false}
                    onCheckedChange={(checked) => setConfig({ ...config, technicalFileDateBold: checked })}
                  />
                  <Label htmlFor="technical-file-date-bold" className="cursor-pointer">Bold</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="technical-file-date-underline"
                    checked={config.technicalFileDateUnderline || false}
                    onCheckedChange={(checked) => setConfig({ ...config, technicalFileDateUnderline: checked })}
                  />
                  <Label htmlFor="technical-file-date-underline" className="cursor-pointer">Underline</Label>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table Settings */}
          <div className="space-y-4 pb-6 border-b">
            <h3 className="text-lg font-semibold mb-4">2. Items Table Settings</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="technical-file-table-text-alignment">Table Text Alignment</Label>
                <Select
                  id="technical-file-table-text-alignment"
                  value={config.technicalFileTableTextAlignment || "left"}
                  onValueChange={(value: any) => setConfig({ ...config, technicalFileTableTextAlignment: value })}
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
                <Label htmlFor="technical-file-table-direction">Writing Direction</Label>
                <Select
                  id="technical-file-table-direction"
                  value={config.technicalFileTableDirection || "LTR"}
                  onValueChange={(value: any) => setConfig({ ...config, technicalFileTableDirection: value })}
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
                  <Label htmlFor="technical-file-table-label-font-family">Font Family</Label>
                  <Select
                    id="technical-file-table-label-font-family"
                    value={config.technicalFileTableLabelFontFamily || "HELVETICA"}
                    onValueChange={(value: any) => setConfig({ ...config, technicalFileTableLabelFontFamily: value })}
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
                  <Label htmlFor="technical-file-table-label-font-size">Font Size (px)</Label>
                  <Input
                    id="technical-file-table-label-font-size"
                    type="number"
                    min="8"
                    max="72"
                    value={config.technicalFileTableLabelFontSize || 11}
                    onChange={(e) => setConfig({ ...config, technicalFileTableLabelFontSize: parseInt(e.target.value) || 11 })}
                  />
                </div>
                <div>
                  <Label htmlFor="technical-file-table-label-text-color">Color</Label>
                  <Input
                    id="technical-file-table-label-text-color"
                    type="color"
                    value={config.technicalFileTableLabelTextColor || "#000000"}
                    onChange={(e) => setConfig({ ...config, technicalFileTableLabelTextColor: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="technical-file-table-label-line-spacing">Line Spacing</Label>
                  <Input
                    id="technical-file-table-label-line-spacing"
                    type="number"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={config.technicalFileTableLabelLineSpacing || 1}
                    onChange={(e) => setConfig({ ...config, technicalFileTableLabelLineSpacing: parseFloat(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label htmlFor="technical-file-table-label-letter-spacing">Letter Spacing (px)</Label>
                  <Input
                    id="technical-file-table-label-letter-spacing"
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={config.technicalFileTableLabelLetterSpacing || 0}
                    onChange={(e) => setConfig({ ...config, technicalFileTableLabelLetterSpacing: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="technical-file-table-label-bold"
                    checked={config.technicalFileTableLabelBold || false}
                    onCheckedChange={(checked) => setConfig({ ...config, technicalFileTableLabelBold: checked })}
                  />
                  <Label htmlFor="technical-file-table-label-bold" className="cursor-pointer">Bold</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="technical-file-table-label-underline"
                    checked={config.technicalFileTableLabelUnderline || false}
                    onCheckedChange={(checked) => setConfig({ ...config, technicalFileTableLabelUnderline: checked })}
                  />
                  <Label htmlFor="technical-file-table-label-underline" className="cursor-pointer">Underline</Label>
                </div>
              </div>
            </div>

            {/* Table Values Settings */}
            <div className="space-y-4 pt-4">
              <h4 className="font-medium">Table Values (Rest of Table) Settings</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="technical-file-table-value-font-family">Font Family</Label>
                  <Select
                    id="technical-file-table-value-font-family"
                    value={config.technicalFileTableValueFontFamily || "HELVETICA"}
                    onValueChange={(value: any) => setConfig({ ...config, technicalFileTableValueFontFamily: value })}
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
                  <Label htmlFor="technical-file-table-value-font-size">Font Size (px)</Label>
                  <Input
                    id="technical-file-table-value-font-size"
                    type="number"
                    min="8"
                    max="72"
                    value={config.technicalFileTableValueFontSize || 11}
                    onChange={(e) => setConfig({ ...config, technicalFileTableValueFontSize: parseInt(e.target.value) || 11 })}
                  />
                </div>
                <div>
                  <Label htmlFor="technical-file-table-value-text-color">Color</Label>
                  <Input
                    id="technical-file-table-value-text-color"
                    type="color"
                    value={config.technicalFileTableValueTextColor || "#000000"}
                    onChange={(e) => setConfig({ ...config, technicalFileTableValueTextColor: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="technical-file-table-value-line-spacing">Line Spacing</Label>
                  <Input
                    id="technical-file-table-value-line-spacing"
                    type="number"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={config.technicalFileTableValueLineSpacing || 1}
                    onChange={(e) => setConfig({ ...config, technicalFileTableValueLineSpacing: parseFloat(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label htmlFor="technical-file-table-value-letter-spacing">Letter Spacing (px)</Label>
                  <Input
                    id="technical-file-table-value-letter-spacing"
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={config.technicalFileTableValueLetterSpacing || 0}
                    onChange={(e) => setConfig({ ...config, technicalFileTableValueLetterSpacing: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="technical-file-table-value-bold"
                    checked={config.technicalFileTableValueBold || false}
                    onCheckedChange={(checked) => setConfig({ ...config, technicalFileTableValueBold: checked })}
                  />
                  <Label htmlFor="technical-file-table-value-bold" className="cursor-pointer">Bold</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="technical-file-table-value-underline"
                    checked={config.technicalFileTableValueUnderline || false}
                    onCheckedChange={(checked) => setConfig({ ...config, technicalFileTableValueUnderline: checked })}
                  />
                  <Label htmlFor="technical-file-table-value-underline" className="cursor-pointer">Underline</Label>
                </div>
              </div>
            </div>
          </div>

          {/* Column-Specific Settings (NO NUMBER COLUMN for technical files) */}
          <div className="space-y-4 pb-6 border-b">
            <h3 className="text-lg font-semibold mb-4">2.1 Column Settings</h3>
            <p className="text-sm text-muted-foreground mb-4">Configure width and padding for each column in the items table</p>

            <div className="space-y-4">
              {/* Column 1: Item family (First column for technical files) */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Column 1: Item family</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="technical-file-col-family-width">Width (mm)</Label>
                    <Input
                      id="technical-file-col-family-width"
                      type="number"
                      min="10"
                      max="150"
                      step="0.01"
                      value={config.technicalFileColFamilyWidth ?? 39.69}
                      onChange={(e) => setConfig({ ...config, technicalFileColFamilyWidth: parseFloat(e.target.value) || 39.69 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="technical-file-col-family-padding">Padding (mm)</Label>
                    <Input
                      id="technical-file-col-family-padding"
                      type="number"
                      min="0"
                      max="20"
                      step="0.01"
                      value={config.technicalFileColFamilyPadding ?? 5.61}
                      onChange={(e) => setConfig({ ...config, technicalFileColFamilyPadding: parseFloat(e.target.value) || 5.61 })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Column 2: Model */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Column 2: Model</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="technical-file-col-model-width">Width (mm)</Label>
                    <Input
                      id="technical-file-col-model-width"
                      type="number"
                      min="10"
                      max="150"
                      step="0.01"
                      value={config.technicalFileColModelWidth ?? 39.69}
                      onChange={(e) => setConfig({ ...config, technicalFileColModelWidth: parseFloat(e.target.value) || 39.69 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="technical-file-col-model-padding">Padding (mm)</Label>
                    <Input
                      id="technical-file-col-model-padding"
                      type="number"
                      min="0"
                      max="20"
                      step="0.01"
                      value={config.technicalFileColModelPadding ?? 5.61}
                      onChange={(e) => setConfig({ ...config, technicalFileColModelPadding: parseFloat(e.target.value) || 5.61 })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Column 3: Brand */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Column 3: Brand</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="technical-file-col-brand-width">Width (mm)</Label>
                    <Input
                      id="technical-file-col-brand-width"
                      type="number"
                      min="10"
                      max="150"
                      step="0.01"
                      value={config.technicalFileColBrandWidth ?? 31.75}
                      onChange={(e) => setConfig({ ...config, technicalFileColBrandWidth: parseFloat(e.target.value) || 31.75 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="technical-file-col-brand-padding">Padding (mm)</Label>
                    <Input
                      id="technical-file-col-brand-padding"
                      type="number"
                      min="0"
                      max="20"
                      step="0.01"
                      value={config.technicalFileColBrandPadding ?? 5.61}
                      onChange={(e) => setConfig({ ...config, technicalFileColBrandPadding: parseFloat(e.target.value) || 5.61 })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Column 4: Quantity */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Column 4: Quantity</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="technical-file-col-quantity-width">Width (mm)</Label>
                    <Input
                      id="technical-file-col-quantity-width"
                      type="number"
                      min="10"
                      max="150"
                      step="0.01"
                      value={config.technicalFileColQuantityWidth ?? 21.17}
                      onChange={(e) => setConfig({ ...config, technicalFileColQuantityWidth: parseFloat(e.target.value) || 21.17 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="technical-file-col-quantity-padding">Padding (mm)</Label>
                    <Input
                      id="technical-file-col-quantity-padding"
                      type="number"
                      min="0"
                      max="20"
                      step="0.01"
                      value={config.technicalFileColQuantityPadding ?? 5.61}
                      onChange={(e) => setConfig({ ...config, technicalFileColQuantityPadding: parseFloat(e.target.value) || 5.61 })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Column 5: Price per unit */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Column 5: Price per unit</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="technical-file-col-price-unit-width">Width (mm)</Label>
                    <Input
                      id="technical-file-col-price-unit-width"
                      type="number"
                      min="10"
                      max="150"
                      step="0.01"
                      value={config.technicalFileColPriceUnitWidth ?? 31.75}
                      onChange={(e) => setConfig({ ...config, technicalFileColPriceUnitWidth: parseFloat(e.target.value) || 31.75 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="technical-file-col-price-unit-padding">Padding (mm)</Label>
                    <Input
                      id="technical-file-col-price-unit-padding"
                      type="number"
                      min="0"
                      max="20"
                      step="0.01"
                      value={config.technicalFileColPriceUnitPadding ?? 5.61}
                      onChange={(e) => setConfig({ ...config, technicalFileColPriceUnitPadding: parseFloat(e.target.value) || 5.61 })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Column 6: Price excluding tax */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Column 6: Price excluding tax</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="technical-file-col-price-total-width">Width (mm)</Label>
                    <Input
                      id="technical-file-col-price-total-width"
                      type="number"
                      min="10"
                      max="150"
                      step="0.01"
                      value={config.technicalFileColPriceTotalWidth ?? 31.75}
                      onChange={(e) => setConfig({ ...config, technicalFileColPriceTotalWidth: parseFloat(e.target.value) || 31.75 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="technical-file-col-price-total-padding">Padding (mm)</Label>
                    <Input
                      id="technical-file-col-price-total-padding"
                      type="number"
                      min="0"
                      max="20"
                      step="0.01"
                      value={config.technicalFileColPriceTotalPadding ?? 5.61}
                      onChange={(e) => setConfig({ ...config, technicalFileColPriceTotalPadding: parseFloat(e.target.value) || 5.61 })}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Empty Rows Settings */}
          <div className="space-y-4 pb-6 border-b">
            <div>
              <Label htmlFor="technical-file-empty-rows">Empty Rows (number)</Label>
              <Input
                id="technical-file-empty-rows"
                type="number"
                min="0"
                max="20"
                value={config.technicalFileEmptyRows ?? 8}
                onChange={(e) => setConfig({ ...config, technicalFileEmptyRows: parseInt(e.target.value) ?? 8 })}
              />
              <p className="text-xs text-muted-foreground mt-1">Number of extra empty rows to add at the bottom of the items table</p>
            </div>
            <div>
              <Label htmlFor="technical-file-last-page-table-max-height">Last Page Table Max Height (mm)</Label>
              <Input
                id="technical-file-last-page-table-max-height"
                type="number"
                min="50"
                max="250"
                value={config.technicalFileLastPageTableMaxHeight ?? 150}
                onChange={(e) => setConfig({ ...config, technicalFileLastPageTableMaxHeight: parseInt(e.target.value) ?? 150 })}
              />
              <p className="text-xs text-muted-foreground mt-1">Maximum height of items table on last page (page with summary + terms section)</p>
            </div>
            <div>
              <Label htmlFor="technical-file-first-page-table-max-height">First Page Table Max Height (mm)</Label>
              <Input
                id="technical-file-first-page-table-max-height"
                type="number"
                min="50"
                max="250"
                value={config.technicalFileFirstPageTableMaxHeight ?? 180}
                onChange={(e) => setConfig({ ...config, technicalFileFirstPageTableMaxHeight: parseInt(e.target.value) ?? 180 })}
              />
              <p className="text-xs text-muted-foreground mt-1">Maximum height of items table on first page (page with header and customer info)</p>
            </div>
            <div>
              <Label htmlFor="technical-file-other-pages-table-max-height">Other Pages Table Max Height (mm)</Label>
              <Input
                id="technical-file-other-pages-table-max-height"
                type="number"
                min="50"
                max="250"
                value={config.technicalFileOtherPagesTableMaxHeight ?? 180}
                onChange={(e) => setConfig({ ...config, technicalFileOtherPagesTableMaxHeight: parseInt(e.target.value) ?? 180 })}
              />
              <p className="text-xs text-muted-foreground mt-1">Maximum height of items table on other pages (pages without header and footer)</p>
            </div>
            <div>
              <Label htmlFor="technical-file-single-page-table-max-height">Single Page Table Max Height (mm)</Label>
              <Input
                id="technical-file-single-page-table-max-height"
                type="number"
                min="50"
                max="297"
                value={config.technicalFileSinglePageTableMaxHeight ?? 297}
                onChange={(e) => setConfig({ ...config, technicalFileSinglePageTableMaxHeight: parseInt(e.target.value) ?? 297 })}
              />
              <p className="text-xs text-muted-foreground mt-1">Maximum height of items table when technical file is single page (no height limit - full A4 height)</p>
            </div>
          </div>

          {/* Footer Settings */}
          <div className="space-y-4 pb-6 border-b">
            <h3 className="text-lg font-semibold mb-4">3. Footer Settings</h3>

            <div className="space-y-4 pt-4">
              <h4 className="font-medium">Terms & Conditions Settings</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="technical-file-terms-position">Position</Label>
                  <Select
                    id="technical-file-terms-position"
                    value={config.technicalFileTermsPosition || "left"}
                    onValueChange={(value: any) => setConfig({ ...config, technicalFileTermsPosition: value })}
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
                  <Label htmlFor="technical-file-terms-title">Title Text</Label>
                  <Input
                    id="technical-file-terms-title"
                    value={config.technicalFileTermsTitle || "Terms and conditions"}
                    onChange={(e) => setConfig({ ...config, technicalFileTermsTitle: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="technical-file-terms-font-family">Font Family</Label>
                  <Select
                    id="technical-file-terms-font-family"
                    value={config.technicalFileTermsFontFamily || "HELVETICA"}
                    onValueChange={(value: any) => setConfig({ ...config, technicalFileTermsFontFamily: value })}
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
                  <Label htmlFor="technical-file-terms-font-size">Font Size (px)</Label>
                  <Input
                    id="technical-file-terms-font-size"
                    type="number"
                    min="8"
                    max="72"
                    value={config.technicalFileTermsFontSize || 11}
                    onChange={(e) => setConfig({ ...config, technicalFileTermsFontSize: parseInt(e.target.value) || 11 })}
                  />
                </div>
                <div>
                  <Label htmlFor="technical-file-terms-text-color">Color</Label>
                  <Input
                    id="technical-file-terms-text-color"
                    type="color"
                    value={config.technicalFileTermsTextColor || "#000000"}
                    onChange={(e) => setConfig({ ...config, technicalFileTermsTextColor: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="technical-file-terms-line-spacing">Line Spacing</Label>
                  <Input
                    id="technical-file-terms-line-spacing"
                    type="number"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={config.technicalFileTermsLineSpacing || 1}
                    onChange={(e) => setConfig({ ...config, technicalFileTermsLineSpacing: parseFloat(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label htmlFor="technical-file-terms-letter-spacing">Letter Spacing (px)</Label>
                  <Input
                    id="technical-file-terms-letter-spacing"
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={config.technicalFileTermsLetterSpacing || 0}
                    onChange={(e) => setConfig({ ...config, technicalFileTermsLetterSpacing: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="technical-file-terms-bold"
                    checked={config.technicalFileTermsBold || false}
                    onCheckedChange={(checked) => setConfig({ ...config, technicalFileTermsBold: checked })}
                  />
                  <Label htmlFor="technical-file-terms-bold" className="cursor-pointer">Bold</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="technical-file-terms-underline"
                    checked={config.technicalFileTermsUnderline || false}
                    onCheckedChange={(checked) => setConfig({ ...config, technicalFileTermsUnderline: checked })}
                  />
                  <Label htmlFor="technical-file-terms-underline" className="cursor-pointer">Underline</Label>
                </div>
              </div>
            </div>

            {/* Individual Terms Settings */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-semibold mb-3">Individual Terms</h4>

              {/* Delivery Term */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="terms-include-delivery"
                      checked={config.technicalFileTermsIncludeDelivery ?? true}
                      onCheckedChange={(checked) => setConfig({ ...config, technicalFileTermsIncludeDelivery: checked })}
                    />
                    <Label htmlFor="terms-include-delivery" className="cursor-pointer font-medium">Include Delivery Term</Label>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Time Type</Label>
                    <Select
                      value={config.technicalFileTermsDeliveryType || "fixed"}
                      onValueChange={(value: any) => setConfig({ ...config, technicalFileTermsDeliveryType: value })}
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
                      value={config.technicalFileTermsDeliveryTimeFrom ?? 15}
                      onChange={(e) => setConfig({ ...config, technicalFileTermsDeliveryTimeFrom: parseInt(e.target.value) || 15 })}
                    />
                  </div>
                  
                  {config.technicalFileTermsDeliveryType === "range" && (
                    <div>
                      <Label>Time To</Label>
                      <Input
                        type="number"
                        min="1"
                        value={config.technicalFileTermsDeliveryTimeTo ?? 30}
                        onChange={(e) => setConfig({ ...config, technicalFileTermsDeliveryTimeTo: parseInt(e.target.value) || 30 })}
                      />
                    </div>
                  )}
                  
                  <div>
                    <Label>Time Unit</Label>
                    <Select
                      value={config.technicalFileTermsDeliveryTimeUnit || "days"}
                      onValueChange={(value: any) => setConfig({ ...config, technicalFileTermsDeliveryTimeUnit: value })}
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
                      checked={config.technicalFileTermsIncludeValidity ?? true}
                      onCheckedChange={(checked) => setConfig({ ...config, technicalFileTermsIncludeValidity: checked })}
                    />
                    <Label htmlFor="terms-include-validity" className="cursor-pointer font-medium">Include Validity Term</Label>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Time Type</Label>
                    <Select
                      value={config.technicalFileTermsValidityType || "fixed"}
                      onValueChange={(value: any) => setConfig({ ...config, technicalFileTermsValidityType: value })}
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
                      value={config.technicalFileTermsValidityTime ?? 30}
                      onChange={(e) => setConfig({ ...config, technicalFileTermsValidityTime: parseInt(e.target.value) || 30 })}
                    />
                  </div>
                  
                  {config.technicalFileTermsValidityType === "range" && (
                    <div>
                      <Label>Time To</Label>
                      <Input
                        type="number"
                        min="1"
                        value={config.technicalFileTermsValidityTimeTo ?? 60}
                        onChange={(e) => setConfig({ ...config, technicalFileTermsValidityTimeTo: parseInt(e.target.value) || 60 })}
                      />
                    </div>
                  )}
                  
                  <div>
                    <Label>Time Unit</Label>
                    <Select
                      value={config.technicalFileTermsValidityTimeUnit || "months"}
                      onValueChange={(value: any) => setConfig({ ...config, technicalFileTermsValidityTimeUnit: value })}
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
                      checked={config.technicalFileTermsIncludeWarranty ?? true}
                      onCheckedChange={(checked) => setConfig({ ...config, technicalFileTermsIncludeWarranty: checked })}
                    />
                    <Label htmlFor="terms-include-warranty" className="cursor-pointer font-medium">Include Warranty Term</Label>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Time Type</Label>
                    <Select
                      value={config.technicalFileTermsWarrantyType || "fixed"}
                      onValueChange={(value: any) => setConfig({ ...config, technicalFileTermsWarrantyType: value })}
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
                      value={config.technicalFileTermsWarrantyTime ?? 12}
                      onChange={(e) => setConfig({ ...config, technicalFileTermsWarrantyTime: parseInt(e.target.value) || 12 })}
                    />
                  </div>
                  
                  {config.technicalFileTermsWarrantyType === "range" && (
                    <div>
                      <Label>Time To</Label>
                      <Input
                        type="number"
                        min="1"
                        value={config.technicalFileTermsWarrantyTimeTo ?? 24}
                        onChange={(e) => setConfig({ ...config, technicalFileTermsWarrantyTimeTo: parseInt(e.target.value) || 24 })}
                      />
                    </div>
                  )}
                  
                  <div>
                    <Label>Time Unit</Label>
                    <Select
                      value={config.technicalFileTermsWarrantyTimeUnit || "months"}
                      onValueChange={(value: any) => setConfig({ ...config, technicalFileTermsWarrantyTimeUnit: value })}
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
                      checked={config.technicalFileTermsIncludeConfirmation ?? true}
                      onCheckedChange={(checked) => setConfig({ ...config, technicalFileTermsIncludeConfirmation: checked })}
                    />
                    <Label htmlFor="terms-include-confirmation" className="cursor-pointer font-medium">Include Confirmation Term</Label>
                  </div>
                </div>
                
                <div>
                  <Label>Delivery Condition</Label>
                  <Select
                    value={config.technicalFileTermsDeliveryCondition || "after_order_confirmation"}
                    onValueChange={(value: any) => setConfig({ ...config, technicalFileTermsDeliveryCondition: value })}
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
                      checked={config.technicalFileTermsIncludePayment ?? true}
                      onCheckedChange={(checked) => setConfig({ ...config, technicalFileTermsIncludePayment: checked })}
                    />
                    <Label htmlFor="terms-include-payment" className="cursor-pointer font-medium">Include Payment Method Term</Label>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Payment Method</Label>
                    <Select
                      value={config.technicalFileTermsPaymentMethod || "split_payment"}
                      onValueChange={(value: any) => setConfig({ ...config, technicalFileTermsPaymentMethod: value })}
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
                  
                  {config.technicalFileTermsPaymentMethod === "split_payment" && (
                    <div>
                      <Label>Payment at Order (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={config.technicalFileTermsSplitPaymentPercent ?? 50}
                        onChange={(e) => setConfig({ ...config, technicalFileTermsSplitPaymentPercent: parseInt(e.target.value) || 50 })}
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
                    checked={config.technicalFileTermsIncludePriceInWords ?? true}
                    onCheckedChange={(checked) => setConfig({ ...config, technicalFileTermsIncludePriceInWords: checked })}
                  />
                  <Label htmlFor="terms-include-price-in-words" className="cursor-pointer font-medium">Include Total Price in Words</Label>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <h4 className="font-medium">Signature Settings</h4>
              
              {/* Signature Count */}
              <div className="space-y-4">
                <Label htmlFor="technical-file-signature-count">Number of Signatures</Label>
                <Select
                  id="technical-file-signature-count"
                  value={String(config.technicalFileSignatureCount || 2)}
                  onValueChange={(value: string) => setConfig({ ...config, technicalFileSignatureCount: parseInt(value) as 1 | 2 })}
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
              {config.technicalFileSignatureCount === 1 && (
                <div className="space-y-4">
                  <Label htmlFor="technical-file-signature-position">Signature Position</Label>
                  <Select
                    id="technical-file-signature-position"
                    value={config.technicalFileSignaturePosition || "right"}
                    onValueChange={(value: "right" | "left" | "middle") => setConfig({ ...config, technicalFileSignaturePosition: value })}
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
                <Label htmlFor="technical-file-signature-line-width">Signature Line Width (px)</Label>
                <Input
                  id="technical-file-signature-line-width"
                  type="number"
                  min="50"
                  max="300"
                  step="10"
                  value={config.technicalFileSignatureLineWidth || 150}
                  onChange={(e) => setConfig({ ...config, technicalFileSignatureLineWidth: parseInt(e.target.value) || 150 })}
                />
              </div>

              {/* Signature Labels */}
              <div className="space-y-4 pt-4">
                <h4 className="font-medium">Signature Labels</h4>
                <div className="grid grid-cols-2 gap-4">
                  {config.technicalFileSignatureCount === 1 ? (
                    <div className="col-span-2">
                      <Label htmlFor="technical-file-signature-left-label">Signature Label</Label>
                      <Select
                        id="technical-file-signature-left-label"
                        value={config.technicalFileSignatureLeftLabelText || "Gérant"}
                        onValueChange={(value: string) => setConfig({ ...config, technicalFileSignatureLeftLabelText: value })}
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
                        <Label htmlFor="technical-file-signature-left-label">Left Signature Label</Label>
                        <Select
                          id="technical-file-signature-left-label"
                          value={config.technicalFileSignatureLeftLabelText || "Gérant"}
                          onValueChange={(value: string) => setConfig({ ...config, technicalFileSignatureLeftLabelText: value })}
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
                        <Label htmlFor="technical-file-signature-right-label">Right Signature Label</Label>
                        <Select
                          id="technical-file-signature-right-label"
                          value={config.technicalFileSignatureRightLabelText || "Client"}
                          onValueChange={(value: string) => setConfig({ ...config, technicalFileSignatureRightLabelText: value })}
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
              {config.technicalFileSignatureCount === 2 && (
                <div className="space-y-4 pt-4">
                  <h4 className="font-medium">Individual Signature Controls</h4>

                  {/* Left Signature Controls */}
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-left-signature"
                        checked={config.technicalFileIncludeLeftSignature !== false}
                        onCheckedChange={(checked) => setConfig({ ...config, technicalFileIncludeLeftSignature: checked as boolean })}
                      />
                      <Label htmlFor="include-left-signature" className="cursor-pointer font-medium">Include Left Signature</Label>
                    </div>

                    {config.technicalFileIncludeLeftSignature !== false && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="left-signature-offset-x">Horizontal Offset (px)</Label>
                          <Input
                            id="left-signature-offset-x"
                            type="number"
                            min="-100"
                            max="100"
                            step="1"
                            value={config.technicalFileLeftSignatureOffsetX || 0}
                            onChange={(e) => setConfig({ ...config, technicalFileLeftSignatureOffsetX: parseInt(e.target.value) || 0 })}
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
                            value={config.technicalFileLeftSignatureOffsetY || 0}
                            onChange={(e) => setConfig({ ...config, technicalFileLeftSignatureOffsetY: parseInt(e.target.value) || 0 })}
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
                        checked={config.technicalFileIncludeRightSignature !== false}
                        onCheckedChange={(checked) => setConfig({ ...config, technicalFileIncludeRightSignature: checked as boolean })}
                      />
                      <Label htmlFor="include-right-signature" className="cursor-pointer font-medium">Include Right Signature</Label>
                    </div>

                    {config.technicalFileIncludeRightSignature !== false && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="right-signature-offset-x">Horizontal Offset (px)</Label>
                          <Input
                            id="right-signature-offset-x"
                            type="number"
                            min="-100"
                            max="100"
                            step="1"
                            value={config.technicalFileRightSignatureOffsetX || 0}
                            onChange={(e) => setConfig({ ...config, technicalFileRightSignatureOffsetX: parseInt(e.target.value) || 0 })}
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
                            value={config.technicalFileRightSignatureOffsetY || 0}
                            onChange={(e) => setConfig({ ...config, technicalFileRightSignatureOffsetY: parseInt(e.target.value) || 0 })}
                          />
                          <p className="text-xs text-muted-foreground">Positive = down, Negative = up</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Single Signature Controls */}
              {config.technicalFileSignatureCount === 1 && (
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-single-signature"
                      checked={config.technicalFileIncludeLeftSignature !== false}
                      onCheckedChange={(checked) => setConfig({ ...config, technicalFileIncludeLeftSignature: checked as boolean })}
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
                    <p className="text-xs text-muted-foreground">{t("qrCodePreviewDesc", "Using technical file data and test verification token")}</p>
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
                  <Label htmlFor="technical-file-page-number-position">Position</Label>
                  <Select
                    id="technical-file-page-number-position"
                    value={config.technicalFilePageNumberPosition || "center"}
                    onValueChange={(value: any) => setConfig({ ...config, technicalFilePageNumberPosition: value })}
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
                  <Label htmlFor="technical-file-page-number-font-family">Font Family</Label>
                  <Select
                    id="technical-file-page-number-font-family"
                    value={config.technicalFilePageNumberFontFamily || "HELVETICA"}
                    onValueChange={(value: any) => setConfig({ ...config, technicalFilePageNumberFontFamily: value })}
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
                  <Label htmlFor="technical-file-page-number-font-size">Font Size (px)</Label>
                  <Input
                    id="technical-file-page-number-font-size"
                    type="number"
                    min="8"
                    max="24"
                    value={config.technicalFilePageNumberFontSize || 10}
                    onChange={(e) => setConfig({ ...config, technicalFilePageNumberFontSize: parseInt(e.target.value) || 10 })}
                  />
                </div>
                <div>
                  <Label htmlFor="technical-file-page-number-text-color">Text Color</Label>
                  <Input
                    id="technical-file-page-number-text-color"
                    type="color"
                    value={config.technicalFilePageNumberTextColor || "#666666"}
                    onChange={(e) => setConfig({ ...config, technicalFilePageNumberTextColor: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="technical-file-page-number-offset-x">Horizontal Offset (px)</Label>
                  <Input
                    id="technical-file-page-number-offset-x"
                    type="number"
                    min="-50"
                    max="50"
                    value={config.technicalFilePageNumberOffsetX || 0}
                    onChange={(e) => setConfig({ ...config, technicalFilePageNumberOffsetX: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="technical-file-page-number-offset-y">Vertical Offset (mm)</Label>
                <Input
                  id="technical-file-page-number-offset-y"
                  type="number"
                  min="-20"
                  max="20"
                  step="1"
                  value={config.technicalFilePageNumberOffsetY || 0}
                  onChange={(e) => setConfig({ ...config, technicalFilePageNumberOffsetY: parseFloat(e.target.value) || 0 })}
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

      <TechnicalFilePreviewDialog
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
