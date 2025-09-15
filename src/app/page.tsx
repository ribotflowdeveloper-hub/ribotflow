/**
 * @file page.tsx (Home Page)
 * @summary Aquest fitxer defineix la pàgina d'inici arrel de l'aplicació (`/`).
 * En una aplicació com aquesta, on l'accés principal és a través d'un panell de control
 * per a usuaris autenticats, aquesta pàgina sovint no té contingut visible.
 * La seva funció principal és actuar com a punt d'entrada mentre el 'middleware'
 * de Next.js s'executa, comprova l'estat d'autenticació de l'usuari i el redirigeix
 * a la pàgina de login (`/login`) o al dashboard (`/dashboard`).
 */

import { Loader2 } from "lucide-react";

/**
 * @function HomePage
 * @summary Mostra un indicador de càrrega simple. Aquesta pàgina normalment
 * només es veu durant un instant (o gens) mentre es produeix la redirecció.
 */
export default function HomePage() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin" />
    </div>
  );
}
