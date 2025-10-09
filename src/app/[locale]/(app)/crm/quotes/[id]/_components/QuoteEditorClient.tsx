"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Send, Trash2, Building } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Quote, Contact, Product, Opportunity } from '@/types/crm';
import type { TeamData } from '@/types/settings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from "@/components/ui/switch";

// Importem el hook que conté TOTA la lògica
import { useQuoteEditor } from '../_hooks/useQuoteEditor';

// Importem els sub-components de presentació
import { CompanyProfileDialog } from './CompanyProfileDialog';
import { QuoteMeta } from './QuoteMeta';
import { QuoteItems } from './QuoteItems';
import { QuoteTotals } from './QuoteTotals';
import { QuotePreview } from './QuotePreview';

interface QuoteEditorClientProps {
    initialQuote: Quote;
    contacts: Contact[];
    products: Product[];
    companyProfile: TeamData | null;
    initialOpportunities: Opportunity[];
    userId: string;
    locale: string;
}

export function QuoteEditorClient(props: QuoteEditorClientProps) {
    const router = useRouter();

    const {
        state,
        quote,
        onQuoteChange,
        onItemsChange,
        setCurrentTeamData,
        setIsDeleteDialogOpen,
        setIsProfileDialogOpen,
        subtotal, discountAmount, tax, total,
        handleSave, handleDelete, handleSend,
        isSaving, isSending,
        t
    } = useQuoteEditor(props);

    return (
        <>
            <CompanyProfileDialog
                open={state.isProfileDialogOpen}
                onOpenChange={setIsProfileDialogOpen}
                profile={state.currentTeamData}
                onProfileUpdate={setCurrentTeamData}
            />
            <AlertDialog open={state.isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('quoteEditor.deleteDialogTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('quoteEditor.deleteDialogDescription')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSaving}>Cancel·lar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={isSaving}>
                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Confirmar Eliminació
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="flex flex-col h-full">
                <header className="flex justify-between items-center mb-6 flex-shrink-0">
                    <Button variant="ghost" onClick={() => router.push('/crm/quotes')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />{t('quoteEditor.backButton')}
                    </Button>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setIsProfileDialogOpen(true)} title={t('quoteEditor.companyDataTooltip')}>
                            <Building className="w-4 h-4" />
                        </Button>
                        {quote.id !== 'new' &&
                            <Button variant="outline" size="icon" onClick={() => setIsDeleteDialogOpen(true)} title={t('quoteEditor.deleteTooltip')}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                        }
                        <Button onClick={handleSave} disabled={isSaving || isSending}>
                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {quote.id === 'new' ? t('quoteEditor.createButton') : t('quoteEditor.saveButton')}
                        </Button>
                        {quote.id !== 'new' && (
                            <Button onClick={handleSend} disabled={isSaving || isSending}>
                                {isSending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {state.sendingStatus === 'generating' && t('quoteEditor.generatingPDF')}
                                        {state.sendingStatus === 'uploading' && t('quoteEditor.uploadingFile')}
                                        {state.sendingStatus === 'sending' && t('quoteEditor.sending')}
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" />
                                        {quote.sent_at ? t('quoteEditor.resendButton') : t('quoteEditor.sendButton')}
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </header>

                {quote.sent_at && (
                    <div className="mb-4 p-2 text-center bg-green-100 text-green-800 rounded-md text-sm">
                        {t('quoteEditor.sentOn', { date: new Date(quote.sent_at).toLocaleDateString(props.locale, { day: '2-digit', month: 'long', year: 'numeric' }) })}
                    </div>
                )}

                <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0">
                    <section className="flex flex-col gap-4 overflow-y-auto pr-4">
                        <div className="glass-card p-4">
                            <QuoteMeta
                                contact_id={quote.contact_id}
                                quote_number={quote.quote_number}
                                issue_date={quote.issue_date}
                                expiry_date={quote.expiry_date ?? null}
                                onMetaChange={onQuoteChange}
                                contacts={props.contacts}
                            />
                        </div>

                        <div className="glass-card p-4">
                            <Label>{t('quoteEditor.clientOpportunitiesLabel')}</Label>
                            {state.contactOpportunities.length > 0 ? (
                                <Select
                                    value={quote.opportunity_id ? String(quote.opportunity_id) : ''}
                                    onValueChange={(value) => onQuoteChange('opportunity_id', value ? Number(value) : null)}
                                    disabled={!quote.contact_id}
                                >
                                    <SelectTrigger
                                        className="w-full text-foreground" // ✅ AFEGEIX "text-foreground" AQUÍ
                                    >
                                        <SelectValue placeholder="Selecciona una oportunitat" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {state.contactOpportunities.map(o => (
                                            // ✅ CORRECCIÓ CLAU: Convertim l'ID a string aquí
                                            <SelectItem key={o.id} value={String(o.id)}>
                                                {o.name} ({o.stage_name})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <p className="mt-2 text-sm text-muted-foreground">{t('quoteEditor.noOpenOpportunities')}</p>
                            )}
                        </div>

                        <div className="glass-card p-2">
                            <QuoteItems
                                items={quote.items || []}
                                onItemsChange={onItemsChange}
                                products={props.products}
                                userId={props.userId}
                            />
                            <QuoteTotals
                                subtotal={subtotal}
                                discount={quote.discount}
                                setDiscount={(d) => onQuoteChange('discount', d)}
                                discountAmount={discountAmount}
                                tax={tax}
                                total={total}
                                tax_percent={quote.tax_percent}
                                setTaxPercent={(p) => onQuoteChange('tax_percent', p)}
                            />
                        </div>

                        <Card>
                            <CardHeader><CardTitle>{t('options.title')}</CardTitle></CardHeader>
                            <CardContent>
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="show-quantity"
                                        checked={quote.show_quantity ?? true}
                                        onCheckedChange={(checked) => onQuoteChange('show_quantity', checked)}
                                    />
                                    <Label htmlFor="show-quantity">{t('options.showQuantitiesLabel')}</Label>
                                </div>
                                <p className="text-sm text-muted-foreground mt-2">{t('options.showQuantitiesDescription')}</p>
                            </CardContent>
                        </Card>

                        <div className="glass-card p-4">
                            <Label>Notes Addicionals</Label>
                            <Textarea
                                value={quote.notes ?? ''}
                                onChange={(e) => onQuoteChange('notes', e.target.value)}
                                className="mt-2 min-h-[220px]"
                            />
                        </div>
                    </section>

                    <aside id="quote-preview-for-pdf-wrapper" className="hidden lg:block glass-card p-4 overflow-y-auto">
                        <QuotePreview
                            quote={quote}
                            contacts={props.contacts}
                            companyProfile={state.currentTeamData}
                            subtotal={subtotal}
                            discountAmount={discountAmount}
                            tax={tax}
                            total={total}
                        />
                    </aside>
                </main>
            </div>
        </>
    );
}