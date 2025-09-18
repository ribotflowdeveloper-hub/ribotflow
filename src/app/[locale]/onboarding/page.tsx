import { Suspense } from 'react';
import type { Metadata } from 'next';
import { OnboardingData } from './_components/OnboardingData';
import { OnboardingSkeleton } from './_components/OnboardingSkeleton';

export const metadata: Metadata = {
  title: 'Benvingut a Ribotflow',
  description: 'Completa el teu perfil per començar.',
};

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingSkeleton />}>
      <OnboardingData />
    </Suspense>
  );
}