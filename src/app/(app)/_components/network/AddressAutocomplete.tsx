// src/app/_components/network/AddressAutocomplete.tsx
"use client";

import { ChangeEvent } from 'react';
import { AddressAutofill } from '@mapbox/search-js-react';
import type { MapboxRetrieveResponse, MapboxContext } from '@mapbox/search-js-react';


import { MapPin } from 'lucide-react';
import type { DetailedAddress } from './onboarding-types';

interface AddressAutocompleteProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onAddressSelect: (address: DetailedAddress) => void;
}

export default function AddressAutocomplete({ value, onChange, onAddressSelect }: AddressAutocompleteProps) {
  
  const handleRetrieve = (res: MapboxRetrieveResponse) => { 
    const feature = res.features[0];
    if (!feature?.properties) return;

    const context = feature.properties.context;
    
    // ✅ CORRECCIÓ CLAU: Definim el tipus de 'ctx' com a 'MapboxContext' per eliminar l'error de 'any'
    const findContext = (idPrefix: string): string => {
      if (!context) return '';
      const found = context.find((ctx: MapboxContext) => ctx.id.startsWith(idPrefix));
      return found?.name || '';
    };

    const street = feature.properties.address || '';
    const city = findContext('place');
    const postcode = findContext('postcode');
    const region = findContext('region');
    const country = findContext('country');
    
    onAddressSelect({ street, city, postcode, region, country });
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-muted-foreground">Carrer (amb cercador)</label>
      <AddressAutofill accessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!} onRetrieve={handleRetrieve}>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            id="address-search"
            className="w-full bg-gray-800 border border-gray-600 rounded-md pl-10 pr-4 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            placeholder="Escriu un carrer i selecciona..."
            autoComplete="address-line1"
            value={value}
            onChange={onChange}
          />
        </div>
      </AddressAutofill>
    </div>
  );
}