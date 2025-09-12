// mapbox.d.ts
declare module '@mapbox/search-js-react' {
  import * as React from 'react';

  export type MapboxContext = {
    id: string;
    name: string;
  };

  export type MapboxFeature = {
    properties: {
      address: string;
      // ✅ CORRECCIÓ: Definim 'context' com un array de 'MapboxContext'
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