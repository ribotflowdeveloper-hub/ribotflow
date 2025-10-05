export interface DetailedAddress {
  street: string;
  city: string;
  postcode: string;
  region: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
}
