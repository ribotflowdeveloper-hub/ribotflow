/**
 * @file ThemeSwitcher.tsx
 * @summary Aquest és un component de client dedicat a gestionar el canvi de tema (clar/fosc).
 * Utilitza la llibreria `next-themes` per a una gestió senzilla i eficient del tema.
 */

"use client";

import * as React from "react";
import { useState, useEffect } from "react"; 
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { useTranslations } from 'next-intl'; // ✅ 1. Importem el hook

export function ThemeSwitcher() {
  // Aquest estat 'mounted' és una pràctica recomanada amb 'next-themes'.
  // Evita que el component es renderitzi al servidor amb un tema i després canviï bruscament al client
  // (un problema conegut com a "hydration mismatch").
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme(); // Hook de la llibreria per obtenir i canviar el tema.
  const t = useTranslations('ThemeSwitcher'); // ✅ 2. Cridem el hook amb un nou espai de noms

  // Quan el component es munta al client, actualitzem l'estat.
  useEffect(() => {
    setMounted(true);
  }, []);
  // Mentre el component no estigui muntat al client, mostrem uns placeholders.
  // Això evita el "hydration mismatch" i el canvi de layout (Layout Shift), millorant l'experiència de l'usuari.
  if (!mounted) {
    // Retorna un placeholder per evitar canvis de layout (Layout Shift)
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm">
        <div className="h-24 bg-muted rounded-lg animate-pulse" />
        <div className="h-24 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }
  // Un cop muntat, mostrem els botons reals.
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm">
      <Button
        variant={theme === 'light' ? 'default' : 'outline'}
        onClick={() => setTheme("light")}
        className="flex flex-col h-24 gap-2"
      >
        <Sun className="w-6 h-6" />
         {/* ✅ 3. Utilitzem la traducció */}
         <span>{t('lightTheme')}</span>
      </Button>
      <Button
        variant={theme === 'dark' ? 'default' : 'outline'}
        onClick={() => setTheme("dark")}
        className="flex flex-col h-24 gap-2"
      >
        <Moon className="w-6 h-6" />
        <span>{t('darkTheme')}</span>
      </Button>
    </div>
  );
}