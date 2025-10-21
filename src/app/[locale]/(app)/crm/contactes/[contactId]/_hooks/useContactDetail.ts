"use client";

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
// ✅ 1. Importem el tipus 'ContactDetail' a més de l'acció
import { updateContactAction, deleteContactAction, type ContactDetail } from '../actions';
import { type useTranslations } from 'next-intl';

type TFunction = ReturnType<typeof useTranslations<string>>;

/**
 * Hook per gestionar la lògica de la pàgina de detall d'un contacte.
 */
// ✅ 2. Canviem el tipus del paràmetre d'entrada a 'ContactDetail'.
export function useContactDetail(initialContact: ContactDetail, t: TFunction) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isEditing, setIsEditing] = useState(false);
    
    // ✅ 3. Assegurem que l'estat intern també sigui del tipus 'ContactDetail'.
    const [contact, setContact] = useState<ContactDetail>(initialContact);
    const formRef = useRef<HTMLFormElement>(null);

    const handleSaveChanges = (formData: FormData) => {
        startTransition(async () => {
            const { data, error } = await updateContactAction(contact.id, formData);
            if (error) {
                toast.error(t('toast.errorTitle'), { description: error.message });
            } else if (data) {
                toast.success(t('toast.successTitle'), { description: t('toast.updateSuccess') });

                // ✅ 4. L'actualització de l'estat ara és segura.
                // 'data' ja és del tipus 'ContactDetail', així que no cal fer 'as'.
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
        // ✅ 5. En cancel·lar, resetejem l'estat amb les dades inicials completes.
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