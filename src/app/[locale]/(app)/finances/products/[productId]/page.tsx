// src/app/[locale]/(app)/crm/products/[productId]/page.tsx
import { Suspense } from 'react';
import { ProductDetailData } from './_components/ProductDetailData';
// Pots crear un Skeleton específic o reutilitzar parts del GenericDataTableSkeleton
import { Skeleton } from '@/components/ui/skeleton'; // Skeleton bàsic com a fallback

// Funció per generar Metadata (opcional però recomanat)
// import { fetchProductDetail } from './actions'; // Importa l'acció
// export async function generateMetadata({ params }: { params: { productId: string } }): Promise<Metadata> {
//   const productId = parseInt(params.productId);
//   if (isNaN(productId)) return { title: 'Producte | Ribot' };
//   try {
//       const product = await fetchProductDetail(productId);
//       return { title: `${product.name} | Productes | Ribot` };
//   } catch (error) {
//       return { title: 'Producte no trobat | Ribot' };
//   }
// }


interface ProductDetailPageProps {
  params: {
    productId: string;
  };
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


export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  // Validem que productId sigui un número
  const productId = parseInt(params.productId, 10);

  // Podem fer la validació aquí o dins de ProductDetailData/fetchProductDetail
  if (isNaN(productId)) {
    // Si no és un número, podem mostrar 404 directament
    const { notFound } = await import('next/navigation');
    notFound();
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 h-full"> {/* Padding i alçada */}
      <Suspense fallback={<ProductDetailSkeleton />}>
        {/* Passem el productId validat */}
        <ProductDetailData productId={productId} />
      </Suspense>
    </div>
  );
}