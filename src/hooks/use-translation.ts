"use client";

import { useLanguage } from "@/components/language-provider";
import { translations, LanguageKey, SupportedLanguage } from "@/lib/translations";

export function useTranslation() {
  const { language } = useLanguage();

  const t = (key: LanguageKey, defaultValue?: string): string => {
    const lang = language as SupportedLanguage;
    const translated = translations[lang]?.[key] || translations.en[key];
    return translated || defaultValue || key;
  };

  return { t, language };
}
