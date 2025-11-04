// /app/[locale]/(app)/finances/products/[productId]/_components/ProductDetailData.tsx (CORREGIT)

import { notFound } from 'next/navigation'; // 👈 1. Importar notFound
import { fetchProductDetail } from '../actions';
import { ProductDetailClient } from './ProductDetailClient';

interface ProductDetailDataProps {
  productId: number;
}

export async function ProductDetailData({ productId }: ProductDetailDataProps) {
  // Nota: Si 'fetchProductDetail' necessita 't', hauràs de crear-lo abans
  // const t = await getTranslations('ProductsPage');

  let product;
  try {
    // 2. Cridem l'acció per obtenir les dades
    product = await fetchProductDetail(productId);

  } catch (error: unknown) {
    // 3. Si l'acció llança un error (ex: error de base de dades),
    // el capturem i mostrem la pàgina 404.
    if (error instanceof Error) {
      console.error(`[ProductDetailData] Error en carregar el producte ${productId}:`, error.message);
    } else {
      console.error(`[ProductDetailData] Error en carregar el producte ${productId}:`, error);
    }
    return notFound(); 
  }

  // 4. Comprovació addicional per si l'acció retorna 'null' en lloc de llançar un error
  if (!product) {
    // Si el producte no es troba (null o undefined), mostrem 404
    return notFound();
  }

  // 5. Si tot va bé, renderitzem el component client amb les dades
  return (
    <ProductDetailClient product={product} />
  );
}