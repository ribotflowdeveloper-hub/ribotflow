// src/app/[locale]/(app)/crm/products/[productId]/_components/ProductDetailData.tsx
import { fetchProductDetail } from '../actions'; // Acció del directori [productId]
import { ProductDetailClient } from './ProductDetailClient'; // Component client que crearem
import { getTranslations } from 'next-intl/server'; // Per a missatges d'error

interface ProductDetailDataProps {
  productId: number;
}

export async function ProductDetailData({ productId }: ProductDetailDataProps) {
  const t = await getTranslations('ProductsPage'); // O un namespace específic

  try {
    // Cridem l'acció per obtenir el producte.
    // fetchProductDetail ja gestiona el 'notFound()' internament.
    const product = await fetchProductDetail(productId);

    // Passem les dades al component client
    return <ProductDetailClient product={product} />;

  } catch (error) {
    // Si fetchProductDetail llança un altre error (p.ex., error de BD)
    console.error("Error loading product data:", error);
    // Mostrem un missatge d'error genèric
    // (L'error 404 ja s'hauria gestionat amb notFound())
    // Podries llançar l'error perquè Error Boundary el capturi
    throw new Error(t('errors.loadSingleFailed') || "No s'ha pogut carregar el detall del producte.");
  }
}