// src/app/(app)/settings/page.tsx
import { redirect } from 'next/navigation';

export default function SettingsRootPage() {
  // Redirigim a la primera opció del menú per defecte
  redirect('/settings/profile');
}