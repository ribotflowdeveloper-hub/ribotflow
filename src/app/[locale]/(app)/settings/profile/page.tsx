import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ProfileData } from './_components/ProfileData';
import { ProfileSkeleton } from './_components/ProfileSkeleton';

export const metadata: Metadata = {
  title: 'El Teu Perfil | Ribot',
};

/**
 * @summary La pàgina principal de Perfil, que ara actua com a orquestradora de Suspense.
 */
export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileData />
    </Suspense>
  );
}