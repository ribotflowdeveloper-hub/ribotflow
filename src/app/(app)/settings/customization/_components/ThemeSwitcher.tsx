// src/app/(app)/settings/customization/_components/ThemeSwitcher.tsx
"use client";

import * as React from "react";
// 👇 Importem useState i useEffect
import { useState, useEffect } from "react"; 
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

export function ThemeSwitcher() {
  // 👇 Creem un estat per saber si el component ja està muntat al client
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // 👇 Aquest efecte NOMÉS s'executa al client, un cop el component s'ha muntat
  useEffect(() => {
    setMounted(true);
  }, []);

  // 👇 Mentre no estigui muntat (al servidor o durant la primera càrrega del client),
  // no renderitzis res per evitar el conflicte.
  if (!mounted) {
    return null;
  }

  // 👇 Un cop muntat, renderitzem el component amb la informació correcta del tema
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm">
      <Button
        variant={theme === 'light' ? 'default' : 'outline'}
        onClick={() => setTheme("light")}
        className="flex flex-col h-24 gap-2"
      >
        <Sun className="w-6 h-6" />
        <span>Clar</span>
      </Button>
      <Button
        variant={theme === 'dark' ? 'default' : 'outline'}
        onClick={() => setTheme("dark")}
        className="flex flex-col h-24 gap-2"
      >
        <Moon className="w-6 h-6" />
        <span>Fosc</span>
      </Button>
    </div>
  );
}