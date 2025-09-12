// src/app/_components/network/NetworkLoader.tsx
"use client"; // 👈 Aquest component SÍ és de client

import dynamic from 'next/dynamic';
import { PublicProfile } from '@/types';

// La importació dinàmica es fa aquí, dins d'un Client Component
const NetworkClient = dynamic(() => import('@/app/(app)/_components/network/NetworkClient'), {
  ssr: false, // Ara sí que està permès
  loading: () => <div className="p-8 text-center">Carregant xarxa professional...</div>,
});

interface NetworkLoaderProps {
  profiles: PublicProfile[];
}

// Aquest component només serveix per carregar el NetworkClient i passar-li les dades
export default function NetworkLoader({ profiles }: NetworkLoaderProps) {
  return <NetworkClient profiles={profiles} />;
}