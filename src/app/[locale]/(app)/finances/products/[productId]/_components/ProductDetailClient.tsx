"use client";

import { useState, useTransition, useEffect, useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ProductDetailView } from './ProductDetailView';
import { deleteProduct } from '../../actions';
import { updateProduct, createProduct } from '../actions';
// ✅ 1. Importem el nou tipus
import type { FormState, ProductWithTaxes } from '@/lib/services/finances/products/products.service';
import Link from 'next/link';
import { ArrowLeft, TriangleAlert, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { type UsageCheckResult } from '@/lib/subscription/subscription';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ItemTaxSelector } from '@/components/features/taxs/ItemTaxSelector';
import { type TaxRate } from '@/types/finances/index';
import { fetchTaxRatesAction } from '@/components/features/taxs/fetchTaxRatesAction';

// ✅ 2. Actualitzem les Props
interface ProductDetailClientProps {
  product: ProductWithTaxes | null; // ✅ Utilitzem el tipus extès
  isNew: boolean;
  userId: string;
  teamId: string;
  limitStatus: UsageCheckResult | null;
}

const initialState: FormState = { success: false, message: "" };

export function ProductDetailClient({
  product,
  isNew,
  limitStatus
}: ProductDetailClientProps) {

  const t = useTranslations('ProductDetailPage');
  const tGlobal = useTranslations('Global');
  const t_billing = useTranslations('Shared.limits');
  const router = useRouter();
  const locale = 'ca';

  const [isEditing, setIsEditing] = useState(isNew);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(product);
  const [isDeletePending, startDeleteTransition] = useTransition();

  const [availableTaxes, setAvailableTaxes] = useState<TaxRate[]>([]);
  const [isLoadingTaxes, setIsLoadingTaxes] = useState(true);
  const [selectedTaxes, setSelectedTaxes] = useState<TaxRate[]>([]); // S'inicialitza buit

  const isLimitExceeded = (isNew && limitStatus && !limitStatus.allowed) ||
    (!isNew && limitStatus && !limitStatus.allowed && product?.is_active === false);

  const actionToCall = isNew ? createProduct : updateProduct.bind(null, currentProduct?.id ?? 0);
  const [formState, formAction, isPending] = useActionState(actionToCall, initialState);

  // ✅ 3. Carreguem el catàleg d'impostos I seleccionem els actuals
  useEffect(() => {
    async function loadTaxes() {
      setIsLoadingTaxes(true);
      const result = await fetchTaxRatesAction();
      if (result.success && result.data) {
        const allTaxes = result.data;
        setAvailableTaxes(allTaxes);

        // ✅ SOLUCIÓ AL TODO:
        // Si el producte existeix i té impostos, els pre-seleccionem
        if (product && product.product_taxes) {
          const productTaxIds = product.product_taxes.map(pt => pt.tax_rate_id);
          const preSelected = allTaxes.filter(tax => productTaxIds.includes(tax.id));
          setSelectedTaxes(preSelected);
        }

      } else {
        toast.error("Error al carregar els impostos.");
      }
      setIsLoadingTaxes(false);
    }
    loadTaxes();
  }, [product]); // Depenem de 'product' per seleccionar els impostos

  // Efecte per gestionar la resposta del formulari
  useEffect(() => {
    if (formState.success) {
      toast.success(formState.message);
      setIsEditing(false);
      if (formState.data) {
        setCurrentProduct(formState.data); // Actualitzem el producte actual (ara amb impostos)
        if (isNew) {
          router.replace(`/finances/products/${formState.data.id}`);
        } else {
          router.refresh();
        }
      }
    } else if (formState.message && !formState.success && !formState.errors) {
      toast.error(formState.message);
    }
  }, [formState, isNew, router]);

  // Gestor per a l'ELIMINACIÓ
  const handleDelete = () => {
    if (!currentProduct) return;
    startDeleteTransition(async () => {
      const result = await deleteProduct(currentProduct.id);
      if (result.success) {
        toast.success(result.message);
        router.push('/finances/products');
      } else {
        toast.error(result.message);
      }
      setIsAlertOpen(false);
    });
  };

  if (isEditing) {
    // --- VISTA D'EDICIÓ (O CREACIÓ) ---
    return (
      <div className="space-y-6">
        {isLimitExceeded && (
          <Alert variant="destructive" className="border-yellow-400 bg-yellow-50 text-yellow-900">
            <TriangleAlert className="h-4 w-4 text-yellow-900" />
            <AlertTitle className="font-semibold">
              {t_billing('modalTitle', { default: 'Límit assolit' })}
            </AlertTitle>
            <AlertDescription className="text-xs">
              {limitStatus.error || t_billing('products', { current: limitStatus.current, max: limitStatus.max })}
              <Button asChild variant="link" size="sm" className="px-1 h-auto py-0 text-yellow-900 font-semibold underline">
                <Link href={`/${locale}/settings/billing`}>{t_billing('upgradeButton')}</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Button variant="outline" onClick={() => isNew ? router.push('/finances/products') : setIsEditing(false)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {isNew ? t('backToList') : tGlobal('cancel')}
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>{isNew ? t('newProductButton') : t('editDialog.title')}</CardTitle>
          </CardHeader>
          <CardContent>

            <form action={formAction} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Columna Esquerra */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">{t('form.nameLabel')}</Label>
                    <Input id="name" name="name" defaultValue={currentProduct?.name || ''} required />
                    {formState.errors?.name && <p className="text-xs text-destructive pt-1">{formState.errors.name.join(', ')}</p>}
                  </div>
                  <div>
                    <Label htmlFor="description">{t('form.descriptionLabel')}</Label>
                    <Textarea id="description" name="description" defaultValue={currentProduct?.description || ''} rows={5} />
                  </div>
                  <div>
                    <Label>{t('form.categoryLabel')}</Label>
                    <Input id="category" name="category" defaultValue={currentProduct?.category || ''} placeholder={t('form.categoryPlaceholder')} />
                  </div>
                </div>

                {/* Columna Dreta */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price">{t('table.price')}</Label>
                      <Input id="price" name="price" type="number" step="0.01" defaultValue={currentProduct?.price || 0} required />
                      {formState.errors?.price && <p className="text-xs text-destructive pt-1">{formState.errors.price.join(', ')}</p>}
                    </div>
                    <div>
                      <Label htmlFor="unit">{t('table.unit')}</Label>
                      <Input id="unit" name="unit" defaultValue={currentProduct?.unit || ''} placeholder={t('form.unitPlaceholder')} />
                    </div>
                  </div>

                  {/* Selector d'Impostos */}
                  <div>
                    <Label>{t('form.taxesLabel')}</Label>
                    {isLoadingTaxes ? (
                      <Button variant="outline" className="w-full h-9" disabled>
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </Button>
                    ) : (
                      <ItemTaxSelector
                        ar-ticle
                        availableTaxes={availableTaxes}
                        selectedTaxes={selectedTaxes}
                        onChange={(newTaxes) => setSelectedTaxes(newTaxes)}
                        disabled={isPending}
                      />
                    )}
                 
                    <input type="hidden" name="tax_ids" value={selectedTaxes.map(t => t.id).join(',')} />
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox id="is_active" name="is_active" defaultChecked={currentProduct?.is_active ?? true} />
                    <Label htmlFor="is_active">{t('form.activeLabel')}</Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => isNew ? router.push('/finances/products') : setIsEditing(false)}
                  disabled={isPending}
                >
                  {tGlobal('cancel')}
                </Button>
                <Button type="submit" disabled={isPending || !!isLimitExceeded}>
                  {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {tGlobal('save')}
                </Button>
                Més
              </div>
            </form>

          </CardContent>
        </Card>
      </div>
    );
  }

  // --- VISTA DE DETALL (PER DEFECTE) ---
  if (!currentProduct) return null;

  return (
    <>
      {isLimitExceeded && (
        <Alert variant="destructive" className="mb-4 border-yellow-400 bg-yellow-50 text-yellow-900">
          <TriangleAlert className="h-4 w-4 text-yellow-900" />
          <AlertTitle className="font-semibold">
            {t_billing('modalTitle', { default: 'Límit assolit' })}
          </AlertTitle>
          <AlertDescription className="text-xs">
            {limitStatus.error || t_billing('products', { current: limitStatus.current, max: limitStatus.max })}
            <Button asChild variant="link" size="sm" className="px-1 h-auto py-0 text-yellow-900 font-semibold underline">
              <Link href={`/${locale}/settings/billing`}>{t_billing('upgradeButton')}</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <ProductDetailView
        product={currentProduct}
        onEdit={() => setIsEditing(true)}
        onDelete={() => setIsAlertOpen(true)}
      />

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletePending}>
              {tGlobal('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeletePending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeletePending ? tGlobal('deleting') : tGlobal('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}