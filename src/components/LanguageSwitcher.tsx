"use client";

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';

import { cn } from '@/lib/utils/utils'; // Importem 'cn' per combinar classes

export function LanguageSwitcher() {
  const t = useTranslations('LanguageSwitcher');
  const [isPending, startTransition] = useTransition();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  
  const handleLanguageChange = (nextLocale: string) => {
    if (locale === nextLocale || isPending) return;
    
    startTransition(() => {
      const newPath = pathname.replace(`/${locale}`, `/${nextLocale}`);
      router.replace(newPath);
    });
  };

  const languages = [
    { code: 'ca', label: t('catalan') },
    { code: 'es', label: t('spanish') },
    { code: 'en', label: t('english') },
  ];

  return (
    // ✅ NOU: Agrupem els botons i els donem un fons i vores per a un millor disseny
    <div className="flex space-x-1 p-1 bg-muted rounded-lg">
      {languages.map((lang) => (
        <Button 
          key={lang.code}
          // ✅ CORRECCIÓ: Eliminem 'variant' i gestionem l'estil amb 'className'
          onClick={() => handleLanguageChange(lang.code)} 
          disabled={isPending}
          // ✅ La clau és aquí: utilitzem 'cn' per aplicar les classes condicionalment
          className={cn(
            "text-xs px-2 py-1 h-auto transition-all duration-300",
            locale === lang.code 
              ? 'bg-gradient-to-r from-green-400 to-cyan-400 text-black font-semibold shadow-md' // Estil actiu (com el botó Accedir)
              : 'bg-transparent text-muted-foreground hover:bg-background/50' // Estil inactiu
          )}
        >
          {/* Mostrem el loader només al botó que s'està activant */}
          {isPending && locale !== lang.code }
          {lang.label}
        </Button>
      ))}
    </div>
  );
}