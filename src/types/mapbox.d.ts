// mapbox.d.ts

declare module '@mapbox/search-js-react' {
    import * as React from 'react';
    import type { Geometry } from 'geojson'; // Tipus oficial GeoJSON
  
    export type MapboxContext = {
      id: string;
      name: string;
    };
  
    export type MapboxFeature = {
      geometry: Geometry; // ✅ Substituïm 'any' per GeoJSON.Geometry
      properties: {
        address: string;
        context?: MapboxContext[];
      };
    };
  
    export type MapboxRetrieveResponse = {
      features: MapboxFeature[];
    };
  
    export interface AddressAutofillProps {
      accessToken: string;
      onRetrieve?: (res: MapboxRetrieveResponse) => void;
      children?: React.ReactNode;
    }
  
    export const AddressAutofill: React.FC<AddressAutofillProps>;
  }
  