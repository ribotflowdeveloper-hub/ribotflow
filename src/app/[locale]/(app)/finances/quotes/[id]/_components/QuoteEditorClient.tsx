// /app/[locale]/(app)/crm/quotes/[id]/_components/QuoteEditorClient.tsx (Refactoritzat per al Disseny)
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Send, Trash2, Building, Download } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from "@/components/ui/switch";
import { type Database } from '@/types/supabase';
import { useQuoteEditor, type EditableQuote } from '../_hooks/useQuoteEditor';
import { CompanyProfileDialog } from './CompanyProfileDialog';
import { QuoteMeta } from './QuoteMeta';
import { QuoteItems } from './QuoteItems';
import { QuoteTotals } from './QuoteTotals';
import { QuotePreview } from './QuotePreview';
import { Separator } from '@/components/ui/separator'; // Importem el separador
import { QuoteDownloadButton } from './PDF/QuoteDownloadButton'; // Importem el botó de descàrrega


// --- Tipus Derivats de la Base de Dades ---
type Contact = Database['public']['Tables']['contacts']['Row'];
type Product = Database['public']['Tables']['products']['Row'];
type Opportunity = Database['public']['Tables']['opportunities']['Row'];
type Team = Database['public']['Tables']['teams']['Row'];

interface QuoteEditorClientProps {
    initialQuote: EditableQuote;
    contacts: Contact[];
    products: Product[];
    companyProfile: Team | null;
    initialOpportunities: Opportunity[];
    userId: string;
    locale: string;
}

export function QuoteEditorClient(props: QuoteEditorClientProps) { // ❌ 'pdfUrl' eliminat de les props    

    const router = useRouter();

    const {
        state,
        quote,
        onQuoteChange,
        onItemsChange,
        setCurrentTeamData,
        setIsDeleteDialogOpen,
        setIsProfileDialogOpen,
        subtotal, tax_amount, total_amount, discountAmount, // 👈 Aquest és el VALOR (€) calculat
        handleSave, handleDelete, handleSend,
        isSaving, isSending,
        t
    } = useQuoteEditor(props); // Passem la resta de props al hook

    // Funció per a la navegació enrere
    const handleBack = () => router.push(`/${props.locale}/finances/quotes`);

    // -------------------------------------------------------------
    // Funció de Renderitzat per a l'Estat d'Enviament (Card)
    // -------------------------------------------------------------
    const SentStatusCard = () => {
        if (!quote.sent_at) return null;

        const sentDate = new Date(quote.sent_at).toLocaleDateString(props.locale, {
            day: '2-digit',
            month: 'short', // 'short' per a estalviar espai a la capçalera
            year: 'numeric'
        });

        return (
            <div
                // ✅ Ús de fons 'success' per indicar estat positiu, amb text negre.
                className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm font-medium whitespace-nowrap"
            >
                {t('quoteEditor.sentOn', { date: sentDate })}
            </div>
        );
    };

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
                {/* ------------------------------------------------------------- */}
                {/* ✅ NOVA CAPÇALERA RESPONSIVE PER A MÒBIL I ESCRIPTORI */}
                {/* ------------------------------------------------------------- */}
                <header className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6 flex-shrink-0">
                    {/* Esquerra: botó enrere + estat */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" onClick={handleBack} className="flex-shrink-0 bg-card">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            {t('quoteEditor.backButton')}
                        </Button>
                        <SentStatusCard />
                    </div>

                    {/* Dreta: accions */}
                    <div className="flex flex-wrap justify-start sm:justify-end items-center gap-2 w-full sm:w-auto">
                        {/* ✅✅✅ CORRECCIÓ FASE 1: 'QuoteDownloadButton' ✅✅✅ */}
                        {/* Passem els noms de props correctes al botó de descàrrega. */}
                        {/* Nota: El component 'QuoteDownloadButton' també s'ha d'actualitzar internament! */}
                        {typeof quote.id === 'number' ? (
                            <QuoteDownloadButton
                                quote={quote} // Passa el pressupost sencer (conté tax_rate)
                                company={state.currentTeamData}
                                contact={props.contacts.find(c => c.id === quote.contact_id) || null}
                                totals={{
                                    subtotal: subtotal,
                                    discount_amount: quote.discount_amount || 0, // Passem el valor fix
                                    tax_amount: tax_amount,
                                    total_amount: total_amount
                                }}
                                t={t}
                            />
                        ) : (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span>
                                            <Button variant="outline" size="icon" disabled>
                                                <Download className="h-4 w-4" />
                                            </Button>
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{t('quoteEditor.pdfNotAvailableYet')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}

                        {/* Dades empresa */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsProfileDialogOpen(true)}
                            title={t('quoteEditor.companyDataTooltip')}
                        >
                            <Building className="w-4 h-4" />
                        </Button>

                        {/* Eliminar (si no és nou) */}
                        {quote.id !== 'new' && (
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setIsDeleteDialogOpen(true)}
                                title={t('quoteEditor.deleteTooltip')}
                                className='bg-card'
                            >
                                <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                        )}

                        {/* Guardar */}
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || isSending}
                            className="min-w-[110px] w-full sm:w-auto"
                        >
                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {quote.id === 'new'
                                ? t('quoteEditor.createButton')
                                : t('quoteEditor.saveButton')}
                        </Button>

                        {/* Enviar */}
                        {quote.id !== 'new' && (
                            <Button
                                onClick={handleSend}
                                disabled={isSaving || isSending}
                                className="min-w-[120px] w-full sm:w-auto"
                            >
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
                                        {quote.sent_at
                                            ? t('quoteEditor.resendButton')
                                            : t('quoteEditor.sendButton')}
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </header>

                {/* ❌ Eliminem l'anterior div de sent_at, ja no és necessari */}

                <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0">
                    <section className="flex flex-col gap-4 overflow-y-auto pr-4">

                        {/* ------------------------------------------------------------- */}
                        {/* ✅ Ús de Card per sortir del fons gris ('glass-card' a 'Card') */}
                        {/* ------------------------------------------------------------- */}
                        <Card className="p-4">
                            <QuoteMeta
                                contact_id={quote.contact_id !== null && quote.contact_id !== undefined ? String(quote.contact_id) : null}
                                quote_number={quote.quote_number}
                                issue_date={quote.issue_date}
                                expiry_date={quote.expiry_date ?? null}
                                onMetaChange={onQuoteChange}
                                contacts={props.contacts}
                            />
                        </Card>

                        <Card className="p-4">
                            <Label>{t('quoteEditor.clientOpportunitiesLabel')}</Label>
                            {state.contactOpportunities.length > 0 ? (
                                <Select
                                    value={quote.opportunity_id ? String(quote.opportunity_id) : ''}
                                    onValueChange={(value) => onQuoteChange('opportunity_id', value ? Number(value) : null)}
                                    disabled={!quote.contact_id}
                                >
                                    <SelectTrigger className="w-full text-foreground">
                                        <SelectValue placeholder="Selecciona una oportunitat" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {state.contactOpportunities.map(o => (
                                            <SelectItem key={o.id} value={String(o.id)}>
                                                {o.name} ({o.stage_name})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <p className="mt-2 text-sm text-muted-foreground">{t('quoteEditor.noOpenOpportunities')}</p>
                            )}
                        </Card>

                        <Card className="p-2">
                            <QuoteItems
                                items={quote.items || []}
                                onItemsChange={onItemsChange}
                                products={props.products}
                                userId={props.userId}
                            />
                            <Separator className="my-4" />
                            {/* ✅✅✅ CORRECCIÓ FASE 1: 'QuoteTotals' Props ✅✅✅ */}
                            {/* Passem les props correctes que espera el component 'QuoteTotals' refactoritzat. */}
                            <QuoteTotals
                                // Valors calculats
                                subtotal={subtotal}
                                discountAmountCalculated={discountAmount} // El valor en €
                                tax_amount={tax_amount}
                                total_amount={total_amount}

                                // Valors dels inputs (per mantenir la lògica de %)
                                discount_percent_input={quote.discount_percent_input ?? null}
                                tax_percent_input={quote.tax_percent_input ?? null}

                                // Setter
                                onQuoteChange={onQuoteChange}
                            />
                        </Card>

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

                        <Card className="p-4">
                            <Label>Notes Addicionals</Label>
                            <Textarea
                                value={quote.notes ?? ''}
                                onChange={(e) => onQuoteChange('notes', e.target.value)}
                                className="mt-2 min-h-[220px]"
                            />
                        </Card>
                    </section>

                    <aside id="quote-preview-for-pdf-wrapper" className="hidden lg:block glass-card p-4 overflow-y-auto">
                        {/* ✅ 3. PASSANT LES PROPS CORRECTES A QUOTEPREVIEW */}
                        <QuotePreview
                            quote={quote} // Passa el pressupost (conté _percent_input)
                            contacts={props.contacts}
                            companyProfile={state.currentTeamData}
                            // Valors calculats
                            subtotal={subtotal}
                            discount_amount={discountAmount} // Valor en €
                            tax_amount={tax_amount} // Valor en €
                            total_amount={total_amount} // Valor en €
                        />
                    </aside>
                </main>
            </div>
        </>
    );
}