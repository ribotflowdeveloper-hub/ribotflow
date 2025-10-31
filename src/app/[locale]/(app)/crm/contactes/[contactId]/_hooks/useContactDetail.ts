"use client";

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { updateContactAction, deleteContactAction, type ContactDetail } from '../actions';
import { type useTranslations } from 'next-intl';

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

    // ❌ 1. ELIMINEM LA FUNCIÓ 'hydrateFormData' D'AQUÍ
    // const hydrateFormData = (formData: FormData) => { ... }

    const handleSaveChanges = (formData: FormData) => {
        
        // ❌ 2. ELIMINEM LA CRIDA A 'hydrateFormData'
        // hydrateFormData(formData); 

        startTransition(async () => {
            // Ara el FormData només s'enviarà quan 'DetailsTab' estigui
            // muntat, gràcies al 'type="button"' que hem afegit a 
            // 'ContactViewSwitcher'.
            const { data, error } = await updateContactAction(contact.id, formData);
            
            if (error) {
                console.error("Error updating contact:", error); // Mantenim això per al log
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