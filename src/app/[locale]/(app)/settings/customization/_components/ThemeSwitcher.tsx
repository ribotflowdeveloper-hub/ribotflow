"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { Sun, Moon, Laptop } from "lucide-react";
import { cn } from "@/lib/utils/utils";

const themeOptions = [
  { theme: "light", label: "Clar", Icon: Sun },
  { theme: "dark", label: "Fosc", Icon: Moon },
  { theme: "system", label: "Sistema", Icon: Laptop },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [activeTheme, setActiveTheme] = React.useState(theme);

  React.useEffect(() => {
    setActiveTheme(theme);
  }, [theme]);

  return (
    <div className="relative flex items-center p-1 bg-muted dark:bg-muted/50 rounded-lg">
      {themeOptions.map(({ theme: optionTheme, label, Icon }) => (
        <button
          key={optionTheme}
          onClick={() => setTheme(optionTheme)}
          className={cn(
            "relative flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md z-10 transition-colors",
            activeTheme !== optionTheme && "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="w-4 h-4" />
          {label}
        </button>
      ))}
      {/* Indicador lliscant */}
      <motion.div
        layoutId="theme-switcher-active"
        className="absolute inset-0 h-full p-1 z-0"
        initial={{ x: themeOptions.findIndex(opt => opt.theme === activeTheme) * 100 + '%' }}
        animate={{ x: themeOptions.findIndex(opt => opt.theme === activeTheme) * (100 / themeOptions.length) + '%' }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="w-1/3 h-full bg-background rounded-md shadow-sm" />
      </motion.div>
    </div>
  );
}