import { Suspense } from 'react';
import type { Metadata } from 'next';
import { DashboardData } from './_components/DashboardData';
import { DashboardSkeleton } from './_components/DashboardSkeleton';
import { AIOracle } from './_components/AIOracle';
import { AIOracleSkeleton } from './_components/AIOracleSkeleton';


export const metadata: Metadata = {
  title: 'Tauler Principal | Ribot',
};



/**
 * @summary La pàgina principal del Dashboard.
 */
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      {/* ✅ CORRECCIÓ: Passem l'Oracle com a fill (children) de DashboardData */}
      <DashboardData>
        <Suspense fallback={<AIOracleSkeleton />}>
          {/* <AIOracle /> */}
        </Suspense>
      </DashboardData>
    </Suspense>
  );
}
