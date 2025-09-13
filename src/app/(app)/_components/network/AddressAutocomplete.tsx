"use client";

import { ChangeEvent } from "react";
import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";

// Importem els tipus oficials de Mapbox des del nostre fitxer de declaració
import type { 
  MapboxRetrieveResponse,
  MapboxContext,
  MapboxFeature
} from '@mapbox/search-js-react';

// Importem el nostre tipus personalitzat
import type { DetailedAddress } from "@/types/DetailedAddress";

// Carreguem dinàmicament el component de Mapbox
const AddressAutofill = dynamic(
  () => import("@mapbox/search-js-react").then((mod) => mod.AddressAutofill),
  { ssr: false }
);

interface AddressAutocompleteProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onAddressSelect: (address: DetailedAddress) => void;
}

export default function AddressAutocomplete({ value, onChange, onAddressSelect }: AddressAutocompleteProps) {
  
  const handleRetrieve = (res: MapboxRetrieveResponse) => {
    const feature = res.features[0];
    
    if (!feature?.properties) {
      console.warn("⚠️ La resposta de Mapbox no té 'properties'.", feature);
      return;
    }

    const props = feature.properties;
    const context = props.context || [];

    const findContext = (idPrefix: string): string => {
      const found = context.find((ctx: MapboxContext) => ctx.id.startsWith(idPrefix));
      return found?.name || "";
    };

    // ✅ CORRECCIÓ CLAU: Extreiem la latitud i longitud directament de la geometria
    const [longitude, latitude] = feature.geometry?.coordinates || [null, null];

    const parsedAddress: DetailedAddress = {
      street: props.address || "",
      city: findContext("place"),
      postcode: findContext("postcode"),
      region: findContext("region"),
      country: findContext("country"),
      latitude,
      longitude,
    };
    
    onAddressSelect(parsedAddress);
  };

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!mapboxToken) {
    return <div className="text-red-500 p-4 bg-red-900/20 rounded-md">Error de configuració: Falta el token de Mapbox.</div>;
  }

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-muted-foreground">
        Carrer (amb cercador)
      </label>
      <AddressAutofill accessToken={mapboxToken} onRetrieve={handleRetrieve}>
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