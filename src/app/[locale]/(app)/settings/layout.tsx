import React from 'react';

// Aquest layout ja no necessita crear la seva pròpia estructura de columnes,
// ja que el layout principal de l'aplicació ('AppClientLayout') s'encarrega dels sidebars.
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Simplement retornem el contingut de la pàgina. El layout de nivell superior
  // el col·locarà automàticament a l'àrea de contingut principal.
  // L'embolcallem en un 'div' per consistència.
  return <div className="h-full">{children}</div>;
}