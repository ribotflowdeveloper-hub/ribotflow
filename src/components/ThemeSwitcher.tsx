"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

/**
 * @summary Component que renderitza un botó d'icona per canviar entre tema clar i fosc.
 * Està dissenyat per a ser utilitzat en barres de navegació.
 */
export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // Aquest efecte assegura que el component només es renderitza al client
  // per evitar errors d'hidratació (hydration mismatch).
  useEffect(() => {
    setMounted(true);
  }, []);

  // Mentre el component no estigui muntat al client, mostrem un espai reservat
  // de la mateixa mida que el botó final per evitar que la interfície "salti".
  if (!mounted) {
    return <div className="h-9 w-9" />;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Canviar tema"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      {/* Mostrem el Sol si el tema és fosc, i la Lluna si el tema és clar */}
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}