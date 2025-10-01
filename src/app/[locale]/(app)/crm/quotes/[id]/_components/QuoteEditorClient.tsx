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

// Importem el nostre hook personalitzat, que ara conté tota la lògica
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
}

export function QuoteEditorClient(props: QuoteEditorClientProps) {
    const router = useRouter();

    // Tota la lògica complexa (estats, handlers, càlculs) ara ve d'aquest hook.
    const {
        quote, setQuote,
        currentTeamData, setCurrentTeamData,
        contactOpportunities,
        isDeleteDialogOpen, setIsDeleteDialogOpen,
        isProfileDialogOpen, setIsProfileDialogOpen,
        isSaving, isSending, sendingStatus,
        subtotal, discountAmount, tax, total,
        handleSave, handleDelete, handleSend, handleAddNewItem,
        t, locale
    } = useQuoteEditor(props);

    return (
        <>
            <CompanyProfileDialog
                open={isProfileDialogOpen}
                onOpenChange={setIsProfileDialogOpen}
                profile={currentTeamData}
                onProfileUpdate={setCurrentTeamData}
            />
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            {quote.id === 'new' ? t('quoteEditor.createButton') : t('quoteEditor.saveButton')}
                        </Button>
                        {quote.id !== 'new' && (
                            <Button onClick={handleSend} disabled={isSaving || isSending}>
                                {isSending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {sendingStatus === 'generating' && t('quoteEditor.generatingPDF')}
                                        {sendingStatus === 'uploading' && t('quoteEditor.uploadingFile')}
                                        {sendingStatus === 'sending' && t('quoteEditor.sending')}
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
                        {t('quoteEditor.sentOn', { date: new Date(quote.sent_at).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' }) })}
                    </div>
                )}

                <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0">
                    <section className="flex flex-col gap-4 overflow-y-auto pr-4">
                        <div className="glass-card p-4">
                            <QuoteMeta
                                quote={quote}
                                setQuote={setQuote}
                                contacts={props.contacts}
                            />
                        </div>

                        <div className="glass-card p-4">
                            <Label>{t('quoteEditor.clientOpportunitiesLabel')}</Label>
                            {contactOpportunities.length > 0 ? (
                                <Select
                                    value={quote.opportunity_id || ''}
                                    onValueChange={(value) => setQuote(q => ({ ...q, opportunity_id: value || null }))}
                                    disabled={!quote.contact_id}
                                >
                                    <SelectTrigger className="mt-2 w-full">
                                        <SelectValue placeholder={t('quoteEditor.noOpportunityAssociated')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {contactOpportunities.map(o => (
                                            <SelectItem key={o.id} value={o.id}>
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
                                items={quote.items}
                                setItems={(newItems) => setQuote(q => ({ ...q, items: newItems }))}
                                products={props.products}
                                onAddNewItem={handleAddNewItem}
                                userId={props.userId}
                            />
                            <QuoteTotals
                                subtotal={subtotal}
                                discount={quote.discount}
                                setDiscount={(d) => setQuote(q => ({ ...q, discount: d }))}
                                discountAmount={discountAmount}
                                tax={tax}
                                total={total}
                                // ✅ Connectem el nou camp d'IVA
                                tax_percent={quote.tax_percent}
                                setTaxPercent={(p) => setQuote(q => ({ ...q, tax_percent: p }))}
                            />
                        </div>

                        <div className="glass-card p-4">
                            <Label>Notes Addicionals</Label>
                            <Textarea
                                value={quote.notes ?? ''}
                                onChange={(e) => setQuote(q => ({ ...q, notes: e.target.value }))}
                                className="mt-2"
                            />
                        </div>
                    </section>

                    <aside className="hidden lg:block glass-card p-4 overflow-y-auto">
                        <div id="quote-preview-for-pdf">
                            <QuotePreview
                                quote={quote}
                                contacts={props.contacts}
                                companyProfile={currentTeamData}
                                subtotal={subtotal}
                                discountAmount={discountAmount}
                                tax={tax}
                                total={total}

                            />
                        </div>
                    </aside>
                </main>
            </div>
        </>
    );
}