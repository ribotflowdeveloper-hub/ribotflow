/**
 * @file page.tsx (Project Structure)
 * @summary Component de Servidor per a la pàgina de l'Arquitectura del Projecte.
 * ✅ VERSIÓ SIMPLIFICADA: Ara només renderitza el component de client, sense carregar posicions.
 */


import { ArchitectureVisualizer } from './_components/ArchitectureVisualizer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Arquitectura del Projecte | Ribot',
};

// Ja no necessitem carregar cap dada aquí, tota la lògica es mou al client.
export default async function ProjectStructurePage() {
  return (
    <div className="h-full w-full p-4">
        <ArchitectureVisualizer />
    </div>
  );
}

