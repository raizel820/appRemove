"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useTranslation } from "@/hooks/use-translation";
import { Eye, Printer, Loader2, Minus, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import {
  printHTMLWithIframe,
  printIframeContent
} from "@/lib/printUtils";

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
  activeProfileId?: string;
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

interface PDFConfiguration {
  id: string;
  descriptionLanguage: "FRENCH" | "ENGLISH";
  useInInvoice: boolean;
  useInProforma: boolean;
  useInDeliveryNote: boolean;
  useInPurchaseOrder: boolean;
  useInNameplate: boolean;
  useInTechnicalFile: boolean;
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
  // Label font settings (for "Telephone:", "Fax:", etc.)
  labelFontFamily: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  labelFontSize: number;
  labelTextColor: string;
  labelLineSpacing: number;
  // Data font settings (for actual values like phone numbers, addresses)
  dataFontFamily: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  dataFontSize: number;
  dataTextColor: string;
  dataLineSpacing: number;
  // Writing direction for each part
  leftPartDirection: "LTR" | "RTL";
  rightPartDirection: "LTR" | "RTL";
}

export default function GlobalPdfHeaderSection() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [config, setConfig] = useState<PDFConfiguration | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string>("");
  const previewRef = useRef<HTMLIFrameElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);

  // Preview dialog controls state
  const [previewZoom, setPreviewZoom] = useState(100);
  const [previewWidth, setPreviewWidth] = useState(252); // A4 width (210mm) + 20%
  const [previewDialogBackgroundColor, setPreviewDialogBackgroundColor] = useState("transparent");

  // Load configuration and company data
  useEffect(() => {
    loadData();
    loadProfiles();
  }, []);

  // Load activity profiles
  const loadProfiles = async () => {
    try {
      const response = await fetch("/api/company-profiles");
      if (response.ok) {
        const profilesData = await response.json();
        setProfiles(profilesData);
      }
    } catch (error) {
      console.error("Error loading profiles:", error);
    }
  };

  // Load logo as base64 for printing
  useEffect(() => {
    if (company?.activeLogoId && company.logos) {
      const activeLogo = company.logos.find(logo => logo.isActive || logo.id === company.activeLogoId);
      if (activeLogo?.url) {
        fetchLogoAsBase64(activeLogo.url);
      }
    }
  }, [company?.activeLogoId, company?.logos]);

  // Helper function to convert ArrayBuffer to Base64 safely (avoids stack overflow)
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 0x8000; // 32KB chunks to avoid stack overflow
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
    }
    return btoa(binary);
  };

  const fetchLogoAsBase64 = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = arrayBufferToBase64(arrayBuffer);
      const mimeType = blob.type.split('/')[1] || 'png';
      setLogoBase64(`data:image/${mimeType};base64,${base64}`);
    } catch (error) {
      console.error("Error fetching logo:", error);
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Load company data
      const companyRes = await fetch("/api/company");
      if (companyRes.ok) {
        const companyData = await companyRes.json();
        console.log("Loaded company data:", companyData);
        setCompany(companyData);
        // Set default selected profile to active profile
        if (companyData.activeProfileId) {
          setSelectedProfileId(companyData.activeProfileId);
        }
      }

      // Load PDF configuration
      const configRes = await fetch("/api/pdf-configuration");
      if (configRes.ok) {
        const configData = await configRes.json();
        console.log("Loaded PDF config:", configData);
        if (configData) {
          console.log("Config directions from DB:", {
            leftPartDirection: configData.leftPartDirection,
            rightPartDirection: configData.rightPartDirection,
          });
          setConfig(configData);
        } else {
          // Create default config
          const defaultConfig: PDFConfiguration = {
            id: "",
            descriptionLanguage: "FRENCH",
            useInInvoice: true,
            useInProforma: true,
            useInDeliveryNote: true,
            useInPurchaseOrder: true,
            useInNameplate: false,
            useInTechnicalFile: false,
            includeTelephone: false,
            includeFax: false,
            includeAddress: false,
            includeEmail: false,
            includeRcn: true,
            includeNif: false,
            includeNis: false,
            includeRib: false,
            includeBankName: false,
            includeCapitalSocial: false,
            includeArabicDescription: true,
            includeFrenchDescription: true,
            headerLineSpacing: 1.0,
            companyNameFontFamily: "HELVETICA",
            companyNameFontSize: 24,
            companyNameTextColor: "#000000",
            companyNameLineSpacing: 1.0,
            descriptionFontFamily: "HELVETICA",
            descriptionFontSize: 12,
            descriptionTextColor: "#000000",
            descriptionLineSpacing: 1.0,
            logoScaling: 1.0,
            logoOffsetX: 0,
            logoOffsetY: 0,
            // Label font settings
            labelFontFamily: "HELVETICA",
            labelFontSize: 12,
            labelTextColor: "#000000",
            labelLineSpacing: 1.0,
            // Data font settings
            dataFontFamily: "HELVETICA",
            dataFontSize: 12,
            dataTextColor: "#000000",
            dataLineSpacing: 1.0,
            // Writing direction for each part
            leftPartDirection: "LTR",
            rightPartDirection: "RTL",
          };
          setConfig(defaultConfig);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error(t("pdfSettingsLoadError", "Failed to load configuration"));
    } finally {
      setIsLoading(false);
    }
  };

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
        console.log("Saved config:", savedConfig);
        console.log("Left part direction:", savedConfig.leftPartDirection);
        console.log("Right part direction:", savedConfig.rightPartDirection);
        setConfig(savedConfig);
        toast.success(t("pdfSettingsSaveSuccess", "Configuration saved successfully"));
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast.error(t("pdfSettingsSaveError", "Failed to save configuration"));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    const iframe = previewRef.current;
    const success = printIframeContent(iframe, isIframeLoaded);

    if (!success) {
      if (!iframe || !iframe.contentWindow) {
        toast.error("Preview iframe not ready");
      } else if (!isIframeLoaded) {
        toast.error("Preview not fully loaded yet");
      } else {
        toast.error("Failed to print");
      }
    }
  };

  const openPreview = () => {
    setIsIframeLoaded(false);
    setIsPreviewOpen(true);
  };

  const handlePrintWithoutPreview = async () => {
    try {
      await printHTMLWithIframe(generatePrintHTML(logoBase64));
    } catch (error) {
      console.error("Error printing:", error);
      toast.error("Failed to print");
    }
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

  // Generate preview HTML
  const generatePreviewHTML = (): string => {
    if (!config || !company) return "";

    console.log("Generating preview with config:", {
      leftPartDirection: config.leftPartDirection,
      rightPartDirection: config.rightPartDirection,
    });

    const fontFamilyMap: Record<string, string> = {
      HELVETICA: "Helvetica, Arial, sans-serif",
      TIMES_ROMAN: "Times New Roman, serif",
      COURIER: "Courier, monospace",
      ARIAL: "Arial, sans-serif",
    };

    // Get active logo URL for preview (use relative URL in iframe)
    const activeLogo = company.logos?.find(logo => logo.isActive || logo.id === company.activeLogoId);
    const logoUrl = activeLogo?.url || null;

    // Calculate logo dimensions with scaling
    const logoMaxWidth = Math.round(150 * config.logoScaling);
    const logoMaxHeight = Math.round(100 * config.logoScaling);

    // Get selected profile data for preview (falls back to company data if no profile selected)
    const selectedProfile = profiles.find(p => p.id === selectedProfileId);
    const previewNif = selectedProfile?.nif ?? company.nif;
    const previewNis = selectedProfile?.nis ?? company.nis;
    const previewRcn = selectedProfile?.rcn ?? company.rcn;
    const previewRib = selectedProfile?.rib ?? company.rib;
    const previewBankName = selectedProfile?.bankName ?? company.bankName;
    const previewFundCapital = selectedProfile?.fundCapital ?? company.fundCapital;

    // Get activity descriptions based on checkbox settings
    const activityDescriptionAr = config.includeArabicDescription ? (company.activityDescriptionAr || "") : "";
    const activityDescriptionFrOrEn = config.includeFrenchDescription ? (company.activityDescriptionFr || "") : "";

    // Company labels (French/English)
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

    // Company labels (Arabic)
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

    const headerFontFamily = fontFamilyMap[config.headerFontFamily] || "Arial, sans-serif";
    const companyNameFontFamily = fontFamilyMap[config.companyNameFontFamily] || "Arial, sans-serif";
    const descriptionFontFamily = fontFamilyMap[config.descriptionFontFamily] || "Arial, sans-serif";
    const labelFontFamily = fontFamilyMap[config.labelFontFamily] || "Arial, sans-serif";
    const dataFontFamily = fontFamilyMap[config.dataFontFamily] || "Arial, sans-serif";

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: ${headerFontFamily};
      font-size: ${config.headerFontSize}px;
      color: ${config.headerTextColor};
      background: white;
      padding: 20px;
    }
    .header-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
    }
    .top-section {
      text-align: center;
      margin-bottom: 20px;
    }
    .company-name {
      font-family: ${companyNameFontFamily};
      font-size: ${config.companyNameFontSize}px;
      color: ${config.companyNameTextColor};
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 10px;
      line-height: ${config.companyNameLineSpacing};
    }
    .activity-ar {
      font-family: ${descriptionFontFamily};
      font-size: ${config.descriptionFontSize}px;
      color: ${config.descriptionTextColor};
      direction: rtl;
      text-align: center;
      margin-bottom: 5px;
      line-height: ${config.descriptionLineSpacing};
    }
    .activity-fr-en {
      font-family: ${descriptionFontFamily};
      font-size: ${config.descriptionFontSize}px;
      color: ${config.descriptionTextColor};
      direction: ltr;
      text-align: center;
      margin-bottom: 15px;
      line-height: ${config.descriptionLineSpacing};
    }
    .divider {
      border-top: 1px solid #000;
      margin-bottom: 20px;
    }
    .middle-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
    }
    .left-column {
      flex: 1;
      text-align: left;
      direction: ${config.leftPartDirection.toLowerCase()};
    }
    .right-column {
      flex: 1;
      text-align: ${config.rightPartDirection === 'RTL' ? 'right' : 'left'};
      direction: ${config.rightPartDirection.toLowerCase()};
    }
    .center-column {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
    }
    .logo-placeholder {
      width: ${logoMaxWidth}px;
      height: ${logoMaxHeight}px;
      border: 1px solid #ccc;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
      transform: translate(${config.logoOffsetX}px, ${config.logoOffsetY}px);
    }
    .field-label {
      margin-bottom: ${8 * config.labelLineSpacing}px;
      font-family: ${labelFontFamily};
      font-size: ${config.labelFontSize}px;
      color: ${config.labelTextColor};
    }
    .field-data {
      font-family: ${dataFontFamily};
      font-size: ${config.dataFontSize}px;
      color: ${config.dataTextColor};
    }
    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="header-container">
    <!-- Top Section -->
    <div class="top-section">
      <div class="company-name">${company.name || "COMPANY NAME"}</div>
      ${activityDescriptionAr ? `<div class="activity-ar">${activityDescriptionAr}</div>` : ""}
      ${activityDescriptionFrOrEn ? `<div class="activity-fr-en">${activityDescriptionFrOrEn}</div>` : ""}
      <div class="divider"></div>
    </div>

    <!-- Middle Section -->
    <div class="middle-section">
      <!-- Left Part (French/English) -->
      <div class="left-column">
        ${config.includeTelephone ? `<div class="field-label"><span class="field-label">${labelsFr.telephone}:</span> <span class="field-data">${company.phoneNumbers?.join(", ") || ""}</span></div>` : ""}
        ${config.includeFax ? `<div class="field-label"><span class="field-label">${labelsFr.fax}:</span> <span class="field-data">${company.faxNumbers?.join(", ") || ""}</span></div>` : ""}
        ${config.includeAddress ? `<div class="field-label"><span class="field-label">${labelsFr.address}:</span> <span class="field-data">${company.address || ""}</span></div>` : ""}
        ${config.includeEmail ? `<div class="field-label"><span class="field-label">${labelsFr.email}:</span> <span class="field-data">${company.emails?.join(", ") || ""}</span></div>` : ""}
        ${config.includeRcn ? `<div class="field-label"><span class="field-label">${labelsFr.rcn}:</span> <span class="field-data">${previewRcn || ""}</span></div>` : ""}
        ${config.includeNif ? `<div class="field-label"><span class="field-label">${labelsFr.nif}:</span> <span class="field-data">${previewNif || ""}</span></div>` : ""}
        ${config.includeNis ? `<div class="field-label"><span class="field-label">${labelsFr.nis}:</span> <span class="field-data">${previewNis || ""}</span></div>` : ""}
        ${config.includeRib ? `<div class="field-label"><span class="field-label">${labelsFr.rib}:</span> <span class="field-data">${previewRib || ""}</span></div>` : ""}
        ${config.includeBankName ? `<div class="field-label"><span class="field-label">${labelsFr.bankName}:</span> <span class="field-data">${previewBankName || ""}</span></div>` : ""}
        ${config.includeCapitalSocial ? `<div class="field-label"><span class="field-label">${labelsFr.capitalSocial}:</span> <span class="field-data">${previewFundCapital ? String(previewFundCapital) : ""}</span></div>` : ""}
      </div>

      <!-- Middle Part (Logo) -->
      <div class="center-column">
        <div class="logo-placeholder">
          ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" style="max-width: 100%; max-height: 100%;" />` : "LOGO"}
        </div>
      </div>

      <!-- Right Part (Arabic) -->
      <div class="right-column">
        ${config.includeTelephone ? `<div class="field-label"><span class="field-label">${labelsAr.telephone}:</span> <span class="field-data">${company.phoneNumbers?.join(", ") || ""}</span></div>` : ""}
        ${config.includeFax ? `<div class="field-label"><span class="field-label">${labelsAr.fax}:</span> <span class="field-data">${company.faxNumbers?.join(", ") || ""}</span></div>` : ""}
        ${config.includeAddress ? `<div class="field-label"><span class="field-label">${labelsAr.address}:</span> <span class="field-data">${company.address || ""}</span></div>` : ""}
        ${config.includeEmail ? `<div class="field-label"><span class="field-label">${labelsAr.email}:</span> <span class="field-data">${company.emails?.join(", ") || ""}</span></div>` : ""}
        ${config.includeRcn ? `<div class="field-label"><span class="field-label">${labelsAr.rcn}:</span> <span class="field-data">${previewRcn || ""}</span></div>` : ""}
        ${config.includeNif ? `<div class="field-label"><span class="field-label">${labelsAr.nif}:</span> <span class="field-data">${previewNif || ""}</span></div>` : ""}
        ${config.includeNis ? `<div class="field-label"><span class="field-label">${labelsAr.nis}:</span> <span class="field-data">${previewNis || ""}</span></div>` : ""}
        ${config.includeRib ? `<div class="field-label"><span class="field-label">${labelsAr.rib}:</span> <span class="field-data">${previewRib || ""}</span></div>` : ""}
        ${config.includeBankName ? `<div class="field-label"><span class="field-label">${labelsAr.bankName}:</span> <span class="field-data">${previewBankName || ""}</span></div>` : ""}
        ${config.includeCapitalSocial ? `<div class="field-label"><span class="field-label">${labelsAr.capitalSocial}:</span> <span class="field-data">${previewFundCapital ? String(previewFundCapital) : ""}</span></div>` : ""}
      </div>
    </div>
  </div>
</body>
</html>
    `;
  };

  // Generate print HTML with base64-embedded logo
  const generatePrintHTML = (logoBase64: string): string => {
    if (!config || !company) return "";

    const fontFamilyMap: Record<string, string> = {
      HELVETICA: "Helvetica, Arial, sans-serif",
      TIMES_ROMAN: "Times New Roman, serif",
      COURIER: "Courier, monospace",
      ARIAL: "Arial, sans-serif",
    };

    // Calculate logo dimensions with scaling
    const logoMaxWidth = Math.round(150 * config.logoScaling);
    const logoMaxHeight = Math.round(100 * config.logoScaling);

    // Get selected profile data for printing (falls back to company data if no profile selected)
    const selectedProfile = profiles.find(p => p.id === selectedProfileId);
    const printNif = selectedProfile?.nif ?? company.nif;
    const printNis = selectedProfile?.nis ?? company.nis;
    const printRcn = selectedProfile?.rcn ?? company.rcn;
    const printRib = selectedProfile?.rib ?? company.rib;
    const printBankName = selectedProfile?.bankName ?? company.bankName;
    const printFundCapital = selectedProfile?.fundCapital ?? company.fundCapital;

    // Get activity descriptions based on checkbox settings
    const activityDescriptionAr = config.includeArabicDescription ? (company.activityDescriptionAr || "") : "";
    const activityDescriptionFrOrEn = config.includeFrenchDescription ? (company.activityDescriptionFr || "") : "";

    // Company labels (French/English)
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

    // Company labels (Arabic)
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

    const headerFontFamily = fontFamilyMap[config.headerFontFamily] || "Arial, sans-serif";
    const companyNameFontFamily = fontFamilyMap[config.companyNameFontFamily] || "Arial, sans-serif";
    const descriptionFontFamily = fontFamilyMap[config.descriptionFontFamily] || "Arial, sans-serif";
    const labelFontFamily = fontFamilyMap[config.labelFontFamily] || "Arial, sans-serif";
    const dataFontFamily = fontFamilyMap[config.dataFontFamily] || "Arial, sans-serif";

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>PDF Header Print</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: ${headerFontFamily};
      font-size: ${config.headerFontSize}px;
      color: ${config.headerTextColor};
      background: white;
      padding: 20px;
    }
    .header-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
    }
    .top-section {
      text-align: center;
      margin-bottom: 20px;
    }
    .company-name {
      font-family: ${companyNameFontFamily};
      font-size: ${config.companyNameFontSize}px;
      color: ${config.companyNameTextColor};
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 10px;
      line-height: ${config.companyNameLineSpacing};
    }
    .activity-ar {
      font-family: ${descriptionFontFamily};
      font-size: ${config.descriptionFontSize}px;
      color: ${config.descriptionTextColor};
      direction: rtl;
      text-align: center;
      margin-bottom: 5px;
      line-height: ${config.descriptionLineSpacing};
    }
    .activity-fr-en {
      font-family: ${descriptionFontFamily};
      font-size: ${config.descriptionFontSize}px;
      color: ${config.descriptionTextColor};
      direction: ltr;
      text-align: center;
      margin-bottom: 15px;
      line-height: ${config.descriptionLineSpacing};
    }
    .divider {
      border-top: 1px solid #000;
      margin-bottom: 20px;
    }
    .middle-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
    }
    .left-column {
      flex: 1;
      text-align: left;
      direction: ${config.leftPartDirection.toLowerCase()};
    }
    .right-column {
      flex: 1;
      text-align: ${config.rightPartDirection === 'RTL' ? 'right' : 'left'};
      direction: ${config.rightPartDirection.toLowerCase()};
    }
    .center-column {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
    }
    .logo-placeholder {
      width: ${logoMaxWidth}px;
      height: ${logoMaxHeight}px;
      border: 1px solid #ccc;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
      transform: translate(${config.logoOffsetX}px, ${config.logoOffsetY}px);
    }
    .field-label {
      margin-bottom: ${8 * config.labelLineSpacing}px;
      font-family: ${labelFontFamily};
      font-size: ${config.labelFontSize}px;
      color: ${config.labelTextColor};
    }
    .field-data {
      font-family: ${dataFontFamily};
      font-size: ${config.dataFontSize}px;
      color: ${config.dataTextColor};
    }
    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="header-container">
    <!-- Top Section -->
    <div class="top-section">
      <div class="company-name">${company.name || "COMPANY NAME"}</div>
      ${activityDescriptionAr ? `<div class="activity-ar">${activityDescriptionAr}</div>` : ""}
      ${activityDescriptionFrOrEn ? `<div class="activity-fr-en">${activityDescriptionFrOrEn}</div>` : ""}
      <div class="divider"></div>
    </div>

    <!-- Middle Section -->
    <div class="middle-section">
      <!-- Left Column (French/English) -->
      <div class="left-column">
        ${config.includeTelephone ? `<div class="field-label"><span class="field-label">${labelsFr.telephone}:</span> <span class="field-data">${company.phoneNumbers?.join(", ") || ""}</span></div>` : ""}
        ${config.includeFax ? `<div class="field-label"><span class="field-label">${labelsFr.fax}:</span> <span class="field-data">${company.faxNumbers?.join(", ") || ""}</span></div>` : ""}
        ${config.includeAddress ? `<div class="field-label"><span class="field-label">${labelsFr.address}:</span> <span class="field-data">${company.address || ""}</span></div>` : ""}
        ${config.includeEmail ? `<div class="field-label"><span class="field-label">${labelsFr.email}:</span> <span class="field-data">${company.emails?.join(", ") || ""}</span></div>` : ""}
        ${config.includeRcn ? `<div class="field-label"><span class="field-label">${labelsFr.rcn}:</span> <span class="field-data">${printRcn || ""}</span></div>` : ""}
        ${config.includeNif ? `<div class="field-label"><span class="field-label">${labelsFr.nif}:</span> <span class="field-data">${printNif || ""}</span></div>` : ""}
        ${config.includeNis ? `<div class="field-label"><span class="field-label">${labelsFr.nis}:</span> <span class="field-data">${printNis || ""}</span></div>` : ""}
        ${config.includeRib ? `<div class="field-label"><span class="field-label">${labelsFr.rib}:</span> <span class="field-data">${printRib || ""}</span></div>` : ""}
        ${config.includeBankName ? `<div class="field-label"><span class="field-label">${labelsFr.bankName}:</span> <span class="field-data">${printBankName || ""}</span></div>` : ""}
        ${config.includeCapitalSocial ? `<div class="field-label"><span class="field-label">${labelsFr.capitalSocial}:</span> <span class="field-data">${printFundCapital ? String(printFundCapital) : ""}</span></div>` : ""}
      </div>

      <!-- Center Column (Logo) -->
      <div class="center-column">
        <div class="logo-placeholder">
          ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" style="max-width: 100%; max-height: 100%;" />` : "LOGO"}
        </div>
      </div>

      <!-- Right Column (Arabic) -->
      <div class="right-column">
        ${config.includeTelephone ? `<div class="field-label"><span class="field-label">${labelsAr.telephone}:</span> <span class="field-data">${company.phoneNumbers?.join(", ") || ""}</span></div>` : ""}
        ${config.includeFax ? `<div class="field-label"><span class="field-label">${labelsAr.fax}:</span> <span class="field-data">${company.faxNumbers?.join(", ") || ""}</span></div>` : ""}
        ${config.includeAddress ? `<div class="field-label"><span class="field-label">${labelsAr.address}:</span> <span class="field-data">${company.address || ""}</span></div>` : ""}
        ${config.includeEmail ? `<div class="field-label"><span class="field-label">${labelsAr.email}:</span> <span class="field-data">${company.emails?.join(", ") || ""}</span></div>` : ""}
        ${config.includeRcn ? `<div class="field-label"><span class="field-label">${labelsAr.rcn}:</span> <span class="field-data">${printRcn || ""}</span></div>` : ""}
        ${config.includeNif ? `<div class="field-label"><span class="field-label">${labelsAr.nif}:</span> <span class="field-data">${printNif || ""}</span></div>` : ""}
        ${config.includeNis ? `<div class="field-label"><span class="field-label">${labelsAr.nis}:</span> <span class="field-data">${printNis || ""}</span></div>` : ""}
        ${config.includeRib ? `<div class="field-label"><span class="field-label">${labelsAr.rib}:</span> <span class="field-data">${printRib || ""}</span></div>` : ""}
        ${config.includeBankName ? `<div class="field-label"><span class="field-label">${labelsAr.bankName}:</span> <span class="field-data">${printBankName || ""}</span></div>` : ""}
        ${config.includeCapitalSocial ? `<div class="field-label"><span class="field-label">${labelsAr.capitalSocial}:</span> <span class="field-data">${printFundCapital ? String(printFundCapital) : ""}</span></div>` : ""}
      </div>
    </div>
  </div>
</body>
</html>
    `;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t("pdfSettingsNoConfig", "No configuration found")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Preview and Print Buttons */}
      <div className="flex justify-end gap-2">
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" onClick={openPreview}>
              <Eye className="h-4 w-4 mr-2" />
              {t("pdfSettingsPreview", "Preview")}
            </Button>
          </DialogTrigger>
          <DialogContent
            className="overflow-hidden"
            style={{
              width: '90%',
              maxWidth: '90%',
              maxHeight: '90vh',
              backgroundColor: previewDialogBackgroundColor === 'transparent'
                ? (theme === 'dark' ? 'black' : 'white')
                : previewDialogBackgroundColor,
              color: previewDialogBackgroundColor === 'transparent'
                ? (theme === 'dark' ? 'white' : 'black')
                : 'white'
            }}
          >
            <DialogHeader>
              <DialogTitle
                style={{
                  color: previewDialogBackgroundColor === 'transparent'
                    ? (theme === 'dark' ? 'white' : 'black')
                    : 'white'
                }}
              >
                PDF Header Preview
              </DialogTitle>
            </DialogHeader>

            {/* Preview control toolbar */}
            <div className="flex flex-wrap items-center gap-2 py-2 border-b">
              {/* Activity profile selector */}
              {profiles.length > 0 && (
                <div className="flex items-center gap-2">
                  <label
                    className="text-sm"
                    style={{
                      color: previewDialogBackgroundColor === 'transparent'
                        ? (theme === 'dark' ? 'white' : 'black')
                        : 'white'
                    }}
                  >
                    Profile:
                  </label>
                  <Select
                    value={selectedProfileId || ""}
                    onValueChange={setSelectedProfileId}
                  >
                    <SelectTrigger className="h-8 w-[200px]">
                      <SelectValue placeholder={t("selectProfile", "Select Profile")} />
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

              {/* Zoom controls */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleZoomOut}
                  title="Zoom Out"
                  className="h-8 w-8"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span
                  className="text-sm font-medium min-w-[50px] text-center"
                  style={{
                    color: previewDialogBackgroundColor === 'transparent'
                      ? (theme === 'dark' ? 'white' : 'black')
                      : 'white'
                  }}
                >
                  {previewZoom}%
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleZoomIn}
                  title="Zoom In"
                  className="h-8 w-8"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Width controls */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleDecreaseWidth}
                  title="Decrease Width"
                  className="h-8 w-8"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span
                  className="text-sm font-medium min-w-[60px] text-center"
                  style={{
                    color: previewDialogBackgroundColor === 'transparent'
                      ? (theme === 'dark' ? 'white' : 'black')
                      : 'white'
                  }}
                >
                  {previewWidth}mm
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleIncreaseWidth}
                  title="Increase Width"
                  className="h-8 w-8"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Color picker */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="dialog-color-picker-global"
                  className="text-sm"
                  style={{
                    color: previewDialogBackgroundColor === 'transparent'
                      ? (theme === 'dark' ? 'white' : 'black')
                      : 'white'
                  }}
                >
                  Color:
                </label>
                <input
                  id="dialog-color-picker-global"
                  type="color"
                  value={previewDialogBackgroundColor === 'transparent'
                    ? (theme === 'dark' ? '#000000' : '#ffffff')
                    : previewDialogBackgroundColor}
                  onChange={(e) => setPreviewDialogBackgroundColor(e.target.value)}
                  className="h-8 w-12 cursor-pointer border rounded"
                />
              </div>

              {/* Print button */}
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrint}
                title="Print Preview"
                className="h-8 w-8"
              >
                <Printer className="h-4 w-4" />
              </Button>

              {/* Reset button */}
              <Button
                variant="outline"
                size="icon"
                onClick={handleResetPreview}
                title="Reset Preview"
                className="h-8 w-8"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Preview iframe */}
            <div className="overflow-auto py-4">
              <div
                ref={previewContainerRef}
                className="mx-auto"
                style={{
                  width: `${previewWidth}mm`,
                  transform: `scale(${previewZoom / 100})`,
                  transformOrigin: 'top center',
                }}
              >
                <iframe
                  ref={previewRef}
                  srcDoc={generatePreviewHTML()}
                  onLoad={() => setIsIframeLoaded(true)}
                  className="border rounded"
                  style={{
                    width: `${previewWidth}mm`,
                    minHeight: '500px',
                  }}
                  title="PDF Header Preview"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Button onClick={handlePrintWithoutPreview}>
          <Printer className="h-4 w-4 mr-2" />
          {t("pdfSettingsPrint", "Print")}
        </Button>
      </div>

      {/* Document Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>{t("pdfSettingsDocumentTypes", "Document Types Using This Header")}</CardTitle>
          <CardDescription>
            {t("pdfSettingsDocumentTypesDesc", "Select which document types should use this global header")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="invoice"
                checked={config.useInInvoice}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, useInInvoice: checked as boolean })
                }
              />
              <Label htmlFor="invoice">{t("pdfSettingsInvoice", "Invoice")}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="proforma"
                checked={config.useInProforma}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, useInProforma: checked as boolean })
                }
              />
              <Label htmlFor="proforma">{t("pdfSettingsProforma", "Proforma")}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="delivery-note"
                checked={config.useInDeliveryNote}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, useInDeliveryNote: checked as boolean })
                }
              />
              <Label htmlFor="delivery-note">{t("pdfSettingsDeliveryNote", "Delivery Note")}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="purchase-order"
                checked={config.useInPurchaseOrder}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, useInPurchaseOrder: checked as boolean })
                }
              />
              <Label htmlFor="purchase-order">{t("pdfSettingsPurchaseOrder", "Purchase Order")}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="nameplate"
                checked={config.useInNameplate}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, useInNameplate: checked as boolean })
                }
              />
              <Label htmlFor="nameplate">{t("pdfSettingsNameplate", "Nameplate")}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="technical-file"
                checked={config.useInTechnicalFile}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, useInTechnicalFile: checked as boolean })
                }
              />
              <Label htmlFor="technical-file">{t("pdfSettingsTechnicalFile", "Technical File")}</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Description Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t("pdfSettingsActivityDescription", "Activity Description")}</CardTitle>
          <CardDescription>
            {t("pdfSettingsActivityDescriptionDesc", "Select which activity descriptions to include in the header")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="arabic-description"
                checked={config.includeArabicDescription}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, includeArabicDescription: checked as boolean })
                }
              />
              <Label htmlFor="arabic-description" className="flex items-center gap-2">
                {t("pdfSettingsArabicDescription", "Arabic Description")}
                {company?.activityDescriptionAr && (
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    ({company.activityDescriptionAr.substring(0, 30)}...)
                  </span>
                )}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="french-description"
                checked={config.includeFrenchDescription}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, includeFrenchDescription: checked as boolean })
                }
              />
              <Label htmlFor="french-description" className="flex items-center gap-2">
                {t("pdfSettingsFrenchDescription", "French Description")}
                {company?.activityDescriptionFr && (
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    ({company.activityDescriptionFr.substring(0, 30)}...)
                  </span>
                )}
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Profile Fields */}
      <Card>
        <CardHeader>
          <CardTitle>{t("pdfSettingsCompanyFields", "Company Profile Fields")}</CardTitle>
          <CardDescription>
            {t("pdfSettingsCompanyFieldsDesc", "Select which company information fields to include in the header (applies to both Arabic and French/English sides)")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="telephone"
                checked={config.includeTelephone}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, includeTelephone: checked as boolean })
                }
              />
              <Label htmlFor="telephone">{t("telephone", "Telephone")}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="fax"
                checked={config.includeFax}
                onCheckedChange={(checked) => setConfig({ ...config, includeFax: checked as boolean })}
              />
              <Label htmlFor="fax">{t("fax", "Fax")}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="address"
                checked={config.includeAddress}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, includeAddress: checked as boolean })
                }
              />
              <Label htmlFor="address">{t("address", "Address")}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="email"
                checked={config.includeEmail}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, includeEmail: checked as boolean })}
              />
              <Label htmlFor="email">{t("email", "Email")}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="rcn"
                checked={config.includeRcn}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, includeRcn: checked as boolean })}
              />
              <Label htmlFor="rcn">{t("rcn", "Trade Register Number (RC)")}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="nif"
                checked={config.includeNif}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, includeNif: checked as boolean })}
              />
              <Label htmlFor="nif">{t("nif", "Tax Identification Number (NIF)")}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="nis"
                checked={config.includeNis}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, includeNis: checked as boolean })}
              />
              <Label htmlFor="nis">{t("nis", "Statistical Number (NIS)")}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="rib"
                checked={config.includeRib}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, includeRib: checked as boolean })}
              />
              <Label htmlFor="rib">{t("rib", "Bank Account Number (RIB)")}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="bank-name"
                checked={config.includeBankName}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, includeBankName: checked as boolean })
                }
              />
              <Label htmlFor="bank-name">{t("bankAgency", "Bank Agency")}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="capital-social"
                checked={config.includeCapitalSocial}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, includeCapitalSocial: checked as boolean })
                }
              />
              <Label htmlFor="capital-social">{t("capitalSocial", "Capital Social")}</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Name Styling */}
      <Card>
        <CardHeader>
          <CardTitle>{t("pdfSettingsCompanyNameStyling", "Company Name Styling")}</CardTitle>
          <CardDescription>
            {t("pdfSettingsCompanyNameDesc", "Configure font styling for company name")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <Label htmlFor="company-name-font-family">{t("pdfSettingsFontFamily", "Font Family")}</Label>
              <Select
                value={config.companyNameFontFamily}
                onValueChange={(value: any) =>
                  setConfig({ ...config, companyNameFontFamily: value })
                }
              >
                <SelectTrigger id="company-name-font-family">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HELVETICA">{t("pdfSettingsHelvetica", "Helvetica")}</SelectItem>
                  <SelectItem value="TIMES_ROMAN">{t("pdfSettingsTimesRoman", "Times Roman")}</SelectItem>
                  <SelectItem value="COURIER">{t("pdfSettingsCourier", "Courier")}</SelectItem>
                  <SelectItem value="ARIAL">{t("pdfSettingsArial", "Arial")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="company-name-font-size">{t("pdfSettingsFontSize", "Font Size (px)")}</Label>
              <Input
                id="company-name-font-size"
                type="number"
                min="8"
                max="48"
                value={config.companyNameFontSize}
                onChange={(e) => setConfig({ ...config, companyNameFontSize: parseInt(e.target.value) || 24 })}
              />
            </div>
            <div>
              <Label htmlFor="company-name-text-color">{t("pdfSettingsTextColor", "Text Color")}</Label>
              <div className="flex gap-2">
                <Input
                  id="company-name-text-color"
                  type="color"
                  value={config.companyNameTextColor}
                  onChange={(e) => setConfig({ ...config, companyNameTextColor: e.target.value })}
                  className="w-16 h-10 p-1"
                />
                <Input
                  type="text"
                  value={config.companyNameTextColor}
                  onChange={(e) => setConfig({ ...config, companyNameTextColor: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="company-name-line-spacing">{t("pdfSettingsLineSpacing", "Line Spacing")}</Label>
              <Input
                id="company-name-line-spacing"
                type="number"
                min="0.5"
                max="3"
                step="0.1"
                value={config.companyNameLineSpacing}
                onChange={(e) => setConfig({ ...config, companyNameLineSpacing: parseFloat(e.target.value) || 1.0 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Description Styling */}
      <Card>
        <CardHeader>
          <CardTitle>{t("pdfSettingsDescriptionStyling", "Company Description Styling")}</CardTitle>
          <CardDescription>
            {t("pdfSettingsDescriptionStylingDesc", "Configure font styling for company description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <Label htmlFor="description-font-family">{t("pdfSettingsFontFamily", "Font Family")}</Label>
              <Select
                value={config.descriptionFontFamily}
                onValueChange={(value: any) =>
                  setConfig({ ...config, descriptionFontFamily: value })
                }
              >
                <SelectTrigger id="description-font-family">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HELVETICA">{t("pdfSettingsHelvetica", "Helvetica")}</SelectItem>
                  <SelectItem value="TIMES_ROMAN">{t("pdfSettingsTimesRoman", "Times Roman")}</SelectItem>
                  <SelectItem value="COURIER">{t("pdfSettingsCourier", "Courier")}</SelectItem>
                  <SelectItem value="ARIAL">{t("pdfSettingsArial", "Arial")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description-font-size">{t("pdfSettingsFontSize", "Font Size (px)")}</Label>
              <Input
                id="description-font-size"
                type="number"
                min="8"
                max="24"
                value={config.descriptionFontSize}
                onChange={(e) => setConfig({ ...config, descriptionFontSize: parseInt(e.target.value) || 12 })}
              />
            </div>
            <div>
              <Label htmlFor="description-text-color">{t("pdfSettingsTextColor", "Text Color")}</Label>
              <div className="flex gap-2">
                <Input
                  id="description-text-color"
                  type="color"
                  value={config.descriptionTextColor}
                  onChange={(e) => setConfig({ ...config, descriptionTextColor: e.target.value })}
                  className="w-16 h-10 p-1"
                />
                <Input
                  type="text"
                  value={config.descriptionTextColor}
                  onChange={(e) => setConfig({ ...config, descriptionTextColor: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description-line-spacing">{t("pdfSettingsLineSpacing", "Line Spacing")}</Label>
              <Input
                id="description-line-spacing"
                type="number"
                min="0.5"
                max="3"
                step="0.1"
                value={config.descriptionLineSpacing}
                onChange={(e) => setConfig({ ...config, descriptionLineSpacing: parseFloat(e.target.value) || 1.0 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logo Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t("pdfSettingsLogoSettings", "Logo Settings")}</CardTitle>
          <CardDescription>
            {t("pdfSettingsLogoDesc", "Configure logo size and position")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="logo-scaling">{t("pdfSettingsLogoScaling", "Logo Scaling (%)")}</Label>
              <Input
                id="logo-scaling"
                type="number"
                min="0.1"
                max="3"
                step="0.1"
                value={config.logoScaling}
                onChange={(e) => setConfig({ ...config, logoScaling: parseFloat(e.target.value) || 1.0 })}
              />
            </div>
            <div>
              <Label htmlFor="logo-offset-x">{t("pdfSettingsLogoOffsetX", "Horizontal Offset (px)")}</Label>
              <Input
                id="logo-offset-x"
                type="number"
                min="-100"
                max="100"
                value={config.logoOffsetX}
                onChange={(e) => setConfig({ ...config, logoOffsetX: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label htmlFor="logo-offset-y">{t("pdfSettingsLogoOffsetY", "Vertical Offset (px)")}</Label>
              <Input
                id="logo-offset-y"
                type="number"
                min="-100"
                max="100"
                value={config.logoOffsetY}
                onChange={(e) => setConfig({ ...config, logoOffsetY: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">
              {t("pdfSettingsLogoHelp", "Logo positioning help:")}
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>{t("pdfSettingsLogoScalingHelp", "Use scaling to resize the logo (1.0 = 100% original size)")}</li>
              <li>{t("pdfSettingsLogoOffsetXHelp", "Horizontal offset: negative values move left, positive values move right")}</li>
              <li>{t("pdfSettingsLogoOffsetYHelp", "Vertical offset: negative values move up, positive values move down")}</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Font Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t("pdfSettingsFontSettings", "Font Settings")}</CardTitle>
          <CardDescription>
            {t("pdfSettingsFontDesc", "Configure font styling for labels and data")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Label Font Settings */}
          <div className="mb-8">
            <h4 className="text-sm font-semibold mb-4">{t("pdfSettingsLabelFontSettings", "Label Font Settings")}</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <Label htmlFor="label-font-family">{t("pdfSettingsFontFamily", "Font Family")}</Label>
                <Select
                  value={config.labelFontFamily}
                  onValueChange={(value: any) =>
                    setConfig({ ...config, labelFontFamily: value })
                  }
                >
                  <SelectTrigger id="label-font-family">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HELVETICA">{t("pdfSettingsHelvetica", "Helvetica")}</SelectItem>
                    <SelectItem value="TIMES_ROMAN">{t("pdfSettingsTimesRoman", "Times Roman")}</SelectItem>
                    <SelectItem value="COURIER">{t("pdfSettingsCourier", "Courier")}</SelectItem>
                    <SelectItem value="ARIAL">{t("pdfSettingsArial", "Arial")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="label-font-size">{t("pdfSettingsFontSize", "Font Size (px)")}</Label>
                <Input
                  id="label-font-size"
                  type="number"
                  min="8"
                  max="24"
                  value={config.labelFontSize}
                  onChange={(e) => setConfig({ ...config, labelFontSize: parseInt(e.target.value) || 12 })}
                />
              </div>
              <div>
                <Label htmlFor="label-text-color">{t("pdfSettingsTextColor", "Text Color")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="label-text-color"
                    type="color"
                    value={config.labelTextColor}
                    onChange={(e) => setConfig({ ...config, labelTextColor: e.target.value })}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    type="text"
                    value={config.labelTextColor}
                    onChange={(e) => setConfig({ ...config, labelTextColor: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="label-line-spacing">{t("pdfSettingsLineSpacing", "Line Spacing")}</Label>
                <Input
                  id="label-line-spacing"
                  type="number"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={config.labelLineSpacing}
                  onChange={(e) => setConfig({ ...config, labelLineSpacing: parseFloat(e.target.value) || 1.0 })}
                />
              </div>
            </div>
          </div>

          {/* Data Font Settings */}
          <div>
            <h4 className="text-sm font-semibold mb-4">{t("pdfSettingsDataFontSettings", "Data Font Settings")}</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <Label htmlFor="data-font-family">{t("pdfSettingsFontFamily", "Font Family")}</Label>
                <Select
                  value={config.dataFontFamily}
                  onValueChange={(value: any) =>
                    setConfig({ ...config, dataFontFamily: value })
                  }
                >
                  <SelectTrigger id="data-font-family">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HELVETICA">{t("pdfSettingsHelvetica", "Helvetica")}</SelectItem>
                    <SelectItem value="TIMES_ROMAN">{t("pdfSettingsTimesRoman", "Times Roman")}</SelectItem>
                    <SelectItem value="COURIER">{t("pdfSettingsCourier", "Courier")}</SelectItem>
                    <SelectItem value="ARIAL">{t("pdfSettingsArial", "Arial")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="data-font-size">{t("pdfSettingsFontSize", "Font Size (px)")}</Label>
                <Input
                  id="data-font-size"
                  type="number"
                  min="8"
                  max="24"
                  value={config.dataFontSize}
                  onChange={(e) => setConfig({ ...config, dataFontSize: parseInt(e.target.value) || 12 })}
                />
              </div>
              <div>
                <Label htmlFor="data-text-color">{t("pdfSettingsTextColor", "Text Color")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="data-text-color"
                    type="color"
                    value={config.dataTextColor}
                    onChange={(e) => setConfig({ ...config, dataTextColor: e.target.value })}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    type="text"
                    value={config.dataTextColor}
                    onChange={(e) => setConfig({ ...config, dataTextColor: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="data-line-spacing">{t("pdfSettingsLineSpacing", "Line Spacing")}</Label>
                <Input
                  id="data-line-spacing"
                  type="number"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={config.dataLineSpacing}
                  onChange={(e) => setConfig({ ...config, dataLineSpacing: parseFloat(e.target.value) || 1.0 })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Writing Direction Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t("pdfSettingsWritingDirectionSettings", "Writing Direction Settings")}</CardTitle>
          <CardDescription>
            {t("pdfSettingsWritingDirectionDesc", "Configure writing direction (LTR/RTL) for left and right parts")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="left-part-direction">{t("pdfSettingsLeftPart", "Left Part (French/English)")}</Label>
              <Select
                value={config.leftPartDirection}
                onValueChange={(value: any) =>
                  setConfig({ ...config, leftPartDirection: value })
                }
              >
                <SelectTrigger id="left-part-direction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LTR">{t("pdfSettingsLTR", "Left to Right (LTR)")}</SelectItem>
                  <SelectItem value="RTL">{t("pdfSettingsRTL", "Right to Left (RTL)")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="right-part-direction">{t("pdfSettingsRightPart", "Right Part (Arabic)")}</Label>
              <Select
                value={config.rightPartDirection}
                onValueChange={(value: any) =>
                  setConfig({ ...config, rightPartDirection: value })
                }
              >
                <SelectTrigger id="right-part-direction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LTR">{t("pdfSettingsLTR", "Left to Right (LTR)")}</SelectItem>
                  <SelectItem value="RTL">{t("pdfSettingsRTL", "Right to Left (RTL)")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t("pdfSettingsSavingButton", "Saving...")}
            </>
          ) : (
            t("pdfSettingsSaveButton", "Save")
          )}
        </Button>
      </div>
    </div>
  );
}
