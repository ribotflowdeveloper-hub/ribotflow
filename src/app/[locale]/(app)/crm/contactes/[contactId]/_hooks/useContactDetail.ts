// src/app/[locale]/(app)/crm/contactes/[contactId]/_hooks/useContactDetail.ts
"use client";

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { updateContactAction, deleteContactAction } from '../actions';
import type { ContactDetail } from '@/lib/services/crm/contacts/contacts.service';

export function useContactDetail(initialContact: ContactDetail) {
    const t = useTranslations('ContactDetailPage'); // Assegura't que la clau existeix
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isEditing, setIsEditing] = useState(false);
    
    // Optimistic UI: Podríem utilitzar useOptimistic aquí, però per ara local state va bé
    const [contact, setContact] = useState<ContactDetail>(initialContact);
    const formRef = useRef<HTMLFormElement>(null);

    const handleSaveChanges = (formData: FormData) => {
        startTransition(async () => {
            // Afegim l'ID manualment si no ve del form, encara que updateContactAction ja el rep per paràmetre
            const res = await updateContactAction(contact.id, formData);
            
            if (res.success && res.data) {
                toast.success(t('toast.successTitle'), { description: t('toast.updateSuccess') });
                setContact(res.data);
                setIsEditing(false);
            } else {
                toast.error(t('toast.errorTitle'), { description: res.message });
            }
        });
    };

    const handleDelete = () => {
        startTransition(async () => {
            const res = await deleteContactAction(contact.id);
            
            if (res.success) {
                toast.success(t('toast.successTitle'), { description: t('toast.deleteSuccess') });
                router.push('/crm/contactes');
                router.refresh(); 
            } else {
                toast.error(t('toast.errorTitle'), { description: res.message });
            }
        });
    };

    const handleCancelEdit = () => {
        setContact(initialContact); // Revertim canvis
        setIsEditing(false);
        formRef.current?.reset();
    };

    return {
        contact,
        isEditing,
        setIsEditing,
        isPending,
        formRef,
        handleSaveChanges,
        handleDelete,
        handleCancelEdit,
    };
}