// Aquest fitxer serà la única font de veritat per a l'estructura de l'adreça.
export interface DetailedAddress {
  street: string;
  city: string;
  postcode: string;
  region: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
}