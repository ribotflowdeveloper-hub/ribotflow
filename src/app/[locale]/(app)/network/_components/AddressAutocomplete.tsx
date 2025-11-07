"use client";

import React, { useState, useCallback, useEffect, ChangeEvent, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useDebounce } from 'use-debounce';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin } from 'lucide-react';
import type { DetailedAddress } from '@/types/shared/index';

// Importem els components necessaris per al "Combobox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from '@/lib/utils/utils';

// Les props de react-hook-form
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

export default function AddressAutocomplete({ value, onChange, onAddressSelect }: AddressAutocompleteProps) {
  const t = useTranslations('OnboardingPage.step2'); 
  
  const [localQuery, setLocalQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<MapboxSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedQuery] = useDebounce(localQuery, 500);
  
  // ✅ 1. Estat per controlar si el Popover està obert
  const [isOpen, setIsOpen] = useState(false);

  // Ref per a l'input
  const inputRef = useRef<HTMLInputElement>(null);

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
      console.error(t('errorFetchingSuggestions'), error);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    // Només busquem si l'usuari està escrivint activament
    if (debouncedQuery.length > 2) {
      fetchSuggestions(debouncedQuery);
    } else {
      setSuggestions([]);
    }
  }, [debouncedQuery, fetchSuggestions]);

  const handleSelectSuggestion = async (suggestion: MapboxSuggestion) => {
    setIsLoading(true);
    setSuggestions([]);
    setIsOpen(false); // ✅ 2. AQUEST ÉS EL CANVI CLAU: tanquem el popover
    
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
            street, city, postcode, region, country, 
            latitude: feature.geometry.coordinates[1], 
            longitude: feature.geometry.coordinates[0], 
        };

        // Passem dades al formulari
        onAddressSelect(detailedAddress);
        
        // Simulem l'event per a RHF
        onChange({ target: { value: street } } as ChangeEvent<HTMLInputElement>);
        setLocalQuery(street); // Sincronitzem l'estat local

    } catch (error) {
        console.error(t('errorRetrievingAddress'), error);
    } finally {
        setIsLoading(false);
        // Desenfocar l'input un cop hem acabat
        inputRef.current?.blur();
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e); // Actualitza RHF
    setLocalQuery(e.target.value); // Actualitza l'estat local per al 'debounce'
    if (e.target.value.length > 2) {
        setIsOpen(true); // Obrim el popover si no està obert
    } else {
        setIsOpen(false);
    }
  };

  // Sincronitzem l'estat local si el formulari es reseteja
  useEffect(() => {
    setLocalQuery(value);
  }, [value]);

  return (
    // ✅ 3. Utilitzem Popover. Es renderitzarà fora del Dialog,
    // solucionant el 'padding' i 'z-index'.
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder={t('addressPlaceholder')}
            value={localQuery}
            onChange={handleInputChange}
            // Obrim el popover en fer focus si hi ha text
            onFocus={() => {
              if (localQuery.length > 2) setIsOpen(true);
            }}
            className="pl-10"
            autoComplete="off"
          />
          {isLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin" />}
        </div>
      </PopoverTrigger>
      
      <PopoverContent 
        className="p-0 w-[--radix-popover-trigger-width]" // ✅ 4. Ajustem l'amplada i traiem padding
        onOpenAutoFocus={(e) => e.preventDefault()} // Evitem que el popover robi el focus a l'input
      >
        <Command>
          <CommandList>
            {isLoading && !suggestions.length && (
              <div className="p-4 text-sm text-center text-muted-foreground">
                Cercant...
              </div>
            )}
            {!isLoading && !suggestions.length && debouncedQuery.length > 2 && (
              <CommandEmpty>{t('noResults')}</CommandEmpty>
            )}
            {suggestions.map((s) => (
              <CommandItem 
                key={s.mapbox_id}
                onSelect={() => handleSelectSuggestion(s)}
                // ✅ 5. Reduïm el padding dels items per defecte de Command
                className="py-1 px-2 cursor-pointer" 
              >
                <div className="flex flex-col">
                  <p className="font-semibold text-sm">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.full_address}</p>
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}