import { createClient } from "@/lib/supabase/server";
import { ProductsClient } from "./components/ProductsClient";
import { cookies } from "next/headers"; // ✅ 1. Importa 'cookies'

export type Product = {
    id: string;
    name: string;
    price: number;
    user_id: string;
    created_at: string;
    iva: number | null;
    discount: number | null;
    // ✅ NOUS CAMPS AFEGITS
    description: string | null;
    category: string | null;
    unit: string | null;
    is_active: boolean;
  };

export default async function ProductsPage() {
  const cookieStore = cookies(); // ✅ 2. Llegeix les cookies
  const supabase = createClient(cookieStore); // ✅ 3. Passa-les al client

  const { data: { user } } = await supabase.auth.getUser();

  let products: Product[] = [];
  if (user) {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true });
    products = (data as Product[]) || [];
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <ProductsClient initialProducts={products} />
    </div>
  );
}