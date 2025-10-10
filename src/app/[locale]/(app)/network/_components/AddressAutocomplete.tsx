/**
 * @file AddressAutocomplete.tsx
 * @summary Aquest fitxer defineix un component de client (`"use client"`) que proporciona un camp de text
 * per a la cerca d'adreces amb funcionalitat d'autocompletat, utilitzant el servei de Mapbox.
 * És reutilitzable en qualsevol formulari que necessiti introduir una adreça.
 */

"use client"; // Directiva de Next.js que marca aquest component per ser executat exclusivament al navegador.
              // És necessari perquè utilitza hooks de React (useState, useEffect) i interactua amb el DOM.

import { ChangeEvent } from 'react';
// Components i tipus específics de la llibreria de cerca de Mapbox per a React.
import { AddressAutofill } from '@mapbox/search-js-react';
import type { MapboxRetrieveResponse, MapboxContext } from '@mapbox/search-js-react';

// Importació d'icones per a la interfície d'usuari.
import { MapPin } from 'lucide-react';
// Importació del nostre tipus personalitzat per a l'objecte d'adreça detallada.
import type { DetailedAddress } from '@/types/shared/index';

/**
 * @interface AddressAutocompleteProps
 * @summary Defineix les propietats (props) que el component AddressAutocomplete espera rebre.
 */
interface AddressAutocompleteProps {
  /** El valor actual del camp de text, controlat pel component pare. */
  value: string;
  /** Funció que s'executa quan el contingut del camp de text canvia. */
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  /** Funció callback que s'executa quan l'usuari selecciona una adreça de la llista de suggeriments. */
  onAddressSelect: (address: DetailedAddress) => void;
}

/**
 * @function AddressAutocomplete
 * @summary Component funcional de React que renderitza un input d'autocompletat d'adreces.
 */
export default function AddressAutocomplete({ value, onChange, onAddressSelect }: AddressAutocompleteProps) {
  
  /**
   * @function handleRetrieve
   * @summary Aquesta funció s'activa quan l'usuari selecciona un suggeriment d'adreça de Mapbox.
   * Processa la resposta de l'API per extreure els components individuals de l'adreça.
   * @param {MapboxRetrieveResponse} res - L'objecte de resposta complet de l'API de Mapbox.
   */
  const handleRetrieve = (res: MapboxRetrieveResponse) => { 
    // La resposta pot contenir múltiples resultats ('features'), però normalment ens interessa el primer i més rellevant.
    const feature = res.features[0];
    // Comprovació de seguretat per evitar errors si la resposta no té el format esperat.
    if (!feature?.properties) return;

    // L'objecte 'context' conté informació addicional com la ciutat, el país, la regió, etc.
    const context = feature.properties.context;
    
    /**
     * @function findContext
     * @summary Funció d'ajuda interna per buscar un component específic (com la ciutat o el codi postal)
     * dins de l'array 'context' de la resposta de Mapbox.
     * @param {string} idPrefix - El prefix que identifica el tipus de dada que busquem (ex: 'place', 'postcode').
     * @returns {string} - El nom del component trobat o una cadena buida.
     */
    const findContext = (idPrefix: string): string => {
      if (!context) return '';
      const found = context.find((ctx: MapboxContext) => ctx.id.startsWith(idPrefix));
      return found?.name || '';
    };

    // Extracció de cada part de l'adreça.
    const street = feature.properties.address || '';
    const city = findContext('place');
    const postcode = findContext('postcode');
    const region = findContext('region');
    const country = findContext('country');
    
    // Un cop tenim totes les dades, cridem a la funció 'onAddressSelect' del component pare
    // per passar-li l'objecte d'adreça complet i que pugui actualitzar el seu estat.
    onAddressSelect({ street, city, postcode, region, country, latitude:null, longitude:null });
  };

  // Renderització del component JSX.
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-muted-foreground">Carrer (amb cercador)</label>
      {/* El component `AddressAutofill` de Mapbox és un contenidor que injecta la lògica d'autocompletat
        a l'element <input> que es troba dins seu.
        Requereix un 'accessToken' per funcionar, que llegim de les variables d'entorn.
        La propietat 'onRetrieve' especifica quina funció executar quan es selecciona una adreça.
      */}
      <AddressAutofill accessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!} onRetrieve={handleRetrieve}>
        <div className="relative"> {/* Contenidor per posicionar la icona a sobre de l'input. */}
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            id="address-search"
            className="w-full bg-gray-800 border border-gray-600 rounded-md pl-10 pr-4 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            placeholder="Escriu un carrer i selecciona..."
            autoComplete="address-line1" // Atribut HTML per ajudar els navegadors a autocompletar.
            value={value} // El valor de l'input està controlat des de l'exterior.
            onChange={onChange} // La gestió del canvi també es delega al pare.
          />
        </div>
      </AddressAutofill>
    </div>
  );
}

