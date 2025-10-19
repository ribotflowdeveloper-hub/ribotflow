"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { type z } from 'zod';

import { type Supplier } from '@/types/finances/suppliers';
import { type SupplierFormData, saveSupplierAction } from '../../actions';
// Assumeix que tens 'schemas.ts' a '../../schemas'
import { type supplierFormSchema } from '../../schemas';

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
      }
      : defaultValues
  );
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
      const result = await saveSupplierAction(formData, supplierId);
      if (result.success) {
        toast.success(result.message);

        // ✅ LÒGICA DE REDIRECCIÓ CORREGIDA
        if (supplierId === null && result.data?.id) {
          // Si estàvem CREANT ('supplierId' era null) i tenim un nou ID:
          // REPLACEM '/new' amb '/[id]' a l'historial.
          router.replace(`/finances/suppliers/${result.data.id}`);
          // Opcionalment, podríem fer un refresh addicional si calgués
          // router.refresh(); // Potser no és necessari amb replace
        } else if (supplierId !== null) {
          // Si estàvem EDITANT ('supplierId' NO era null):
          // Només refresquem les dades de la pàgina actual.
          router.refresh();
        }
        // Si no hi ha ID (error?), no fem res o mostrem error.

      } else {
        toast.error(result.message || t('toast.saveError'));
      }
    });
  };

  return { isPending, formData, errors, handleFieldChange, handleSubmit, t };
}
