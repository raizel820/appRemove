"use client";

import { Globe } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background">
      <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-between gap-4 py-6 md:h-16 md:flex-row">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          <span className="text-sm font-medium">EURL LA SOURCE</span>
        </div>
        <p className="text-sm text-muted-foreground">
          © {currentYear} EURL LA SOURCE. All rights reserved.
        </p>
        <p className="text-xs text-muted-foreground">
          {t("invoiceManagementSystem")} v1.0
        </p>
      </div>
    </footer>
  );
}
