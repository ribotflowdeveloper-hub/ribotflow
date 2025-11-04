// /app/[locale]/(app)/crm/products/[productId]/_components/ProductDetailClient.tsx (FITXER CORREGIT)
"use client";

// ✅ CORRECCIÓ: Importem 'useActionState' des de 'react'
import { useState, useTransition, useEffect, useActionState } from 'react';
// ❌ ELIMINEM: import { useFormState } from 'react-dom';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { ProductDetailView } from './ProductDetailView';

// ✅ 1. Importem ACCIONS de LLISTA
import { deleteProduct } from '../../actions';
// ✅ 2. Importem ACCIONS de DETALL
import { updateProduct } from '../actions';
// ✅ 3. Importem TIPUS des del SERVEI (Soluciona ts(2459))
import type { FormState, Product } from '@/lib/services/finances/products/products.service';

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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

interface ProductDetailClientProps {
  product: Product;
}

const initialState: FormState = { success: false, message: "" };

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const t = useTranslations('ProductsPage');
  const tGlobal = useTranslations('Global');
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(product);
  const [isDeletePending, startDeleteTransition] = useTransition();

  // ✅ CORRECCIÓ: Canviem 'useFormState' per 'useActionState'
  const updateProductWithId = updateProduct.bind(null, currentProduct.id);
  const [formState, formAction] = useActionState(updateProductWithId, initialState);

  // Efecte per gestionar la resposta del formulari
  useEffect(() => {
    if (formState.success) {
      toast.success(formState.message);
      setIsEditing(false); 
      if (formState.data) {
        setCurrentProduct(formState.data);
      }
    } else if (formState.message && !formState.success && !formState.errors) {
       toast.error(formState.message);
    }
  }, [formState]);

  // Gestor per a l'ELIMINACIÓ
  const handleDelete = () => {
    startDeleteTransition(async () => {
      const result = await deleteProduct(currentProduct.id); // Aquesta crida està bé
      if (result.success) {
        toast.success(result.message);
        router.push('/crm/products'); 
      } else {
        toast.error(result.message);
      }
      setIsAlertOpen(false);
    });
  };

  if (isEditing) {
    // --- VISTA D'EDICIÓ ---
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('backToList')}
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>{t('editDialog.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            
            {/* Aquí hauries d'inserir el teu component ProductForm */}
            {/* <ProductForm 
                action={formAction} 
                initialState={formState} 
                defaultValues={currentProduct}
                onCancel={() => setIsEditing(false)} 
            /> 
            */}

            {/* Placeholder si encara no tens el formulari */}
            <form action={formAction} className="space-y-4">
              <p>Aquí aniria el teu formulari d'edició (ProductForm).</p>
              {formState.errors && (
                  <div className="text-red-500 text-sm">
                      {Object.values(formState.errors).map(errs => errs.join(', ')).join('; ')}
                  </div>
              )}
              <div className="flex justify-end gap-2 mt-4">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => setIsEditing(false)}
                >
                  {tGlobal('cancel')}
                </Button>
                <Button type="submit">
                  {tGlobal('save')}
                </Button>
              </div>
            </form>
            
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- VISTA DE DETALL (PER DEFECTE) ---
  return (
    <>
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