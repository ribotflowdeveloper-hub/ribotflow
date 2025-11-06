"use client";

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { type Supplier, type SupplierFormData } from '@/lib/services/finances/suppliers/suppliers.service';
import { saveSupplierAction } from '../actions';
// (Importa el teu schema de Zod si el fas servir)

// ✅ 1. Actualitzem la interfície
interface UseSupplierFormProps {
  initialData: Supplier | null;
  supplierId: string | null;
  userId: string; // <-- AFEGIT
  teamId: string; // <-- AFEGIT
}

// Data per defecte
const defaultData: SupplierFormData = {
  nom: '',
  email: null,
  telefon: null,
  nif: null,
};

// ✅ 2. Acceptem les noves props
export function useSupplierForm({ 
  initialData, 
  supplierId,

}: UseSupplierFormProps) {
  const t = useTranslations('SupplierDetailPage');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState<SupplierFormData>(
    initialData ? {
      nom: initialData.nom,
      email: initialData.email,
      telefon: initialData.telefon,
      nif: initialData.nif
    } : defaultData
  );

  const handleFieldChange = (field: keyof SupplierFormData, value: string | null) => {
    setFormData(prev => ({ ...prev, [field]: value || null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    startTransition(async () => {
      // ✅ La 'saveSupplierAction' ja està blindada (Capa 3)
      // i obtindrà el userId/teamId de la seva pròpia validació de sessió.
      const result = await saveSupplierAction(formData, supplierId);
      
      if (result.success) {
        toast.success(t('toast.saveSuccess'));
        router.push('/finances/suppliers');
        router.refresh();
      } else {
        // Si falla per límit, es mostrarà aquí
        toast.error(result.message || t('toast.saveError'));
      }
    });
  };

  return {
    isPending,
    formData,
    handleFieldChange,
    handleSubmit,
    t,
  };
}