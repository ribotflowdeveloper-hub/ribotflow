// src/app/[locale]/(app)/crm/contactes/[contactId]/_components/contact-detail-client.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { ca, es, enUS } from 'date-fns/locale';
import { useContactDetail } from '../_hooks/useContactDetail';
import { ContactDetailHeader } from './ContactDetailHeader';
import { CONTACT_STATUS_MAP } from '@/config/contacts';

// ✅ 1. Importem els tipus DIRECTAMENT des del SERVEI
import type { ContactDetail, ContactRelatedData } from '@/lib/services/crm/contacts/contacts.service';

// ✅ 2. Importem els components de layout
import { ContactSummaryDashboard } from './tabs/ContactSummaryDashboard';
import { ContactViewSwitcher, type ContactViewKey } from './ContactViewSwitcher';

// ✅ 3. Importem el contingut que abans estava dins les pestanyes
import { ActivitiesTab } from './tabs/ActivitiesTab';
import { RelatedDataTable } from './tabs/RelatedDataTable';
import { DetailsTab } from './tabs/DetailsTab';

interface ContactDetailClientProps {
    initialContact: ContactDetail;
    // ✅ 4. Corregim el nom del tipus (coincidint amb el Server Component)
    initialRelatedData: ContactRelatedData;
}

// Definim les animacions per al canvi de vista
const viewVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

export function ContactDetailClient({ initialContact, initialRelatedData }: ContactDetailClientProps) {
    const t = useTranslations('ContactDetailPage');
    const locale = useLocale();
    const dateLocale = { ca, es, en: enUS }[locale] || ca;
    
    const [activeView, setActiveView] = useState<ContactViewKey>('summary');

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

    const getStatusLabel = (statusCode?: string | null) => {
        if (!statusCode) return t('details.noData');
        const status = CONTACT_STATUS_MAP.find(s => s.code === statusCode);
        return status ? t(`contactStatuses.${status.key}`) : statusCode;
    };

    useEffect(() => {
        if (isEditing) {
            setActiveView('details');
        }
    }, [isEditing]);

    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="flex flex-col h-full overflow-y-auto"
        >
            <form action={handleSaveChanges} ref={formRef} className="flex flex-col h-full">
                
                {/* 1. CAPÇALERA (Sticky) */}
                <ContactDetailHeader
                    contact={contact}
                    isEditing={isEditing}
                    isPending={isPending}
                    onEdit={() => setIsEditing(true)}
                    onCancel={handleCancelEdit}
                    onDelete={handleDelete}
                />

                {/* 2. NAVEGACIÓ DE MÒDULS (El nou Switcher) */}
                <ContactViewSwitcher
                    relatedData={initialRelatedData}
                    activeView={activeView}
                    onViewChange={setActiveView}
                    disabled={isEditing} // Deshabilitem el selector mentre s'edita
                />

                {/* 3. CONTINGUT ANIMAT */}
                <div className="p-4 md:px-6 flex-1">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={isEditing ? 'edit' : activeView}
                            variants={viewVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            {/* Cas especial: Mode Edició */}
                            {isEditing ? (
                                <DetailsTab 
                                    contact={contact} 
                                    isEditing={true} 
                                    dateLocale={dateLocale} 
                                    getStatusLabel={getStatusLabel} 
                                />
                            ) : (
                                <>
                                    {/* Vistes normals (Mode Visualització) */}
                                    {activeView === 'summary' && (
                                        <ContactSummaryDashboard
                                            relatedData={initialRelatedData}
                                        />
                                    )}
                                    {activeView === 'activities' && (
                                        <ActivitiesTab 
                                            activities={initialRelatedData.activities} 
                                            dateLocale={dateLocale} 
                                            emptyMessage={t('activities.empty')}
                                        />
                                    )}
                                    {activeView === 'opportunities' && (
                                        <RelatedDataTable 
                                            data={initialRelatedData.opportunities} 
                                            columns={[
                                                { key: 'name', label: t('opportunities.table.name') }, 
                                                { key: 'stage', label: t('opportunities.table.status') }, 
                                                { key: 'value', label: t('opportunities.table.value') }
                                            ]} 
                                            linkPath="/crm/pipeline" 
                                            emptyMessage={t('opportunities.empty')} 
                                        />
                                    )}
                                    {activeView === 'quotes' && (
                                        <RelatedDataTable 
                                            data={initialRelatedData.quotes} 
                                            columns={[
                                                { key: 'quote_number', label: t('quotes.table.number') }, 
                                                { key: 'status', label: t('quotes.table.status') }, 
                                                { key: 'total_amount', label: t('quotes.table.total') } // Assegura't que 'total_amount' existeix
                                            ]} 
                                            linkPath="/finances/quotes" 
                                            emptyMessage={t('quotes.empty')} 
                                        />
                                    )}
                                    {activeView === 'invoices' && (
                                        <RelatedDataTable 
                                            data={initialRelatedData.invoices} 
                                            columns={[
                                                { key: 'invoice_number', label: t('invoices.table.number') }, 
                                                { key: 'status', label: t('invoices.table.status') }, 
                                                { key: 'total_amount', label: t('invoices.table.total') } // Assegura't que 'total_amount' existeix
                                            ]} 
                                            emptyMessage={t('invoices.empty')} 
                                        />
                                    )}
                                    {activeView === 'details' && (
                                        <DetailsTab 
                                            contact={contact} 
                                            isEditing={false} // Mode vista
                                            dateLocale={dateLocale} 
                                            getStatusLabel={getStatusLabel} 
                                        />
                                    )}
                                </>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </form>
        </motion.div>
    );
}