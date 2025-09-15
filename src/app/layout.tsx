/**
 * @file src/app/layout.tsx
 * @summary Layout raíz que solo actúa como un contenedor vacío.
 * No debe renderizar etiquetas <html> o <body>.
 */
import './globals.css';
import { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  // Simplemente devuelve los hijos sin añadir ninguna etiqueta.
  // El layout de [locale] se encargará del <html> y <body>.
  return children;
}