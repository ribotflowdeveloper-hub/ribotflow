/**
 * @file src/app/[locale]/page.tsx
 * @summary Aquesta és la pàgina d'inici (Landing Page).
 * No fa cap redirecció. El middleware s'encarrega de tot.
 */
import type { Metadata } from 'next';
import { MainLandingView } from './_components/MainLandingView';

export const metadata: Metadata = {
  title: 'Ribotflow - El Futur de la Gestió Empresarial',
  description: 'Unifica el teu CRM, vendes i comunicacions.',
};

export default function LandingPage() {
  return <MainLandingView />;
}