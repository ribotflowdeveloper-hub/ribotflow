// src/app/actions/localeActions.ts
// Aquest fitxer s'executarà exclusivament al servidor
'use server';

import { cookies } from 'next/headers';
// ❌ Eliminem la importació innecessària de NextResponse.
// ❌ Eliminem la importació incorrecta de Locale de '@/types/shared/index'.

// ✅ Importem directament les llistes i el defaultLocale des de la font canònica.
import { locales, defaultLocale } from '@/i18n'; 

// 🚀 Constant per al nom de la Cookie de persistència (Ha de coincidir amb el middleware)
const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

// 🔑 CLAU: Determinar si estem en un entorn segur (HTTPS)
const isProduction = process.env.NODE_ENV === 'production';

// Definim un tipus d'unió per als nostres idiomes basat en l'array de i18n
type AppLocale = typeof locales[number];

/**
 * Estableix la cookie de preferència d'idioma de forma explícita amb màxim temps de vida.
 * Aquesta acció garanteix el maxAge i la configuració secure/httpOnly correcte.
 * @param locale - L'idioma a establir (ha de ser un string, ja que ve del client).
 */
export async function setLocalePersistence(locale: string) {
  
  // 1. Validació segura sense 'any'
  const finalLocale: AppLocale = locales.includes(locale as AppLocale) 
    ? (locale as AppLocale) 
    : defaultLocale;
  
  // 2. Fixar la cookie
  // Utilitzem next/headers/cookies().set per fixar la cookie des del servidor.
  (await
        // 2. Fixar la cookie
        // Utilitzem next/headers/cookies().set per fixar la cookie des del servidor.
        cookies()).set(LOCALE_COOKIE_NAME, finalLocale, {
    maxAge: 60 * 60 * 24 * 365, // 1 any
    httpOnly: false, // Permetem que el client (o el middleware) la llegeixi si cal.
    secure: isProduction, // Condicional per a Localhost vs Producció
    path: '/', // Disponible a tota l'aplicació
    sameSite: 'lax',
  });
  
  return { success: true, locale: finalLocale };
}