// Ja no necessitem definir el tipus 'Product' aquí, ja que ve del fitxer central.
// ✅ AFEGEIX L'EXPORTACIÓ DELS TIPUS AQUÍ
export type Product = {
  id: number;
  name: string;
  price: number;
  description: string | null;
  category: string | null;
  unit: string | null;
  iva: number | null;
  discount: number | null; // És una bona idea incloure tots els camps possibles
  is_active: boolean;
};