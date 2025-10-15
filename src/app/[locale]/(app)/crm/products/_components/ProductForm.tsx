// /app/[locale]/(app)/crm/products/_components/ProductForm.tsx (Refactoritzat)
"use client";

import { useActionState, useEffect } from "react"; 
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProduct, updateProduct } from "../actions";
// ✅ 1. Importem els tipus des de la seva font correcta.
import { type Product } from "./ProductsData";
import { type FormState } from "../actions";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "next-intl";

function SubmitButton({ isEditing }: { isEditing: boolean }) {
    const t = useTranslations('ProductsPage');
    const { pending } = useFormStatus();
    return <Button type="submit" disabled={pending}>{pending ? t('form.saving') : (isEditing ? t('form.saveChanges') : t('form.createConcept'))}</Button>;
}

interface ProductFormProps {
    product: Product | null;
    onSuccess: (product: Product) => void;
}

export function ProductForm({ product, onSuccess }: ProductFormProps) {
    const t = useTranslations('ProductsPage');

    // ✅ 2. 'product.id' ara és un número, 'bind' funciona correctament.
    const action = product ? updateProduct.bind(null, product.id) : createProduct;
    const initialState: FormState = { success: false, message: "" };
    const [state, formAction] = useActionState(action, initialState);

    useEffect(() => {
        if (state.message) {
            if (state.success) {
                toast.success(t('toast.success'), { description: state.message });
                if (state.data) {
                    onSuccess(state.data);
                }
            } else if (!state.errors) {
                toast.error(t('toast.error'), { description: state.message });
            }
        }
    }, [state, onSuccess, t]);

    return (
        <form action={formAction} className="grid gap-6 py-4">
            <div className="flex items-center space-x-2">
                <Switch id="is_active" name="is_active" defaultChecked={product?.is_active ?? true} />
                <Label htmlFor="is_active">{t('form.activeLabel')}</Label>
                <p className="text-sm text-muted-foreground">{t('form.activeDescription')}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="name">{t('form.nameLabel')}</Label>
                    <Input id="name" name="name" defaultValue={product?.name || ""} required />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="category">{t('form.categoryLabel')}</Label>
                    <Input id="category" name="category" defaultValue={product?.category || ""} placeholder="Ex: Disseny Web" />
                </div>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="description">{t('form.descriptionLabel')}</Label>
                <Textarea id="description" name="description" defaultValue={product?.description || ""} placeholder="Descripció detallada del servei o producte..." />
            </div>
            <div className="grid grid-cols-4 gap-4">
                <div className="grid gap-2 col-span-2">
                    <Label htmlFor="price">{t('form.priceLabel')}</Label>
                    <Input id="price" name="price" type="number" step="0.01" defaultValue={product?.price || ""} required />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="unit">{t('form.unitLabel')}</Label>
                    <Input id="unit" name="unit" defaultValue={product?.unit || ""} placeholder="hores, unitats..." />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="iva">{t('form.vatLabel')}</Label>
                    <Input id="iva" name="iva" type="number" defaultValue={product?.iva ?? 0} />
                </div>
            </div>
            <SubmitButton isEditing={!!product} />
        </form>
    );
}