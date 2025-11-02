// src/app/[locale]/(app)/finances/products/[productId]/page.tsx

import { Suspense } from 'react';
import { type Metadata } from 'next';
// ✅ Assegura't que la ruta d'importació de 'actions' és correcta.
// Si 'actions.ts' és a 'finances/products', ha de ser '../actions'.
import { fetchProductDetail } from './actions'; 
import { ProductDetailData } from './_components/ProductDetailData';
import { Skeleton } from '@/components/ui/skeleton';

// -------------------------------------------------------------------
// ✅ 1. UNIFICACIÓ DE PROPS:
// Definim UNA única interfície amb 'params' com a Promise.
// -------------------------------------------------------------------
interface ProductDetailPageProps {
  params: Promise<{
    productId: string;
    locale: string; // Incloem 'locale' ja que és part de la ruta
  }>;
}

// -------------------------------------------------------------------
// ✅ 2. generateMetadata (UTILITZANT LA PROMESA)
// Utilitzem la mateixa interfície 'ProductDetailPageProps'.
// -------------------------------------------------------------------
export async function generateMetadata(props: ProductDetailPageProps): Promise<Metadata> {
  
  // ✅ Fem 'await' dels paràmetres, igual que a la pàgina.
  const { productId: productIdString } = await props.params; 
  const productId = parseInt(productIdString, 10);
  
  if (isNaN(productId)) {
    return { title: 'Producte | Ribot' };
  }

  try {
    const product = await fetchProductDetail(productId); 
    if (!product) {
       return { title: 'Producte no trobat | Ribot' };
    }
    return { title: `${product.name} | Productes | Ribot` };
  } catch {
    // Si fetchProductDetail llança 'notFound()', Next.js ho gestionarà.
    return { title: 'Producte no trobat | Ribot' };
  }
}

// Skeleton simple per a la pàgina de detall
function ProductDetailSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-9 w-24 mb-4" /> {/* Botó tornar */}
            <div className="border rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <Skeleton className="h-7 w-48" /> {/* Títol */}
                        <Skeleton className="h-4 w-32" /> {/* Categoria */}
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" /> {/* Badge */}
                </div>
                 <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                         <Skeleton className="h-10 w-full" />
                    </div>
                     <div className="space-y-4">
                         <Skeleton className="h-16 w-full" />
                         <Skeleton className="h-10 w-full" />
                    </div>
                 </div>
            </div>
        </div>
    );
}

// -------------------------------------------------------------------
// ✅ 3. Component de Pàgina (UTILITZANT LA PROMESA)
// Aquesta part ja era correcta.
// -------------------------------------------------------------------
export default async function ProductDetailPage(props: ProductDetailPageProps) {
  
  // Resolem la promesa per obtenir els paràmetres
  const { productId: productIdString } = await props.params;

  const productId = parseInt(productIdString, 10);

  if (isNaN(productId)) {
    const { notFound } = await import('next/navigation');
    notFound();
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 h-full">
      <Suspense fallback={<ProductDetailSkeleton />}>
        {/* Passem el productId validat */}
        <ProductDetailData productId={productId} />
      </Suspense>
    </div>
  );
}