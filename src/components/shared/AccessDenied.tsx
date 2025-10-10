// src/components/shared/AccessDenied.tsx (exemple)
import { useTranslations } from 'next-intl';

// ✅ Defineix les props que el teu component accepta
interface AccessDeniedProps {
  message?: string; // Fes-la opcional amb '?'
}

export function AccessDenied({ message }: AccessDeniedProps) {
  const t = useTranslations('Errors');

  // Fes servir el missatge personalitzat si existeix, si no, un per defecte.
  const displayMessage = message || t('permissionDenied');

  return (
    <div className="text-center p-8 glass-card">
      <h2 className="text-xl font-bold text-destructive">Accés Denegat</h2>
      <p className="text-muted-foreground">{displayMessage}</p>
    </div>
  );
}