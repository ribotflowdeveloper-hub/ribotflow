// src/app/[locale]/(app)/crm/contactes/[contactId]/_components/contact-detail-client.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { ca, es, enUS } from 'date-fns/locale';
import { CONTACT_STATUS_MAP } from '@/config/contacts';

import type { ContactDetail, ContactRelatedData } from '@/lib/services/crm/contacts/contacts.service';
import { useContactDetail } from '../_hooks/useContactDetail';

// Components
import { ContactDetailHeader } from './ContactDetailHeader';
import { ContactViewSwitcher, type ContactViewKey } from './ContactViewSwitcher';
import { ContactSummaryDashboard } from './tabs/ContactSummaryDashboard';
import { DetailsTab } from './tabs/DetailsTab';
import { ActivitiesTab } from './tabs/ActivitiesTab';
import { RelatedDataTable } from './tabs/RelatedDataTable';
import type { RelatedDataKey } from './ContactViewSwitcher'; // Importa el tipus restringit

interface ContactDetailClientProps {
    initialContact: ContactDetail;
    initialRelatedData: ContactRelatedData;
}

const viewVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.1 } },
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
    } = useContactDetail(initialContact);

    // Si entrem en mode edició, forcem la vista de detalls
    useEffect(() => {
        if (isEditing) setActiveView('details');
    }, [isEditing]);

    const getStatusLabel = (statusCode?: string | null) => {
        if (!statusCode) return t('details.noData');
        const status = CONTACT_STATUS_MAP.find(s => s.code === statusCode);
        return status ? t(`contactStatuses.${status.key}`) : statusCode;
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-full overflow-hidden" // Evitem scroll doble
        >
            {/* IMPORTANT: El form engloba Header i Content */}
            <form action={handleSaveChanges} ref={formRef} className="flex flex-col h-full">

                {/* HEADER (Sticky i fix) */}
                <div className="flex-shrink-0">
                    <ContactDetailHeader
                        contact={contact}
                        isEditing={isEditing}
                        isPending={isPending}
                        onEdit={() => setIsEditing(true)}
                        onCancel={handleCancelEdit}
                        onDelete={handleDelete}
                    />

                    <ContactViewSwitcher
                        relatedData={initialRelatedData}
                        activeView={activeView}
                        onViewChange={setActiveView}
                        disabled={isEditing}
                    />
                </div>

                {/* CONTINGUT (Scrollable) */}
                <div className="flex-1 overflow-y-auto bg-muted/10 p-4 md:p-6">
                    <div className="max-w-7xl mx-auto">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={isEditing ? 'editing-mode' : activeView}
                                variants={viewVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                            >
                                {isEditing ? (
                                    <DetailsTab
                                        contact={contact}
                                        isEditing={true}
                                        dateLocale={dateLocale}
                                        getStatusLabel={getStatusLabel}
                                    />
                                ) : (
                                    <>
                                        {activeView === 'summary' && (
                                            <ContactSummaryDashboard relatedData={initialRelatedData} />
                                        )}
                                        {activeView === 'details' && (
                                            <DetailsTab
                                                contact={contact}
                                                isEditing={false}
                                                dateLocale={dateLocale}
                                                getStatusLabel={getStatusLabel}
                                            />
                                        )}
                                        {activeView === 'activities' && (
                                            <ActivitiesTab
                                                activities={initialRelatedData.activities}
                                                dateLocale={dateLocale}
                                                emptyMessage={t('activities.empty')}
                                            />
                                        )}
                                        {/* Bloc de renderització condicional */}
                                        {/* Comprovem si la vista activa és una de les taules */}
                                        {['opportunities', 'quotes', 'invoices'].includes(activeView) && (
                                            <RelatedDataTable
                                                // 1. Fem càsting: "TypeScript, confia en mi, ja he fet l'if a dalt"
                                                type={activeView as RelatedDataKey}

                                                // 2. Passem les dades. Com que 'activeView' és dinàmic,
                                                // accedim a initialRelatedData amb clau dinàmica.
                                                // Utilitzem el tipus adequat en lloc de 'any'
                                                data={initialRelatedData[activeView as RelatedDataKey]}
                                            />
                                        )}
                                    </>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </form>
        </motion.div>
    );
}