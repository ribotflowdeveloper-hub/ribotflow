// src/app/[locale]/(app)/crm/products/[productId]/_components/ProductDetailClient.tsx
"use client";

import { useState, useTransition, useEffect } from 'react';
import { useFormState } from 'react-dom';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// Importa el formulari reutilitzable
// Importa el nou component de visualització
import { ProductDetailView } from './ProductDetailView';

// Importa accions i tipus del fitxer general
import { 
  updateProduct, 
  deleteProduct, 
  type FormState 
} from '../../actions';
import { type Product } from '../../_components/ProductsData';

// Importa components de UI
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

  // Estat per canviar entre vista i edició
  const [isEditing, setIsEditing] = useState(false);
  // Estat per al diàleg de confirmació d'eliminació
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  // Estat per desar les dades del producte (per actualitzacions optimistes)
  const [currentProduct, setCurrentProduct] = useState(product);

  const [isDeletePending, startDeleteTransition] = useTransition();

  // 1. Configuració de useFormState per a l'ACTUALITZACIÓ
  // Bindejem l'ID del producte a l'acció d'actualitzar
  const updateProductWithId = updateProduct.bind(null, currentProduct.id);
  const [formState] = useFormState(updateProductWithId, initialState);

  // 2. Efecte per gestionar la resposta del formulari d'actualització
  useEffect(() => {
    if (formState.success) {
      toast.success(formState.message);
      setIsEditing(false); // Tornem a la vista de detall
      if (formState.data) {
        // Actualitzem l'estat local amb les noves dades
        setCurrentProduct(formState.data);
      }
    } else if (formState.message && !formState.success) {
      // Només mostrem error si el missatge existeix i success és false
      // (evita mostrar-se en la càrrega inicial)
      toast.error(formState.message);
    }
  }, [formState]);

  // 3. Gestor per a l'ELIMINACIÓ
  const handleDelete = () => {
    startDeleteTransition(async () => {
      const result = await deleteProduct(currentProduct.id);
      if (result.success) {
        toast.success(result.message);
        router.push('/crm/products'); // Tornem a la llista
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
    
            {/* El botó de Cancel·lar ha d'estar fora del ProductForm 
              si ProductForm té el seu propi botó de Submit.
              Si `ProductForm` no té botó de submit, el pots afegir aquí
              juntament amb el de cancel·lar.
              
              Assumint que `ProductForm` JA TÉ un botó de Submit:
            */}
            <div className="flex justify-end mt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsEditing(false)}
              >
                {tGlobal('cancel')}
              </Button>
               {/* Si `ProductForm` NO té botó de submit, descomenta això:
                 <Button type="submit" form="product-form-id">
                   {tGlobal('save')}
                 </Button>
              */}
            </div>
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

      {/* Diàleg de confirmació d'eliminació */}
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