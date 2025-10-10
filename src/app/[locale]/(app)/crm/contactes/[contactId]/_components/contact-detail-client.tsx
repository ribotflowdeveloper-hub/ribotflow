// @/app/[locale]/(app)/crm/contactes/[id]/_components/ContactDetailClient.tsx (Versió Final Refactoritzada)
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { type Contact, type Quote, type Opportunity, type Invoice, type Activity } from '@/types/crm';
import { useContactDetail } from '../_hooks/useContactDetail'; // ✅ 1. IMPORTA EL NOU HOOK
import { ContactDetailHeader } from './ContactDetailHeader'; // ✅ 2. IMPORTA EL NOU COMPONENT DE CAPÇALERA
import { ContactDetailTabs } from './ContactDetailTabs'; // El component de pestanyes que ja tenies

interface ContactDetailClientProps {
    initialContact: Contact;
    initialRelatedData: {
        quotes: Quote[];
        opportunities: Opportunity[];
        invoices: Invoice[];
        activities: Activity[];
    };
}

export function ContactDetailClient({ initialContact, initialRelatedData }: ContactDetailClientProps) {
    const t = useTranslations('ContactDetailPage');
    
    // ✅ 3. TOTA LA LÒGICA ESTÀ CENTRALITZADA AL HOOK
    const {
        contact,
        isEditing,
        isPending,
        formRef,
        handleSaveChanges,
        handleDelete,
        handleCancelEdit,
        setIsEditing,
    } = useContactDetail(initialContact, t);

    return (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-full">
            <form action={handleSaveChanges} ref={formRef} className="flex flex-col h-full">
                
                {/* ✅ 4. RENDERITZA EL COMPONENT DE CAPÇALERA, PASSANT-LI ELS PROPS NECESSARIS */}
                <ContactDetailHeader
                    contact={contact}
                    isEditing={isEditing}
                    isPending={isPending}
                    onEdit={() => setIsEditing(true)}
                    onCancel={handleCancelEdit}
                    onDelete={handleDelete}
                />
                
                {/* ✅ 5. RENDERITZA LES PESTANYES. LA LÒGICA INTERNA DE LES PESTANYES JA ESTÀ SEPARADA */}
                <ContactDetailTabs
                    contact={contact}
                    relatedData={initialRelatedData}
                    isEditing={isEditing}
                />

            </form>
        </motion.div>
    );
}