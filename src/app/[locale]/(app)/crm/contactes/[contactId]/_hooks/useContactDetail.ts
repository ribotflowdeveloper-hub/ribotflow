// /app/[locale]/(app)/crm/contactes/[contactId]/_hooks/useContactDetail.ts (CORREGIT)
"use client";

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { type Database } from '@/types/supabase';
import { updateContactAction, deleteContactAction } from '../actions';
// ✅ 1. Importem el tipus directament de la llibreria next-intl.
import { type useTranslations } from 'next-intl';

type Contact = Database['public']['Tables']['contacts']['Row'];

// ✅ 2. Definim TFunction com el tipus de retorn del hook useTranslations.
// Aquesta és la manera més segura i precisa de fer-ho.
type TFunction = ReturnType<typeof useTranslations<string>>;

/**
 * Hook per gestionar la lògica de la pàgina de detall d'un contacte.
 * @param initialContact - L'objecte inicial del contacte.
 * @param t - La funció de traducció de next-intl.
 */
export function useContactDetail(initialContact: Contact, t: TFunction) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isEditing, setIsEditing] = useState(false);
    const [contact, setContact] = useState(initialContact);
    const formRef = useRef<HTMLFormElement>(null);

    const handleSaveChanges = (formData: FormData) => {
        startTransition(async () => {
            const { data, error } = await updateContactAction(contact.id, formData);
            if (error) {
                toast.error(t('toast.errorTitle'), { description: error.message });
            } else if (data) {
                toast.success(t('toast.successTitle'), { description: t('toast.updateSuccess') });
                setContact(data as Contact);
                setIsEditing(false);
            }
        });
    };

    const handleDelete = () => {
        startTransition(async () => {
            const res = await deleteContactAction(contact.id);
            if (!res.success) {
                toast.error(t('toast.errorTitle'), { description: res.message });
            } else {
                toast.success(t('toast.successTitle'), { description: t('toast.deleteSuccess') });
                router.push('/crm/contactes');
                router.refresh(); 
            }
        });
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        formRef.current?.reset();
    };

    return {
        contact,
        isEditing,
        isPending,
        formRef,
        handleSaveChanges,
        handleDelete,
        handleCancelEdit,
        setIsEditing,
    };
}