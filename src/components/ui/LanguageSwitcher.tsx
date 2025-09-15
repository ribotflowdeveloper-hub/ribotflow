// src/components/ui/LanguageSwitcher.tsx
"use client";

import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  const handleLanguageChange = (nextLocale: string) => {
    // Reemplaça el codi de l'idioma actual a la URL.
    // Això funciona perquè el pathname ja conté el prefix de l'idioma.
    router.replace(pathname.replace(`/${locale}`, `/${nextLocale}`));
  };

  return (
    <Select defaultValue={locale} onValueChange={handleLanguageChange}>
      <SelectTrigger className="w-auto gap-2">
        <span className="fi fi-ww rounded-sm"></span> 
        <SelectValue placeholder="Idioma" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ca">Català</SelectItem>
        <SelectItem value="es">Español</SelectItem>
        <SelectItem value="en">English</SelectItem>
      </SelectContent>
    </Select>
  );
}