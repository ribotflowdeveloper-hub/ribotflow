"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/utils";

const locales = [
  { code: "ca", label: "CA" },
  { code: "es", label: "ES" },
  { code: "en", label: "EN" },
];

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();

  const onSelectChange = (nextLocale: string) => {
    // Treiem el locale actual del pathname per construir la nova ruta
    const newPath = pathname.startsWith(`/${currentLocale}`)
      ? pathname.substring(`/${currentLocale}`.length) || '/'
      : pathname;
    router.replace(`/${nextLocale}${newPath}`);
  };

  return (
    <div className="relative flex items-center p-1 bg-muted dark:bg-muted/50 rounded-lg">
      {locales.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => onSelectChange(code)}
          className={cn(
            "relative flex-1 px-4 py-2 text-sm font-medium rounded-md z-10 transition-colors",
            currentLocale !== code && "text-muted-foreground hover:text-foreground"
          )}
        >
          {label}
        </button>
      ))}
      {/* Indicador lliscant */}
      <motion.div
        layoutId="language-switcher-active"
        className="absolute inset-0 h-full p-1 z-0"
        initial={{ x: locales.findIndex(l => l.code === currentLocale) * 100 + '%' }}
        animate={{ x: locales.findIndex(l => l.code === currentLocale) * (100 / locales.length) + '%' }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="w-1/3 h-full bg-background rounded-md shadow-sm" />
      </motion.div>
    </div>
  );
}