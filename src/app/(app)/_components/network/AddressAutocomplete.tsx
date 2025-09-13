"use client";

import { ChangeEvent } from "react";
import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";

// Import official Mapbox types
import type { 
  MapboxRetrieveResponse,
  MapboxContext,
  MapboxFeature
} from '@mapbox/search-js-react';

// Import our custom address type
import type { DetailedAddress } from "@/types/DetailedAddress";

// The official Mapbox types can be incomplete. For example, 'context' items
// and 'feature' objects sometimes contain a 'text' property that is not in the
// official type definition. We create extended types to handle this safely
// without disabling ESLint rules.
type MapboxContextWithText = MapboxContext & { text?: string };
type MapboxFeatureWithText = MapboxFeature & { text?: string };

// Dynamically import the Mapbox component to prevent SSR issues
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
    console.log("🔎 Resposta rebuda de Mapbox:", res);

    // Let TypeScript infer the type of 'feature' to be more resilient
    // against conflicting type definitions in the project.
    const feature = res.features[0];
    
    // Defensive check in case the response is empty or invalid
    if (!feature?.properties || !feature?.geometry?.coordinates) {
      console.warn("⚠️ Mapbox response feature is missing properties or geometry.", feature);
      return;
    }

    const props = feature.properties;
    const context = props.context || [];

    const findContext = (idPrefix: string): string => {
      const found = context.find((ctx: MapboxContext) => {
        // Defensive check: Ensure 'id' exists and is a string before calling startsWith
        return typeof ctx?.id === 'string' && ctx.id.startsWith(idPrefix);
      });
      
      // Use our extended type to safely access 'text', with a fallback to the official 'name' property.
      return (found as MapboxContextWithText | undefined)?.text || found?.name || "";
    };

    const [longitude, latitude] = feature.geometry.coordinates;

    // Use our extended type to safely access the 'text' property on the feature
    const street = props.address || (feature as MapboxFeatureWithText).text || "";
    const city = findContext("place");
    const postcode = findContext("postcode");
    const region = findContext("region");
    const country = findContext("country");

    const parsedAddress: DetailedAddress = {
      street,
      city,
      postcode,
      region,
      country,
      latitude,
      longitude,
    };
    
    console.log("✅ Adreça processada:", parsedAddress);
    onAddressSelect(parsedAddress);
  };

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!mapboxToken) {
    console.error("❌ ERROR: El token d'accés de Mapbox no està configurat (NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN).");
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

