"use client";

// Force rebuild - timestamp: 2025-02-08 08:02

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, FolderOpen, FileText, Building2, MapPin, Mail, Phone, Printer, DollarSign, Globe, Coins } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/use-translation";

interface DashboardStats {
  totalCustomers: number;
  totalModels: number;
  totalOrders: number;
  totalFamilies: number;
}

interface Company {
  id: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  phoneNumbers?: string[];
  faxNumbers?: string[];
  emails?: string[];
  nif?: string;
  nis?: string;
  rib?: string;
  rcn?: string;
  bankName?: string;
  fundCapital?: number;
  logo?: string;
  currency: string;
  defaultLanguage: string;
  createdAt: string;
  updatedAt: string;
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalModels: 0,
    totalOrders: 0,
    totalFamilies: 0,
  });

  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      console.log("Fetching dashboard data...");
      // First, ensure company exists
      const initRes = await fetch("/api/company/init", { method: "POST" });
      if (!initRes.ok) {
        console.error("Failed to initialize company");
      }

      const [customersRes, modelsRes, ordersRes, familiesRes, companyRes] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/machines/models"),
        fetch("/api/orders"),
        fetch("/api/machines/families"),
        fetch("/api/company"),
      ]);

      const customers = customersRes.ok ? await customersRes.json() : [];
      const models = modelsRes.ok ? await modelsRes.json() : [];
      const orders = ordersRes.ok ? await ordersRes.json() : [];
      const families = familiesRes.ok ? await familiesRes.json() : [];
      const company = companyRes.ok ? await companyRes.json() : null;

      setStats({
        totalCustomers: customers.length,
        totalModels: models.length,
        totalOrders: orders.orders ? orders.orders.length : orders.length,
        totalFamilies: families.length,
      });

      setCompany(company);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  const statCards = [
    {
      title: t("totalCustomers"),
      value: stats.totalCustomers,
      description: t("activeAccounts"),
      icon: Users,
      href: "/customers",
      color: "text-blue-600",
    },
    {
      title: t("totalOrders"),
      value: stats.totalOrders,
      description: t("allTime"),
      icon: FileText,
      href: "/orders",
      color: "text-purple-600",
    },
    {
      title: t("machineModels"),
      value: stats.totalModels,
      description: t("availableProducts"),
      icon: Package,
      href: "/machines",
      color: "text-green-600",
    },
    {
      title: t("machineFamilies"),
      value: stats.totalFamilies,
      description: t("categories"),
      icon: FolderOpen,
      href: "/machines",
      color: "text-orange-600",
    },
  ];

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("dashboard")}</h1>
            <p className="text-muted-foreground mt-1">
              {t("welcome")}
            </p>
          </div>
          <Button onClick={fetchDashboardData} variant="outline">
            {t("refresh")}
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title} className="hover:shadow-lg transition-shadow">
              <Link href={stat.href}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>

        {/* Company Info Card */}
        {company && (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-6 w-6 text-blue-600" />
                    <div>
                      <CardTitle className="text-xl">{t("companyProfile")}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">{company.activityDescriptionFr || company.activityDescriptionAr || ""}</CardDescription>
                    </div>
                  </div>
              </div>
              {company.logo && (
                <div className="w-16 h-16 rounded-lg border-2 bg-white flex items-center justify-center shadow-sm">
                  <img
                    src={company.logo}
                    alt="Company Logo"
                    className="h-14 w-14 object-contain"
                  />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Company Name & Address */}
              <div className="rounded-lg border bg-muted/30 p-4">
                <h3 className="text-lg font-bold mb-2">{company.name}</h3>
                <div className="space-y-1">
                  {company.address && (
                    <p className="text-sm flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span>{company.address}</span>
                    </p>
                  )}
                  {(company.city || company.country) && (
                    <p className="text-sm ml-6">
                      {company.city && company.country 
                        ? `${company.city}, ${company.country}` 
                        : company.city || company.country}
                    </p>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Contact Information</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  {/* Emails */}
                  <div className="rounded-md border p-3 hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="h-4 w-4 text-blue-500" />
                      <span className="text-xs font-medium text-muted-foreground">{t("emails")}</span>
                    </div>
                    <p className="text-sm">
                      {company.emails && company.emails.length > 0
                        ? company.emails.map((email, i) => (
                            <span key={i} className="inline-block">
                              {email}
                              {i < (company.emails.length - 1) && <span className="text-muted-foreground">, </span>}
                            </span>
                          ))
                        : <span className="text-muted-foreground italic">Not set</span>}
                    </p>
                  </div>
                  {/* Phones */}
                  <div className="rounded-md border p-3 hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <Phone className="h-4 w-4 text-green-500" />
                      <span className="text-xs font-medium text-muted-foreground">{t("phones")}</span>
                    </div>
                    <p className="text-sm">
                      {company.phoneNumbers && company.phoneNumbers.length > 0
                        ? company.phoneNumbers.map((phone, i) => (
                            <span key={i} className="inline-block">
                              {phone}
                              {i < (company.phoneNumbers.length - 1) && <span className="text-muted-foreground">, </span>}
                            </span>
                          ))
                        : <span className="text-muted-foreground italic">Not set</span>}
                    </p>
                  </div>
                  {/* Faxes */}
                  <div className="rounded-md border p-3 hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <Printer className="h-4 w-4 text-purple-500" />
                      <span className="text-xs font-medium text-muted-foreground">{t("faxes")}</span>
                    </div>
                    <p className="text-sm">
                      {company.faxNumbers && company.faxNumbers.length > 0
                        ? company.faxNumbers.map((fax, i) => (
                            <span key={i} className="inline-block">
                              {fax}
                              {i < (company.faxNumbers.length - 1) && <span className="text-muted-foreground">, </span>}
                            </span>
                          ))
                        : <span className="text-muted-foreground italic">Not set</span>}
                    </p>
                  </div>
                </div>
              </div>

              {/* Business Settings */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Business Settings</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Currency */}
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-amber-500" />
                      <span className="text-xs font-medium text-muted-foreground">{t("currency")}</span>
                    </div>
                    <Badge variant="outline" className="font-medium">{company.currency}</Badge>
                  </div>
                  {/* Language */}
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-blue-500" />
                      <span className="text-xs font-medium text-muted-foreground">{t("language")}</span>
                    </div>
                    <Badge variant="outline" className="font-medium">
                      {company.defaultLanguage === "fr" && "Français"}
                      {company.defaultLanguage === "en" && "English"}
                      {company.defaultLanguage === "ar" && "العربية"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Business Identifiers */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">{t("businessIdentifiers")}</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  {/* NIF */}
                  {company.nif && (
                    <div className="rounded-md border p-3 hover:bg-accent/50 transition-colors">
                      <p className="text-xs font-medium text-muted-foreground mb-1">NIF</p>
                      <p className="text-sm font-medium">
                        {company.defaultLanguage === 'ar' && (
                          <span className="text-sm" dir="rtl">الرقم الجبائي</span>
                        )}
                        {company.defaultLanguage !== 'ar' && company.nif}
                      </p>
                    </div>
                  )}
                  {/* NIS */}
                  {company.nis && (
                    <div className="rounded-md border p-3 hover:bg-accent/50 transition-colors">
                      <p className="text-xs font-medium text-muted-foreground mb-1">NIS</p>
                      <p className="text-sm font-medium">
                        {company.defaultLanguage === 'ar' && (
                          <span className="text-sm" dir="rtl">الرقم الإحصائي</span>
                        )}
                        {company.defaultLanguage !== 'ar' && company.nis}
                      </p>
                    </div>
                  )}
                  {/* RCN */}
                  {company.rcn && (
                    <div className="rounded-md border p-3 hover:bg-accent/50 transition-colors">
                      <p className="text-xs font-medium text-muted-foreground mb-1">RCN</p>
                      <p className="text-sm font-medium">
                        {company.defaultLanguage === 'ar' && (
                          <span className="text-sm" dir="rtl">رقم السجل التجاري</span>
                        )}
                        {company.defaultLanguage !== 'ar' && company.rcn}
                      </p>
                    </div>
                  )}
                  {/* RIB */}
                  {company.rib && (
                    <div className="rounded-md border p-3 hover:bg-accent/50 transition-colors">
                      <p className="text-xs font-medium text-muted-foreground mb-1">RIB</p>
                      <p className="text-sm font-medium">{company.rib}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Information */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">{t("financialInformation")}</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Bank */}
                  {company.bankName && (
                    <div className="rounded-md border p-3 hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="h-4 w-4 text-blue-500" />
                        <span className="text-xs font-medium text-muted-foreground">{t("bank")}</span>
                      </div>
                      <p className="text-sm font-medium">{company.bankName}</p>
                    </div>
                  )}
                  {/* Fund Capital */}
                  {company.fundCapital && (
                    <div className="rounded-md border p-3 hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <Coins className="h-4 w-4 text-green-500" />
                        <span className="text-xs font-medium text-muted-foreground">{t("fundCapital")}</span>
                      </div>
                      <p className="text-sm font-bold text-green-600">
                        {company.fundCapital.toLocaleString()} {company.currency}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Edit Button */}
            <div className="pt-6 border-t mt-6">
              <Link href="/settings">
                <Button variant="default" className="w-full md:w-auto">
                  <Building2 className="mr-2 h-4 w-4" />
                  {t("editCompanySettings")}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("quickActions")}</CardTitle>
            <CardDescription>{t("frequentlyUsedActions")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/customers">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                {t("addCustomer")}
              </Button>
            </Link>
            <Link href="/machines">
              <Button variant="outline" className="w-full justify-start">
                <Package className="mr-2 h-4 w-4" />
                {t("addMachineModel")}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("recentActivity")}</CardTitle>
            <CardDescription>{t("last30Days")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {t("noRecentActivity")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle>{t("systemInformation")}</CardTitle>
          <CardDescription>Application details and status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm font-medium">{t("application")}</p>
              <p className="text-2xl font-bold">EURL LA SOURCE</p>
              <p className="text-xs text-muted-foreground">{t("invoiceManagementSystem")}</p>
            </div>
            <div>
              <p className="text-sm font-medium">{t("version")}</p>
              <p className="text-2xl font-bold">v1.0.0</p>
              <p className="text-xs text-muted-foreground">{t("productionReady")}</p>
            </div>
            <div>
              <p className="text-sm font-medium">{t("status")}</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <p className="text-2xl font-bold">{t("online")}</p>
              </div>
              <p className="text-xs text-muted-foreground">{t("allSystemsOperational")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
}
