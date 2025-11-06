import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server'; // Importem getTranslations
import { fetchProductDetail } from '../actions';
import { ProductDetailClient } from './ProductDetailClient';

// ✅ 1. Importem guardians, permisos, límits i serveis necessaris
import { 
  validateActionAndUsage, 
  validateSessionAndPermission 
} from '@/lib/permissions/permissions';
import { PERMISSIONS } from '@/lib/permissions/permissions.config';
import { type PlanLimit } from '@/config/subscriptions';
import { AccessDenied } from '@/components/shared/AccessDenied'; 
import { getUsageLimitStatus } from '@/lib/subscription/subscription';

interface ProductDetailDataProps {
  productId: string; // productId ara pot ser 'new'
}

export async function ProductDetailData({ productId: productIdProp }: ProductDetailDataProps) {
  
  const isNew = productIdProp === 'new';
  const t = await getTranslations('ProductsPage'); // Carreguem traduccions

  // --- Lògica per a un NOU producte ---
  if (isNew) {
    // ✅ 2. CAPA 2: Validació de CREACIÓ (Permís + Límit)
    const limitToCheck: PlanLimit = 'maxProducts';
    const validation = await validateActionAndUsage(
      PERMISSIONS.MANAGE_PRODUCTS,
      limitToCheck
    );

    if ('error' in validation) {
      // Si la validació falla, no mostrem el formulari
      return (
        <AccessDenied 
          title={t('errors.limitReachedTitle') || 'Límit assolit'}
          message={validation.error.message}
          backUrl="/finances/products" // Tornem a la llista de /finances
        />
      );
    }

    // Validació superada
    const { user, activeTeamId } = validation;

    return (
      <ProductDetailClient
        product={null} // Passem 'null' per a un producte nou
        isNew={true}   // ✅ Passem 'isNew'
        userId={user.id} // ✅ Passem 'userId'
        teamId={activeTeamId} // ✅ Passem 'teamId'
        limitStatus={null}
      />
    );
  }

  // --- Lògica de càrrega per a un producte EXISTENT ---

  // ✅ 3. CAPA 2: Validació d'EDICIÓ (Només permís de vista)
  const validation = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
  if ('error' in validation) {
      notFound();
  }
  const { user, activeTeamId } = validation; // Obtenim dades de sessió
  
  const numericProductId = parseInt(productIdProp, 10);
  if (isNaN(numericProductId)) {
    notFound();
  }

  let product;
  let limitStatus;

  try {
    // ✅ 4. Carreguem dades I l'estat del límit (per l'alerta)
    [product, limitStatus] = await Promise.all([
      fetchProductDetail(numericProductId),
      getUsageLimitStatus('maxProducts' as PlanLimit)
    ]);

  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`[ProductDetailData] Error en carregar el producte ${numericProductId}:`, error.message);
    }
    return notFound(); 
  }

  if (!product) {
    return notFound();
  }

  return (
    <ProductDetailClient 
      product={product} 
      isNew={false} // ✅ Passem 'isNew'
      userId={user.id} // ✅ Passem 'userId'
      teamId={activeTeamId} // ✅ Passem 'teamId'
      limitStatus={limitStatus} // ✅ Passem l'estat del límit
    />
  );
}