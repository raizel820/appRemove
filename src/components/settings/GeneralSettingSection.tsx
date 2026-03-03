"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Upload, Image as ImageIcon, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage, type AppLanguage } from "@/components/language-provider";
import { useTranslation } from "@/hooks/use-translation";
import ActivityProfileSection from "./ActivityProfileSection";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Helper function to safely parse error from response
async function safeParseErrorResponse(response: Response): Promise<{ error?: string; message?: string }> {
  try {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }
  } catch (e) {
    // Response is not valid JSON or is empty
  }
  return { error: response.statusText || "Unknown error" };
}

interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  updatedAt: string;
}

interface CompanyLogo {
  id: string;
  filename: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  isActive: boolean;
  createdAt: string;
  url: string;
}

interface Company {
  id: string;
  name: string;
  address?: string;
  phoneNumbers?: string[];
  faxNumbers?: string[];
  emails?: string[];
  nif?: string;
  nis?: string;
  rib?: string;
  rcn?: string;
  bankName?: string;
  fundCapital?: number;
  activityDescriptionAr?: string;
  activityDescriptionFr?: string;
  activeLogoId?: string;
  currency: string;
  defaultLanguage: string;
  createdAt: string;
  updatedAt: string;
}

const CURRENCIES = [
  { value: "EUR", label: "EUR - Euro", symbol: "€" },
  { value: "USD", label: "USD - US Dollar", symbol: "$" },
  { value: "GBP", label: "GBP - British Pound", symbol: "£" },
  { value: "CAD", label: "CAD - Canadian Dollar", symbol: "C$" },
  { value: "DZD", label: "DZD - Algerian Dinar", symbol: "DZD" },
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  CAD: "C$",
  DZD: "DZD",
};

const getCurrencySymbol = (currency: string) => {
  return CURRENCY_SYMBOLS[currency] || "";
};

// Helper function to get localized currency labels
const getCurrencyLabels = (t: (key: string, fallback?: string) => string) => {
  return [
    { value: "EUR", label: `EUR - ${t("currencyEuro", "Euro")}`, symbol: "€" },
    { value: "USD", label: `USD - ${t("currencyUSD", "US Dollar")}`, symbol: "$" },
    { value: "GBP", label: `GBP - ${t("currencyGBP", "British Pound")}`, symbol: "£" },
    { value: "CAD", label: `CAD - ${t("currencyCAD", "Canadian Dollar")}`, symbol: "C$" },
    { value: "DZD", label: `DZD - ${t("currencyDZD", "Algerian Dinar")}`, symbol: "DZD" },
  ];
};

// Helper function to get localized language labels
const getLanguageLabels = (t: (key: string, fallback?: string) => string) => {
  return [
    { value: "fr", label: t("languageFrench", "French"), flag: "🇫🇷" },
    { value: "en", label: t("languageEnglish", "English"), flag: "🇬🇧" },
    { value: "ar", label: t("languageArabic", "Arabic"), flag: "🇩🇿" },
  ];
};

export default function GeneralSettingSection() {
  const { toast } = useToast();
  const { language: appLanguage, setLanguage } = useLanguage();
  const { t } = useTranslation();

  const [company, setCompany] = useState<Company | null>(null);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [logos, setLogos] = useState<CompanyLogo[]>([]);
  const [logoFiles, setLogoFiles] = useState<File[]>([]);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [isSavingRate, setIsSavingRate] = useState(false);
  const [isUploadingLogos, setIsUploadingLogos] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [logoToDelete, setLogoToDelete] = useState<CompanyLogo | null>(null);

  // Get localized labels based on current language
  const currencyLabels = getCurrencyLabels(t);
  const languageLabels = getLanguageLabels(t);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
    fetchLogos();
  }, []);

  const fetchSettings = async () => {
    try {
      const [companyRes, ratesRes] = await Promise.all([
        fetch("/api/company"),
        fetch("/api/exchange-rates"),
      ]);

      if (companyRes.ok) {
        const companyData = await companyRes.json();
        setCompany(companyData);
        // Note: Company's defaultLanguage is for document generation (invoices, proformas, etc.)
        // NOT for the app UI language. The app UI language is controlled separately via localStorage.
      }

      if (ratesRes.ok) {
        const ratesData = await ratesRes.json();
        setExchangeRates(ratesData);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const fetchLogos = async () => {
    try {
      const response = await fetch("/api/logos");
      if (response.ok) {
        const data = await response.json();
        setLogos(data.logos || []);
      }
    } catch (error) {
      console.error("Error fetching logos:", error);
    }
  };

  const handleSaveCompany = async () => {
    if (!company) return;

    setIsSavingCompany(true);
    try {
      const { id, createdAt, updatedAt, ...updateData } = company;

      const response = await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...updateData,
          defaultLanguage: appLanguage,
        }),
      });

      if (response.ok) {
        toast({
          title: t("success"),
          description: t("companySettingsUpdated"),
        });
      } else {
        const error = await safeParseErrorResponse(response);
        toast({
          title: t("error"),
          description: error.error || error.message || t("failedToUpdateCompany"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating company:", error);
      toast({
        title: t("error"),
        description: t("failedToUpdateCompany"),
        variant: "destructive",
      });
    } finally {
      setIsSavingCompany(false);
    }
  };

  const handleLogoUpload = async () => {
    if (logoFiles.length === 0) return;

    setIsUploadingLogos(true);
    try {
      const formData = new FormData();
      logoFiles.forEach(file => formData.append("files", file));

      const response = await fetch("/api/logos", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: t("success"),
          description: result.message || t("logosUploaded"),
        });
        setLogoFiles([]);
        await fetchLogos();
      } else {
        // Try to parse error JSON, but fallback if it's empty or invalid
        let errorMessage = t("failedToUploadLogos");
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const error = await response.json();
            errorMessage = error.error || error.message || errorMessage;
          }
        } catch (e) {
          // Response body is empty or not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        toast({
          title: t("error"),
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error uploading logos:", error);
      toast({
        title: t("error"),
        description: t("failedToUploadLogos"),
        variant: "destructive",
      });
    } finally {
      setIsUploadingLogos(false);
    }
  };

  const handleSetActiveLogo = async (logo: CompanyLogo) => {
    if (logo.isActive) return;

    try {
      const response = await fetch(`/api/logos/${logo.id}/set-active`, {
        method: "PUT",
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: t("success"),
          description: t("logoSetActive"),
        });
        await fetchLogos();
      } else {
        const error = await safeParseErrorResponse(response);
        toast({
          title: t("error"),
          description: error.error || error.message || t("failedToSetActiveLogo"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error setting active logo:", error);
      toast({
        title: t("error"),
        description: t("failedToSetActiveLogo"),
        variant: "destructive",
      });
    }
  };

  const handleDeleteLogo = async (logo: CompanyLogo) => {
    setLogoToDelete(logo);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteLogo = async () => {
    if (!logoToDelete) return;

    try {
      const response = await fetch(`/api/logos/${logoToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: t("success"),
          description: t("logoDeleted"),
        });
        setDeleteDialogOpen(false);
        setLogoToDelete(null);
        await fetchLogos();
      } else {
        const error = await safeParseErrorResponse(response);
        toast({
          title: t("error"),
          description: error.error || error.message || t("failedToDeleteLogo"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting logo:", error);
      toast({
        title: t("error"),
        description: t("failedToDeleteLogo"),
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return `0 ${t("bytes")}`;
    const k = 1024;
    const m = 1024 * 1024;
    const g = 1024 * 1024 * 1024;
    if (bytes < k) return `${bytes} ${t("bytes")}`;
    if (bytes < m) return `${(bytes / k).toFixed(2)} ${t("kb")}`;
    if (bytes < g) return `${(bytes / m).toFixed(2)} ${t("mb")}`;
    return `${(bytes / g).toFixed(2)} ${t("gb")}`;
  };

  const handleAddExchangeRate = async (rateData: { from: string; to: string; rate: number }) => {
    setIsSavingRate(true);
    try {
      const response = await fetch("/api/exchange-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rateData),
      });

      if (response.ok) {
        toast({
          title: t("success"),
          description: t("exchangeRateSaved"),
        });
        fetchSettings();
      } else {
        const error = await safeParseErrorResponse(response);
        toast({
          title: t("error"),
          description: error.error || error.message || t("failedToSaveExchangeRate"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving exchange rate:", error);
      toast({
        title: t("error"),
        description: t("failedToSaveExchangeRate"),
        variant: "destructive",
      });
    } finally {
      setIsSavingRate(false);
    }
  };

  const handleDeleteExchangeRate = async (from: string, to: string) => {
    const message = t("deleteExchangeRateConfirm", "Delete exchange rate {from} to {to}?")
      .replace("{from}", from)
      .replace("{to}", to);
    if (!confirm(message)) return;

    try {
      const response = await fetch(`/api/exchange-rates?from=${from}&to=${to}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: t("success"),
          description: t("exchangeRateDeleted"),
        });
        fetchSettings();
      } else {
        const error = await safeParseErrorResponse(response);
        toast({
          title: t("error"),
          description: error.error || error.message || t("failedToDeleteExchangeRate"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting exchange rate:", error);
      toast({
        title: t("error"),
        description: t("failedToDeleteExchangeRate"),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Company Profile */}
      <Card>
        <CardHeader>
          <CardTitle>{t("companyProfile")}</CardTitle>
          <CardDescription>{t("editCompanyInfo")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company-name">{t("companyName")}</Label>
              <Input
                id="company-name"
                value={company?.name || ""}
                onChange={(e) => company && setCompany({ ...company, name: e.target.value })}
                placeholder={t("companyNamePlaceholder")}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="company-address">{t("address")}</Label>
            <Textarea
              id="company-address"
              value={company?.address || ""}
              onChange={(e) => company && setCompany({ ...company, address: e.target.value })}
              placeholder={t("companyAddressPlaceholder")}
              rows={2}
            />
          </div>

          {/* Phone Numbers */}
          <div>
            <Label>{t("phoneNumbers")}</Label>
            <div className="space-y-2">
              {company?.phoneNumbers?.map((phone, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={phone}
                    onChange={(e) => {
                      const newPhones = [...(company.phoneNumbers || [])];
                      newPhones[index] = e.target.value;
                      setCompany({ ...company, phoneNumbers: newPhones });
                    }}
                    placeholder={t("phonePlaceholder")}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const newPhones = company.phoneNumbers?.filter((_, i) => i !== index) || [];
                      setCompany({ ...company, phoneNumbers: newPhones });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )) || []}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const newPhones = [...(company.phoneNumbers || []), ""];
                  setCompany({ ...company, phoneNumbers: newPhones });
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("addPhoneNumber")}
              </Button>
            </div>
          </div>

          {/* Fax Numbers */}
          <div>
            <Label>{t("faxNumbers")}</Label>
            <div className="space-y-2">
              {company?.faxNumbers?.map((fax, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={fax}
                    onChange={(e) => {
                      const newFaxes = [...(company.faxNumbers || [])];
                      newFaxes[index] = e.target.value;
                      setCompany({ ...company, faxNumbers: newFaxes });
                    }}
                    placeholder={t("phonePlaceholder")}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const newFaxes = company.faxNumbers?.filter((_, i) => i !== index) || [];
                      setCompany({ ...company, faxNumbers: newFaxes });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )) || []}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const newFaxes = [...(company.faxNumbers || []), ""];
                  setCompany({ ...company, faxNumbers: newFaxes });
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("addFaxNumber")}
              </Button>
            </div>
          </div>

          {/* Emails */}
          <div>
            <Label>{t("emails")}</Label>
            <div className="space-y-2">
              {company?.emails?.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      const newEmails = [...(company.emails || [])];
                      newEmails[index] = e.target.value;
                      setCompany({ ...company, emails: newEmails });
                    }}
                    placeholder="email@example.com"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const newEmails = company.emails?.filter((_, i) => i !== index) || [];
                      setCompany({ ...company, emails: newEmails });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )) || []}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const newEmails = [...(company.emails || []), ""];
                  setCompany({ ...company, emails: newEmails });
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("addEmail")}
              </Button>
            </div>
          </div>

          {/* Activity Descriptions */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-4">{t("activityDescriptions")}</h4>
            <div className="space-y-4">
              <div>
                <Label htmlFor="activity-fr">{t("activityDescFr")}</Label>
                <Textarea
                  id="activity-fr"
                  value={company?.activityDescriptionFr || ""}
                  onChange={(e) => company && setCompany({ ...company, activityDescriptionFr: e.target.value })}
                  placeholder={t("activityDescFrPlaceholder")}
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="activity-ar">{t("activityDescAr")}</Label>
                <Textarea
                  id="activity-ar"
                  value={company?.activityDescriptionAr || ""}
                  onChange={(e) => company && setCompany({ ...company, activityDescriptionAr: e.target.value })}
                  placeholder={t("activityDescArPlaceholder")}
                  rows={2}
                  dir="rtl"
                />
              </div>
            </div>
          </div>

          {/* Default Currency */}
          <div className="border-t pt-4">
            <Label htmlFor="company-currency">{t("currency")}</Label>
            <select
              id="company-currency"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={company?.currency || "DZD"}
              onChange={(e) => company && setCompany({ ...company, currency: e.target.value })}
            >
              {CURRENCIES.map((curr) => (
                <option key={curr.value} value={curr.value}>{curr.label}</option>
              ))}
            </select>
          </div>

          {/* Default Document Language */}
          <div className="border-t pt-4">
            <Label htmlFor="company-language">{t("defaultDocumentLanguage", "Default Document Language")}</Label>
            <select
              id="company-language"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={company?.defaultLanguage || "fr"}
              onChange={(e) => company && setCompany({ ...company, defaultLanguage: e.target.value })}
            >
              {languageLabels.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.flag} {lang.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {t("defaultDocumentLanguageDescription", "Language used for generating invoices, proformas, and other documents")}
            </p>
          </div>

          <Button onClick={handleSaveCompany} disabled={isSavingCompany}>
            {isSavingCompany ? t("saving") : t("save")}
          </Button>
        </CardContent>
      </Card>

      {/* Activity Profiles */}
      <ActivityProfileSection company={company} onCompanyChange={setCompany} />

      {/* Company Logos */}
      <Card>
        <CardHeader>
          <CardTitle>{t("logoManagement")}</CardTitle>
          <CardDescription>{t("uploadLogos")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload New Logos */}
          <div className="space-y-2">
            <Label>{t("upload")}</Label>
            <div className="flex items-center gap-4">
              <Input
                id="logo-upload"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0) setLogoFiles(files);
                }}
                className="cursor-pointer flex-1"
              />
              <Button
                onClick={handleLogoUpload}
                disabled={logoFiles.length === 0 || isUploadingLogos}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploadingLogos ? t("uploading") : t("upload")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("acceptedFormats")}
            </p>
          </div>

          {/* Uploaded Files Preview */}
          {logoFiles.length > 0 && (
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="font-semibold mb-2">{t("selectLogos")} ({logoFiles.length})</h4>
              <div className="flex flex-wrap gap-2">
                {logoFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
                    <ImageIcon className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium truncate max-w-[150px]">{file.name}</span>
                      <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setLogoFiles(logoFiles.filter((_, i) => i !== index));
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Logo Display */}
          {company?.activeLogoId && logos.find(l => l.id === company.activeLogoId) && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center gap-4">
                <Check className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm font-medium">{t("activeLogo")}</p>
                  <img
                    src={logos.find(l => l.id === company.activeLogoId)?.url}
                    alt={t("activeCompanyLogo")}
                    className="h-20 w-20 object-contain border rounded-md bg-background"
                  />
                </div>
              </div>
            </div>
          )}

          {/* All Uploaded Logos List */}
          {logos.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{t("logosList")} ({logos.length})</h4>
                {logos.some(l => l.isActive) && (
                  <Badge variant="default" className="ml-2">
                    {logos.filter(l => l.isActive).length} {t("active")}
                  </Badge>
                )}
              </div>

              <div className="border rounded-lg overflow-hidden">
                {logos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t("noLogosUploaded")}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("preview")}</TableHead>
                        <TableHead>{t("filename")}</TableHead>
                        <TableHead>{t("size")}</TableHead>
                        <TableHead>{t("status")}</TableHead>
                        <TableHead>{t("uploaded")}</TableHead>
                        <TableHead className="text-right">{t("actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logos.map((logo) => (
                        <TableRow key={logo.id}>
                          <TableCell>
                            <img
                              src={logo.url}
                              alt={logo.originalName}
                              className="h-16 w-16 object-contain border rounded-md bg-background"
                            />
                          </TableCell>
                          <TableCell className="font-medium">{logo.originalName}</TableCell>
                          <TableCell>{formatFileSize(logo.fileSize)}</TableCell>
                          <TableCell>
                            {logo.isActive ? (
                              <Badge variant="default" className="bg-green-500 text-white">{t("active")}</Badge>
                            ) : (
                              <Badge variant="secondary">{t("inactive")}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(logo.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!logo.isActive && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSetActiveLogo(logo)}
                                >
                                  {t("setAsActive")}
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteLogo(logo)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Currency Exchange Rates */}
      <Card>
        <CardHeader>
          <CardTitle>{t("currencyExchangeRates")}</CardTitle>
          <CardDescription>{t("manageExchangeRates")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3">{t("addExchangeRate")}</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="rate-from">{t("fromCurrency")}</Label>
                <select
                  id="rate-from"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {currencyLabels.map((curr) => (
                    <option key={curr.value} value={curr.value}>{curr.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="rate-to">{t("toCurrency")}</Label>
                <select
                  id="rate-to"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {currencyLabels.map((curr) => (
                    <option key={curr.value} value={curr.value}>{curr.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="rate-value">{t("rate")}</Label>
                <Input
                  id="rate-value"
                  type="number"
                  step="0.0001"
                  placeholder={t("ratePlaceholder")}
                  onChange={(e) => e.target.value}
                />
              </div>
            </div>
            <Button
              onClick={() => {
                const fromSelect = document.getElementById("rate-from") as HTMLSelectElement;
                const toSelect = document.getElementById("rate-to") as HTMLSelectElement;
                const rateInput = document.getElementById("rate-value") as HTMLInputElement;
                if (fromSelect.value && toSelect.value && rateInput.value) {
                  handleAddExchangeRate({
                    from: fromSelect.value,
                    to: toSelect.value,
                    rate: parseFloat(rateInput.value),
                  });
                }
              }}
              disabled={isSavingRate}
              className="w-full mt-2"
            >
              {isSavingRate ? t("adding") : t("addRate")}
            </Button>
          </div>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("from")}</TableHead>
                  <TableHead>{t("to")}</TableHead>
                  <TableHead>{t("rate")}</TableHead>
                  <TableHead>{t("updated")}</TableHead>
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exchangeRates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {t("noExchangeRatesConfigured")}
                    </TableCell>
                  </TableRow>
                ) : (
                  exchangeRates.map((rate, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{rate.from}</TableCell>
                      <TableCell>{rate.to}</TableCell>
                      <TableCell className="font-medium">{rate.rate.toFixed(4)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(rate.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteExchangeRate(rate.from, rate.to)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* App UI Language */}
      <Card>
        <CardHeader>
          <CardTitle>{t("applicationLanguage", "Application Language")}</CardTitle>
          <CardDescription>{t("appLanguageDescription", "Language for the application interface (menus, buttons, labels)")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {languageLabels.map((lang) => (
              <button
                key={lang.value}
                onClick={() => setLanguage(lang.value)}
                className={`p-6 rounded-lg border-2 transition-all hover:shadow-md ${
                  appLanguage === lang.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="text-3xl mb-2">{lang.flag}</div>
                <div className="text-sm font-medium">{lang.label}</div>
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("appLanguageNote", "This changes the language of menus and buttons. For document language, use the Default Document Language in Company Profile above.")}
          </p>
        </CardContent>
      </Card>

      {/* Delete Logo Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-background text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteLogo")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteLogoWithName", "Are you sure you want to delete the logo \"{name}\"? {thisActionCannotBeUndone}")
                .replace("{name}", logoToDelete?.originalName || "")
                .replace("{thisActionCannotBeUndone}", t("thisActionCannotBeUndone"))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-foreground">{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteLogo}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("deleteLogo")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
