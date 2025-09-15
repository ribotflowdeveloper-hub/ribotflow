// Aquesta directiva indica que aquest component SÍ s'ha d'executar al navegador (Client Component).
// És necessari perquè farem servir 'dynamic import', una funcionalitat que requereix interactivitat del client.
"use client"; 

// 'dynamic' és una funció de Next.js que permet fer "importacions dinàmiques".
// Això significa que el component 'NetworkClient' no es carregarà inicialment amb la pàgina,
// sinó només quan sigui necessari, millorant el temps de càrrega inicial.
import dynamic from 'next/dynamic';
import { PublicProfile } from '@/types';

// Aquí fem la importació dinàmica del component principal que conté el mapa i la interactivitat.
// Aquest component (NetworkClient) probablement utilitza llibreries que només funcionen al navegador.
const NetworkClient = dynamic(() => import('@/app/[locale]/(app)/_components/network/NetworkClient'), {
  // Aquesta opció és crucial: 'ssr: false' (Server-Side Rendering: false).
  // Evita que Next.js intenti renderitzar aquest component al servidor. Si el component
  // utilitza objectes com 'window' o llibreries de mapes, fallaria al servidor.
  ssr: false, 
  
  // 'loading' defineix un component o JSX que es mostrarà mentre el 'NetworkClient'
  // s'està descarregant i preparant al navegador. És un bon lloc per a un 'spinner' o un esquelet de càrrega.
  loading: () => <div className="p-8 text-center">Carregant xarxa professional...</div>,
});

// Definim les propietats (props) que espera aquest component.
interface NetworkLoaderProps {
  // 'profiles' és un array amb les dades dels perfils públics.
  // Aquestes dades han estat carregades prèviament al servidor (en un Server Component) i es passen aquí.
  profiles: PublicProfile[];
}

/**
 * Aquest component actua com un "carregador" o "pont".
 * La seva única responsabilitat és gestionar la càrrega asíncrona i segura (sense SSR)
 * del component 'NetworkClient', que és el que realment conté la lògica complexa.
 * Aquest patró és molt comú a Next.js per integrar llibreries que depenen del navegador.
 */
export default function NetworkLoader({ profiles }: NetworkLoaderProps) {
  // Un cop 'NetworkClient' està carregat, el renderitzem i li passem les dades 'profiles'.
  return <NetworkClient profiles={profiles} />;
}