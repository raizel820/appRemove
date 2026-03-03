"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";
import GlobalPdfHeaderSection from "@/components/pdf-settings/GlobalPdfHeaderSection";
import InvoiceSettingsSection from "@/components/pdf-settings/InvoiceSettingsSection";
import ProformaSettingsSection from "@/components/pdf-settings/ProformaSettingsSection";
import { Settings, FileText, Truck, Wrench } from "lucide-react";
import PurchaseOrderSettingsSection from "@/components/pdf-settings/PurchaseOrderSettingsSection";
import DeliveryNoteSettingsSection from "@/components/pdf-settings/DeliveryNoteSettingsSection";
import TechnicalFileSettingsSection from "@/components/pdf-settings/TechnicalFileSettingsSection";

export default function PdfSettingsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("global-header");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Settings className="h-8 w-8" />
            {t("pdfSettingsTitle", "PDF Settings")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("pdfSettingsDescription", "Configure PDF document settings and templates")}
          </p>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex w-full gap-2 bg-muted/50 p-2 rounded-lg justify-center lg:justify-start">
            <TabsTrigger
              value="global-header"
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <FileText className="h-4 w-4" />
              {t("pdfSettingsGlobalHeader", "Global PDF Header")}
            </TabsTrigger>
            <TabsTrigger
              value="invoice"
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <FileText className="h-4 w-4" />
              {t("pdfSettingsInvoice", "Invoice")}
            </TabsTrigger>
            <TabsTrigger
              value="proforma"
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <FileText className="h-4 w-4" />
              {t("pdfSettingsProforma", "Proforma")}
            </TabsTrigger>
            <TabsTrigger
              value="technical-file"
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Wrench className="h-4 w-4" />
              {t("pdfSettingsTechnicalFile", "Technical File")}
            </TabsTrigger>
            <TabsTrigger
              value="delivery-note"
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Truck className="h-4 w-4" />
              {t("pdfSettingsDeliveryNote", "Delivery Note")}
            </TabsTrigger>
            <TabsTrigger
              value="purchase-order"
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <FileText className="h-4 w-4" />
              {t("pdfSettingsPurchaseOrder", "Purchase Order")}
            </TabsTrigger>


          </TabsList>

          {/* Global PDF Header Section */}
          <TabsContent value="global-header">
            <GlobalPdfHeaderSection />
          </TabsContent>

          {/* Invoice Section */}
          <TabsContent value="invoice">
            <InvoiceSettingsSection />
          </TabsContent>

          {/* Proforma Section */}
          <TabsContent value="proforma">
            <ProformaSettingsSection />
          </TabsContent>

          {/* Technical File Section */}
          <TabsContent value="technical-file">
            <TechnicalFileSettingsSection />
          </TabsContent>

          {/* Delivery Note Section */}
          <TabsContent value="delivery-note">
            <DeliveryNoteSettingsSection />
          </TabsContent>

          {/* Purchase Order Section */}
          <TabsContent value="purchase-order">
            <PurchaseOrderSettingsSection />
          </TabsContent>



        </Tabs>
      </div>
    </div>
  );
}
