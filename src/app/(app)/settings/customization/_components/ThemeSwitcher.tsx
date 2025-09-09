"use client";

import * as React from "react";
import { useState, useEffect } from "react"; 
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Retorna un placeholder per evitar canvis de layout (Layout Shift)
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm">
        <div className="h-24 bg-muted rounded-lg animate-pulse" />
        <div className="h-24 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

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