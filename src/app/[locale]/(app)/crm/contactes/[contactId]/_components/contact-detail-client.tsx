"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { type Database } from '@/types/supabase';
// ✅ Importa ContactDetail
import { type ContactDetail } from '../actions';
import { useContactDetail } from '../_hooks/useContactDetail';
import { ContactDetailHeader } from './ContactDetailHeader';
import { ContactDetailTabs } from './ContactDetailTabs';

// Tipus base per a dades relacionades
type Quote = Database['public']['Tables']['quotes']['Row'];
type Opportunity = Database['public']['Tables']['opportunities']['Row'];
type Invoice = Database['public']['Tables']['invoices']['Row'];
type Activity = Database['public']['Tables']['activities']['Row'];

interface ContactDetailClientProps {
    // ✅ Accepta ContactDetail
    initialContact: ContactDetail;
    initialRelatedData: {
        quotes: Quote[];
        opportunities: Opportunity[];
        invoices: Invoice[];
        activities: Activity[];
    };
}

export function ContactDetailClient({ initialContact, initialRelatedData }: ContactDetailClientProps) {
    const t = useTranslations('ContactDetailPage');

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
                <ContactDetailHeader
                    contact={contact}
                    isEditing={isEditing}
                    isPending={isPending}
                    onEdit={() => setIsEditing(true)}
                    onCancel={handleCancelEdit}
                    onDelete={handleDelete}
                />
                {/* ContactDetailTabs rep 'contact' que prové de l'estat del hook, inicialitzat amb initialContact */}
                <ContactDetailTabs
                    contact={contact}
                    relatedData={initialRelatedData}
                    isEditing={isEditing}
                />
            </form>
        </motion.div>
    );
}