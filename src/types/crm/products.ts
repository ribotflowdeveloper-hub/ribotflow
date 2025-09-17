// Ja no necessitem definir el tipus 'Product' aquí, ja que ve del fitxer central.
// ✅ AFEGEIX L'EXPORTACIÓ DELS TIPUS AQUÍ
export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  unit: string | null;
  iva: number | null;
  is_active: boolean;
};