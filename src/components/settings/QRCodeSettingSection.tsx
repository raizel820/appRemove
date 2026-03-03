"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefreshCw, Download, QrCode, Check, X, ChevronDown, ChevronUp, Settings, Sparkles, Shield, Sliders, Save, Play, FileText, Building2, User, DollarSign, Copy, Search, Trash2, AlertTriangle, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";
import type { QRCodeConfig, QRCodeData, CompanyInfo, CustomerInfo, FileInfo, ItemData } from "@/lib/qrCodeUtils";
import { generateQRCodeData } from "@/lib/qrCodeUtils";
import { generateVerificationToken } from "@/lib/hashedTokenUtil";
import type { FileVerificationData } from "@/lib/hashedTokenUtil";

const ERROR_CORRECTION_LEVELS = [
  { value: "L", label: "qrErrorCorrectionLow", description: "qrErrorCorrectionLowDesc", icon: "shield" },
  { value: "M", label: "qrErrorCorrectionMedium", description: "qrErrorCorrectionMediumDesc", icon: "shield-check" },
  { value: "Q", label: "qrErrorCorrectionQuartile", description: "qrErrorCorrectionQuartileDesc", icon: "shield-check" },
  { value: "H", label: "qrErrorCorrectionHigh", description: "qrErrorCorrectionHighDesc", icon: "shield-check" },
];

export default function QRCodeSettingSection() {
  const { toast } = useToast();
  const { t } = useTranslation();

  const [settings, setSettings] = useState<QRCodeConfig>({
    // Company info options
    includeCompanyName: true,
    includeCompanyPhone: false,
    includeCompanyFax: false,
    includeCompanyEmail: true,
    includeCompanyNIF: true,
    includeCompanyNIS: false,
    includeCompanyRCN: false,

    // Customer info options
    includeCustomerName: true,
    includeCustomerNIF: false,
    includeCustomerNIS: false,
    includeCustomerRCN: false,
    includeCustomerEmail: true,

    // File info options
    includeFileType: true,
    includeFileNumber: true,
    includeFileDate: true,
    includeFileLocation: false,
    includeTotalPrice: true,

    // Other options
    includeItems: false,
    includeTerms: false,
    includeVerificationToken: true,

    // QR code appearance
    errorCorrectionLevel: "M",
    size: 256,
    margin: 4,
    foregroundColor: "#000000",
    backgroundColor: "#FFFFFF",
  });

  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [verificationTokenInput, setVerificationTokenInput] = useState<string>("");
  const [verificationResult, setVerificationResult] = useState<{ valid: boolean; data?: any } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    companyInfo: true,
    customerInfo: true,
    fileInfo: true,
    otherOptions: true,
  });

  // Sample invoice data for preview
  const [sampleInvoiceData, setSampleInvoiceData] = useState<{
    company: CompanyInfo;
    customer: CustomerInfo;
    file: FileInfo;
    items?: ItemData[];
    terms?: string;
  } | null>(null);

  // PDF configuration for terms
  const [pdfConfig, setPdfConfig] = useState<any>(null);

  // Test verification token
  const [testVerificationToken, setTestVerificationToken] = useState<string>("");
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);

  // Tokens table state
  const [tokens, setTokens] = useState<any[]>([]);
  const [selectedTokenIds, setSelectedTokenIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isDeletingTokens, setIsDeletingTokens] = useState(false);
  const [isClearingAllTokens, setIsClearingAllTokens] = useState(false);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTokenCount, setTotalTokenCount] = useState(0);
  const itemsPerPage = 5;

  // Delete dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Generate terms text based on invoice settings
  const generateInvoiceTerms = (config: any, language: string): string => {
    const termsList: string[] = [];
    const langCode = language.toLowerCase() as 'en' | 'fr' | 'ar';

    // Invoice translations (simplified version from InvoiceSettingsSection)
    const invoiceTranslations = {
      FR: {
        terms: {
          title: "Conditions générales",
          deliveryAfterOrder: "Délai de livraison",
          validityTitle: "Validité de la facture",
          warrantyTitle: "Garantie",
          afterOrderConfirmation: "Livraison après confirmation de commande",
          afterPayment: "Livraison après paiement",
          splitPaymentText: "Payer {percent}% lors de la commande et le reste à la livraison",
          priceInWords: "Montant total en lettres"
        }
      },
      EN: {
        terms: {
          title: "Terms and conditions",
          deliveryAfterOrder: "Delivery time",
          validityTitle: "Invoice validity",
          warrantyTitle: "Warranty",
          afterOrderConfirmation: "Delivery after order confirmation",
          afterPayment: "Delivery after payment",
          splitPaymentText: "Pay {percent}% when ordering and the rest upon delivery",
          priceInWords: "Total amount in words"
        }
      },
      AR: {
        terms: {
          title: "الشروط والأحكام",
          deliveryAfterOrder: "وقت التسليم",
          validityTitle: "صلاحية الفاتورة",
          warrantyTitle: "الضمان",
          afterOrderConfirmation: "التسليم بعد تأكيد الطلب",
          afterPayment: "التسليم بعد الدفع",
          splitPaymentText: "ادفع {percent}% عند الطلب والباقي عند التسليم",
          priceInWords: "المبلغ الإجمالي بالكلمات"
        }
      }
    };

    const tInv = invoiceTranslations[language as keyof typeof invoiceTranslations] || invoiceTranslations.EN;

    // Helper function to format time period
    const formatTimePeriod = (from: number, to: number | null, unit: string, lang: 'en' | 'fr' | 'ar'): string => {
      const units = {
        en: { days: 'days', weeks: 'weeks', months: 'months', years: 'years' },
        fr: { days: 'jours', weeks: 'semaines', months: 'mois', years: 'ans' },
        ar: { days: 'أيام', weeks: 'أسابيع', months: 'أشهر', years: 'سنوات' }
      };
      
      const unitText = units[lang][unit as keyof typeof units['en']] || unit;
      
      if (to && to !== from) {
        return `${from}-${to} ${unitText}`;
      }
      return `${from} ${unitText}`;
    };

    // Delivery term
    if (config.invoiceTermsIncludeDelivery !== false) {
      const timeText = formatTimePeriod(
        config.invoiceTermsDeliveryTimeFrom || 3,
        config.invoiceTermsDeliveryTimeTo || null,
        config.invoiceTermsDeliveryTimeUnit || 'months',
        langCode
      );
      termsList.push(`${tInv.terms.deliveryAfterOrder}: ${timeText} ${tInv.terms.afterOrderConfirmation.toLowerCase()}`);
    }

    // Validity term
    if (config.invoiceTermsIncludeValidity !== false) {
      const timeText = formatTimePeriod(
        config.invoiceTermsValidityTime || 3,
        config.invoiceTermsValidityTimeTo || null,
        config.invoiceTermsValidityTimeUnit || 'months',
        langCode
      );
      termsList.push(`${tInv.terms.validityTitle}: ${timeText}`);
    }

    // Warranty term
    if (config.invoiceTermsIncludeWarranty !== false) {
      const timeText = formatTimePeriod(
        config.invoiceTermsWarrantyTime || 12,
        config.invoiceTermsWarrantyTimeTo || null,
        config.invoiceTermsWarrantyTimeUnit || 'months',
        langCode
      );
      termsList.push(`${tInv.terms.warrantyTitle}: ${timeText}`);
    }

    // Confirmation term
    if (config.invoiceTermsIncludeConfirmation !== false) {
      const confirmationText = config.invoiceTermsDeliveryCondition === 'after_payment'
        ? tInv.terms.afterPayment
        : tInv.terms.afterOrderConfirmation;
      termsList.push(confirmationText);
    }

    // Payment method term
    if (config.invoiceTermsIncludePayment !== false) {
      const paymentMethod = config.invoiceTermsPaymentMethod || 'split_payment';
      const methodText = {
        online: tInv.terms.afterOrderConfirmation,
        website: tInv.terms.afterOrderConfirmation,
        check: tInv.terms.afterOrderConfirmation,
        cash: tInv.terms.afterOrderConfirmation,
        splitPayment: tInv.terms.afterOrderConfirmation
      }[paymentMethod] || tInv.terms.afterOrderConfirmation;
      
      if (paymentMethod === 'split_payment') {
        const percent = config.invoiceTermsSplitPaymentPercent || 50;
        const splitText = tInv.terms.splitPaymentText.replace('{percent}', String(percent));
        termsList.push(`${tInv.terms.afterOrderConfirmation}: ${splitText}`);
      } else {
        termsList.push(methodText);
      }
    }

    return termsList.join(' • ');
  };

  // Generate test verification token
  const handleGenerateTestToken = async () => {
    if (!sampleInvoiceData) {
      toast({
        title: t("error"),
        description: t("noDataAvailable", "No data available"),
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingToken(true);
    try {
      // Prepare verification data (timestamp will be auto-added by generateVerificationToken)
      const verificationData: FileVerificationData = {
        fileNumber: sampleInvoiceData.file.number || "INV-001",
        fileType: sampleInvoiceData.file.type || "Invoice",
        date: sampleInvoiceData.file.date || new Date().toISOString().split('T')[0],
        totalAmount: sampleInvoiceData.file.totalAmount || 1000.00,
        companyName: sampleInvoiceData.company.name || "EURL LA SOURCE",
        customerName: sampleInvoiceData.customer.name || "Example Customer",
      };

      // Generate the verification token (auto-includes timestamp for uniqueness)
      const token = generateVerificationToken(verificationData);

      // Generate the full QR JSON data that would be in the QR code
      const qrData: QRCodeData = {
        company: sampleInvoiceData.company,
        customer: sampleInvoiceData.customer,
        file: sampleInvoiceData.file,
        items: sampleInvoiceData.items,
        terms: sampleInvoiceData.terms,
        verificationToken: token,
      };

      const qrJsonString = generateQRCodeData(qrData, settings);
      const qrJsonData = JSON.parse(qrJsonString);

      // Embed verification data in the stored JSON for future verification
      qrJsonData._verification = {
        customerName: verificationData.customerName,
        fileType: verificationData.fileType,
        fileNumber: verificationData.fileNumber,
        date: verificationData.date,
        totalAmount: verificationData.totalAmount,
        companyName: verificationData.companyName,
      };

      // Save to database with "test" label
      const response = await fetch('/api/qr/token/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationData,
          qrJsonData,
          label: 'test'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save token to database');
      }

      const result = await response.json();

      if (result.success && result.data) {
        setTestVerificationToken(result.data.token);

        toast({
          title: t("tokenGenerated", "Token Generated"),
          description: t("tokenGeneratedDesc", "Test verification token has been generated and saved"),
        });
      } else {
        throw new Error('Failed to generate test token');
      }
    } catch (error) {
      console.error('Error generating verification token:', error);
      toast({
        title: t("error"),
        description: t("failedToGenerateToken", "Failed to generate verification token"),
        variant: "destructive",
      });
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const handleCopyToken = () => {
    if (!testVerificationToken) return;

    navigator.clipboard.writeText(testVerificationToken).then(() => {
      toast({
        title: t("copied", "Copied"),
        description: t("tokenCopied", "Verification token copied to clipboard"),
      });
    }).catch(() => {
      toast({
        title: t("error"),
        description: t("failedToCopy", "Failed to copy token"),
        variant: "destructive",
      });
    });
  };

  // Load tokens
  const loadTokens = async () => {
    setIsLoadingTokens(true);
    try {
      const skip = (currentPage - 1) * itemsPerPage;
      const url = new URL('/api/qr/tokens', window.location.origin);
      if (searchQuery) {
        url.searchParams.append('search', searchQuery);
      }
      url.searchParams.append('limit', String(itemsPerPage));
      url.searchParams.append('skip', String(skip));

      const response = await fetch(url.toString());
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setTokens(result.data);
          setTotalTokenCount(result.totalCount || 0);
        }
      }
    } catch (error) {
      console.error('Error loading tokens:', error);
    } finally {
      setIsLoadingTokens(false);
    }
  };

  // Delete selected tokens
  const handleDeleteTokens = async () => {
    if (selectedTokenIds.length === 0) return;

    // Open confirmation dialog
    setDeleteDialogOpen(true);
  };

  // Confirm delete selected tokens
  const confirmDeleteTokens = async () => {
    setDeleteDialogOpen(false);
    setIsDeletingTokens(true);

    try {
      const response = await fetch('/api/qr/tokens', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenIds: selectedTokenIds }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: t("success"),
          description: t("tokensDeleted", "Tokens deleted successfully"),
        });
        setSelectedTokenIds([]);
        loadTokens();
      } else {
        throw new Error('Failed to delete tokens');
      }
    } catch (error) {
      console.error('Error deleting tokens:', error);
      toast({
        title: t("error"),
        description: t("failedToDeleteTokens", "Failed to delete tokens"),
        variant: "destructive",
      });
    } finally {
      setIsDeletingTokens(false);
    }
  };

  // Clear all tokens
  const handleClearAllTokens = async () => {
    // Open confirmation dialog
    setClearAllDialogOpen(true);
  };

  // Confirm clear all tokens
  const confirmClearAllTokens = async () => {
    setClearAllDialogOpen(false);
    setIsClearingAllTokens(true);

    try {
      const response = await fetch('/api/qr/tokens/clear', {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: t("success"),
          description: t("tokensCleared", "All tokens have been deleted successfully"),
        });
        setCurrentPage(1);
        setSelectedTokenIds([]);
        loadTokens();
      } else {
        throw new Error('Failed to clear tokens');
      }
    } catch (error) {
      console.error('Error clearing tokens:', error);
      toast({
        title: t("error"),
        description: t("failedToClearTokens", "Failed to clear tokens"),
        variant: "destructive",
      });
    } finally {
      setIsClearingAllTokens(false);
    }
  };

  // Toggle token selection
  const toggleTokenSelection = (tokenId: string) => {
    setSelectedTokenIds(prev =>
      prev.includes(tokenId)
        ? prev.filter(id => id !== tokenId)
        : [...prev, tokenId]
    );
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedTokenIds.length === tokens.length && tokens.length > 0) {
      setSelectedTokenIds([]);
    } else {
      setSelectedTokenIds(tokens.map(t => t.id));
    }
  };

  // Load tokens on mount and when search query or page changes
  useEffect(() => {
    loadTokens();
  }, [searchQuery, currentPage]);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Load saved settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/qr/settings');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setSettings(result.data);
          }
        }
      } catch (error) {
        console.error('Error loading QR code settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Load sample invoice data for preview
  useEffect(() => {
    const loadSampleInvoiceData = async () => {
      try {
        // Fetch company data
        const companyRes = await fetch('/api/company');
        const companyData = companyRes.ok ? await companyRes.json() : null;

        // Fetch PDF configuration for terms
        const pdfRes = await fetch('/api/pdf-configuration');
        const pdfData = pdfRes.ok ? await pdfRes.json() : null;
        if (pdfData && pdfData.data) {
          setPdfConfig(pdfData.data);
        }

        // Fetch a sample order for customer and file info
        const ordersRes = await fetch('/api/orders');
        const ordersData = ordersRes.ok ? await ordersRes.json() : null;
        const sampleOrder = ordersData?.orders?.[0] || ordersData?.[0];

        // Generate terms from PDF configuration
        const language = companyData?.defaultLanguage || 'EN';
        const termsText = pdfData?.data 
          ? generateInvoiceTerms(pdfData.data, language)
          : "Payment due within 30 days. All products are subject to our standard terms and conditions.";

        // Build sample invoice data
        const invoiceData: {
          company: CompanyInfo;
          customer: CustomerInfo;
          file: FileInfo;
          items?: ItemData[];
          terms?: string;
        } = {
          company: companyData || {
            name: "EURL LA SOURCE",
            phoneNumbers: companyData?.phoneNumbers || ["+213 21 00 00 00"],
            faxNumbers: companyData?.faxNumbers || ["+213 21 00 00 01"],
            emails: companyData?.emails || ["contact@lasource.dz"],
            nif: companyData?.nif || "123456789012345",
            nis: companyData?.nis || "00123456789",
            rcn: companyData?.rcn || "16/00-1234567B12",
            rib: companyData?.rib || "001234567890123456789012",
            bankName: companyData?.bankName || "BEA",
            address: companyData?.address || "123 Rue de l'Indépendance, Alger, Algérie",
          },
          customer: sampleOrder
            ? {
                name: sampleOrder.customerName || "Example Customer",
                nif: sampleOrder.customerNif || "987654321098765",
                nis: sampleOrder.customerNis || "00123456789",
                rcn: sampleOrder.customerRcn || "16/00-7654321B98",
                email: sampleOrder.customerEmail || "customer@example.com",
                phone: sampleOrder.customerPhone || "+213 550 00 00 00",
                address: sampleOrder.customerAddress || "Customer Address, City, Country",
              }
            : {
                name: "Example Customer",
                nif: "987654321098765",
                nis: "00123456789",
                rcn: "16/00-7654321B98",
                email: "customer@example.com",
                phone: "+213 550 00 00 00",
                address: "Customer Address, City, Country",
              },
          file: sampleOrder
            ? {
                type: sampleOrder.type === 'INVOICE' ? 'Invoice' : 'Proforma',
                number: sampleOrder.fullNumber || sampleOrder.orderNumber || "INV-001",
                date: sampleOrder.date ? sampleOrder.date.split('T')[0] : new Date().toISOString().split('T')[0],
                location: "Alger, Algeria",
                totalAmount: sampleOrder.total || 1000.00,
                currency: sampleOrder.currency || companyData?.currency || "DZD",
              }
            : {
                type: "Invoice",
                number: "INV-001",
                date: new Date().toISOString().split('T')[0],
                location: "Alger, Algeria",
                totalAmount: 1000.00,
                currency: "DZD",
              },
          items: sampleOrder?.items && sampleOrder.items.length > 0
            ? sampleOrder.items.map((item: any) => ({
                name: item.description || "Machine Model X",
                quantity: item.quantity || 1,
                unitPrice: item.unitPrice || 1000.00,
                totalPrice: item.totalPrice || 1000.00,
              }))
            : [
                {
                  name: "Machine Model X",
                  quantity: 1,
                  unitPrice: 600.00,
                  totalPrice: 600.00,
                },
                {
                  name: "Machine Model Y",
                  quantity: 2,
                  unitPrice: 200.00,
                  totalPrice: 400.00,
                },
              ],
          terms: termsText,
        };

        setSampleInvoiceData(invoiceData);
      } catch (error) {
        console.error('Error loading sample invoice data:', error);
        // Set fallback data if API calls fail
        setSampleInvoiceData({
          company: {
            name: "EURL LA SOURCE",
            phoneNumbers: ["+213 21 00 00 00"],
            faxNumbers: ["+213 21 00 00 01"],
            emails: ["contact@lasource.dz"],
            nif: "123456789012345",
            nis: "00123456789",
            rcn: "16/00-1234567B12",
            rib: "001234567890123456789012",
            bankName: "BEA",
            address: "123 Rue de l'Indépendance, Alger, Algérie",
          },
          customer: {
            name: "Example Customer",
            nif: "987654321098765",
            nis: "00123456789",
            rcn: "16/00-7654321B98",
            email: "customer@example.com",
            phone: "+213 550 00 00 00",
            address: "Customer Address, City, Country",
          },
          file: {
            type: "Invoice",
            number: "INV-001",
            date: new Date().toISOString().split('T')[0],
            location: "Alger, Algeria",
            totalAmount: 1000.00,
            currency: "DZD",
          },
          items: [
            {
              name: "Machine Model X",
              quantity: 1,
              unitPrice: 600.00,
              totalPrice: 600.00,
            },
            {
              name: "Machine Model Y",
              quantity: 2,
              unitPrice: 200.00,
              totalPrice: 400.00,
            },
          ],
          terms: "Payment due within 30 days. All products are subject to our standard terms and conditions.",
        });
      }
    };

    loadSampleInvoiceData();
  }, []);

  const handleRefreshPreview = () => {
    if (!sampleInvoiceData) {
      toast({
        title: t("error"),
        description: t("noDataAvailable"),
        variant: "destructive",
      });
      return;
    }

    // Use test token if available, otherwise generate a new one
    let verificationToken: string | undefined;
    if (settings.includeVerificationToken) {
      verificationToken = testVerificationToken;

      if (!verificationToken) {
        const verificationData: FileVerificationData = {
          fileNumber: sampleInvoiceData.file.number || "INV-001",
          fileType: sampleInvoiceData.file.type || "Invoice",
          date: sampleInvoiceData.file.date || new Date().toISOString().split('T')[0],
          totalAmount: sampleInvoiceData.file.totalAmount || 1000.00,
          companyName: sampleInvoiceData.company.name || "EURL LA SOURCE",
          customerName: sampleInvoiceData.customer.name || "Example Customer",
        };
        verificationToken = generateVerificationToken(verificationData);
      }
    }

    const qrData: QRCodeData = {
      company: sampleInvoiceData.company,
      customer: sampleInvoiceData.customer,
      file: sampleInvoiceData.file,
      items: sampleInvoiceData.items,
      terms: sampleInvoiceData.terms,
      verificationToken: verificationToken,
    };

    const sampleData = generateQRCodeData(qrData, settings);

    const mockUrl = `https://api.qrserver.com/v1/create-qr-code/` +
      `?size=${settings.size}x${settings.size}` +
      `&data=${encodeURIComponent(sampleData)}` +
      `&color=${settings.foregroundColor.replace('#', '')}` +
      `&bgcolor=${settings.backgroundColor.replace('#', '')}` +
      `&margin=${settings.margin}` +
      `&ecc=${settings.errorCorrectionLevel}`;

    setPreviewUrl(mockUrl);
    toast({
      title: t("qrCodePreviewRefreshed"),
      description: t("qrCodePreviewRefreshedDesc"),
    });
  };

  const handleVerifyToken = async () => {
    if (!verificationTokenInput.trim()) {
      toast({
        title: t("error"),
        description: t("pleaseEnterVerificationToken"),
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const response = await fetch('/api/qr/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationTokenInput }),
      });

      const result = await response.json();

      console.log('Verification result:', result);

      if (response.ok && result.success) {
        if (result.valid) {
          setVerificationResult({
            valid: true,
            data: result.data,
            source: result.source,
            orderId: result.orderId,
            customerDetails: result.customerDetails,
            error: result.error,
            message: result.message,
          });
          toast({
            title: t("tokenValid"),
            description: t("tokenValidDesc"),
          });
        } else {
          setVerificationResult({
            valid: false,
            error: result.error,
            message: result.message,
          });
          toast({
            title: t("tokenInvalid"),
            description: t("tokenInvalidDesc"),
            variant: "destructive",
          });
        }
      } else {
        setVerificationResult({ valid: false });
        toast({
          title: t("tokenInvalid"),
          description: t("tokenInvalidDesc"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      setVerificationResult({ valid: false });
      toast({
        title: t("error"),
        description: t("verificationError"),
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/qr/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast({
          title: t("qrCodeSettingsSaved"),
          description: t("qrCodeSettingsSavedDesc"),
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving QR code settings:', error);
      toast({
        title: t("error"),
        description: t("failedToSaveQRCodeSettings"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplySettings = async () => {
    setIsApplying(true);
    try {
      // Store current settings in localStorage for QRCodeUtil to use
      localStorage.setItem('qrCodeSettings', JSON.stringify(settings));
      
      toast({
        title: t("qrCodeSettingsApplied"),
        description: t("qrCodeSettingsAppliedDesc"),
      });
    } catch (error) {
      console.error('Error applying QR code settings:', error);
      toast({
        title: t("error"),
        description: t("failedToApplyQRCodeSettings"),
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleDownloadQRCode = () => {
    if (!previewUrl) {
      toast({
        title: t("error"),
        description: t("noQRCodeToDownload"),
        variant: "destructive",
      });
      return;
    }

    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = `qrcode-${Date.now()}.png`;
    link.click();

    toast({
      title: t("qrCodeDownloaded"),
      description: t("qrCodeDownloadedDesc"),
    });
  };

  // Get preview data based on current settings - recalculates when settings change
  const previewData = useMemo(() => {
    if (!sampleInvoiceData) return null;

    // Use test token if available, otherwise generate a new one
    let verificationToken: string | undefined;
    if (settings.includeVerificationToken) {
      // If we have a generated test token, use it in the preview
      verificationToken = testVerificationToken;

      // Only generate a new token if we don't have a test token
      if (!verificationToken) {
        const verificationData: FileVerificationData = {
          fileNumber: sampleInvoiceData.file.number || "INV-001",
          fileType: sampleInvoiceData.file.type || "Invoice",
          date: sampleInvoiceData.file.date || new Date().toISOString().split('T')[0],
          totalAmount: sampleInvoiceData.file.totalAmount || 1000.00,
          companyName: sampleInvoiceData.company.name || "EURL LA SOURCE",
          customerName: sampleInvoiceData.customer.name || "Example Customer",
        };
        verificationToken = generateVerificationToken(verificationData);
      }
    }

    const qrData: QRCodeData = {
      company: sampleInvoiceData.company,
      customer: sampleInvoiceData.customer,
      file: sampleInvoiceData.file,
      items: sampleInvoiceData.items,
      terms: sampleInvoiceData.terms,
      verificationToken: verificationToken,
    };

    const jsonString = generateQRCodeData(qrData, settings);
    try {
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  }, [sampleInvoiceData, settings, testVerificationToken]);

  return (
    <div className="space-y-6">
      {/* QR Code Generation Settings */}
      <Card className="border-2 border-primary/10 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-background border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-6 w-6 text-primary" />
                {t("qrCodeSettings")}
              </CardTitle>
              <CardDescription className="mt-1">{t("qrCodeSettingsDescription")}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full transition-colors duration-300 ${settings.includeVerificationToken ? 'bg-green-500' : 'bg-gray-300'}`} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Enable QR Code Generation */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-muted/50 to-muted border border-border hover:border-primary/50 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Label className="text-base font-semibold cursor-pointer" onClick={() => setSettings({ ...settings, includeVerificationToken: !settings.includeVerificationToken })}>
                  {t("enableQRCodeGeneration")}
                </Label>
                <p className="text-sm text-muted-foreground mt-0.5">{t("enableQRCodeGenerationDesc")}</p>
              </div>
            </div>
            <Checkbox
              id="enable-qr-code"
              checked={settings.includeVerificationToken}
              onCheckedChange={(checked) => setSettings({ ...settings, includeVerificationToken: checked as boolean })}
              className="w-5 h-5"
            />
          </div>

          {/* Company Info Section */}
          <div className="rounded-xl border-2 border-dashed border-border p-5 space-y-4 hover:border-primary/50 transition-colors duration-300 bg-gradient-to-br from-background to-muted/20">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleSection('companyInfo')}
            >
              <h4 className="font-semibold text-base flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <span className="text-lg">🏢</span>
                </div>
                {t("companyInfo")}
              </h4>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${expandedSections.companyInfo ? 'rotate-180' : ''}`}>
                <ChevronDown className="h-5 w-5" />
              </div>
            </div>
            {expandedSections.companyInfo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                {[
                  { key: "includeCompanyName", label: "includeCompanyName" },
                  { key: "includeCompanyPhone", label: "includeCompanyPhone" },
                  { key: "includeCompanyFax", label: "includeCompanyFax" },
                  { key: "includeCompanyEmail", label: "includeCompanyEmail" },
                  { key: "includeCompanyNIF", label: "includeCompanyNIF" },
                  { key: "includeCompanyNIS", label: "includeCompanyNIS" },
                  { key: "includeCompanyRCN", label: "includeCompanyRCN" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent transition-colors duration-200 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      id={item.key}
                      checked={settings[item.key as keyof QRCodeConfig] as boolean}
                      onCheckedChange={(checked) => setSettings({ ...settings, [item.key]: checked as boolean })}
                      className="w-5 h-5"
                    />
                    <Label htmlFor={item.key} className="cursor-pointer flex-1 text-sm font-medium">{t(item.label)}</Label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Info Section */}
          <div className="rounded-xl border-2 border-dashed border-border p-5 space-y-4 hover:border-primary/50 transition-colors duration-300 bg-gradient-to-br from-background to-muted/20">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleSection('customerInfo')}
            >
              <h4 className="font-semibold text-base flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <span className="text-lg">👤</span>
                </div>
                {t("customerInfo")}
              </h4>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${expandedSections.customerInfo ? 'rotate-180' : ''}`}>
                <ChevronDown className="h-5 w-5" />
              </div>
            </div>
            {expandedSections.customerInfo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                {[
                  { key: "includeCustomerName", label: "includeCustomerName" },
                  { key: "includeCustomerNIF", label: "includeCustomerNIF" },
                  { key: "includeCustomerNIS", label: "includeCustomerNIS" },
                  { key: "includeCustomerRCN", label: "includeCustomerRCN" },
                  { key: "includeCustomerEmail", label: "includeCustomerEmail" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent transition-colors duration-200 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      id={item.key}
                      checked={settings[item.key as keyof QRCodeConfig] as boolean}
                      onCheckedChange={(checked) => setSettings({ ...settings, [item.key]: checked as boolean })}
                      className="w-5 h-5"
                    />
                    <Label htmlFor={item.key} className="cursor-pointer flex-1 text-sm font-medium">{t(item.label)}</Label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* File Info Section */}
          <div className="rounded-xl border-2 border-dashed border-border p-5 space-y-4 hover:border-primary/50 transition-colors duration-300 bg-gradient-to-br from-background to-muted/20">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleSection('fileInfo')}
            >
              <h4 className="font-semibold text-base flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <span className="text-lg">📄</span>
                </div>
                {t("fileInfo")}
              </h4>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${expandedSections.fileInfo ? 'rotate-180' : ''}`}>
                <ChevronDown className="h-5 w-5" />
              </div>
            </div>
            {expandedSections.fileInfo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                {[
                  { key: "includeFileType", label: "includeFileType" },
                  { key: "includeFileNumber", label: "includeFileNumber" },
                  { key: "includeFileDate", label: "includeFileDate" },
                  { key: "includeFileLocation", label: "includeFileLocation" },
                  { key: "includeTotalPrice", label: "includeTotalPrice" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent transition-colors duration-200 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      id={item.key}
                      checked={settings[item.key as keyof QRCodeConfig] as boolean}
                      onCheckedChange={(checked) => setSettings({ ...settings, [item.key]: checked as boolean })}
                      className="w-5 h-5"
                    />
                    <Label htmlFor={item.key} className="cursor-pointer flex-1 text-sm font-medium">{t(item.label)}</Label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Other Options Section */}
          <div className="rounded-xl border-2 border-dashed border-border p-5 space-y-4 hover:border-primary/50 transition-colors duration-300 bg-gradient-to-br from-background to-muted/20">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleSection('otherOptions')}
            >
              <h4 className="font-semibold text-base flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <span className="text-lg">⚙️</span>
                </div>
                {t("otherOptions")}
              </h4>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${expandedSections.otherOptions ? 'rotate-180' : ''}`}>
                <ChevronDown className="h-5 w-5" />
              </div>
            </div>
            {expandedSections.otherOptions && (
              <div className="space-y-3 pt-3">
                {[
                  { key: "includeItems", label: "includeItems", desc: "includeItemsDesc" },
                  { key: "includeTerms", label: "includeTerms", desc: "includeTermsDesc" },
                  { key: "includeVerificationToken", label: "includeVerificationToken", desc: "includeVerificationTokenDesc" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors duration-200">
                    <div className="flex-1">
                      <Label htmlFor={item.key} className="cursor-pointer font-medium">{t(item.label)}</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">{t(item.desc)}</p>
                    </div>
                    <Checkbox
                      id={item.key}
                      checked={settings[item.key as keyof QRCodeConfig] as boolean}
                      onCheckedChange={(checked) => setSettings({ ...settings, [item.key]: checked as boolean })}
                      className="w-5 h-5"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Appearance Settings */}
          <div className="rounded-xl border-2 bg-gradient-to-br from-primary/5 to-background p-6 space-y-5">
            <h4 className="font-semibold flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sliders className="h-4 w-4 text-primary" />
              </div>
              {t("appearanceSettings")}
            </h4>

            {/* Error Correction Level */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("errorCorrectionLevel")}</Label>
              <Select
                value={settings.errorCorrectionLevel}
                onValueChange={(value: any) => setSettings({ ...settings, errorCorrectionLevel: value })}
              >
                <SelectTrigger className="bg-background hover:bg-accent transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ERROR_CORRECTION_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div className="flex items-center gap-3">
                        <Shield className={`h-4 w-4 ${level.value === 'H' ? 'text-green-600' : 'text-gray-500'}`} />
                        <div className="flex flex-col">
                          <span className="font-medium">{t(level.label)}</span>
                          <span className="text-xs text-muted-foreground">{t(level.description)}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Color Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Foreground Color */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("foregroundColor")}</Label>
                <div className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/50 transition-colors">
                  <Input
                    type="color"
                    value={settings.foregroundColor}
                    onChange={(e) => setSettings({ ...settings, foregroundColor: e.target.value })}
                    className="w-12 h-12 p-1 rounded-lg cursor-pointer border-2 hover:border-primary/50 transition-colors"
                  />
                  <Input
                    type="text"
                    value={settings.foregroundColor}
                    onChange={(e) => setSettings({ ...settings, foregroundColor: e.target.value })}
                    className="flex-1 font-mono text-sm uppercase tracking-wider"
                    placeholder="#000000"
                  />
                </div>
              </div>

              {/* Background Color */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("backgroundColor")}</Label>
                <div className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/50 transition-colors">
                  <Input
                    type="color"
                    value={settings.backgroundColor}
                    onChange={(e) => setSettings({ ...settings, backgroundColor: e.target.value })}
                    className="w-12 h-12 p-1 rounded-lg cursor-pointer border-2 hover:border-primary/50 transition-colors"
                  />
                  <Input
                    type="text"
                    value={settings.backgroundColor}
                    onChange={(e) => setSettings({ ...settings, backgroundColor: e.target.value })}
                    className="flex-1 font-mono text-sm uppercase tracking-wider"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>
            </div>

            {/* Size and Margin - Modern Sliders */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* QR Code Size */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{t("qrCodeSize")}</Label>
                  <span className="text-xs text-muted-foreground font-mono">{settings.size}px</span>
                </div>
                <div className="relative">
                  <style>{`
                    #qr-size::-webkit-slider-thumb {
                      background: #000000;
                      border: 2px solid white;
                    }
                    #qr-size::-moz-range-thumb {
                      background: #000000;
                      border: 2px solid white;
                    }
                    @media (prefers-color-scheme: light) {
                      #qr-size::-webkit-slider-thumb {
                        border-color: transparent;
                      }
                      #qr-size::-moz-range-thumb {
                        border-color: transparent;
                      }
                    }
                    .dark #qr-size::-webkit-slider-thumb {
                      border-color: white;
                    }
                    .dark #qr-size::-moz-range-thumb {
                      border-color: white;
                    }
                  `}</style>
                  <input
                    id="qr-size"
                    type="range"
                    min="128"
                    max="512"
                    step="32"
                    value={settings.size}
                    onChange={(e) => setSettings({ ...settings, size: parseInt(e.target.value) })}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
                    style={{
                      background: `linear-gradient(to right, hsl(var(--primary)) ${((settings.size - 128) / (512 - 128)) * 100}%, hsl(var(--muted)) ${((settings.size - 128) / (512 - 128)) * 100}%)`,
                    }}
                  />
                </div>
              </div>

              {/* QR Code Margin */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{t("qrCodeMargin")}</Label>
                  <span className="text-xs text-muted-foreground font-mono">{settings.margin}</span>
                </div>
                <div className="relative">
                  <style>{`
                    #qr-margin::-webkit-slider-thumb {
                      background: #000000;
                      border: 2px solid white;
                    }
                    #qr-margin::-moz-range-thumb {
                      background: #000000;
                      border: 2px solid white;
                    }
                    @media (prefers-color-scheme: light) {
                      #qr-margin::-webkit-slider-thumb {
                        border-color: transparent;
                      }
                      #qr-margin::-moz-range-thumb {
                        border-color: transparent;
                      }
                    }
                    .dark #qr-margin::-webkit-slider-thumb {
                      border-color: white;
                    }
                    .dark #qr-margin::-moz-range-thumb {
                      border-color: white;
                    }
                  `}</style>
                  <input
                    id="qr-margin"
                    type="range"
                    min="0"
                    max="8"
                    step="1"
                    value={settings.margin}
                    onChange={(e) => setSettings({ ...settings, margin: parseInt(e.target.value) })}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
                    style={{
                      background: `linear-gradient(to right, hsl(var(--primary)) ${(settings.margin / 8) * 100}%, hsl(var(--muted)) ${(settings.margin / 8) * 100}%)`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSaveSettings}
              disabled={isSaving || isLoading}
              className="border-2 border-primary/30 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isSaving ? t("saving") : t("saveQRCodeSettings")}
            </Button>
            <Button
              onClick={handleApplySettings}
              disabled={isApplying || isLoading}
              variant="outline"
              className="border-2 border-primary/50 hover:bg-primary/10 hover:border-primary transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isApplying ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {isApplying ? t("applying") : t("applyQRCodeSettings")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Preview */}
      <Card className="border-2 border-primary/10 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b">
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
              <FileText className="h-4 w-4 text-white" />
            </div>
            {t("qrCodeDataPreview", "QR Code Data Preview")}
          </CardTitle>
          <CardDescription>
            {t("qrCodeDataPreviewDescription", "Data that will be encoded in the QR code based on your settings")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {!sampleInvoiceData ? (
            <div className="flex items-center justify-center p-8 border-2 border-dashed border-muted rounded-xl bg-muted/30">
              <div className="flex flex-col items-center text-muted-foreground">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8" />
                </div>
                <p>{t("loadingData", "Loading invoice data...")}</p>
              </div>
            </div>
          ) : previewData && Object.keys(previewData).length > 0 ? (
            <div className="space-y-4">
              {/* Company Data Section */}
              {previewData.company && Object.keys(previewData.company).length > 0 && (
                <div className="rounded-lg border-2 border-dashed border-blue-200 bg-gradient-to-br from-blue-50/50 to-background dark:from-blue-900/10 dark:border-blue-800 p-4">
                  <h5 className="flex items-center gap-2 font-semibold text-sm text-blue-800 dark:text-blue-200 mb-3">
                    <Building2 className="h-4 w-4" />
                    {t("companyInfo", "Company Information")}
                  </h5>
                  <div className="grid gap-2 text-sm">
                    {previewData.company.name && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-muted-foreground min-w-[100px]">{t("companyName", "Company Name")}:</span>
                        <span className="flex-1">{previewData.company.name}</span>
                      </div>
                    )}
                    {previewData.company.phone && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-muted-foreground min-w-[100px]">{t("phoneNumber", "Phone Number")}:</span>
                        <span className="flex-1">{previewData.company.phone}</span>
                      </div>
                    )}
                    {previewData.company.fax && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-muted-foreground min-w-[100px]">{t("faxNumber", "Fax Number")}:</span>
                        <span className="flex-1">{previewData.company.fax}</span>
                      </div>
                    )}
                    {previewData.company.email && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-muted-foreground min-w-[100px]">{t("emailAddress", "Email Address")}:</span>
                        <span className="flex-1">{previewData.company.email}</span>
                      </div>
                    )}
                    {previewData.company.nif && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-muted-foreground min-w-[100px]">{t("taxId", "Tax ID (NIF)")}:</span>
                        <span className="flex-1">{previewData.company.nif}</span>
                      </div>
                    )}
                    {previewData.company.nis && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-muted-foreground min-w-[100px]">{t("statisticalId", "Statistical ID (NIS)")}:</span>
                        <span className="flex-1">{previewData.company.nis}</span>
                      </div>
                    )}
                    {previewData.company.rcn && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-muted-foreground min-w-[100px]">{t("tradeRegisterNumber", "Trade Register (RCN)")}:</span>
                        <span className="flex-1">{previewData.company.rcn}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Customer Data Section */}
              {previewData.customer && Object.keys(previewData.customer).length > 0 && (
                <div className="rounded-lg border-2 border-dashed border-purple-200 bg-gradient-to-br from-purple-50/50 to-background dark:from-purple-900/10 dark:border-purple-800 p-4">
                  <h5 className="flex items-center gap-2 font-semibold text-sm text-purple-800 dark:text-purple-200 mb-3">
                    <User className="h-4 w-4" />
                    {t("customerInfo", "Customer Information")}
                  </h5>
                  <div className="grid gap-2 text-sm">
                    {previewData.customer.name && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-muted-foreground min-w-[100px]">{t("customerName", "Customer Name")}:</span>
                        <span className="flex-1">{previewData.customer.name}</span>
                      </div>
                    )}
                    {previewData.customer.email && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-muted-foreground min-w-[100px]">{t("customerEmail", "Customer Email")}:</span>
                        <span className="flex-1">{previewData.customer.email}</span>
                      </div>
                    )}
                    {previewData.customer.nif && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-muted-foreground min-w-[100px]">{t("customerTaxId", "Customer Tax ID (NIF)")}:</span>
                        <span className="flex-1">{previewData.customer.nif}</span>
                      </div>
                    )}
                    {previewData.customer.nis && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-muted-foreground min-w-[100px]">{t("customerStatisticalId", "Customer Statistical ID (NIS)")}:</span>
                        <span className="flex-1">{previewData.customer.nis}</span>
                      </div>
                    )}
                    {previewData.customer.rcn && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-muted-foreground min-w-[100px]">{t("customerTradeRegisterNumber", "Customer Trade Register (RCN)")}:</span>
                        <span className="flex-1">{previewData.customer.rcn}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* File/Invoice Data Section */}
              {previewData.file && Object.keys(previewData.file).length > 0 && (
                <div className="rounded-lg border-2 border-dashed border-green-200 bg-gradient-to-br from-green-50/50 to-background dark:from-green-900/10 dark:border-green-800 p-4">
                  <h5 className="flex items-center gap-2 font-semibold text-sm text-green-800 dark:text-green-200 mb-3">
                    <FileText className="h-4 w-4" />
                    {t("fileInfo", "File Information")}
                  </h5>
                  <div className="grid gap-2 text-sm">
                    {previewData.file.type && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-muted-foreground min-w-[100px]">{t("documentType", "Document Type")}:</span>
                        <span className="flex-1 font-medium">{previewData.file.type}</span>
                      </div>
                    )}
                    {previewData.file.number && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-muted-foreground min-w-[100px]">{t("documentNumber", "Document Number")}:</span>
                        <span className="flex-1 font-mono">{previewData.file.number}</span>
                      </div>
                    )}
                    {previewData.file.date && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-muted-foreground min-w-[100px]">{t("documentDate", "Document Date")}:</span>
                        <span className="flex-1">{previewData.file.date}</span>
                      </div>
                    )}
                    {previewData.file.location && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-muted-foreground min-w-[100px]">{t("documentLocation", "Document Location")}:</span>
                        <span className="flex-1">{previewData.file.location}</span>
                      </div>
                    )}
                    {previewData.file.total && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-muted-foreground min-w-[100px]">{t("totalAmount", "Total Amount")}:</span>
                        <span className="flex-1 font-bold text-green-600 dark:text-green-400">
                          <DollarSign className="h-3 w-3 inline mr-1" />
                          {previewData.file.total}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Verification Token Section */}
              <div className="rounded-lg border-2 border-dashed border-amber-200 bg-gradient-to-br from-amber-50/50 to-background dark:from-amber-900/10 dark:border-amber-800 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="flex items-center gap-2 font-semibold text-sm text-amber-800 dark:text-amber-200">
                    <Shield className="h-4 w-4" />
                    {t("verificationToken", "Verification Token")}
                  </h5>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleGenerateTestToken}
                      disabled={isGeneratingToken || !sampleInvoiceData}
                      size="sm"
                      variant={testVerificationToken ? "default" : "outline"}
                      className="text-xs"
                    >
                      {isGeneratingToken ? (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          {t("generating", "Generating...")}
                        </>
                      ) : testVerificationToken ? (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1" />
                          {t("regenerateTestToken", "Regenerate Test Token")}
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 mr-1" />
                          {t("generateTestToken", "Generate Test Token")}
                        </>
                      )}
                    </Button>
                    {testVerificationToken && (
                      <Button
                        onClick={handleCopyToken}
                        size="sm"
                        variant="outline"
                        className="text-xs"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        {t("copy", "Copy")}
                      </Button>
                    )}
                  </div>
                </div>
                {previewData.verify && (
                  <div className="text-xs font-mono bg-muted/50 rounded p-2 break-all">
                    {t("generatedToken", "Generated Token")}: {previewData.verify}
                  </div>
                )}
                {testVerificationToken && (
                  <div className="mt-2 text-xs space-y-2">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>{t("testToken", "Test Token")}:</span>
                      <Button
                        onClick={handleCopyToken}
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="font-mono bg-muted/50 rounded p-2 break-all">
                      {testVerificationToken}
                    </div>
                  </div>
                )}
              </div>

              {/* Items Section */}
              {previewData.items && (
                <div className="rounded-lg border-2 border-dashed border-cyan-200 bg-gradient-to-br from-cyan-50/50 to-background dark:from-cyan-900/10 dark:border-cyan-800 p-4">
                  <h5 className="flex items-center gap-2 font-semibold text-sm text-cyan-800 dark:text-cyan-200 mb-3">
                    <FileText className="h-4 w-4" />
                    {t("items", "Items")}
                  </h5>
                  <div className="text-sm space-y-2">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>{t("totalItems", "Total Items")}:</span>
                      <span className="font-medium">{previewData.items.count || previewData.items.items?.length || 0}</span>
                    </div>
                    {previewData.items.items && previewData.items.items.length > 0 && (
                      <div className="mt-2 max-h-32 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-1 px-2">{t("item", "Item")}</th>
                              <th className="text-right py-1 px-2">{t("quantity", "Quantity")}</th>
                              <th className="text-right py-1 px-2">{t("price", "Price")}</th>
                              <th className="text-right py-1 px-2">{t("total", "Total")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.items.items.map((item: any, index: number) => (
                              <tr key={index} className="border-b border-border/50">
                                <td className="py-1 px-2">{item.n || item.name}</td>
                                <td className="py-1 px-2 text-right">{item.q}</td>
                                <td className="py-1 px-2 text-right">{item.p}</td>
                                <td className="py-1 px-2 text-right font-medium">{item.t}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Terms and Conditions Section */}
              {previewData.terms && (
                <div className="rounded-lg border-2 border-dashed border-orange-200 bg-gradient-to-br from-orange-50/50 to-background dark:from-orange-900/10 dark:border-orange-800 p-4">
                  <h5 className="flex items-center gap-2 font-semibold text-sm text-orange-800 dark:text-orange-200 mb-2">
                    <FileText className="h-4 w-4" />
                    {t("termsAndConditions", "Terms and Conditions")}
                  </h5>
                  <div className="text-xs bg-muted/50 rounded p-2 max-h-32 overflow-y-auto">
                    {previewData.terms}
                  </div>
                </div>
              )}

              {/* Raw JSON Toggle */}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t("viewRawJsonData", "View Raw JSON Data")}
                </summary>
                <pre className="mt-2 p-4 bg-muted/50 rounded-lg text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto">
                  {JSON.stringify(previewData, null, 2)}
                </pre>
              </details>
            </div>
          ) : (
            <div className="flex items-center justify-center p-8 border-2 border-dashed border-muted rounded-xl bg-muted/30">
              <div className="flex flex-col items-center text-muted-foreground">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8" />
                </div>
                <p>{t("noDataSelected", "No data selected for QR code")}</p>
                <p className="text-xs mt-1">{t("selectDataAbove", "Select the data you want to include above")}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Preview */}
      <Card className="border-2 border-primary/10 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b">
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <QrCode className="h-4 w-4 text-white" />
            </div>
            {t("qrCodePreview")}
          </CardTitle>
          <CardDescription>{t("qrCodePreviewDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-center p-8 border-2 border-dashed border-muted rounded-xl bg-gradient-to-br from-muted/30 to-background hover:border-primary/50 transition-all duration-300">
            {previewUrl ? (
              <div className="relative group">
                <img
                  src={previewUrl}
                  alt={t("qrCodePreviewAlt")}
                  className="max-w-full h-auto rounded-lg shadow-lg group-hover:shadow-xl transition-shadow duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-lg" />
              </div>
            ) : (
              <div className="flex flex-col items-center text-muted-foreground">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                  <QrCode className="h-10 w-10" />
                </div>
                <p>{t("qrCodeNoPreview")}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleRefreshPreview}
              variant="outline"
              className="border-2 hover:bg-accent hover:border-primary transition-all duration-200 hover:scale-105"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("refreshPreview")}
            </Button>
            {previewUrl && (
              <Button
                onClick={handleDownloadQRCode}
                className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <Download className="h-4 w-4 mr-2" />
                {t("downloadQRCode")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Verification Section */}
      <Card className="border-2 border-primary/10 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-b">
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            {t("verifyQRCode")}
          </CardTitle>
          <CardDescription>{t("verifyQRCodeDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="flex gap-2">
            <Input
              value={verificationTokenInput}
              onChange={(e) => setVerificationTokenInput(e.target.value)}
              placeholder={t("enterVerificationToken")}
              className="flex-1 border-2 focus:border-primary focus:ring-2 focus:ring-primary/50 transition-all duration-200"
            />
            <Button
              onClick={handleVerifyToken}
              disabled={isVerifying || !verificationTokenInput.trim()}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isVerifying ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 mr-2" />
                  {t("verifying")}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {t("verify")}
                </>
              )}
            </Button>
          </div>

          {verificationResult && (
            <div className={`p-4 rounded-xl border-2 transition-all duration-300 ${
              verificationResult.valid
                ? "bg-gradient-to-br from-green-50 to-green-100 border-green-200 dark:from-green-900/20 dark:border-green-800"
                : "bg-gradient-to-br from-red-50 to-red-100 border-red-200 dark:from-red-900/20 dark:border-red-800"
            }`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  verificationResult.valid
                    ? "bg-green-500 text-white"
                    : "bg-red-500 text-white"
                }`}>
                  {verificationResult.valid ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <X className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className={`font-semibold text-base ${
                      verificationResult.valid
                        ? "text-green-800 dark:text-green-200"
                        : "text-red-800 dark:text-red-200"
                    }`}>
                      {verificationResult.valid ? t("tokenValid") : t("tokenInvalid")}
                    </p>
                    {verificationResult.valid && verificationResult.source && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        verificationResult.source === 'order'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                          : verificationResult.source === 'split'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                      }`}>
                        {verificationResult.source === 'order'
                          ? t("document", "Document")
                          : verificationResult.source === 'split'
                          ? t("splitDocument", "Split")
                          : t("testTokenLabel", "Test")}
                      </span>
                    )}
                  </div>

                  {!verificationResult.valid ? (
                    <p className="text-sm text-muted-foreground">
                      {verificationResult.message || verificationResult.error || t("tokenInvalidDesc")}
                    </p>
                  ) : verificationResult.data ? (
                    <div className="space-y-1.5 text-sm">
                      {/* Customer */}
                      <p className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-muted-foreground min-w-[120px]">{t("customer")}:</span>
                        <span className="font-medium">{verificationResult.data.customer || 'Unknown'}</span>
                      </p>

                      {/* File Type */}
                      <p className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-muted-foreground min-w-[120px]">{t("fileType")}:</span>
                        <span className="font-medium">{verificationResult.data.fileType || 'Unknown'}</span>
                      </p>

                      {/* File Number */}
                      <p className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-muted-foreground min-w-[120px]">{t("fileNumber")}:</span>
                        <span className="font-medium font-mono">{verificationResult.data.fileNumber || 'N/A'}</span>
                      </p>

                      {/* File Date */}
                      {verificationResult.data.fileDate && (
                        <p className="flex items-center gap-2">
                          <span className="font-semibold text-muted-foreground min-w-[120px]">{t("date")}:</span>
                          <span className="font-medium">{verificationResult.data.fileDate}</span>
                        </p>
                      )}

                      {/* File Date and Time (from order tokens) */}
                      {verificationResult.data.fileDateTime && (
                        <p className="flex items-center gap-2">
                          <span className="font-semibold text-muted-foreground min-w-[120px]">{t("dateTime", "Date & Time")}:</span>
                          <span className="font-medium">
                            {new Date(verificationResult.data.fileDateTime).toLocaleString()}
                          </span>
                        </p>
                      )}

                      {/* Total Amount */}
                      {verificationResult.data.totalAmount && (
                        <p className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold text-muted-foreground min-w-[120px]">{t("total")}:</span>
                          <span className="font-medium font-semibold text-green-600 dark:text-green-400">
                            {verificationResult.data.totalAmount} {verificationResult.data.currency || ''}
                          </span>
                        </p>
                      )}

                      {/* Creation Date and Time */}
                      {verificationResult.data.createdAt && (
                        <p className="flex items-center gap-2 mt-2 pt-2 border-t border-green-200 dark:border-green-800">
                          <span className="font-semibold text-muted-foreground min-w-[120px]">
                            {t("createdAt", "Created At")}:
                          </span>
                          <span className="font-medium text-xs">
                            {new Date(verificationResult.data.createdAt).toLocaleString()}
                          </span>
                        </p>
                      )}

                      {/* Order-specific information */}
                      {verificationResult.source === 'order' && (
                        <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                          <p className="text-xs font-semibold text-green-700 dark:text-green-300 mb-2 uppercase tracking-wide">
                            {t("orderInformation", "Order Information")}
                          </p>
                          {verificationResult.data.orderNumber && (
                            <p className="flex items-center gap-2">
                              <span className="font-semibold text-muted-foreground min-w-[120px]">{t("orderNumber")}:</span>
                              <span className="font-medium font-mono">{verificationResult.data.orderNumber}</span>
                            </p>
                          )}
                          {verificationResult.data.orderType && (
                            <p className="flex items-center gap-2">
                              <span className="font-semibold text-muted-foreground min-w-[120px]">{t("orderType")}:</span>
                              <span className="font-medium">{verificationResult.data.orderType}</span>
                            </p>
                          )}
                          {verificationResult.data.orderStatus && (
                            <p className="flex items-center gap-2">
                              <span className="font-semibold text-muted-foreground min-w-[120px]">{t("status")}:</span>
                              <span className="font-medium">{verificationResult.data.orderStatus}</span>
                            </p>
                          )}
                          {verificationResult.orderId && (
                            <div className="mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(`/orders/${verificationResult.orderId}`, '_blank')}
                                className="text-xs"
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                {t("viewOrder", "View Order")}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Customer Details */}
                      {verificationResult.customerDetails && (
                        <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                          <p className="text-xs font-semibold text-green-700 dark:text-green-300 mb-2 uppercase tracking-wide">
                            {t("customerDetails", "Customer Details")}
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                            {verificationResult.customerDetails.email && (
                              <p className="flex items-center gap-2 text-xs">
                                <span className="font-semibold text-muted-foreground">Email:</span>
                                <span className="font-medium">{verificationResult.customerDetails.email}</span>
                              </p>
                            )}
                            {verificationResult.customerDetails.phone && (
                              <p className="flex items-center gap-2 text-xs">
                                <span className="font-semibold text-muted-foreground">Phone:</span>
                                <span className="font-medium">{verificationResult.customerDetails.phone}</span>
                              </p>
                            )}
                            {verificationResult.customerDetails.nif && (
                              <p className="flex items-center gap-2 text-xs">
                                <span className="font-semibold text-muted-foreground">NIF:</span>
                                <span className="font-medium font-mono">{verificationResult.customerDetails.nif}</span>
                              </p>
                            )}
                            {verificationResult.customerDetails.nis && (
                              <p className="flex items-center gap-2 text-xs">
                                <span className="font-semibold text-muted-foreground">NIS:</span>
                                <span className="font-medium font-mono">{verificationResult.customerDetails.nis}</span>
                              </p>
                            )}
                            {verificationResult.customerDetails.rcn && (
                              <p className="flex items-center gap-2 text-xs">
                                <span className="font-semibold text-muted-foreground">RCN:</span>
                                <span className="font-medium font-mono">{verificationResult.customerDetails.rcn}</span>
                              </p>
                            )}
                            {verificationResult.customerDetails.address && (
                              <p className="flex items-center gap-2 text-xs col-span-2">
                                <span className="font-semibold text-muted-foreground">Address:</span>
                                <span className="font-medium">{verificationResult.customerDetails.address}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Tokens Table */}
      <Card className="border-2 border-primary/10 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-background border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-6 w-6 text-primary" />
                {t("verificationTokens")}
              </CardTitle>
              <CardDescription className="mt-1">{t("verificationTokensDescription")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {/* Search and Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchTokens")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-2 focus:border-primary focus:ring-2 focus:ring-primary/50 transition-all duration-200"
              />
            </div>
            <div className="flex gap-2">
              {selectedTokenIds.length > 0 && (
                <Button
                  onClick={handleDeleteTokens}
                  disabled={isDeletingTokens}
                  variant="destructive"
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg"
                >
                  {isDeletingTokens ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 mr-2" />
                      {t("deleting", "Deleting...")}
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t("deleteSelected")} ({selectedTokenIds.length})
                    </>
                  )}
                </Button>
              )}
              <Button
                onClick={handleClearAllTokens}
                disabled={isClearingAllTokens || tokens.length === 0}
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
              >
                {isClearingAllTokens ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-300 mr-2" />
                    {t("clearing", "Clearing...")}
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    {t("clearAllTokens")}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Tokens Table */}
          {isLoadingTokens ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/30 border-t-primary" />
            </div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{searchQuery ? t("noTokensFound") : t("noTokensFound")}</p>
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 p-4 bg-muted/50 border-b font-semibold text-sm">
                <div className="col-span-1 flex items-center">
                  <Checkbox
                    checked={selectedTokenIds.length === tokens.length && tokens.length > 0}
                    onCheckedChange={toggleSelectAll}
                    aria-label={selectedTokenIds.length === tokens.length ? t("deselectAll") : t("selectAll")}
                  />
                </div>
                <div className="col-span-2">{t("token")}</div>
                <div className="col-span-2">{t("fileType")}</div>
                <div className="col-span-2">{t("fileNumber")}</div>
                <div className="col-span-2">{t("customer")}</div>
                <div className="col-span-2 text-right">{t("actions")}</div>
              </div>

              {/* Table Body */}
              <div className="max-h-96 overflow-y-auto">
                {tokens.map((token) => (
                  <div
                    key={token.id}
                    className={`grid grid-cols-12 gap-4 p-4 border-b hover:bg-muted/30 transition-colors ${
                      selectedTokenIds.includes(token.id) ? 'bg-muted/50' : ''
                    }`}
                  >
                    <div className="col-span-1 flex items-center">
                      <Checkbox
                        checked={selectedTokenIds.includes(token.id)}
                        onCheckedChange={() => toggleTokenSelection(token.id)}
                        aria-label={t("select")}
                      />
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono truncate max-w-[100px]">
                        {token.token.substring(0, 12)}...
                      </code>
                      {token.label === 'test' && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                          {t("testTokenLabel")}
                        </span>
                      )}
                      {token.source === 'order' && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          {t("document", "Document")}
                        </span>
                      )}
                      {token.source === 'split' && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                          {t("splitDocument", "Split")}
                        </span>
                      )}
                    </div>
                    <div className="col-span-2 flex items-center text-sm">
                      {token.fileInfo?.type || '-'}
                    </div>
                    <div className="col-span-2 flex items-center text-sm font-mono">
                      {token.fileInfo?.number || '-'}
                    </div>
                    <div className="col-span-2 flex items-center text-sm">
                      {token.customerName || '-'}
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(token.token);
                          toast({
                            title: t("copied"),
                            description: t("tokenCopied"),
                          });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setVerificationTokenInput(token.token);
                          handleVerifyToken();
                        }}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      {(token.source === 'order' || token.source === 'split') && token.orderId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            window.open(`/orders/${token.orderId}`, '_blank');
                          }}
                          title={token.source === 'split' ? t("viewParentOrder", "View Parent Order") : t("viewOrder", "View Order")}
                        >
                          <FileText className="h-4 w-4 text-blue-600" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pagination Controls */}
          {totalTokenCount > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {t("showing", "Showing")} {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalTokenCount)} {t("of", "of")} {totalTokenCount} {t("tokens", "tokens")}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || isLoadingTokens}
                >
                  <ChevronDown className="h-4 w-4 rotate-90" />
                  {t("previous", "Previous")}
                </Button>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium px-3 py-1 bg-muted rounded">
                    {currentPage} / {Math.ceil(totalTokenCount / itemsPerPage)}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalTokenCount / itemsPerPage), prev + 1))}
                  disabled={currentPage >= Math.ceil(totalTokenCount / itemsPerPage) || isLoadingTokens}
                >
                  {t("next", "Next")}
                  <ChevronDown className="h-4 w-4 -rotate-90" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Tokens Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Selected Tokens
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedTokenIds.length} selected token(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-destructive font-medium">
                Warning: This will permanently delete the selected verification tokens and their associated JSON data from the database.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeletingTokens}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteTokens}
              disabled={isDeletingTokens}
            >
              {isDeletingTokens ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {selectedTokenIds.length} Token{selectedTokenIds.length > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear All Tokens Confirmation Dialog */}
      <Dialog open={clearAllDialogOpen} onOpenChange={setClearAllDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Clear All Tokens
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete ALL verification tokens and their JSON data? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-destructive font-medium mb-2">
                Warning: This will permanently delete ALL verification tokens from the database.
              </p>
              <p className="text-sm text-destructive">
                • All {tokens.length} tokens will be deleted
                • All associated JSON data will be lost
                • This action cannot be undone
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setClearAllDialogOpen(false)}
              disabled={isClearingAllTokens}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmClearAllTokens}
              disabled={isClearingAllTokens}
            >
              {isClearingAllTokens ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 mr-2" />
                  Clearing...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Clear All Tokens
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
