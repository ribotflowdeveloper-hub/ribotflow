// src/app/[locale]/(app)/network/_components/AddressAutocomplete.tsx

"use client"; 

import { ChangeEvent } from 'react';
import { AddressAutofill } from '@mapbox/search-js-react';
import type { MapboxRetrieveResponse, MapboxContext } from '@mapbox/search-js-react';
import { MapPin } from 'lucide-react';
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

export default function AddressAutocomplete({ value, onChange, onAddressSelect }: AddressAutocompleteProps) {
    
    const handleRetrieve = (res: MapboxRetrieveResponse) => { 
        const feature = res.features[0];
        if (!feature?.properties) return;

        // ✅ --- INICI DE LA CORRECCIÓ ---
        let latitude: number | null = null;
        let longitude: number | null = null;

        // Comprovació de tipus (Type Narrowing)
        // L'objecte 'geometry' pot ser de molts tipus (Point, Polygon, etc.)
        // Ens assegurem que NOMÉS si és un 'Point', llegim les coordenades.
        if (feature.geometry && feature.geometry.type === 'Point') {
            // Ara TypeScript sap que feature.geometry és de tipus Point
            const coordinates = feature.geometry.coordinates;
            longitude = coordinates[0] || null;
            latitude = coordinates[1] || null;
        } else {
            console.warn("La geometria rebuda de Mapbox no és un 'Point'. No es pot desar la ubicació exacta.");
        }
        // ✅ --- FI DE LA CORRECCIÓ ---

        const context = feature.properties.context;
        
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
        
        // 2. Passem les coordenades (ara obtingudes de forma segura)
        onAddressSelect({ 
            street, 
            city, 
            postcode, 
            region, 
            country, 
            latitude, 
            longitude 
        });
    };

    return (
        <div className="space-y-1">
            <label className="block text-sm font-medium text-muted-foreground">Carrer (amb cercador)</label>
            <AddressAutofill accessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!} onRetrieve={handleRetrieve}>
                <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                        id="address-search"
                        // Estil actualitzat per a fons clar (el que necessita el formulari del Dialog)
                        className="w-full bg-background border border-border rounded-md pl-10 pr-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
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