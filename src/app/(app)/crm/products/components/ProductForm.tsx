"use client";

// Importem els hooks de React. 'useActionState' és la versió moderna de 'useFormState'
// per gestionar l'estat dels formularis que utilitzen Server Actions.
import { useActionState, useEffect } from "react"; 
// 'useFormStatus' és un hook que ens dona informació sobre l'estat d'enviament
// d'un formulari, com per exemple si està 'pending' (enviant-se).
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProduct, updateProduct } from "../actions";
import type { Product } from "../page";
import type { FormState } from "../actions";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

/**
 * Sub-component reutilitzable per al botó d'enviament del formulari.
 * Utilitza el hook 'useFormStatus' per desactivar-se i mostrar un text
 * de "Desant..." automàticament mentre la Server Action s'està executant.
 */
function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Desant..." : (isEditing ? "Desar Canvis" : "Crear Concepte")}</Button>;
}

/**
 * Component del formulari per crear o editar un producte/concepte.
 * @param {Product | null} product - Si rep un objecte 'product', funciona en mode edició. Si és 'null', funciona en mode creació.
 * @param {() => void} onSuccess - Funció de callback a executar quan l'operació té èxit (ex: tancar el diàleg).
 */
export function ProductForm({ product, onSuccess }: { product: Product | null, onSuccess: () => void }) {
  // Determina quina Server Action s'ha d'executar: 'updateProduct' si estem editant,
  // o 'createProduct' si estem creant. 'bind' s'utilitza per pre-configurar
  // el primer paràmetre de 'updateProduct' (l'ID del producte).
  const action = product ? updateProduct.bind(null, product.id) : createProduct;

  // Estat inicial per a 'useActionState'.
  const initialState: FormState = { success: false, message: "" };

  // Hook principal que connecta el formulari amb la Server Action.
  // 'state' contindrà l'últim resultat de l'acció (èxit, missatge, errors).
  // 'formAction' és la funció que s'assigna a l'atribut 'action' de l'etiqueta <form>.
  const [state, formAction] = useActionState(action, initialState);

  /**
   * 'useEffect' que s'executa cada cop que l'estat ('state') canvia (després d'enviar el formulari).
   * S'encarrega de mostrar les notificacions ('toast') d'èxit o error.
   */
  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast.success("Èxit!", { description: state.message });
        onSuccess(); // Executa el callback per tancar el diàleg.
      } else if (!state.errors) { // Només mostra error general si no hi ha errors de camp específics.
        toast.error("Error", { description: state.message });
      }
    }
  }, [state, onSuccess]);

  return (
       // L'atribut 'action' connecta directament aquest formulari a la nostra Server Action.
    // En fer 'submit', s'executarà la funció 'formAction' al servidor.
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