"use client";

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export function LanguageSwitcher() {
  const t = useTranslations('LanguageSwitcher');
  const [isPending, startTransition] = useTransition();
  const locale = useLocale(); // <-- Ens diu l'idioma actual (ex: 'ca')
  const router = useRouter();
  const pathname = usePathname(); // <-- Ens dona la ruta COMPLETA (ex: '/ca/dashboard')
  
  const handleLanguageChange = (nextLocale: string) => {
    if (locale === nextLocale) return;
    
    startTransition(() => {
      // ✅ 2. Reconstruïm la ruta manualment. Aquesta és la manera més robusta.
      // Reemplacem el primer segment de la ruta (l'idioma) pel nou.
      const newPath = pathname.replace(`/${locale}`, `/${nextLocale}`);
      router.replace(newPath);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Button 
        variant={locale === 'ca' ? 'default' : 'outline'} 
        onClick={() => handleLanguageChange('ca')} 
        disabled={isPending}
      >
        {isPending && locale !== 'ca' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t('catalan')}
      </Button>
      <Button 
        variant={locale === 'es' ? 'default' : 'outline'} 
        onClick={() => handleLanguageChange('es')} 
        disabled={isPending}
      >
        {isPending && locale !== 'es' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t('spanish')}
      </Button>
      <Button 
        variant={locale === 'en' ? 'default' : 'outline'} 
        onClick={() => handleLanguageChange('en')} 
        disabled={isPending}
      >
        {isPending && locale !== 'en' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t('english')}
      </Button>
    </div>
  );
}