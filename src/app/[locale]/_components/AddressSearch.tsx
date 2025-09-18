"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useDebounce } from 'use-debounce';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin } from 'lucide-react';
import type { DetailedAddress } from '@/types/DetailedAddress';

interface AddressSearchProps {
  onAddressSelect: (address: DetailedAddress) => void;
}

// ✅ 1. DEFINIM UN TIPUS SEGUR PER ALS SUGGERIMENTS DE MAPBOX
interface MapboxSuggestion {
  name: string;
  mapbox_id: string;
  full_address: string;
}

export function AddressSearch({ onAddressSelect }: AddressSearchProps) {
  const t = useTranslations('OnboardingPage.step2');
  const [query, setQuery] = useState('');
  // ✅ 2. APLIQUEM EL NOU TIPUS A L'ESTAT DELS SUGGERIMENTS
  const [suggestions, setSuggestions] = useState<MapboxSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedQuery] = useDebounce(query, 500);

  const fetchSuggestions = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 3) {
      setSuggestions([]);
      return;
    }
    setIsLoading(true);
    const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    const endpoint = `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(searchTerm)}&language=ca,es&session_token=08a700a8-1423-4c99-800a-471238634710&access_token=${accessToken}`;
    
    try {
      const response = await fetch(endpoint);
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error fetching Mapbox suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions(debouncedQuery);
  }, [debouncedQuery, fetchSuggestions]);

  // ✅ 3. APLIQUEM EL NOU TIPUS AL PARÀMETRE DE LA FUNCIÓ
  const handleSelectSuggestion = async (suggestion: MapboxSuggestion) => {
    setIsLoading(true);
    setQuery(''); 
    setSuggestions([]);

    const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    const endpoint = `https://api.mapbox.com/search/searchbox/v1/retrieve/${suggestion.mapbox_id}?session_token=08a700a8-1423-4c99-800a-471238634710&access_token=${accessToken}`;
    
    try {
        const response = await fetch(endpoint);
        const data = await response.json();
        const feature = data.features[0];
        if (!feature) return;

        const context = feature.properties.context;
        
        onAddressSelect({
            street: feature.properties.address || '',
            city: context?.place?.name || '',
            postcode: context?.postcode?.name || '',
            region: context?.region?.name || '',
            country: context?.country?.name || '',
            latitude: feature.geometry.coordinates[1],
            longitude: feature.geometry.coordinates[0],
        });
    } catch (error) {
        console.error('Error retrieving Mapbox address:', error);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder={t('addressPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
        {isLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin" />}
      </div>

      {suggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-2 bg-card border rounded-md shadow-lg max-h-60 overflow-y-auto">
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