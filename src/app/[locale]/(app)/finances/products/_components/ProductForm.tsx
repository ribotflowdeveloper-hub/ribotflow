// /app/[locale]/(app)/crm/products/_components/ProductForm.tsx (Adaptat)
"use client";

// ✅ 1. Imports necessaris
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation"; // Necessari per refrescar

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

// ✅ 2. Assegura't que les accions i tipus s'importen correctament
// Assumint que el tipus Product ve de finances
import { type Product } from "@/types/finances/products";
import {
  createProduct,
  updateProduct,
  getProductById, // Necessitem aquesta acció
  type FormState, // Assegura't que FormState inclou 'errors'
} from "../actions";

// Component SubmitButton (sense canvis)
function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const t = useTranslations('Crm.Products.form'); // Ajusta el namespace de traducció
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? t('saving') : isEditing ? t('updateButton') : t('createButton')}
    </Button>
  );
}

// ✅ 3. Definició de Props actualitzada
interface ProductFormProps {
  productId?: string;
  onFinished: () => void; // Canviem 'onSuccess' per 'onFinished'
}

export function ProductForm({ productId, onFinished }: ProductFormProps) {
  const t = useTranslations('Crm.Products.form');
  const router = useRouter();

  // ✅ 4. Estat per guardar les dades del producte en edició
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ 5. Lligar la Server Action correcta
  const action = productId ? updateProduct.bind(null, Number(productId)) : createProduct;
  const initialState: FormState = { success: false, message: "" };
  const [state, formAction] = useActionState(action, initialState);

  // ✅ 6. useEffect per carregar les dades del producte en mode edició
  useEffect(() => {
    if (productId) {
      setIsLoading(true);
      const fetchProduct = async () => {
        // Aquesta acció 'getProductById' ha d'existir a 'actions.ts'
        const result = await getProductById(Number(productId));
        if (result.product) {
          setProduct(result.product as Product);
        } else {
          toast.error(t('loadError'), { description: result.error ?? t('genericError') });
          onFinished(); // Tanca si hi ha error de càrrega
        }
        setIsLoading(false);
      };
      fetchProduct();
    }
  }, [productId, t, onFinished]);

  // ✅ 7. useEffect per gestionar la resposta de la Server Action
  useEffect(() => {
    if (state.message) {
      if (state.success) {
        // Mostrem el missatge d'èxit (els teus 'actions.ts' han de retornar un missatge)
        toast.success(t(productId ? 'updateSuccess' : 'createSuccess'), {
          description: state.message,
        });
        router.refresh(); // Crucial: refresca les dades de la taula (Server Component)
        onFinished(); // Crida la funció del pare per tancar el diàleg
      } else if (!state.errors) {
        // Error genèric (no de validació)
        toast.error(t('genericError'), { description: state.message });
      }
      // Si hi ha 'state.errors' (de Zod), es mostraran als camps del formulari
    }
  }, [state, onFinished, t, productId, router]);

  // ✅ 8. Estat de càrrega mentre es busquen les dades per editar
  if (productId && isLoading) {
    return (
      <div className="grid gap-6 py-4">
        {/* Aquí podries posar un Skeleton del formulari */}
        <p>{t('loading')}...</p>
      </div>
    );
  }

  // ✅ 9. Formulari (sense 'react-hook-form')
  // Els 'defaultValue' ara depenen de l'estat 'product'
  return (
    <form action={formAction} className="grid gap-6 py-4">
      <div className="flex items-center space-x-2">
        <Switch
          id="is_active"
          name="is_active"
          defaultChecked={product?.is_active ?? true}
        />
        <Label htmlFor="is_active">{t('form.activeLabel')}</Label>
        <p className="text-sm text-muted-foreground">
          {t('form.activeDescription')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">{t('form.nameLabel')}</Label>
          <Input
            id="name"
            name="name"
            defaultValue={product?.name || ""}
            required
          />
          {state.errors?.name && (
            <p className="text-sm text-destructive">{state.errors.name[0]}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="category">{t('form.categoryLabel')}</Label>
          <Input
            id="category"
            name="category"
            defaultValue={product?.category || ""}
            placeholder="Ex: Disseny Web"
          />
          {state.errors?.category && (
            <p className="text-sm text-destructive">{state.errors.category[0]}</p>
          )}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">{t('form.descriptionLabel')}</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={product?.description || ""}
          placeholder="Descripció detallada del servei o producte..."
        />
        {state.errors?.description && (
          <p className="text-sm text-destructive">{state.errors.description[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="grid gap-2 col-span-2">
          <Label htmlFor="price">{t('form.priceLabel')}</Label>
          <Input
            id="price"
            name="price"
            type="number"
            step="0.01"
            defaultValue={product?.price || ""}
            required
          />
          {state.errors?.price && (
            <p className="text-sm text-destructive">{state.errors.price[0]}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="unit">{t('form.unitLabel')}</Label>
          <Input
            id="unit"
            name="unit"
            defaultValue={product?.unit || ""}
            placeholder="hores, unitats..."
          />
          {state.errors?.unit && (
            <p className="text-sm text-destructive">{state.errors.unit[0]}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="iva">{t('form.vatLabel')}</Label>
          <Input
            id="iva"
            name="iva"
            type="number"
            defaultValue={product?.iva ?? 0}
          />
          {state.errors?.iva && (
            <p className="text-sm text-destructive">{state.errors.iva[0]}</p>
          )}
        </div>
      </div>

      <SubmitButton isEditing={!!productId} />
    </form>
  );
}