/**
 * @file theme-provider.tsx
 * @summary Aquest fitxer defineix un component embolcall (wrapper) per al proveïdor de temes de 'next-themes'.
 * La seva funció és configurar i proporcionar el context del tema (clar/fosc) a tota l'aplicació.
 * Crear aquest component separat és una bona pràctica recomanada per 'next-themes' per assegurar
 * que només el proveïdor sigui un component de client, permetent que la resta del layout pugui ser un component de servidor.
 */

"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// En lloc de definir els tipus de les propietats manualment, els inferim directament del component
// 'NextThemesProvider'. Això és una pràctica robusta que assegura que els nostres tipus
// sempre estaran sincronitzats amb els de la llibreria.
type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

/**
 * @function ThemeProvider
 * @summary El component que embolcalla l'aplicació per proporcionar el context del tema.
 * @param {React.ReactNode} children - Els components fills que tindran accés al context del tema.
 * @param {ThemeProviderProps} props - La resta de propietats que es passaran al proveïdor de 'next-themes'.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
