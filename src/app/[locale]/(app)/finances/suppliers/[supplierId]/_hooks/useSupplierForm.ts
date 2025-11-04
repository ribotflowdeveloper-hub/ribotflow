// /app/[locale]/(app)/finances/suppliers/[supplierId]/_hooks/useSupplierForm.ts (FITXER CORREGIT)
"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { type z } from 'zod';

// ✅ 1. Importem l'acció de detall
import { saveSupplierAction } from '../actions';
// ✅ 2. Importem els tipus des del SERVEI
import { type Supplier, type SupplierFormData } from '@/lib/services/finances/suppliers/suppliers.service';
// ✅ 3. Importem el schema
import { type supplierFormSchema } from '../schemas';

type SupplierFormValues = z.infer<typeof supplierFormSchema>;

interface UseSupplierFormProps {
  initialData: Supplier | null;
  supplierId: string | null;
}

const defaultValues: SupplierFormData = { nom: '', nif: null, email: null, telefon: null };

export function useSupplierForm({ initialData, supplierId }: UseSupplierFormProps) {
  const t = useTranslations('SupplierDetailPage');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState<SupplierFormData>(
    initialData
      ? {
          nom: initialData.nom ?? '',
          nif: initialData.nif ?? null,
          email: initialData.email ?? null,
          telefon: initialData.telefon ?? null,
          // Afegeix aquí la resta de camps del formulari
      }
      : defaultValues
  );
  // Validació simple, ja que 'schemas.ts' no l'estàs fent servir amb useFormState
  const [errors, setErrors] = useState<Partial<Record<keyof SupplierFormValues, string>>>({});

  const handleFieldChange = (field: keyof SupplierFormData, value: string | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof SupplierFormValues]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    if (!formData.nom || formData.nom.length < 2) {
      setErrors({ nom: t('validation.nameRequired') });
      return;
    }

    startTransition(async () => {
      // ✅ Crida a l'acció de detall
      const result = await saveSupplierAction(formData, supplierId);
      
      if (result.success) {
        toast.success(result.message);

        if (supplierId === null && result.data?.id) {
          // Estàvem CREANT -> Anem a la nova pàgina d'edició
          router.replace(`/finances/suppliers/${result.data.id}`);
        } else if (supplierId !== null) {
          // Estàvem EDITANT -> Refresquem dades
          router.refresh();
        }
      } else {
        toast.error(result.message || t('toast.saveError'));
      }
    });
  };

  return { isPending, formData, errors, handleFieldChange, handleSubmit, t };
}