// Aquest fitxer soluciona els problemes de tipus amb la llibreria de Mapbox.
// Declara el mòdul i exporta els tipus que necessitem a tota l'aplicació.

declare module '@mapbox/search-js-react' {
  import * as React from 'react';

  // Definim les estructures bàsiques basant-nos en la resposta real de l'API de Mapbox.
  // Això inclou propietats opcionals com 'text' que no estan en les definicions oficials.
  export type MapboxContext = {
    id: string;
    name: string;
    text?: string;
  };

  export type MapboxFeature = {
    id: string;
    text?: string;
    place_name: string;
    geometry: {
      type: 'Point';
      coordinates: [number, number]; // [longitude, latitude]
    };
    properties: {
      address?: string;
      context?: MapboxContext[];
    };
  };

  export type MapboxRetrieveResponse = {
    features: MapboxFeature[];
  };

  // Definim les 'props' que accepta el component AddressAutofill.
  export interface AddressAutofillProps {
    accessToken: string;
    onRetrieve?: (res: MapboxRetrieveResponse) => void;
    children?: React.ReactNode;
  }

  // Finalment, declarem el component perquè TypeScript el reconegui.
  export const AddressAutofill: React.FC<AddressAutofillProps>;
}
