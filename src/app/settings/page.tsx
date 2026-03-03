'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import GeneralSettingSection from "@/components/settings/GeneralSettingSection";
import QRCodeSettingSection from "@/components/settings/QRCodeSettingSection";
import BackupSettingsSection from "@/components/settings/BackupSettingsSection";
import { useTranslation } from "@/hooks/use-translation";

export default function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title={t("settingsPageTitle", "Settings")}
        description={t("settingsPageDescription", "Configure application settings and preferences")}
      />

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">
            {t("generalSettings", "General Settings")}
          </TabsTrigger>
          <TabsTrigger value="qrcode">
            {t("qrCodeSettings", "QR Code Settings")}
          </TabsTrigger>
          <TabsTrigger value="backup">
            {t("backupSettings", "Backup & Restore")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <GeneralSettingSection />
        </TabsContent>

        <TabsContent value="qrcode" className="mt-6">
          <QRCodeSettingSection />
        </TabsContent>

        <TabsContent value="backup" className="mt-6">
          <BackupSettingsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
