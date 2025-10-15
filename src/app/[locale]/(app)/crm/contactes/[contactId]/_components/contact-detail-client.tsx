// /app/[locale]/(app)/crm/contactes/[contactId]/_components/contact-detail-client.tsx (Correcte)
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { type Database } from '@/types/supabase';
import { useContactDetail } from '../_hooks/useContactDetail';
import { ContactDetailHeader } from './ContactDetailHeader';
import { ContactDetailTabs } from './ContactDetailTabs';

type Contact = Database['public']['Tables']['contacts']['Row'];
type Quote = Database['public']['Tables']['quotes']['Row'];
type Opportunity = Database['public']['Tables']['opportunities']['Row'];
type Invoice = Database['public']['Tables']['invoices']['Row'];
type Activity = Database['public']['Tables']['activities']['Row'];

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
                
                <ContactDetailTabs
                    contact={contact}
                    relatedData={initialRelatedData}
                    isEditing={isEditing}
                />

            </form>
        </motion.div>
    );
}