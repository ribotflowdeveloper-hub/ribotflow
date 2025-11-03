// src/app/[locale]/(app)/crm/contactes/[contactId]/_hooks/useContactDetail.ts
"use client";

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { type useTranslations } from 'next-intl';

// ✅ 1. Importem NOMÉS les accions des de 'actions'
import { updateContactAction, deleteContactAction } from '../actions';
// ✅ 2. Importem el TIPUS directament des del SERVEI
import type { ContactDetail } from '@/lib/services/crm/contacts/contacts.service';

type TFunction = ReturnType<typeof useTranslations<string>>;

/**
 * Hook per gestionar la lògica de la pàgina de detall d'un contacte.
 */
export function useContactDetail(initialContact: ContactDetail, t: TFunction) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isEditing, setIsEditing] = useState(false);
    
    const [contact, setContact] = useState<ContactDetail>(initialContact);
    const formRef = useRef<HTMLFormElement>(null);

    const handleSaveChanges = (formData: FormData) => {
        startTransition(async () => {
            const { data, error } = await updateContactAction(contact.id, formData);
            
            if (error) {
                console.error("Error updating contact:", error);
                toast.error(t('toast.errorTitle'), { description: error.message });
            } else if (data) {
                toast.success(t('toast.successTitle'), { description: t('toast.updateSuccess') });
                setContact(data);
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
        setContact(initialContact);
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