"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// This is the robust way to get the component's prop types.
// We are inferring the types directly from the component itself.
type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}