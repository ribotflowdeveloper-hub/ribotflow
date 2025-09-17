"use client";

import React, { FC, ElementType } from 'react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { useTranslations, useLocale } from 'next-intl';
import { ca, es, enUS } from 'date-fns/locale';
import { type Contact, type Quote, type Opportunity, type Invoice, type Activity, CONTACT_STATUS_MAP } from '@/types/crm';
import { Briefcase, FileText, Receipt, Activity as ActivityIcon, Edit } from 'lucide-react';

// ====================================================================
// Sub-components interns per a aquest fitxer
// ====================================================================

/**
 * @summary Mostra una etiqueta d'estat acolorida. Reutilitzable per a pressupostos, oportunitats, etc.
 */
const StatusBadge: FC<{ status?: string | null }> = ({ status }) => {
    const t = useTranslations('ContactDetailPage.status');
    
    let colorClass = 'bg-muted text-muted-foreground';
    let text = status || t('notAvailable');

    switch (status?.toLowerCase()) {
        case 'draft':
            text = t('draft');
            colorClass = 'bg-yellow-500/10 text-yellow-500';
            break;
        case 'sent':
            text = t('sent');
            colorClass = 'bg-blue-500/10 text-blue-500';
            break;
        case 'accepted':
        case 'guanyat': // 'guanyat' per a Oportunitats
        case 'paid': // 'paid' per a Factures
            text = t('wonPaid');
            colorClass = 'bg-green-500/10 text-green-500';
            break;
        case 'declined':
        case 'perdut': // 'perdut' per a Oportunitats
            text = t('rejected');
            colorClass = 'bg-red-500/10 text-red-500';
            break;
        case 'negociació':
            text = t('negotiation');
            colorClass = 'bg-purple-500/10 text-purple-500';
            break;
        case 'overdue':
            text = t('overdue');
            colorClass = 'bg-orange-500/10 text-orange-500';
            break;
    }

    return <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${colorClass}`}>{text}</span>;
};

/**
 * @summary Un 'trigger' de pestanya que inclou una icona i un comptador de resultats.
 */
const TabTriggerWithCount: FC<{ value: string, icon: ElementType, count: number, label: string }> = ({ value, icon: Icon, count, label }) => (
    <TabsTrigger value={value} className="flex items-center gap-2 text-sm px-4">
        <Icon className="w-4 h-4" />
        <span className="font-semibold">{label}</span>
        {count > 0 && <span className="ml-1 px-2 py-0.5 text-xs font-bold rounded-full bg-primary/20 text-primary">{count}</span>}
    </TabsTrigger>
);


// ====================================================================
// Component Principal de les Pestanyes
// ====================================================================

interface TabsProps {
  contact: Contact;
  relatedData: {
    quotes: Quote[];
    opportunities: Opportunity[];
    invoices: Invoice[];
    activities: Activity[];
  };
  isEditing: boolean;
}

export function ContactDetailTabs({ contact, relatedData, isEditing }: TabsProps) {
    const t = useTranslations('ContactDetailPage');
    const locale = useLocale();
    const dateLocale = { ca, es, en: enUS }[locale] || ca;
    
    const getStatusLabel = (statusCode?: string) => {
        if (!statusCode) return t('details.noData');
        const status = CONTACT_STATUS_MAP.find(s => s.code === statusCode);
        return status ? t(`contactStatuses.${status.key}`) : statusCode;
    };

    return (
        <div className="glass-card p-2 mt-8">
            <Tabs defaultValue="activitats" className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
                    <TabTriggerWithCount value="activitats" icon={ActivityIcon} count={relatedData.activities.length} label={t('tabs.activities')} />
                    <TabTriggerWithCount value="oportunitats" icon={Briefcase} count={relatedData.opportunities.length} label={t('tabs.opportunities')} />
                    <TabTriggerWithCount value="pressupostos" icon={FileText} count={relatedData.quotes.length} label={t('tabs.quotes')} />
                    <TabTriggerWithCount value="factures" icon={Receipt} count={relatedData.invoices.length} label={t('tabs.invoices')} />
                    <TabsTrigger value="detalls"><Edit className="w-4 h-4 mr-2"/>{t('tabs.details')}</TabsTrigger>
                </TabsList>
                
                {/* Contingut de la Pestanya d'Activitats */}
                <TabsContent value="activitats" className="p-8">
                    <h3 className="text-2xl font-bold mb-6">{t('activities.title')}</h3>
                    <div className="space-y-4">
                        {relatedData.activities.length > 0 ? relatedData.activities.map(act => (
                            <div key={`act-${act.id}`} className="p-4 rounded-lg bg-background/50 border border-border">
                                <div className="flex justify-between items-center text-sm mb-2">
                                    <span className="font-bold text-primary">{act.type}</span>
                                    <span className="text-muted-foreground">{format(new Date(act.created_at), "d MMMM yyyy, HH:mm", { locale: dateLocale })}</span>
                                </div>
                                <p className="text-foreground italic">"{act.content}"</p>
                            </div>
                        )) : (
                            <p className="text-center text-muted-foreground py-8">{t('activities.empty')}</p>
                        )}
                    </div>
                </TabsContent>
                
                {/* Contingut de la Pestanya d'Oportunitats */}
                <TabsContent value="oportunitats" className="p-8">
                    <h3 className="text-2xl font-bold mb-6">{t('opportunities.title')}</h3>
                    <Table>
                        <TableHeader><TableRow><TableHead>{t('opportunities.table.name')}</TableHead><TableHead>{t('opportunities.table.status')}</TableHead><TableHead className="text-right">{t('opportunities.table.value')}</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {relatedData.opportunities.length > 0 ? relatedData.opportunities.map(opp => (
                                <TableRow key={`opp-${opp.id}`}>
                                    <TableCell><Link href={`/crm/pipeline`} className="font-medium text-primary hover:underline">{opp.name}</Link></TableCell>
                                    <TableCell><StatusBadge status={opp.stage_name} /></TableCell>
                                    <TableCell className="text-right font-semibold">€{(opp.value || 0).toLocaleString('ca-ES')}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={3} className="text-center h-24">{t('opportunities.empty')}</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TabsContent>
                
                {/* Contingut de la Pestanya de Pressupostos */}
                <TabsContent value="pressupostos" className="p-8">
                    <h3 className="text-2xl font-bold mb-6">{t('quotes.title')}</h3>
                    <Table>
                        <TableHeader><TableRow><TableHead>{t('quotes.table.number')}</TableHead><TableHead>{t('quotes.table.status')}</TableHead><TableHead className="text-right">{t('quotes.table.total')}</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {relatedData.quotes.length > 0 ? relatedData.quotes.map(quote => (
                                <TableRow key={`quote-${quote.id}`}>
                                    <TableCell><Link href={`/crm/quotes/${quote.id}`} className="font-medium text-primary hover:underline">{quote.quote_number}</Link></TableCell>
                                    <TableCell><StatusBadge status={quote.status} /></TableCell>
                                    <TableCell className="text-right font-semibold">€{(quote.total || 0).toLocaleString('ca-ES')}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={3} className="text-center h-24">{t('quotes.empty')}</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TabsContent>

                {/* Contingut de la Pestanya de Factures */}
                <TabsContent value="factures" className="p-8">
                    <h3 className="text-2xl font-bold mb-6">{t('invoices.title')}</h3>
                    <Table>
                        <TableHeader><TableRow><TableHead>{t('invoices.table.number')}</TableHead><TableHead>{t('invoices.table.status')}</TableHead><TableHead className="text-right">{t('invoices.table.total')}</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {relatedData.invoices.length > 0 ? relatedData.invoices.map(invoice => (
                                <TableRow key={`inv-${invoice.id}`}>
                                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                                    <TableCell><StatusBadge status={invoice.status} /></TableCell>
                                    <TableCell className="text-right font-semibold">€{(invoice.total || 0).toLocaleString('ca-ES')}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={3} className="text-center h-24">{t('invoices.empty')}</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TabsContent>
                
                {/* Contingut de la Pestanya de Detalls */}
                <TabsContent value="detalls" className="p-8 space-y-12">
                    {/* Secció d'informació general */}
                    <div>
                        <h3 className="text-2xl font-bold mb-6">{t('details.generalInfo')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-8">
                            <div className="space-y-2"><Label>{t('details.labels.email')}</Label>{isEditing ? (<Input name="email" type="email" defaultValue={contact.email || ''}/>) : (<p className="text-lg pt-2">{contact.email || t('details.noData')}</p>)}</div>
                            <div className="space-y-2"><Label>{t('details.labels.phone')}</Label>{isEditing ? (<Input name="telefon" defaultValue={contact.telefon || ''}/>) : (<p className="text-lg pt-2">{contact.telefon || t('details.noData')}</p>)}</div>
                            <div className="space-y-2"><Label>{t('details.labels.status')}</Label>{isEditing ? (
                                <Select name="estat" defaultValue={contact.estat || undefined}>
                                    <SelectTrigger className="text-lg h-auto p-2"><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        {CONTACT_STATUS_MAP.map(status => <SelectItem key={status.code} value={status.code}>{t(`contactStatuses.${status.key}`)}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <p className="text-lg pt-2">{getStatusLabel(contact.estat)}</p>
                            )}</div>
                            <div className="space-y-2"><Label>{t('details.labels.jobTitle')}</Label>{isEditing ? (<Input name="job_title" defaultValue={contact.job_title || ''}/>) : (<p className="text-lg pt-2">{contact.job_title || t('details.noData')}</p>)}</div>
                            <div className="space-y-2"><Label>{t('details.labels.industry')}</Label>{isEditing ? (<Input name="industry" defaultValue={contact.industry || ''}/>) : (<p className="text-lg pt-2">{contact.industry || t('details.noData')}</p>)}</div>
                            <div className="space-y-2"><Label>{t('details.labels.leadSource')}</Label>{isEditing ? (<Input name="lead_source" defaultValue={contact.lead_source || ''}/>) : (<p className="text-lg pt-2">{contact.lead_source || t('details.noData')}</p>)}</div>
                        </div>
                    </div>
                    {/* Secció d'informació personal */}
                    <div>
                        <h3 className="text-2xl font-bold mb-6">{t('details.personalInfo')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-8">
                                <div className="space-y-2"><Label>{t('details.labels.birthday')}</Label>{isEditing ? (<Input type="date" name="birthday" defaultValue={contact.birthday || ''}/>) : (<p className="text-lg pt-2">{contact.birthday ? format(new Date(contact.birthday), 'dd/MM/yyyy', { locale: dateLocale }) : t('details.noData')}</p>)}</div>
                                <div className="space-y-2"><Label>{t('details.labels.city')}</Label>{isEditing ? (<Input name="address.city" defaultValue={contact.address?.city || ''}/>) : (<p className="text-lg pt-2">{contact.address?.city || t('details.noData')}</p>)}</div>
                                <div className="space-y-2"><Label>{t('details.labels.linkedin')}</Label>{isEditing ? (<Input name="social_media.linkedin" defaultValue={contact.social_media?.linkedin || ''}/>) : (<p className="text-lg pt-2">{contact.social_media?.linkedin || t('details.noData')}</p>)}</div>
                                <div className="space-y-2"><Label>{t('details.labels.children')}</Label>{isEditing ? (<Input type="number" name="children_count" defaultValue={contact.children_count ?? ''} />) : (<p className="text-lg pt-2">{contact.children_count ?? t('details.noData')}</p>)}</div>
                                <div className="space-y-2"><Label>{t('details.labels.partnerName')}</Label>{isEditing ? (<Input name="partner_name" defaultValue={contact.partner_name || ''} />) : (<p className="text-lg pt-2">{contact.partner_name || t('details.noData')}</p>)}</div>
                                <div className="space-y-2"><Label>{t('details.labels.hobbies')}</Label>{isEditing ? (<Input name="hobbies" defaultValue={contact.hobbies?.join(', ') || ''} />) : (<p className="text-lg pt-2">{contact.hobbies?.join(', ') || t('details.noData')}</p>)}</div>
                        </div>
                    </div>
                    {/* Secció de notes */}
                    <div>
                        <h3 className="text-2xl font-bold mb-6">{t('details.notes')}</h3>
                        {isEditing ? (<Textarea name="notes" defaultValue={contact.notes || ''} rows={6}/>) : (<p className="text-base text-muted-foreground whitespace-pre-wrap">{contact.notes || t('details.noNotes')}</p>)}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}