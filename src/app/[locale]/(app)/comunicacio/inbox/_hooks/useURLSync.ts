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
  onFetchAndSelectTicket, // ✅ La rebem aquí

}: UseURLSyncProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Aquest 'ref' controlarà si ja hem fet la càrrega inicial des de la URL.
  const hasInitializedFromUrl = useRef(false);

  // Per accedir a les darreres versions de les props dins d'un useEffect sense
  // afegir-les com a dependències inestables, les guardem en 'refs'.
  const ticketsRef = useRef(initialTickets);
  ticketsRef.current = initialTickets;

  const onSelectRef = useRef(onSelectTicketFromURL);
  onSelectRef.current = onSelectTicketFromURL;

  // Obtenim una versió estable (string) dels paràmetres per usar-la a les dependències.
  const searchParamsString = searchParams.toString();

  // EFECTE 1: LLEGIR LA URL. S'executa només si canvien els paràmetres de la URL.
  useEffect(() => {
    // Obtenim la versió més recent dels tiquets des del 'ref'.
    const currentTickets = ticketsRef.current;

    // Només actuem si no hem inicialitzat i ja tenim tiquets per buscar.
    if (!hasInitializedFromUrl.current && currentTickets.length > 0) {
      const params = new URLSearchParams(searchParamsString);
      const ticketIdFromUrl = params.get('ticketId');

      if (ticketIdFromUrl) {
        const ticketToSelect = currentTickets.find(t => t.id?.toString() === ticketIdFromUrl);
        if (ticketToSelect) {
          // Marquem com a inicialitzat ABANS de cridar l'acció.
          hasInitializedFromUrl.current = true;
          // Cridem la funció de selecció a través del 'ref'.
          onSelectRef.current(ticketToSelect);
        }
      } else {
        // ✅ Cas 2: NO el trobem, demanem que el vagin a buscar.
        onFetchAndSelectTicket(Number(ticketIdFromUrl));
      }
    }
  }, [initialTickets, searchParamsString, onSelectTicketFromURL, onFetchAndSelectTicket]);

  // EFECTE 2: ESCRVIRE A LA URL. Només s'activa després de la inicialització.
  useEffect(() => {
    // No fem res fins que l'EFECTE 1 hagi acabat la seva feina.
    if (!hasInitializedFromUrl.current) {
      return;
    }

    const params = new URLSearchParams(searchParamsString);

    if (selectedTicket?.id) {
      params.set('ticketId', selectedTicket.id.toString());
    } else {
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
  }, [selectedTicket, debouncedSearchTerm, pathname, searchParamsString]); // ✅ Aquestes dependències també són estables.
}