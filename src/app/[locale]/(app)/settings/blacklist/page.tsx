import { Suspense } from 'react';
import type { Metadata } from 'next';
import { BlacklistData } from './_components/BlacklistData';
import { BlacklistSkeleton } from './_components/BlacklistSkeleton';

export const metadata: Metadata = {
  title: 'Filtre Inbox (Blacklist) | Ribot',
};

// Mantenim el tipus aquí per a que els components fills l'importin fàcilment.
export type Rule = {
  id: string;
  value: string;
  rule_type: 'email' | 'domain';
  created_at: string; // Afegim camps que puguin faltar
  user_id: string;
};

/**
 * @summary La pàgina principal de la Blacklist, que ara actua com a orquestradora de Suspense.
 */
export default function BlacklistPage() {
  return (
    <Suspense fallback={<BlacklistSkeleton />}>
      <BlacklistData />
    </Suspense>
  );
}