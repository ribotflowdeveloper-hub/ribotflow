// @/hooks/useContactDetail.ts
"use client";

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { type Contact } from '@/types/crm';
import { updateContactAction, deleteContactAction } from '../actions'; // Ajusta la ruta a les teves Server Actions

// Tipus per a la funció de traducció, per a més seguretat
type TFunction = (key: string) => string;

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