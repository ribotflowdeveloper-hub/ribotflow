// Aquest arxiu és un Server Component. S'executa al servidor per carregar les dades
// de forma segura abans de renderitzar la pàgina.

import { createClient } from "@/lib/supabase/server";
import { ProductsClient } from "./components/ProductsClient";
import { cookies } from "next/headers";

/**
 * Defineix el tipus de dades per a un objecte 'Product'.
 * És crucial per a la seguretat de tipus i l'autocompletat, assegurant que tant
 * el servidor com el client "parlen el mateix idioma".
 */
export type Product = {
    id: string;
    name: string;
    price: number;
    user_id: string;
    created_at: string;
    iva: number | null;
    discount: number | null;
    description: string | null;
    category: string | null;
    unit: string | null;
    is_active: boolean;
};

/**
 * Funció principal de la pàgina del servidor per a la ruta '/crm/products'.
 * S'encarrega de:
 * 1. Autenticar l'usuari.
 * 2. Carregar la llista inicial de productes des de la base de dades.
 * 3. Passar aquestes dades al component de client ('ProductsClient') per a la seva visualització i interacció.
 */
export default async function ProductsPage() {
  // Obtenim les cookies per crear un client de Supabase autenticat per a aquesta petició.
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verifiquem que hi hagi un usuari amb sessió activa.
  const { data: { user } } = await supabase.auth.getUser();

  let products: Product[] = [];
  // Només fem la consulta a la base de dades si l'usuari està autenticat.
  if (user) {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id) // Assegurem que només carreguem els productes de l'usuari actual.
      .order("name", { ascending: true }); // Ordenem alfabèticament per nom.
    products = (data as Product[]) || [];
  }

  // Retornem el component de client, passant-li les dades carregades com a propietat.
  // El servidor envia l'HTML ja renderitzat amb aquestes dades, i el client s'encarrega de la interactivitat.
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <ProductsClient initialProducts={products} />
    </div>
  );
}