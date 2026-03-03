"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type AppLanguage = "ar" | "en" | "fr";

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("en");
  const [mounted, setMounted] = useState(false);

  // Load language from localStorage on mount (client-side only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("app-language") as AppLanguage;
      if (stored && ["ar", "en", "fr"].includes(stored)) {
        setLanguageState(stored);
      }
      setMounted(true);
    } catch (error) {
      console.error("Failed to load language from localStorage:", error);
      setMounted(true);
    }
  }, []);

  // Update HTML lang attribute when language changes (keep direction always LTR)
  useEffect(() => {
    if (!mounted) return;

    // Save to localStorage
    try {
      localStorage.setItem("app-language", language);
    } catch (error) {
      console.error("Failed to save language to localStorage:", error);
    }

    // Update HTML lang attribute (keep dir always LTR)
    const html = document.documentElement;
    html.setAttribute("lang", language);
    html.setAttribute("dir", "ltr");
  }, [language, mounted]);

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
  };

  const value = {
    language,
    setLanguage,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  // During SSR or before mount, context may be undefined
  // Provide defaults instead of throwing
  if (context === undefined) {
    return {
      language: "en" as AppLanguage,
      setLanguage: () => {},
    };
  }
  return context;
}
