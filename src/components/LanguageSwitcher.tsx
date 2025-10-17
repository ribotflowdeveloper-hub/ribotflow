// src/components/LanguageSwitcher.tsx (CORREGIT)

"use client";

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';

import { cn } from '@/lib/utils/utils';
// 🚀 NOU: Importem la Server Action per a persistència forçada
import { setLocalePersistence } from '@/app/actions/localeActions'; 
// Assumim que la llista d'idiomes es pot extreure o definir aquí si no és possible importar-la directament
// const languages = [{ code: 'ca', label: 'Català' }, { code: 'es', label: 'Espanyol' }, { code: 'en', label: 'Anglès' }];

export function LanguageSwitcher() {
  const t = useTranslations('LanguageSwitcher');
  const [isPending, startTransition] = useTransition();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  
  const languages = [
    { code: 'ca', label: t('catalan') },
    { code: 'es', label: t('spanish') },
    { code: 'en', label: t('english') },
  ];
  
  const handleLanguageChange = (nextLocale: string) => {
    if (locale === nextLocale || isPending) return;
    
    startTransition(async () => {
      // 🔑 PAS CLAU: Forcem l'establiment de la cookie persistent.
      await setLocalePersistence(nextLocale);
      
      // Després de fixar la cookie, naveguem a la nova ruta
      const newPath = pathname.replace(`/${locale}`, `/${nextLocale}`);
      router.replace(newPath);
    });
  };

  return (
    <div className="flex space-x-1 p-1 bg-muted rounded-lg">
      {languages.map((lang) => (
        <Button 
          key={lang.code}
          onClick={() => handleLanguageChange(lang.code)} 
          disabled={isPending}
          className={cn(
            "text-xs px-2 py-1 h-auto transition-all duration-300",
            locale === lang.code 
              ? 'bg-gradient-to-r from-green-400 to-cyan-400 text-black font-semibold shadow-md'
              : 'bg-transparent text-muted-foreground hover:bg-background/50' 
          )}
        >
          {isPending && locale !== lang.code }
          {lang.label}
        </Button>
      ))}
    </div>
  );
}