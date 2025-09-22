import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { ProductsClient } from "./ProductsClient"; // El teu component de client principal
import type { Product } from '@/types/crm/products'; // Importem el tipus des del fitxer central

/**
 * @summary Aquest és un Server Component asíncron que carrega les dades dels productes.
 */
export async function ProductsData() {
  
  const supabase = createClient(cookies())
;

  const { data: { user } } = await supabase.auth.getUser();

  let products: Product[] = [];
  if (user) {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true });
    products = data || [];
  }

  // Un cop tenim les dades, les passem al component de client.
  return <ProductsClient initialProducts={products} />;
}