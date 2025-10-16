// /app/[locale]/(app)/crm/quotes/[id]/_components/QuoteEditorClient.tsx (Refactoritzat per al Disseny)
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Send, Trash2, Building } from 'lucide-react';
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
    
    // Funció per a la navegació enrere
    const handleBack = () => router.push(`/${props.locale}/crm/quotes`);

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
                {/* ✅ NOU DISSENY DE LA CAPÇALERA AMB L'ESTAT A L'ESQUERRA */}
                {/* ------------------------------------------------------------- */}
                <header className="flex justify-between items-center mb-6 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" onClick={handleBack}> 
                            <ArrowLeft className="w-4 h-4 mr-2" />{t('quoteEditor.backButton')}
                        </Button>
                        <SentStatusCard /> {/* ✅ Estat d'enviament al costat del botó de tornada */}
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setIsProfileDialogOpen(true)} title={t('quoteEditor.companyDataTooltip')}>
                            <Building className="w-4 h-4" />
                        </Button>
                        {quote.id !== 'new' &&
                            <Button variant="outline" size="icon" onClick={() => setIsDeleteDialogOpen(true)} title={t('quoteEditor.deleteTooltip')}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                        }
                        <Button onClick={handleSave} disabled={isSaving || isSending} className="min-w-[100px]">
                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {quote.id === 'new' ? t('quoteEditor.createButton') : t('quoteEditor.saveButton')}
                        </Button>
                        {quote.id !== 'new' && (
                            <Button onClick={handleSend} disabled={isSaving || isSending} className="min-w-[120px]">
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