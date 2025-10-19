"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { type z } from 'zod';

import { type Supplier } from '@/types/finances/suppliers';
import { type SupplierFormData, saveSupplierAction } from '../../actions';
import { type supplierFormSchema } from '../../schemas'; // Assegura't que 'schemas.ts' existeix

type SupplierFormValues = z.infer<typeof supplierFormSchema>;

interface UseSupplierFormProps {
  initialData: Supplier | null;
  supplierId: string | null;
}

// Dades per defecte per a un proveïdor nou
const defaultValues: SupplierFormData = {
  nom: '',
  nif: null,
  email: null,
  telefon: null,
};

export function useSupplierForm({ initialData, supplierId }: UseSupplierFormProps) {
  const t = useTranslations('SupplierDetailPage');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // Estat del formulari
  const [formData, setFormData] = useState<SupplierFormData>(initialData || defaultValues);
  
  // Estat per als errors de validació
  const [errors, setErrors] = useState<Partial<Record<keyof SupplierFormValues, string>>>({});

  // Gestor de canvis als camps
  const handleFieldChange = (field: keyof SupplierFormData, value: string | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Neteja l'error d'aquest camp quan l'usuari escriu
    if (errors[field as keyof SupplierFormValues]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Gestor de l'enviament del formulari
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({}); // Neteja errors antics

    // (Aquí aniria la validació amb Zod si féssim servir react-hook-form)
    // De moment fem una validació simple manual:
    if (!formData.nom || formData.nom.length < 2) {
        setErrors({ nom: t('validation.nameRequired') }); // Hauràs d'afegir 'validation.nameRequired' a les traduccions
        return;
    }

    startTransition(async () => {
      const result = await saveSupplierAction(formData, supplierId);
      
      if (result.success) {
        toast.success(result.message);
        router.push('/finances/suppliers'); // Torna al llistat
        router.refresh(); // Refresca les dades del llistat
      } else {
        toast.error(result.message || t('toast.saveError'));
      }
    });
  };

  return {
    isPending,
    formData,
    errors,
    handleFieldChange,
    handleSubmit,
    t,
  };
}