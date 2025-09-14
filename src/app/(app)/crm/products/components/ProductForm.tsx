"use client";
import { useActionState, useEffect } from "react"; 
import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner"; // ✅ CORRECCIÓ: Importem 'toast' directament de 'sonner'
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProduct, updateProduct } from "../actions";
import type { Product } from "../page";
import type { FormState } from "../actions";
import { Switch } from "@/components/ui/switch"; // ✅ Importa el component Switch
import { Textarea } from "@/components/ui/textarea"; // ✅ Importa Textarea

// Botó de Submit que mostra un estat de càrrega
function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Desant..." : (isEditing ? "Desar Canvis" : "Crear Concepte")}</Button>;
}

export function ProductForm({ product, onSuccess }: { product: Product | null, onSuccess: () => void }) {
  const action = product ? updateProduct.bind(null, product.id) : createProduct;
  const initialState: FormState = { success: false, message: "" };
  const [state, formAction] = useActionState(action, initialState);

  useEffect(() => {
    if (state.message) {
      if (state.success) {
        // ✅ CORRECCIÓ: Nova manera de cridar les notificacions
        toast.success("Èxit!", {
          description: state.message,
        });
        onSuccess();
      } else if (!state.errors) {
        // ✅ CORRECCIÓ: Nova manera de cridar les notificacions d'error
        toast.error("Error", {
          description: state.message,
        });
      }
    }
  }, [state, onSuccess]);
  return (
    <form action={formAction} className="grid gap-6 py-4">
      {/* Camp 'is_active' a dalt de tot */}
      <div className="flex items-center space-x-2">
        <Switch id="is_active" name="is_active" defaultChecked={product?.is_active ?? true} />
        <Label htmlFor="is_active">Producte actiu</Label>
        <p className="text-sm text-muted-foreground">(Si està inactiu, no apareixerà per afegir a nous pressupostos)</p>
      </div>

      {/* Nom i Categoria */}
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Nom del concepte</Label>
          <Input id="name" name="name" defaultValue={product?.name || ""} required />
          {/* ... error message ... */}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="category">Categoria</Label>
          <Input id="category" name="category" defaultValue={product?.category || ""} placeholder="Ex: Disseny Web" />
          {/* ... error message ... */}
        </div>
      </div>
      
      {/* Descripció */}
      <div className="grid gap-2">
        <Label htmlFor="description">Descripció</Label>
        <Textarea id="description" name="description" defaultValue={product?.description || ""} placeholder="Descripció detallada del servei o producte..." />
        {/* ... error message ... */}
      </div>

      {/* Preus i Unitat */}
      <div className="grid grid-cols-4 gap-4">
        <div className="grid gap-2 col-span-2">
            <Label htmlFor="price">Preu Base (€)</Label>
            <Input id="price" name="price" type="number" step="0.01" defaultValue={product?.price || ""} required />
            {/* ... error message ... */}
        </div>
        <div className="grid gap-2">
            <Label htmlFor="unit">Unitat</Label>
            <Input id="unit" name="unit" defaultValue={product?.unit || ""} placeholder="hores, unitats..." />
            {/* ... error message ... */}
        </div>
        <div className="grid gap-2">
            <Label htmlFor="iva">IVA (%)</Label>
            <Input id="iva" name="iva" type="number" defaultValue={product?.iva || 0} />
            {/* ... error message ... */}
        </div>
      </div>
      
      <SubmitButton isEditing={!!product} />
    </form>
  );
}