"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTranslation } from "@/hooks/use-translation";
import { Eye, Printer, Loader2, FileText, Check, Minus, Plus, RefreshCw, ChevronDown, ChevronUp, QrCode, Copy, Shield, Download } from "lucide-react";
import { toast } from "sonner";
import { CURRENCIES, convertPrice, formatPrice, getCurrencySymbol, type ExchangeRate } from "@/lib/currencyUtils";
import { numberToWords, currencyToWords, formatTimePeriod } from "@/lib/numberToWords";
import {
  printHTMLWithIframe,
  printIframeContent
} from "@/lib/printUtils";
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
  getTodayDate,
  getQrCodeDataUrls,
  generatePreviewHTML,
  generatePDFFromHTML
} from "@/lib/invoicePreviewUtils";
import InvoicePreviewDialog from "@/components/invoice/InvoicePreviewDialog";

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

  // Invoice Top Body Part
  invoiceTopBodyDirection?: "LTR" | "RTL";
  // Title settings
  invoiceTitlePosition?: "left" | "center" | "right";
  invoiceTitleFontFamily?: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  invoiceTitleFontSize?: number;
  invoiceTitleTextColor?: string;
  invoiceTitleLineSpacing?: number;
  invoiceTitleLetterSpacing?: number;
  invoiceTitleBold?: boolean;
  invoiceTitleUnderline?: boolean;
  // Customer settings
  // Customer info position
  invoiceClientInfoPosition?: "left" | "center" | "right";
  invoiceClientLabelText?: string;

  // Customer info settings - Label
  invoiceClientLabelFontFamily?: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  invoiceClientLabelFontSize?: number;
  invoiceClientLabelTextColor?: string;
  invoiceClientLabelLineSpacing?: number;
  invoiceClientLabelLetterSpacing?: number;
  invoiceClientLabelBold?: boolean;
  invoiceClientLabelUnderline?: boolean;

  // Customer info settings - Value
  invoiceClientValueFontFamily?: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  invoiceClientValueFontSize?: number;
  invoiceClientValueTextColor?: string;
  invoiceClientValueLineSpacing?: number;
  invoiceClientValueLetterSpacing?: number;
  invoiceClientValueBold?: boolean;
  invoiceClientValueUnderline?: boolean;

  // Date settings
  invoiceDatePosition?: "left" | "center" | "right";
  invoiceLocationDateLabelText?: string;
  invoiceDateFontFamily?: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  invoiceDateFontSize?: number;
  invoiceDateTextColor?: string;
  invoiceDateLineSpacing?: number;
  invoiceDateLetterSpacing?: number;
  invoiceDateBold?: boolean;
  invoiceDateUnderline?: boolean;

  // Table settings
  invoiceTableTextAlignment?: "left" | "center" | "right";
  invoiceTableDirection?: "LTR" | "RTL";
  // Table labels
  invoiceTableLabelFontFamily?: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  invoiceTableLabelFontSize?: number;
  invoiceTableLabelTextColor?: string;
  invoiceTableLabelLineSpacing?: number;
  invoiceTableLabelLetterSpacing?: number;
  invoiceTableLabelBold?: boolean;
  invoiceTableLabelUnderline?: boolean;
  // Table values
  invoiceTableValueFontFamily?: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  invoiceTableValueFontSize?: number;
  invoiceTableValueTextColor?: string;
  invoiceTableValueLineSpacing?: number;
  invoiceTableValueLetterSpacing?: number;
  invoiceTableValueBold?: boolean;
  invoiceTableValueUnderline?: boolean;
  invoiceEmptyRows?: number;
  invoiceFirstPageTableMaxHeight?: number;
  invoiceSinglePageTableMaxHeight?: number;
  invoiceLastPageTableMaxHeight?: number;
  invoiceOtherPagesTableMaxHeight?: number;

  // Column-specific settings for items table
  invoiceColNumberWidth?: number;
  invoiceColNumberPadding?: number;
  invoiceColFamilyWidth?: number;
  invoiceColFamilyPadding?: number;
  invoiceColModelWidth?: number;
  invoiceColModelPadding?: number;
  invoiceColBrandWidth?: number;
  invoiceColBrandPadding?: number;
  invoiceColQuantityWidth?: number;
  invoiceColQuantityPadding?: number;
  invoiceColPriceUnitWidth?: number;
  invoiceColPriceUnitPadding?: number;
  invoiceColPriceTotalWidth?: number;
  invoiceColPriceTotalPadding?: number;

  // Footer terms settings
  invoiceTermsPosition?: "left" | "center" | "right";
  invoiceTermsTitle?: string;
  invoiceTermsFontFamily?: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  invoiceTermsFontSize?: number;
  invoiceTermsTextColor?: string;
  invoiceTermsLineSpacing?: number;
  invoiceTermsLetterSpacing?: number;
  invoiceTermsBold?: boolean;
  invoiceTermsUnderline?: boolean;

  // Individual Terms Settings
  invoiceTermsIncludeDelivery?: boolean;
  invoiceTermsDeliveryType?: "fixed" | "range";
  invoiceTermsDeliveryTimeFrom?: number;
  invoiceTermsDeliveryTimeTo?: number | null;
  invoiceTermsDeliveryTimeUnit?: "days" | "weeks" | "months" | "years";

  invoiceTermsIncludeValidity?: boolean;
  invoiceTermsValidityType?: "fixed" | "range";
  invoiceTermsValidityTime?: number;
  invoiceTermsValidityTimeTo?: number | null;
  invoiceTermsValidityTimeUnit?: "days" | "weeks" | "months" | "years";

  invoiceTermsIncludeWarranty?: boolean;
  invoiceTermsWarrantyType?: "fixed" | "range";
  invoiceTermsWarrantyTime?: number;
  invoiceTermsWarrantyTimeTo?: number | null;
  invoiceTermsWarrantyTimeUnit?: "days" | "weeks" | "months" | "years";

  invoiceTermsIncludeConfirmation?: boolean;
  invoiceTermsDeliveryCondition?: "after_order_confirmation" | "after_payment";

  invoiceTermsIncludePayment?: boolean;
  invoiceTermsPaymentMethod?: "online" | "website" | "check" | "cash" | "split_payment";
  invoiceTermsSplitPaymentPercent?: number;
  invoiceTermsIncludePriceInWords?: boolean;

  // Signature settings
  invoiceSignatureCount?: number;
  invoiceSignaturePosition?: "right" | "left" | "middle";
  invoiceSignatureLeftLabelText?: string;
  invoiceSignatureRightLabelText?: string;
  invoiceSignatureLineWidth?: number;
  savedSignatureLabels?: string;

  // Individual signature controls
  includeLeftSignature?: boolean;
  leftSignatureOffsetX?: number;
  leftSignatureOffsetY?: number;
  includeRightSignature?: boolean;
  rightSignatureOffsetX?: number;
  rightSignatureOffsetY?: number;

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
  invoicePageNumberFontFamily?: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  invoicePageNumberFontSize?: number;
  invoicePageNumberTextColor?: string;
  invoicePageNumberPosition?: "left" | "center" | "right";
  invoicePageNumberOffsetX?: number;
  invoicePageNumberOffsetY?: number;

  // QR Code settings
  includeQrCode?: boolean;
  qrCodeSize?: number;
  qrCodeOffsetX?: number;
  qrCodeOffsetY?: number;

  // Invoice currency and language
  invoiceCurrency?: string;
  invoiceLanguage?: string;
}

export default function InvoiceSettingsSection() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [config, setConfig] = useState<PDFConfiguration | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [machineModels, setMachineModels] = useState<MachineModel[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
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
  const [previewDialogBackgroundColor, setPreviewDialogBackgroundColor] = useState("transparent");

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
      setSelectedCurrency(config.invoiceCurrency || "DZD");
      setSelectedLanguage(config.invoiceLanguage || "FR");
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
    link.download = `invoice-qr-${Date.now()}.png`;
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

  const invoiceTranslations = {
    FR: {
      invoiceNumber: "Facture N°",
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
        validityTitle: "Validité de la facture",
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
      invoiceNumber: "Invoice N°",
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
        validityTitle: "Invoice validity",
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
      invoiceNumber: "فاتورة رقم",
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
        validityTitle: "صلاحية الفاتورة",
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
      invoiceTranslations,
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
        invoiceCurrency: selectedCurrency,
        invoiceLanguage: selectedLanguage,
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

  const handleGeneratePDF = async () => {
    if (!config || !company) return;

    try {
      setIsGeneratingPDF(true);
      const previewHTML = getPreviewHTML();
      const fileName = `Invoice_${getTodayDate().replace(/\//g, '-')}.pdf`;
      await generatePDFFromHTML(previewHTML, fileName);
      toast.success("PDF generated successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };


  const handlePrint = async () => {
    try {
      await printHTMLWithIframe(getPreviewHTML().replace('margin: 0 auto 20px auto;', 'margin: 0 auto 0 auto;'));
    } catch (error) {
      console.error("Error printing:", error);
      toast.error("Failed to print");
    }
  };

  // Function to print preview dialog iframe directly (without opening new window)
  const handlePrintPreview = () => {
    const iframe = previewRef.current;
    const success = printIframeContent(iframe, isIframeLoaded);

    if (!success) {
      if (!iframe || !iframe.contentWindow) {
        toast.error("Preview iframe not ready");
      } else if (!isIframeLoaded) {
        toast.error("Preview not fully loaded yet");
      } else {
        toast.error("Failed to print preview");
      }
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
    setPreviewDialogBackgroundColor("transparent");
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
              <CardTitle>{t("pdfSettingsInvoice", "Invoice")}</CardTitle>
              <CardDescription>{t("pdfSettingsInvoiceDescription", "Configure invoice-specific PDF settings")}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(true)}>
                <Eye className="h-4 w-4 mr-2" />
                {t("pdfSettingsPreview", "Preview")}
              </Button>

              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                {t("pdfSettingsPrint", "Print")}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleGeneratePDF}
                disabled={isGeneratingPDF}
              >
                {isGeneratingPDF ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Generate PDF
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
            The invoice uses global PDF header. Configure header settings in Global Header tab.
          </p>

          {/* Top Body Part Settings */}
          <div className="space-y-4 pb-6 border-b">
            <h3 className="text-lg font-semibold mb-4">1. Top Body Part Settings</h3>

            {/* Writing Direction */}
            <div>
              <Label htmlFor="invoice-top-body-direction">Writing Direction</Label>
              <Select
                id="invoice-top-body-direction"
                value={config.invoiceTopBodyDirection || "LTR"}
                onValueChange={(value: any) => setConfig({ ...config, invoiceTopBodyDirection: value })}
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
                  <Label htmlFor="invoice-title-position">Position</Label>
                  <Select
                    id="invoice-title-position"
                    value={config.invoiceTitlePosition || "center"}
                    onValueChange={(value: any) => setConfig({ ...config, invoiceTitlePosition: value })}
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
                  <Label htmlFor="invoice-title-font-family">Font Family</Label>
                  <Select
                    id="invoice-title-font-family"
                    value={config.invoiceTitleFontFamily || "HELVETICA"}
                    onValueChange={(value: any) => setConfig({ ...config, invoiceTitleFontFamily: value })}
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
                  <Label htmlFor="invoice-title-font-size">Font Size (px)</Label>
                  <Input
                    id="invoice-title-font-size"
                    type="number"
                    min="8"
                    max="72"
                    value={config.invoiceTitleFontSize || 16}
                    onChange={(e) => setConfig({ ...config, invoiceTitleFontSize: parseInt(e.target.value) || 16 })}
                  />
                </div>
                <div>
                  <Label htmlFor="invoice-title-text-color">Color</Label>
                  <Input
                    id="invoice-title-text-color"
                    type="color"
                    value={config.invoiceTitleTextColor || "#000000"}
                    onChange={(e) => setConfig({ ...config, invoiceTitleTextColor: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="invoice-title-line-spacing">Line Spacing</Label>
                  <Input
                    id="invoice-title-line-spacing"
                    type="number"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={config.invoiceTitleLineSpacing || 1}
                    onChange={(e) => setConfig({ ...config, invoiceTitleLineSpacing: parseFloat(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label htmlFor="invoice-title-letter-spacing">Letter Spacing (px)</Label>
                  <Input
                    id="invoice-title-letter-spacing"
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={config.invoiceTitleLetterSpacing || 0}
                    onChange={(e) => setConfig({ ...config, invoiceTitleLetterSpacing: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="invoice-title-bold"
                    checked={config.invoiceTitleBold || false}
                    onCheckedChange={(checked) => setConfig({ ...config, invoiceTitleBold: checked })}
                  />
                  <Label htmlFor="invoice-title-bold" className="cursor-pointer">Bold</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="invoice-title-underline"
                    checked={config.invoiceTitleUnderline || false}
                    onCheckedChange={(checked) => setConfig({ ...config, invoiceTitleUnderline: checked })}
                  />
                  <Label htmlFor="invoice-title-underline" className="cursor-pointer">Underline</Label>
                </div>
              </div>
            </div>

            {/* Customer Settings */}
            <div className="space-y-4 pt-4">
              <h4 className="font-medium">Customer Info Settings</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoice-client-info-position">Position</Label>
                  <Select
                    id="invoice-client-info-position"
                    value={config.invoiceClientInfoPosition || "left"}
                    onValueChange={(value: any) => setConfig({ ...config, invoiceClientInfoPosition: value })}
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
                    <Label htmlFor="invoice-client-label-font-family">Font Family</Label>
                    <Select
                      id="invoice-client-label-font-family"
                      value={config.invoiceClientLabelFontFamily || "HELVETICA"}
                      onValueChange={(value: any) => setConfig({ ...config, invoiceClientLabelFontFamily: value })}
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
                    <Label htmlFor="invoice-client-label-font-size">Font Size (px)</Label>
                    <Input
                      id="invoice-client-label-font-size"
                      type="number"
                      min="8"
                      max="72"
                      value={config.invoiceClientLabelFontSize || 12}
                      onChange={(e) => setConfig({ ...config, invoiceClientLabelFontSize: parseInt(e.target.value) || 12 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoice-client-label-text-color">Color</Label>
                    <Input
                      id="invoice-client-label-text-color"
                      type="color"
                      value={config.invoiceClientLabelTextColor || "#000000"}
                      onChange={(e) => setConfig({ ...config, invoiceClientLabelTextColor: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoice-client-label-line-spacing">Line Spacing</Label>
                    <Input
                      id="invoice-client-label-line-spacing"
                      type="number"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={config.invoiceClientLabelLineSpacing || 1}
                      onChange={(e) => setConfig({ ...config, invoiceClientLabelLineSpacing: parseFloat(e.target.value) || 1 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoice-client-label-letter-spacing">Letter Spacing (px)</Label>
                    <Input
                      id="invoice-client-label-letter-spacing"
                      type="number"
                      min="0"
                      max="20"
                      step="0.1"
                      value={config.invoiceClientLabelLetterSpacing || 0}
                      onChange={(e) => setConfig({ ...config, invoiceClientLabelLetterSpacing: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="invoice-client-label-bold"
                      checked={config.invoiceClientLabelBold || false}
                      onCheckedChange={(checked) => setConfig({ ...config, invoiceClientLabelBold: checked })}
                    />
                    <Label htmlFor="invoice-client-label-bold" className="cursor-pointer">Bold</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="invoice-client-label-underline"
                      checked={config.invoiceClientLabelUnderline || false}
                      onCheckedChange={(checked) => setConfig({ ...config, invoiceClientLabelUnderline: checked })}
                    />
                    <Label htmlFor="invoice-client-label-underline" className="cursor-pointer">Underline</Label>
                  </div>
                </div>
              </div>

              {/* Value Settings */}
              <div className="border-t pt-4">
                <h5 className="font-medium mb-3">Value Settings</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="invoice-client-value-font-family">Font Family</Label>
                    <Select
                      id="invoice-client-value-font-family"
                      value={config.invoiceClientValueFontFamily || "HELVETICA"}
                      onValueChange={(value: any) => setConfig({ ...config, invoiceClientValueFontFamily: value })}
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
                    <Label htmlFor="invoice-client-value-font-size">Font Size (px)</Label>
                    <Input
                      id="invoice-client-value-font-size"
                      type="number"
                      min="8"
                      max="72"
                      value={config.invoiceClientValueFontSize || 12}
                      onChange={(e) => setConfig({ ...config, invoiceClientValueFontSize: parseInt(e.target.value) || 12 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoice-client-value-text-color">Color</Label>
                    <Input
                      id="invoice-client-value-text-color"
                      type="color"
                      value={config.invoiceClientValueTextColor || "#000000"}
                      onChange={(e) => setConfig({ ...config, invoiceClientValueTextColor: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoice-client-value-line-spacing">Line Spacing</Label>
                    <Input
                      id="invoice-client-value-line-spacing"
                      type="number"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={config.invoiceClientValueLineSpacing || 1}
                      onChange={(e) => setConfig({ ...config, invoiceClientValueLineSpacing: parseFloat(e.target.value) || 1 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoice-client-value-letter-spacing">Letter Spacing (px)</Label>
                    <Input
                      id="invoice-client-value-letter-spacing"
                      type="number"
                      min="0"
                      max="20"
                      step="0.1"
                      value={config.invoiceClientValueLetterSpacing || 0}
                      onChange={(e) => setConfig({ ...config, invoiceClientValueLetterSpacing: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="invoice-client-value-bold"
                      checked={config.invoiceClientValueBold || false}
                      onCheckedChange={(checked) => setConfig({ ...config, invoiceClientValueBold: checked })}
                    />
                    <Label htmlFor="invoice-client-value-bold" className="cursor-pointer">Bold</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="invoice-client-value-underline"
                      checked={config.invoiceClientValueUnderline || false}
                      onCheckedChange={(checked) => setConfig({ ...config, invoiceClientValueUnderline: checked })}
                    />
                    <Label htmlFor="invoice-client-value-underline" className="cursor-pointer">Underline</Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Date Settings */}
            <div className="space-y-4 pt-4">
              <h4 className="font-medium">Date/Location Settings</h4>

              <div>
                <Label htmlFor="invoice-date-position">Position</Label>
                <Select
                  id="invoice-date-position"
                  value={config.invoiceDatePosition || "left"}
                  onValueChange={(value: any) => setConfig({ ...config, invoiceDatePosition: value })}
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
                  <Label htmlFor="invoice-client-label-text">Label Text</Label>
                  <Input
                    id="invoice-client-label-text"
                    value={config.invoiceLocationDateLabelText || "M'sila le"}
                    onChange={(e) => setConfig({ ...config, invoiceLocationDateLabelText: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="invoice-date-font-family">Font Family</Label>
                  <Select
                    id="invoice-date-font-family"
                    value={config.invoiceDateFontFamily || "HELVETICA"}
                    onValueChange={(value: any) => setConfig({ ...config, invoiceDateFontFamily: value })}
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
                  <Label htmlFor="invoice-date-font-size">Font Size (px)</Label>
                  <Input
                    id="invoice-date-font-size"
                    type="number"
                    min="8"
                    max="72"
                    value={config.invoiceDateFontSize || 12}
                    onChange={(e) => setConfig({ ...config, invoiceDateFontSize: parseInt(e.target.value) || 12 })}
                  />
                </div>
                <div>
                  <Label htmlFor="invoice-date-text-color">Color</Label>
                  <Input
                    id="invoice-date-text-color"
                    type="color"
                    value={config.invoiceDateTextColor || "#000000"}
                    onChange={(e) => setConfig({ ...config, invoiceDateTextColor: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="invoice-date-line-spacing">Line Spacing</Label>
                  <Input
                    id="invoice-date-line-spacing"
                    type="number"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={config.invoiceDateLineSpacing || 1}
                    onChange={(e) => setConfig({ ...config, invoiceDateLineSpacing: parseFloat(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label htmlFor="invoice-date-letter-spacing">Letter Spacing (px)</Label>
                  <Input
                    id="invoice-date-letter-spacing"
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={config.invoiceDateLetterSpacing || 0}
                    onChange={(e) => setConfig({ ...config, invoiceDateLetterSpacing: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="invoice-date-bold"
                    checked={config.invoiceDateBold || false}
                    onCheckedChange={(checked) => setConfig({ ...config, invoiceDateBold: checked })}
                  />
                  <Label htmlFor="invoice-date-bold" className="cursor-pointer">Bold</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="invoice-date-underline"
                    checked={config.invoiceDateUnderline || false}
                    onCheckedChange={(checked) => setConfig({ ...config, invoiceDateUnderline: checked })}
                  />
                  <Label htmlFor="invoice-date-underline" className="cursor-pointer">Underline</Label>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table Settings */}
          <div className="space-y-4 pb-6 border-b">
            <h3 className="text-lg font-semibold mb-4">2. Items Table Settings</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoice-table-text-alignment">Table Text Alignment</Label>
                <Select
                  id="invoice-table-text-alignment"
                  value={config.invoiceTableTextAlignment || "left"}
                  onValueChange={(value: any) => setConfig({ ...config, invoiceTableTextAlignment: value })}
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
                <Label htmlFor="invoice-table-direction">Writing Direction</Label>
                <Select
                  id="invoice-table-direction"
                  value={config.invoiceTableDirection || "LTR"}
                  onValueChange={(value: any) => setConfig({ ...config, invoiceTableDirection: value })}
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
                  <Label htmlFor="invoice-table-label-font-family">Font Family</Label>
                  <Select
                    id="invoice-table-label-font-family"
                    value={config.invoiceTableLabelFontFamily || "HELVETICA"}
                    onValueChange={(value: any) => setConfig({ ...config, invoiceTableLabelFontFamily: value })}
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
                  <Label htmlFor="invoice-table-label-font-size">Font Size (px)</Label>
                  <Input
                    id="invoice-table-label-font-size"
                    type="number"
                    min="8"
                    max="72"
                    value={config.invoiceTableLabelFontSize || 11}
                    onChange={(e) => setConfig({ ...config, invoiceTableLabelFontSize: parseInt(e.target.value) || 11 })}
                  />
                </div>
                <div>
                  <Label htmlFor="invoice-table-label-text-color">Color</Label>
                  <Input
                    id="invoice-table-label-text-color"
                    type="color"
                    value={config.invoiceTableLabelTextColor || "#000000"}
                    onChange={(e) => setConfig({ ...config, invoiceTableLabelTextColor: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="invoice-table-label-line-spacing">Line Spacing</Label>
                  <Input
                    id="invoice-table-label-line-spacing"
                    type="number"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={config.invoiceTableLabelLineSpacing || 1}
                    onChange={(e) => setConfig({ ...config, invoiceTableLabelLineSpacing: parseFloat(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label htmlFor="invoice-table-label-letter-spacing">Letter Spacing (px)</Label>
                  <Input
                    id="invoice-table-label-letter-spacing"
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={config.invoiceTableLabelLetterSpacing || 0}
                    onChange={(e) => setConfig({ ...config, invoiceTableLabelLetterSpacing: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="invoice-table-label-bold"
                    checked={config.invoiceTableLabelBold || false}
                    onCheckedChange={(checked) => setConfig({ ...config, invoiceTableLabelBold: checked })}
                  />
                  <Label htmlFor="invoice-table-label-bold" className="cursor-pointer">Bold</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="invoice-table-label-underline"
                    checked={config.invoiceTableLabelUnderline || false}
                    onCheckedChange={(checked) => setConfig({ ...config, invoiceTableLabelUnderline: checked })}
                  />
                  <Label htmlFor="invoice-table-label-underline" className="cursor-pointer">Underline</Label>
                </div>
              </div>
            </div>

            {/* Table Values Settings */}
            <div className="space-y-4 pt-4">
              <h4 className="font-medium">Table Values (Rest of Table) Settings</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoice-table-value-font-family">Font Family</Label>
                  <Select
                    id="invoice-table-value-font-family"
                    value={config.invoiceTableValueFontFamily || "HELVETICA"}
                    onValueChange={(value: any) => setConfig({ ...config, invoiceTableValueFontFamily: value })}
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
                  <Label htmlFor="invoice-table-value-font-size">Font Size (px)</Label>
                  <Input
                    id="invoice-table-value-font-size"
                    type="number"
                    min="8"
                    max="72"
                    value={config.invoiceTableValueFontSize || 11}
                    onChange={(e) => setConfig({ ...config, invoiceTableValueFontSize: parseInt(e.target.value) || 11 })}
                  />
                </div>
                <div>
                  <Label htmlFor="invoice-table-value-text-color">Color</Label>
                  <Input
                    id="invoice-table-value-text-color"
                    type="color"
                    value={config.invoiceTableValueTextColor || "#000000"}
                    onChange={(e) => setConfig({ ...config, invoiceTableValueTextColor: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="invoice-table-value-line-spacing">Line Spacing</Label>
                  <Input
                    id="invoice-table-value-line-spacing"
                    type="number"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={config.invoiceTableValueLineSpacing || 1}
                    onChange={(e) => setConfig({ ...config, invoiceTableValueLineSpacing: parseFloat(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label htmlFor="invoice-table-value-letter-spacing">Letter Spacing (px)</Label>
                  <Input
                    id="invoice-table-value-letter-spacing"
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={config.invoiceTableValueLetterSpacing || 0}
                    onChange={(e) => setConfig({ ...config, invoiceTableValueLetterSpacing: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="invoice-table-value-bold"
                    checked={config.invoiceTableValueBold || false}
                    onCheckedChange={(checked) => setConfig({ ...config, invoiceTableValueBold: checked })}
                  />
                  <Label htmlFor="invoice-table-value-bold" className="cursor-pointer">Bold</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="invoice-table-value-underline"
                    checked={config.invoiceTableValueUnderline || false}
                    onCheckedChange={(checked) => setConfig({ ...config, invoiceTableValueUnderline: checked })}
                  />
                  <Label htmlFor="invoice-table-value-underline" className="cursor-pointer">Underline</Label>
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
                    <Label htmlFor="invoice-col-number-width">Width (mm)</Label>
                    <Input
                      id="invoice-col-number-width"
                      type="number"
                      min="5"
                      max="100"
                      step="0.01"
                      value={config.invoiceColNumberWidth ?? 13.23}
                      onChange={(e) => setConfig({ ...config, invoiceColNumberWidth: parseFloat(e.target.value) || 13.23 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoice-col-number-padding">Padding (mm)</Label>
                    <Input
                      id="invoice-col-number-padding"
                      type="number"
                      min="0"
                      max="20"
                      step="0.01"
                      value={config.invoiceColNumberPadding ?? 5.61}
                      onChange={(e) => setConfig({ ...config, invoiceColNumberPadding: parseFloat(e.target.value) || 5.61 })}
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
                    <Label htmlFor="invoice-col-family-width">Width (mm)</Label>
                    <Input
                      id="invoice-col-family-width"
                      type="number"
                      min="10"
                      max="150"
                      step="0.01"
                      value={config.invoiceColFamilyWidth ?? 39.69}
                      onChange={(e) => setConfig({ ...config, invoiceColFamilyWidth: parseFloat(e.target.value) || 39.69 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoice-col-family-padding">Padding (mm)</Label>
                    <Input
                      id="invoice-col-family-padding"
                      type="number"
                      min="0"
                      max="20"
                      step="0.01"
                      value={config.invoiceColFamilyPadding ?? 5.61}
                      onChange={(e) => setConfig({ ...config, invoiceColFamilyPadding: parseFloat(e.target.value) || 5.61 })}
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
                    <Label htmlFor="invoice-col-model-width">Width (mm)</Label>
                    <Input
                      id="invoice-col-model-width"
                      type="number"
                      min="10"
                      max="150"
                      step="0.01"
                      value={config.invoiceColModelWidth ?? 39.69}
                      onChange={(e) => setConfig({ ...config, invoiceColModelWidth: parseFloat(e.target.value) || 39.69 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoice-col-model-padding">Padding (mm)</Label>
                    <Input
                      id="invoice-col-model-padding"
                      type="number"
                      min="0"
                      max="20"
                      step="0.01"
                      value={config.invoiceColModelPadding ?? 5.61}
                      onChange={(e) => setConfig({ ...config, invoiceColModelPadding: parseFloat(e.target.value) || 5.61 })}
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
                    <Label htmlFor="invoice-col-brand-width">Width (mm)</Label>
                    <Input
                      id="invoice-col-brand-width"
                      type="number"
                      min="10"
                      max="150"
                      step="0.01"
                      value={config.invoiceColBrandWidth ?? 31.75}
                      onChange={(e) => setConfig({ ...config, invoiceColBrandWidth: parseFloat(e.target.value) || 31.75 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoice-col-brand-padding">Padding (mm)</Label>
                    <Input
                      id="invoice-col-brand-padding"
                      type="number"
                      min="0"
                      max="20"
                      step="0.01"
                      value={config.invoiceColBrandPadding ?? 5.61}
                      onChange={(e) => setConfig({ ...config, invoiceColBrandPadding: parseFloat(e.target.value) || 5.61 })}
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
                    <Label htmlFor="invoice-col-quantity-width">Width (mm)</Label>
                    <Input
                      id="invoice-col-quantity-width"
                      type="number"
                      min="10"
                      max="150"
                      step="0.01"
                      value={config.invoiceColQuantityWidth ?? 21.17}
                      onChange={(e) => setConfig({ ...config, invoiceColQuantityWidth: parseFloat(e.target.value) || 21.17 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoice-col-quantity-padding">Padding (mm)</Label>
                    <Input
                      id="invoice-col-quantity-padding"
                      type="number"
                      min="0"
                      max="20"
                      step="0.01"
                      value={config.invoiceColQuantityPadding ?? 5.61}
                      onChange={(e) => setConfig({ ...config, invoiceColQuantityPadding: parseFloat(e.target.value) || 5.61 })}
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
                    <Label htmlFor="invoice-col-price-unit-width">Width (mm)</Label>
                    <Input
                      id="invoice-col-price-unit-width"
                      type="number"
                      min="10"
                      max="150"
                      step="0.01"
                      value={config.invoiceColPriceUnitWidth ?? 31.75}
                      onChange={(e) => setConfig({ ...config, invoiceColPriceUnitWidth: parseFloat(e.target.value) || 31.75 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoice-col-price-unit-padding">Padding (mm)</Label>
                    <Input
                      id="invoice-col-price-unit-padding"
                      type="number"
                      min="0"
                      max="20"
                      step="0.01"
                      value={config.invoiceColPriceUnitPadding ?? 5.61}
                      onChange={(e) => setConfig({ ...config, invoiceColPriceUnitPadding: parseFloat(e.target.value) || 5.61 })}
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
                    <Label htmlFor="invoice-col-price-total-width">Width (mm)</Label>
                    <Input
                      id="invoice-col-price-total-width"
                      type="number"
                      min="10"
                      max="150"
                      step="0.01"
                      value={config.invoiceColPriceTotalWidth ?? 31.75}
                      onChange={(e) => setConfig({ ...config, invoiceColPriceTotalWidth: parseFloat(e.target.value) || 31.75 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoice-col-price-total-padding">Padding (mm)</Label>
                    <Input
                      id="invoice-col-price-total-padding"
                      type="number"
                      min="0"
                      max="20"
                      step="0.01"
                      value={config.invoiceColPriceTotalPadding ?? 5.61}
                      onChange={(e) => setConfig({ ...config, invoiceColPriceTotalPadding: parseFloat(e.target.value) || 5.61 })}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Empty Rows Settings */}
          <div className="space-y-4 pb-6 border-b">
            <div>
              <Label htmlFor="invoice-empty-rows">Empty Rows (number)</Label>
              <Input
                id="invoice-empty-rows"
                type="number"
                min="0"
                max="20"
                value={config.invoiceEmptyRows ?? 8}
                onChange={(e) => setConfig({ ...config, invoiceEmptyRows: parseInt(e.target.value) ?? 8 })}
              />
              <p className="text-xs text-muted-foreground mt-1">Number of extra empty rows to add at the bottom of the items table</p>
            </div>
            <div>
              <Label htmlFor="invoice-last-page-table-max-height">Last Page Table Max Height (mm)</Label>
              <Input
                id="invoice-last-page-table-max-height"
                type="number"
                min="50"
                max="250"
                value={config.invoiceLastPageTableMaxHeight ?? 150}
                onChange={(e) => setConfig({ ...config, invoiceLastPageTableMaxHeight: parseInt(e.target.value) ?? 150 })}
              />
              <p className="text-xs text-muted-foreground mt-1">Maximum height of items table on last page (page with summary + terms section)</p>
            </div>
            <div>
              <Label htmlFor="invoice-first-page-table-max-height">First Page Table Max Height (mm)</Label>
              <Input
                id="invoice-first-page-table-max-height"
                type="number"
                min="50"
                max="250"
                value={config.invoiceFirstPageTableMaxHeight ?? 180}
                onChange={(e) => setConfig({ ...config, invoiceFirstPageTableMaxHeight: parseInt(e.target.value) ?? 180 })}
              />
              <p className="text-xs text-muted-foreground mt-1">Maximum height of items table on first page (page with header and customer info)</p>
            </div>
            <div>
              <Label htmlFor="invoice-other-pages-table-max-height">Other Pages Table Max Height (mm)</Label>
              <Input
                id="invoice-other-pages-table-max-height"
                type="number"
                min="50"
                max="250"
                value={config.invoiceOtherPagesTableMaxHeight ?? 180}
                onChange={(e) => setConfig({ ...config, invoiceOtherPagesTableMaxHeight: parseInt(e.target.value) ?? 180 })}
              />
              <p className="text-xs text-muted-foreground mt-1">Maximum height of items table on other pages (pages without header and footer)</p>
            </div>
            <div>
              <Label htmlFor="invoice-single-page-table-max-height">Single Page Table Max Height (mm)</Label>
              <Input
                id="invoice-single-page-table-max-height"
                type="number"
                min="50"
                max="297"
                value={config.invoiceSinglePageTableMaxHeight ?? 297}
                onChange={(e) => setConfig({ ...config, invoiceSinglePageTableMaxHeight: parseInt(e.target.value) ?? 297 })}
              />
              <p className="text-xs text-muted-foreground mt-1">Maximum height of items table when invoice is single page (no height limit - full A4 height)</p>
            </div>
          </div>

          {/* Footer Settings */}
          <div className="space-y-4 pb-6 border-b">
            <h3 className="text-lg font-semibold mb-4">3. Footer Settings</h3>

            <div className="space-y-4 pt-4">
              <h4 className="font-medium">Terms & Conditions Settings</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoice-terms-position">Position</Label>
                  <Select
                    id="invoice-terms-position"
                    value={config.invoiceTermsPosition || "left"}
                    onValueChange={(value: any) => setConfig({ ...config, invoiceTermsPosition: value })}
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
                  <Label htmlFor="invoice-terms-title">Title Text</Label>
                  <Input
                    id="invoice-terms-title"
                    value={config.invoiceTermsTitle || "Terms and conditions"}
                    onChange={(e) => setConfig({ ...config, invoiceTermsTitle: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="invoice-terms-font-family">Font Family</Label>
                  <Select
                    id="invoice-terms-font-family"
                    value={config.invoiceTermsFontFamily || "HELVETICA"}
                    onValueChange={(value: any) => setConfig({ ...config, invoiceTermsFontFamily: value })}
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
                  <Label htmlFor="invoice-terms-font-size">Font Size (px)</Label>
                  <Input
                    id="invoice-terms-font-size"
                    type="number"
                    min="8"
                    max="72"
                    value={config.invoiceTermsFontSize || 11}
                    onChange={(e) => setConfig({ ...config, invoiceTermsFontSize: parseInt(e.target.value) || 11 })}
                  />
                </div>
                <div>
                  <Label htmlFor="invoice-terms-text-color">Color</Label>
                  <Input
                    id="invoice-terms-text-color"
                    type="color"
                    value={config.invoiceTermsTextColor || "#000000"}
                    onChange={(e) => setConfig({ ...config, invoiceTermsTextColor: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="invoice-terms-line-spacing">Line Spacing</Label>
                  <Input
                    id="invoice-terms-line-spacing"
                    type="number"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={config.invoiceTermsLineSpacing || 1}
                    onChange={(e) => setConfig({ ...config, invoiceTermsLineSpacing: parseFloat(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label htmlFor="invoice-terms-letter-spacing">Letter Spacing (px)</Label>
                  <Input
                    id="invoice-terms-letter-spacing"
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={config.invoiceTermsLetterSpacing || 0}
                    onChange={(e) => setConfig({ ...config, invoiceTermsLetterSpacing: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="invoice-terms-bold"
                    checked={config.invoiceTermsBold || false}
                    onCheckedChange={(checked) => setConfig({ ...config, invoiceTermsBold: checked })}
                  />
                  <Label htmlFor="invoice-terms-bold" className="cursor-pointer">Bold</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="invoice-terms-underline"
                    checked={config.invoiceTermsUnderline || false}
                    onCheckedChange={(checked) => setConfig({ ...config, invoiceTermsUnderline: checked })}
                  />
                  <Label htmlFor="invoice-terms-underline" className="cursor-pointer">Underline</Label>
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
                      checked={config.invoiceTermsIncludeDelivery ?? true}
                      onCheckedChange={(checked) => setConfig({ ...config, invoiceTermsIncludeDelivery: checked })}
                    />
                    <Label htmlFor="terms-include-delivery" className="cursor-pointer font-medium">Include Delivery Term</Label>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Time Type</Label>
                    <Select
                      value={config.invoiceTermsDeliveryType || "range"}
                      onValueChange={(value: any) => setConfig({ ...config, invoiceTermsDeliveryType: value })}
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
                      value={config.invoiceTermsDeliveryTimeFrom ?? 3}
                      onChange={(e) => setConfig({ ...config, invoiceTermsDeliveryTimeFrom: parseInt(e.target.value) || 3 })}
                    />
                  </div>
                  
                  {config.invoiceTermsDeliveryType === "range" && (
                    <div>
                      <Label>Time To</Label>
                      <Input
                        type="number"
                        min="1"
                        value={config.invoiceTermsDeliveryTimeTo ?? 4}
                        onChange={(e) => setConfig({ ...config, invoiceTermsDeliveryTimeTo: parseInt(e.target.value) || 4 })}
                      />
                    </div>
                  )}
                  
                  <div>
                    <Label>Time Unit</Label>
                    <Select
                      value={config.invoiceTermsDeliveryTimeUnit || "months"}
                      onValueChange={(value: any) => setConfig({ ...config, invoiceTermsDeliveryTimeUnit: value })}
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
                      checked={config.invoiceTermsIncludeValidity ?? true}
                      onCheckedChange={(checked) => setConfig({ ...config, invoiceTermsIncludeValidity: checked })}
                    />
                    <Label htmlFor="terms-include-validity" className="cursor-pointer font-medium">Include Validity Term</Label>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Time Type</Label>
                    <Select
                      value={config.invoiceTermsValidityType || "fixed"}
                      onValueChange={(value: any) => setConfig({ ...config, invoiceTermsValidityType: value })}
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
                      value={config.invoiceTermsValidityTime ?? 3}
                      onChange={(e) => setConfig({ ...config, invoiceTermsValidityTime: parseInt(e.target.value) || 3 })}
                    />
                  </div>
                  
                  {config.invoiceTermsValidityType === "range" && (
                    <div>
                      <Label>Time To</Label>
                      <Input
                        type="number"
                        min="1"
                        value={config.invoiceTermsValidityTimeTo ?? 6}
                        onChange={(e) => setConfig({ ...config, invoiceTermsValidityTimeTo: parseInt(e.target.value) || 6 })}
                      />
                    </div>
                  )}
                  
                  <div>
                    <Label>Time Unit</Label>
                    <Select
                      value={config.invoiceTermsValidityTimeUnit || "months"}
                      onValueChange={(value: any) => setConfig({ ...config, invoiceTermsValidityTimeUnit: value })}
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
                      checked={config.invoiceTermsIncludeWarranty ?? true}
                      onCheckedChange={(checked) => setConfig({ ...config, invoiceTermsIncludeWarranty: checked })}
                    />
                    <Label htmlFor="terms-include-warranty" className="cursor-pointer font-medium">Include Warranty Term</Label>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Time Type</Label>
                    <Select
                      value={config.invoiceTermsWarrantyType || "fixed"}
                      onValueChange={(value: any) => setConfig({ ...config, invoiceTermsWarrantyType: value })}
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
                      value={config.invoiceTermsWarrantyTime ?? 12}
                      onChange={(e) => setConfig({ ...config, invoiceTermsWarrantyTime: parseInt(e.target.value) || 12 })}
                    />
                  </div>
                  
                  {config.invoiceTermsWarrantyType === "range" && (
                    <div>
                      <Label>Time To</Label>
                      <Input
                        type="number"
                        min="1"
                        value={config.invoiceTermsWarrantyTimeTo ?? 24}
                        onChange={(e) => setConfig({ ...config, invoiceTermsWarrantyTimeTo: parseInt(e.target.value) || 24 })}
                      />
                    </div>
                  )}
                  
                  <div>
                    <Label>Time Unit</Label>
                    <Select
                      value={config.invoiceTermsWarrantyTimeUnit || "months"}
                      onValueChange={(value: any) => setConfig({ ...config, invoiceTermsWarrantyTimeUnit: value })}
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
                      checked={config.invoiceTermsIncludeConfirmation ?? true}
                      onCheckedChange={(checked) => setConfig({ ...config, invoiceTermsIncludeConfirmation: checked })}
                    />
                    <Label htmlFor="terms-include-confirmation" className="cursor-pointer font-medium">Include Confirmation Term</Label>
                  </div>
                </div>
                
                <div>
                  <Label>Delivery Condition</Label>
                  <Select
                    value={config.invoiceTermsDeliveryCondition || "after_order_confirmation"}
                    onValueChange={(value: any) => setConfig({ ...config, invoiceTermsDeliveryCondition: value })}
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
                      checked={config.invoiceTermsIncludePayment ?? true}
                      onCheckedChange={(checked) => setConfig({ ...config, invoiceTermsIncludePayment: checked })}
                    />
                    <Label htmlFor="terms-include-payment" className="cursor-pointer font-medium">Include Payment Method Term</Label>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Payment Method</Label>
                    <Select
                      value={config.invoiceTermsPaymentMethod || "split_payment"}
                      onValueChange={(value: any) => setConfig({ ...config, invoiceTermsPaymentMethod: value })}
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
                  
                  {config.invoiceTermsPaymentMethod === "split_payment" && (
                    <div>
                      <Label>Payment at Order (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={config.invoiceTermsSplitPaymentPercent ?? 50}
                        onChange={(e) => setConfig({ ...config, invoiceTermsSplitPaymentPercent: parseInt(e.target.value) || 50 })}
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
                    checked={config.invoiceTermsIncludePriceInWords ?? true}
                    onCheckedChange={(checked) => setConfig({ ...config, invoiceTermsIncludePriceInWords: checked })}
                  />
                  <Label htmlFor="terms-include-price-in-words" className="cursor-pointer font-medium">Include Total Price in Words</Label>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <h4 className="font-medium">Signature Settings</h4>
              
              {/* Signature Count */}
              <div className="space-y-4">
                <Label htmlFor="invoice-signature-count">Number of Signatures</Label>
                <Select
                  id="invoice-signature-count"
                  value={String(config.invoiceSignatureCount || 2)}
                  onValueChange={(value: string) => setConfig({ ...config, invoiceSignatureCount: parseInt(value) as 1 | 2 })}
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
              {config.invoiceSignatureCount === 1 && (
                <div className="space-y-4">
                  <Label htmlFor="invoice-signature-position">Signature Position</Label>
                  <Select
                    id="invoice-signature-position"
                    value={config.invoiceSignaturePosition || "right"}
                    onValueChange={(value: "right" | "left" | "middle") => setConfig({ ...config, invoiceSignaturePosition: value })}
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
                <Label htmlFor="invoice-signature-line-width">Signature Line Width (px)</Label>
                <Input
                  id="invoice-signature-line-width"
                  type="number"
                  min="50"
                  max="300"
                  step="10"
                  value={config.invoiceSignatureLineWidth || 150}
                  onChange={(e) => setConfig({ ...config, invoiceSignatureLineWidth: parseInt(e.target.value) || 150 })}
                />
              </div>

              {/* Signature Labels */}
              <div className="space-y-4 pt-4">
                <h4 className="font-medium">Signature Labels</h4>
                <div className="grid grid-cols-2 gap-4">
                  {config.invoiceSignatureCount === 1 ? (
                    <div className="col-span-2">
                      <Label htmlFor="invoice-signature-left-label">Signature Label</Label>
                      <Select
                        id="invoice-signature-left-label"
                        value={config.invoiceSignatureLeftLabelText || "Gérant"}
                        onValueChange={(value: string) => setConfig({ ...config, invoiceSignatureLeftLabelText: value })}
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
                        <Label htmlFor="invoice-signature-left-label">Left Signature Label</Label>
                        <Select
                          id="invoice-signature-left-label"
                          value={config.invoiceSignatureLeftLabelText || "Gérant"}
                          onValueChange={(value: string) => setConfig({ ...config, invoiceSignatureLeftLabelText: value })}
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
                        <Label htmlFor="invoice-signature-right-label">Right Signature Label</Label>
                        <Select
                          id="invoice-signature-right-label"
                          value={config.invoiceSignatureRightLabelText || "Client"}
                          onValueChange={(value: string) => setConfig({ ...config, invoiceSignatureRightLabelText: value })}
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
              {config.invoiceSignatureCount === 2 && (
                <div className="space-y-4 pt-4">
                  <h4 className="font-medium">Individual Signature Controls</h4>

                  {/* Left Signature Controls */}
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-left-signature"
                        checked={config.includeLeftSignature !== false}
                        onCheckedChange={(checked) => setConfig({ ...config, includeLeftSignature: checked as boolean })}
                      />
                      <Label htmlFor="include-left-signature" className="cursor-pointer font-medium">Include Left Signature</Label>
                    </div>

                    {config.includeLeftSignature !== false && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="left-signature-offset-x">Horizontal Offset (px)</Label>
                          <Input
                            id="left-signature-offset-x"
                            type="number"
                            min="-100"
                            max="100"
                            step="1"
                            value={config.leftSignatureOffsetX || 0}
                            onChange={(e) => setConfig({ ...config, leftSignatureOffsetX: parseInt(e.target.value) || 0 })}
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
                            value={config.leftSignatureOffsetY || 0}
                            onChange={(e) => setConfig({ ...config, leftSignatureOffsetY: parseInt(e.target.value) || 0 })}
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
                        checked={config.includeRightSignature !== false}
                        onCheckedChange={(checked) => setConfig({ ...config, includeRightSignature: checked as boolean })}
                      />
                      <Label htmlFor="include-right-signature" className="cursor-pointer font-medium">Include Right Signature</Label>
                    </div>

                    {config.includeRightSignature !== false && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="right-signature-offset-x">Horizontal Offset (px)</Label>
                          <Input
                            id="right-signature-offset-x"
                            type="number"
                            min="-100"
                            max="100"
                            step="1"
                            value={config.rightSignatureOffsetX || 0}
                            onChange={(e) => setConfig({ ...config, rightSignatureOffsetX: parseInt(e.target.value) || 0 })}
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
                            value={config.rightSignatureOffsetY || 0}
                            onChange={(e) => setConfig({ ...config, rightSignatureOffsetY: parseInt(e.target.value) || 0 })}
                          />
                          <p className="text-xs text-muted-foreground">Positive = down, Negative = up</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Single Signature Controls */}
              {config.invoiceSignatureCount === 1 && (
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-single-signature"
                      checked={config.includeLeftSignature !== false}
                      onCheckedChange={(checked) => setConfig({ ...config, includeLeftSignature: checked as boolean })}
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
                    <p className="text-xs text-muted-foreground">{t("qrCodePreviewDesc", "Using invoice data and test verification token")}</p>
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
                  <Label htmlFor="invoice-page-number-position">Position</Label>
                  <Select
                    id="invoice-page-number-position"
                    value={config.invoicePageNumberPosition || "center"}
                    onValueChange={(value: any) => setConfig({ ...config, invoicePageNumberPosition: value })}
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
                  <Label htmlFor="invoice-page-number-font-family">Font Family</Label>
                  <Select
                    id="invoice-page-number-font-family"
                    value={config.invoicePageNumberFontFamily || "HELVETICA"}
                    onValueChange={(value: any) => setConfig({ ...config, invoicePageNumberFontFamily: value })}
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
                  <Label htmlFor="invoice-page-number-font-size">Font Size (px)</Label>
                  <Input
                    id="invoice-page-number-font-size"
                    type="number"
                    min="8"
                    max="24"
                    value={config.invoicePageNumberFontSize || 10}
                    onChange={(e) => setConfig({ ...config, invoicePageNumberFontSize: parseInt(e.target.value) || 10 })}
                  />
                </div>
                <div>
                  <Label htmlFor="invoice-page-number-text-color">Text Color</Label>
                  <Input
                    id="invoice-page-number-text-color"
                    type="color"
                    value={config.invoicePageNumberTextColor || "#666666"}
                    onChange={(e) => setConfig({ ...config, invoicePageNumberTextColor: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="invoice-page-number-offset-x">Horizontal Offset (px)</Label>
                  <Input
                    id="invoice-page-number-offset-x"
                    type="number"
                    min="-50"
                    max="50"
                    value={config.invoicePageNumberOffsetX || 0}
                    onChange={(e) => setConfig({ ...config, invoicePageNumberOffsetX: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="invoice-page-number-offset-y">Vertical Offset (mm)</Label>
                <Input
                  id="invoice-page-number-offset-y"
                  type="number"
                  min="-20"
                  max="20"
                  step="1"
                  value={config.invoicePageNumberOffsetY || 0}
                  onChange={(e) => setConfig({ ...config, invoicePageNumberOffsetY: parseFloat(e.target.value) || 0 })}
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

      <InvoicePreviewDialog
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
