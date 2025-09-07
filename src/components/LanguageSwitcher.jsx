// src/components/LanguageSwitcher.jsx

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

const languages = [
  { code: 'ca', label: 'CAT' },
  { code: 'es', label: 'ESP' },
  { code: 'en', label: 'ENG' },
];

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  return (
    <div className="flex space-x-1 p-1 bg-secondary rounded-lg">
      {languages.map((lang) => (
        <Button
          key={lang.code}
          variant={i18n.language === lang.code ? 'default' : 'ghost'}
          onClick={() => i18n.changeLanguage(lang.code)}
          className="text-xs px-2 py-1 h-auto"
        >
          {lang.label}
        </Button>
      ))}
    </div>
  );
};