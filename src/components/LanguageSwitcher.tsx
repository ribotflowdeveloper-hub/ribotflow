"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const locales = [
  { code: "ca", label: "Català" },
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
];

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();
  const t = useTranslations('LandingNav.langSwitcher');

  const onSelectChange = (nextLocale: string) => {
    // Evitem la navegació si ja estem al 'locale' seleccionat
    if (nextLocale === currentLocale) return;

    // Lògica per extreure el 'pathname' sense el 'locale'
    const newPath = pathname.startsWith(`/${currentLocale}`)
      ? pathname.substring(`/${currentLocale}`.length) || '/'
      : pathname;
    
    // Fem 'replace' per no afegir-ho a l'historial del navegador
    router.replace(`/${nextLocale}${newPath}`);
  };

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t('title')}>
                <Languages className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {locales.map(({ code, label }) => (
                <DropdownMenuItem
                  key={code}
                  onClick={() => onSelectChange(code)}
                  // Destaquem visualment l'idioma actiu
                  className={currentLocale === code ? "font-bold" : ""}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('title')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}