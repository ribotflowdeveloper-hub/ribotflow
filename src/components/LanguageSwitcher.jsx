/**
 * @file LanguageSwitcher.jsx
 * @summary Aquest fitxer defineix un component de client reutilitzable que permet a l'usuari
 * canviar l'idioma de la interfície. Utilitza la llibreria 'react-i18next' per a la gestió
 * de les traduccions.
 */

import React from 'react';
import { useTranslation } from 'react-i18next'; // Hook per accedir a les funcions de traducció.
import { Button } from '@/components/ui/button';

// Definim els idiomes disponibles en un array per a una fàcil gestió.
const languages = [
  { code: 'ca', label: 'CAT' },
  { code: 'es', label: 'ESP' },
  { code: 'en', label: 'ENG' },
];

export const LanguageSwitcher = () => {
  // 'i18n' és l'objecte que conté tota la configuració i les funcions de la llibreria,
  // com 'i18n.language' (l'idioma actual) i 'i18n.changeLanguage()' (la funció per canviar-lo).
  const { i18n } = useTranslation();

  return (
    <div className="flex space-x-1 p-1 bg-secondary rounded-lg">
      {/* Mapegem l'array d'idiomes per renderitzar un botó per a cadascun. */}
      {languages.map((lang) => (
        <Button
          key={lang.code}
          // Canviem l'estil del botó per ressaltar l'idioma que està actualment seleccionat.
          variant={i18n.language === lang.code ? 'default' : 'ghost'}
          // Quan es fa clic, cridem a la funció per canviar l'idioma.
          onClick={() => i18n.changeLanguage(lang.code)}
          className="text-xs px-2 py-1 h-auto"
        >
          {lang.label}
        </Button>
      ))}
    </div>
  );
};
