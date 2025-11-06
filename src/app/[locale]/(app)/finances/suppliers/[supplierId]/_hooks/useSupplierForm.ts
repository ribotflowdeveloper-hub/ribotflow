"use client";

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { type Supplier, type SupplierFormData } from '@/lib/services/finances/suppliers/suppliers.service';
import { saveSupplierAction } from '../actions';
// (Importa el teu schema de Zod si el fas servir)

interface UseSupplierFormProps {
  initialData: Supplier | null;
  supplierId: string | null;
  userId: string; 
  teamId: string; 
}

// Data per defecte
const defaultData: SupplierFormData = {
  nom: '',
  email: null,
  telefon: null,
  nif: null,
};

export function useSupplierForm({ 
  initialData, 
  supplierId,
  // No estàs fent servir userId ni teamId, però els mantenim si l'acció els necessités
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

  // ✅ 1. AFEGIR ESTAT PER ALS ERRORS DE VALIDACIÓ
  // Assumim que els errors seran un objecte amb claus de 'SupplierFormData'
  const [errors, setErrors] = useState<Partial<Record<keyof SupplierFormData, string>>>({});

  const handleFieldChange = (field: keyof SupplierFormData, value: string | null) => {
    setFormData(prev => ({ ...prev, [field]: value || null }));
    // Opcional: Neteja l'error del camp quan l'usuari comença a escriure
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({}); // Neteja errors antics abans de validar
    
    startTransition(async () => {
      // Passa les dades del formulari i l'ID
      const result = await saveSupplierAction(formData, supplierId);
      
      if (result.success) {
        toast.success(t('toast.saveSuccess'));
        router.push('/finances/suppliers');
        router.refresh();
      } else {
        // ✅ 2. GESTIONAR ELS DIFERENTS TIPUS D'ERRORS
        if (result.error) {
          // Errors de validació o errors generals
          toast.error(result.message || result.error || t('toast.saveError'));
        }
      }
    });
  };

  // ✅ 3. RETORNAR ELS ERRORS A L'OBJECTE
  return {
    isPending,
    formData,
    errors, // <-- Aquí està la propietat que faltava
    handleFieldChange,
    handleSubmit,
    t,
  };
}