"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const t = useTranslations('LandingNav.themeSwitcher');

  // PER QUÈ: Ens assegurem que el component estigui muntat al client
  // abans de llegir el 'theme', per evitar hydration mismatch.
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Determinem el tema actual (ignorem "system" per a aquest toggle simple)
  const isDarkMode = theme === "dark";

  // Retornem un 'skeleton' mentre no estigui muntat
  if (!mounted) {
    return <div className="w-9 h-9" />; // Espai reservat
  }

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={isDarkMode ? t('light') : t('dark')}
            className="relative w-9 h-9" // Assegurem la mida
          >
            <AnimatePresence initial={false} mode="wait">
              {isDarkMode ? (
                // Si és FOSC, mostrem la icona del SOL
                <motion.div
                  key="sun"
                  initial={{ opacity: 0, scale: 0.8, rotate: -90 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.8, rotate: 90 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute"
                >
                  <Sun className="w-5 h-5" />
                </motion.div>
              ) : (
                // Si és CLAR, mostrem la icona de la LLUNA
                <motion.div
                  key="moon"
                  initial={{ opacity: 0, scale: 0.8, rotate: 90 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.8, rotate: -90 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute"
                >
                  <Moon className="w-5 h-5" />
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isDarkMode ? t('light') : t('dark')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}