// Aquest fitxer ara només conté el tipus que és específic de la teva aplicació.
// Els tipus de Mapbox els importem directament des de la seva llibreria.

export interface DetailedAddress {
  street: string;
  city: string;
  postcode: string;
  region: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
}

