"use client";

import { useTranslations, useLocale } from 'next-intl';
import { ca, es, enUS } from 'date-fns/locale';
import { type Database } from '@/types/supabase';
import { CONTACT_STATUS_MAP } from '@/config/contacts';
// ✅ 1. Importem el tipus 'ContactDetail' des de la font original.
import { type ContactDetail } from '../actions';
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { Briefcase, FileText, Receipt, Activity as ActivityIcon, Edit } from 'lucide-react';

import { TabTriggerWithCount } from './shared/TabTriggerWithCount';
import { ActivitiesTab } from './tabs/ActivitiesTab';
import { RelatedDataTable } from './tabs/RelatedDataTable';
import { DetailsTab } from './tabs/DetailsTab';

// Definicions de tipus base (es queden igual)
type Quote = Database['public']['Tables']['quotes']['Row'];
type Opportunity = Database['public']['Tables']['opportunities']['Row'];
type Invoice = Database['public']['Tables']['invoices']['Row'];
type Activity = Database['public']['Tables']['activities']['Row'];

interface Props {
    // ✅ 2. Usem 'ContactDetail' directament. Això resol la discrepància.
    contact: ContactDetail;
    relatedData: { 
        quotes: Quote[]; 
        opportunities: Opportunity[]; 
        invoices: Invoice[]; 
        activities: Activity[]; 
    };
    isEditing: boolean;
}

export function ContactDetailTabs({ contact, relatedData, isEditing }: Props) {
    const t = useTranslations('ContactDetailPage');
    const locale = useLocale();
    const dateLocale = { ca, es, en: enUS }[locale] || ca;
    
    const getStatusLabel = (statusCode?: string | null) => {
        if (!statusCode) return t('details.noData');
        const status = CONTACT_STATUS_MAP.find(s => s.code === statusCode);
        return status ? t(`contactStatuses.${status.key}`) : statusCode;
    };

    return (
        <div className="glass-card p-4 md:p-6 mt-8">
            <Tabs defaultValue="activitats" className="w-full">
                <div className="overflow-x-auto -mx-4 px-4 pb-px">
                    <TabsList className="grid w-full sm:w-auto sm:grid-cols-5">
                        <TabTriggerWithCount value="activitats" icon={ActivityIcon} count={relatedData.activities.length} label={t('tabs.activities')} />
                        <TabTriggerWithCount value="oportunitats" icon={Briefcase} count={relatedData.opportunities.length} label={t('tabs.opportunities')} />
                        <TabTriggerWithCount value="pressupostos" icon={FileText} count={relatedData.quotes.length} label={t('tabs.quotes')} />
                        <TabTriggerWithCount value="factures" icon={Receipt} count={relatedData.invoices.length} label={t('tabs.invoices')} />
                        <TabTriggerWithCount value="detalls" icon={Edit} count={0} label={t('tabs.details')} />
                    </TabsList>
                </div>
                
                <TabsContent value="oportunitats" className="pt-6">
                    <h3 className="text-2xl font-bold mb-6">{t('opportunities.title')}</h3>
                    <RelatedDataTable data={relatedData.opportunities} columns={[{ key: 'name', label: t('opportunities.table.name') }, { key: 'stage', label: t('opportunities.table.status') }, { key: 'value', label: t('opportunities.table.value') }]} linkPath="/crm/pipeline" emptyMessage={t('opportunities.empty')} />
                </TabsContent>
                
                {/* ... la resta de TabsContent es queden igual ... */}
                <TabsContent value="activitats" className="pt-6">
                    <h3 className="text-2xl font-bold mb-6">{t('activities.title')}</h3>
                    <ActivitiesTab activities={relatedData.activities} dateLocale={dateLocale} emptyMessage={t('activities.empty')}/>
                </TabsContent>

                <TabsContent value="pressupostos" className="pt-6">
                    <h3 className="text-2xl font-bold mb-6">{t('quotes.title')}</h3>
                    <RelatedDataTable data={relatedData.quotes} columns={[{ key: 'quote_number', label: t('quotes.table.number') }, { key: 'status', label: t('quotes.table.status') }, { key: 'total_amount', label: t('quotes.table.total') }]} linkPath="/crm/quotes" emptyMessage={t('quotes.empty')} />
                </TabsContent>

                <TabsContent value="factures" className="pt-6">
                    <h3 className="text-2xl font-bold mb-6">{t('invoices.title')}</h3>
                    <RelatedDataTable data={relatedData.invoices} columns={[{ key: 'invoice_number', label: t('invoices.table.number') }, { key: 'status', label: t('invoices.table.status') }, { key: 'total_amount', label: t('invoices.table.total') }]} emptyMessage={t('invoices.empty')} />
                </TabsContent>

                <TabsContent value="detalls" className="pt-6">
                    {/* Ara 'contact' és del tipus correcte ('ContactDetail') que DetailsTab espera. */}
                    <DetailsTab contact={contact} isEditing={isEditing} dateLocale={dateLocale} getStatusLabel={getStatusLabel} />
                </TabsContent>
            </Tabs>
        </div>
    );
}