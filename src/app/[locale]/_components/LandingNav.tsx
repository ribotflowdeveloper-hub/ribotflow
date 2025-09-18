"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';

export function LandingNav() {
  const t = useTranslations('LandingNav');

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 p-4 flex justify-between items-center bg-background/50 backdrop-blur-lg border-b border-white/10"
    >
      <Link href="/" className="flex items-center gap-2">
        <Image src="/android-chrome-192x192.png" alt="Logo de Ribotflow" width={32} height={32} />
        <span className="font-bold text-lg hidden sm:block text-foreground">Ribotflow</span>
      </Link>
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeSwitcher />
        <Button asChild variant="ghost">
          <Link href="/login">{t('login')}</Link>
        </Button>
        <Button asChild className="hidden sm:inline-flex bg-gradient-to-r from-green-400 to-cyan-400 text-black font-bold hover:scale-105 transition-transform">
          <Link href="/signup">{t('signup')}</Link>
        </Button>
      </div>
    </motion.nav>
  );
}