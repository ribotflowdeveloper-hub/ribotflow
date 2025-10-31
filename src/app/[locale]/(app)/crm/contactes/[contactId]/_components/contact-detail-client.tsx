"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { ca, es, enUS } from 'date-fns/locale';
import { type Database } from '@/types/supabase';
import { type ContactDetail } from '../actions';
import { useContactDetail } from '../_hooks/useContactDetail';
import { ContactDetailHeader } from './ContactDetailHeader';
import { CONTACT_STATUS_MAP } from '@/config/contacts';

// ✅ 1. Importem els nous components de layout
import { ContactSummaryDashboard, type RelatedData } from './tabs/ContactSummaryDashboard';
import { ContactViewSwitcher, type ContactViewKey } from './ContactViewSwitcher';

// ✅ 2. Importem el contingut que abans estava dins les pestanyes
import { ActivitiesTab } from './tabs/ActivitiesTab';
import { RelatedDataTable } from './tabs/RelatedDataTable';
import { DetailsTab } from './tabs/DetailsTab';

// ❌ Ja no necessitem ContactDetailTabs
// import { ContactDetailTabs } from './ContactDetailTabs';

// Tipus (ja no calen aquí, els importa 'RelatedData')
// type Quote = ...

interface ContactDetailClientProps {
    initialContact: ContactDetail;
    initialRelatedData: RelatedData;
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
    
    // ✅ 3. Estat per a la vista activa. Comencem per 'summary' (el nou dashboard)
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

    // Funció per obtenir el text de l'estat (necessària per a DetailsTab)
    const getStatusLabel = (statusCode?: string | null) => {
        if (!statusCode) return t('details.noData');
        const status = CONTACT_STATUS_MAP.find(s => s.code === statusCode);
        return status ? t(`contactStatuses.${status.key}`) : statusCode;
    };

    // ✅ 4. Efecte per forçar la vista de "Detalls" quan s'està editant
    useEffect(() => {
        if (isEditing) {
            setActiveView('details');
        }
    }, [isEditing]);

    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            // Permet scroll vertical a tota la pàgina de detall
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
                            // La clau és crucial per a l'animació.
                            // Si estem editant, la clau és 'edit', sinó, és la vista activa.
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
                                                { key: 'total_amount', label: t('quotes.table.total') }
                                            ]} 
                                            linkPath="/crm/quotes" 
                                            emptyMessage={t('quotes.empty')} 
                                        />
                                    )}
                                    {activeView === 'invoices' && (
                                        <RelatedDataTable 
                                            data={initialRelatedData.invoices} 
                                            columns={[
                                                { key: 'invoice_number', label: t('invoices.table.number') }, 
                                                { key: 'status', label: t('invoices.table.status') }, 
                                                { key: 'total_amount', label: t('invoices.table.total') }
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