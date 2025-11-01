"use client";

import React, { useState, useCallback, useEffect, ChangeEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useDebounce } from 'use-debounce';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin } from 'lucide-react';
import type { DetailedAddress } from '@/types/shared/index';

// Aquestes són les props que rep de react-hook-form (via <FormField>)
interface AddressAutocompleteProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onAddressSelect: (address: DetailedAddress) => void;
}

interface MapboxSuggestion {
  name: string;
  mapbox_id: string;
  full_address: string;
}

// AQUEST COMPONENT JA NO UTILITZA '@mapbox/search-js-react'
export default function AddressAutocomplete({ value, onChange, onAddressSelect }: AddressAutocompleteProps) {
  // Reutilitzem traduccions, ja que són les mateixes
  const t = useTranslations('OnboardingPage.step2'); 
  
  // Necessitem un estat local per al text de l'input per al 'debounce'
  // El 'value' de les props (react-hook-form) no s'actualitza a temps
  const [localQuery, setLocalQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<MapboxSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedQuery] = useDebounce(localQuery, 500);

  const fetchSuggestions = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 3) {
      setSuggestions([]);
      return;
    }
    setIsLoading(true);
    const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    // Utilitzem el mateix session_token per consistència
    const endpoint = `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(searchTerm)}&language=ca,es&session_token=08a700a8-1423-4c99-800a-471238634710&access_token=${accessToken}`;
    
    try {
      const response = await fetch(endpoint);
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error(t('errorFetchingSuggestions'), error);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchSuggestions(debouncedQuery);
  }, [debouncedQuery, fetchSuggestions]);

  const handleSelectSuggestion = async (suggestion: MapboxSuggestion) => {
    setIsLoading(true);
    setLocalQuery(suggestion.name);
    setSuggestions([]);

    const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    const endpoint = `https://api.mapbox.com/search/searchbox/v1/retrieve/${suggestion.mapbox_id}?session_token=08a700a8-1423-4c99-800a-471238634710&access_token=${accessToken}`;
    
    try {
        const response = await fetch(endpoint);
        const data = await response.json();
        const feature = data.features[0];
        if (!feature) return;

        const context = feature.properties.context;
        const street = feature.properties.address || '';
        const city = context?.place?.name || '';
        const postcode = context?.postcode?.name || '';
        const region = context?.region?.name || '';
        const country = context?.country?.name || '';
        
        const detailedAddress: DetailedAddress = {
            street, 
            city, 
            postcode, 
            region, 
            country, 
            latitude: feature.geometry.coordinates[1], 
            longitude: feature.geometry.coordinates[0], 
        };

        // 1. Passem l'objecte sencer al 'Dialog' (que omplirà tots els camps)
        onAddressSelect(detailedAddress);
        
        // 2. Actualitzem el camp 'address_text' de react-hook-form amb el carrer
        // Simulem un 'event' perquè 'onChange' de react-hook-form funcioni
        onChange({ target: { value: street } } as ChangeEvent<HTMLInputElement>);
        setLocalQuery(street); // Sincronitzem l'estat local

    } catch (error) {
        console.error(t('errorRetrievingAddress'), error);
    } finally {
        setIsLoading(false);
    }
  };

  // Aquesta funció actualitza l'estat local (per al debounce)
  // i el de react-hook-form (via 'onChange' de les props)
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e); // Actualitza RHF
    setLocalQuery(e.target.value); // Actualitza l'estat local per al 'debounce'
  };

  // Sincronitzem l'estat local si el formulari es reseteja
  useEffect(() => {
    setLocalQuery(value);
  }, [value]);

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder={t('addressPlaceholder')}
          value={localQuery} // L'input mostra l'estat local per a rapidesa
          onChange={handleInputChange}
          className="pl-10"
          autoComplete="off" // Desactivem l'autocompletat natiu
        />
        {isLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin" />}
      </div>

      {/* Aquesta llista <ul> es renderitza dins del Dialog, evitant conflictes de z-index */}
      {suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-2 bg-card border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((s) => (
            <li 
              key={s.mapbox_id}
              onClick={() => handleSelectSuggestion(s)}
              className="px-4 py-2 hover:bg-muted cursor-pointer"
            >
              <p className="font-semibold">{s.name}</p>
              <p className="text-sm text-muted-foreground">{s.full_address}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}