'use client';

/**
 * Document Language Selector Component
 * Allows users to select language for individual documents
 * Separate from UI/App language
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Languages, Globe } from 'lucide-react';

export type DocumentLanguage = 'ar' | 'en' | 'fr';

interface DocumentLanguageSelectorProps {
  currentLanguage: DocumentLanguage;
  onLanguageChange: (language: DocumentLanguage) => void;
  trigger?: React.ReactNode;
  description?: string;
}

const languageOptions: {
  code: DocumentLanguage;
  name: string;
  nativeName: string;
  direction: 'rtl' | 'ltr';
}[] = [
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    direction: 'ltr',
  },
];

export function DocumentLanguageSelector({
  currentLanguage,
  onLanguageChange,
  trigger,
  description,
}: DocumentLanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedLanguage = languageOptions.find((lang) => lang.code === currentLanguage);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Globe className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">
              {selectedLanguage?.nativeName || selectedLanguage?.name || 'Language'}
            </span>
            <span className="sm:hidden">
              {selectedLanguage?.code === 'ar' ? 'ar' : selectedLanguage?.code === 'fr' ? 'fr' : 'en'}
            </span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            <span>Document Language</span>
          </DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        <div className="grid gap-3 py-4">
          {languageOptions.map((language) => (
            <button
              key={language.code}
              onClick={() => {
                onLanguageChange(language.code);
                setIsOpen(false);
              }}
              className={`
                flex items-start gap-3 p-4 rounded-lg border-2 transition-all
                hover:bg-slate-50 dark:hover:bg-slate-800
                ${currentLanguage === language.code
                  ? 'border-slate-500 bg-slate-50 dark:bg-slate-800'
                  : 'border-slate-200 dark:border-slate-700'
                }
              `}
            >
              <div className="flex-1">
                <div className="font-semibold text-base">
                  {language.name}
                  <span className="text-sm text-slate-500 dark:text-slate-400 ml-2">
                    ({language.nativeName})
                  </span>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Direction: {language.direction === 'rtl' ? 'Right-to-Left' : 'Left-to-Right'}
                </div>
              </div>
              {currentLanguage === language.code && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white text-xs">
                  ✓
                </div>
              )}
            </button>
          ))}
        </div>
        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <strong>Note:</strong> This changes the language of the document only.
            The app interface will remain in your preferred language.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
