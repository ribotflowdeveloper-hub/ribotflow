import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import type { EnrichedTicket } from '@/types/db';

type UseURLSyncProps = {
  selectedTicket: EnrichedTicket | null;
  debouncedSearchTerm: string;
  initialTickets: EnrichedTicket[];
  onSelectTicketFromURL: (ticket: EnrichedTicket) => void;
  onFetchAndSelectTicket: (ticketId: number) => void;
};

export function useURLSync({
  selectedTicket,
  debouncedSearchTerm,
  initialTickets,
  onSelectTicketFromURL,
  onFetchAndSelectTicket,

}: UseURLSyncProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const hasInitializedFromUrl = useRef(false);

  const ticketsRef = useRef(initialTickets);
  ticketsRef.current = initialTickets;

  const onSelectRef = useRef(onSelectTicketFromURL);
  onSelectRef.current = onSelectTicketFromURL;

  const onFetchRef = useRef(onFetchAndSelectTicket);
  onFetchRef.current = onFetchAndSelectTicket;

  const searchParamsString = searchParams.toString();

  // -------------------------------------------------------------------------
  // EFECTE 1: LLEGIR LA URL (Inicialització).
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (hasInitializedFromUrl.current) return; 
    
    const params = new URLSearchParams(searchParamsString);
    const ticketIdFromUrl = params.get('ticketId');

    if (ticketIdFromUrl) {
      const ticketIdNum = Number(ticketIdFromUrl);
      const ticketToSelect = ticketsRef.current.find(t => t.id === ticketIdNum);

      if (ticketToSelect) {
        // Cas A: Trobem el tiquet localment.
        hasInitializedFromUrl.current = true;
        onSelectRef.current(ticketToSelect);
      } else {
        // Cas B: Tiquet NO a la llista (Cal anar a buscar-lo).
        // Mantenim hasInitializedFromUrl = true per BLOCAR l'EFECTE 2 i evitar neteja
        hasInitializedFromUrl.current = true; 
        onFetchRef.current(ticketIdNum);
      }
    } else {
      // Cas C: Si NO hi ha ID a la URL, la inicialització de l'ID s'ha completat.
      hasInitializedFromUrl.current = true;
    }
  }, [initialTickets, searchParamsString]); 
    // Nota: Eliminem les funcions com a dependència ja que són refs estables.


  // -------------------------------------------------------------------------
  // EFECTE 2: ESCRVIRE A LA URL (Sincronització).
  // -------------------------------------------------------------------------
  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    const ticketIdInUrl = params.get('ticketId'); // 🔑 Llegim l'estat actual de la URL
    
    // 🔑 DOBLE BLOQUEIG:
    // 1. Si l'inicialització no ha acabat.
    // 2. Si hi ha un ticketId a la URL, però selectedTicket encara és null (estem esperant el fetch).
    if (!hasInitializedFromUrl.current || (ticketIdInUrl && !selectedTicket?.id)) {
      return;
    }

    // La URL i l'estat estan sincronitzats, podem escriure
    if (selectedTicket?.id) {
      // L'usuari ha seleccionat un tiquet: escrivim l'ID
      params.set('ticketId', selectedTicket.id.toString());
    } else {
      // L'usuari ha tancat el detall (selectedTicket = null): esborrem l'ID
      params.delete('ticketId'); 
    }

    if (debouncedSearchTerm) {
      params.set('q', debouncedSearchTerm);
    } else {
      params.delete('q');
    }

    if (params.toString() !== searchParamsString) {
      window.history.replaceState(null, '', `${pathname}?${params.toString()}`);
    }
  }, [selectedTicket, debouncedSearchTerm, pathname, searchParamsString]);
}