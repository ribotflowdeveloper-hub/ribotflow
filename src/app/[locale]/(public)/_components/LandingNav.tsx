"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button, buttonVariants } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils/utils';

export function LandingNav() {
  const t = useTranslations('LandingNav');

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      // ✅ ARQUITECTURA: Eliminem p-4 i flex. El 'nav' només s'encarrega del fons
      // i l'alçada (py-3).
      className="fixed top-0 left-0 right-0 z-50 
                 bg-background/50 backdrop-blur-lg border-b border-border py-3"
    >
      {/* ✅ NOU: Aquest 'div' fa de contenidor. 
           S'alinearà perfectament amb el 'container' del 'main'.
           'px-4' és necessari per al padding en pantalles mòbils.
      */}
      <div className="container mx-auto flex justify-between items-center px-4">
        
        {/* Grup Esquerra: Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image src="/android-chrome-192x192.png" alt={t('logoAlt')} width={32} height={32} />
          <span className="font-bold text-lg hidden sm:block text-foreground">{t('brandName')}</span>
        </Link>
        
        {/* Grup Dreta: Controls i Accions */}
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeSwitcher />
          
          {/* Separador visual */}
          <div className="h-6 w-px bg-border mx-2" /> 

          {/* Acció Secundària */}
          <Button variant="ghost" asChild>
            <Link href="/login">{t('login')}</Link>
          </Button>
          
          {/* Acció Primària */}
          <Link 
            href="/signup"
            className={cn(
              buttonVariants({ variant: 'default' }),
              "hidden sm:inline-flex font-bold hover:scale-105 transition-transform"
            )}
          >
            {t('signup')}
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}