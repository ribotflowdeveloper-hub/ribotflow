// Ruta del fitxer: src/app/(app)/crm/quotes/[id]/_components/QuoteEditorClient.tsx
"use client";

import React, { useState, useMemo, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Send, Trash2, Building } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { createClient } from '@/lib/supabase/client';

import { saveQuoteAction, deleteQuoteAction, sendQuoteAction } from '../actions';
import type { Quote, Contact, Product, CompanyProfile, Opportunity, QuoteItem } from '../page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { CompanyProfileDialog } from './CompanyProfileDialog';
import { QuoteMeta } from './QuoteMeta';
import { QuoteItems } from './QuoteItems';
import { QuoteTotals } from './QuoteTotals';
import { QuotePreview } from './QuotePreview';

export function QuoteEditorClient({ initialQuote, contacts, products, companyProfile, initialOpportunities }: {
  initialQuote: Quote;
  contacts: Contact[];
  products: Product[];
  companyProfile: CompanyProfile;
  initialOpportunities: Opportunity[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  
  const [quote, setQuote] = useState<Quote>(initialQuote);
  const [currentCompanyProfile, setCurrentCompanyProfile] = useState<CompanyProfile>(companyProfile);
  const [contactOpportunities, setContactOpportunities] = useState<Opportunity[]>(initialOpportunities);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isSaving, startSaveTransition] = useTransition();
  const [isSending, startSendTransition] = useTransition();
  const [sendingStatus, setSendingStatus] = useState<'idle' | 'generating' | 'uploading' | 'sending'>('idle');

  const { subtotal, discountAmount, tax, total } = useMemo(() => {
    if (!quote?.items) return { subtotal: 0, discountAmount: 0, tax: 0, total: 0 };
    const sub = quote.items.reduce((acc, item) => acc + (item.quantity || 0) * (item.unit_price || 0), 0);
    const calculatedDiscountAmount = sub * ((quote.discount || 0) / 100);
    const subAfterDiscount = sub - calculatedDiscountAmount;
    const taxAmount = subAfterDiscount * 0.21;
    return { subtotal: sub, discountAmount: calculatedDiscountAmount, tax: taxAmount, total: subAfterDiscount + taxAmount };
  }, [quote?.items, quote?.discount]);
  
  const handleSave = () => {
    startSaveTransition(async () => {
      const result = await saveQuoteAction({ ...quote, subtotal, tax, total });
      if (result.success) {
        toast({ title: 'Èxit!', description: result.message });
        if (quote.id === 'new' && result.newId) {
          router.replace(`/crm/quotes/${result.newId}`);
        } else {
          router.refresh(); 
        }
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    });
  };

  const handleDelete = () => {
    startSaveTransition(async () => {
        await deleteQuoteAction(quote.id);
    });
  };
  
  // ✅ LÒGICA D'ENVIAMENT COMPLETA
  const handleSend = () => {
    if (quote.id === 'new') {
        toast({ variant: 'destructive', title: "Acció no permesa", description: "Desa el pressupost abans d'enviar-lo." });
        return;
    }

    startSendTransition(async () => {
        try {
            setSendingStatus('generating');
            toast({ title: "Preparant enviament...", description: "Generant el PDF del pressupost." });
            
            const quotePreviewElement = document.getElementById('quote-preview-for-pdf');
            if (!quotePreviewElement) throw new Error("No s'ha trobat l'element de previsualització.");

            const canvas = await html2canvas(quotePreviewElement, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            const pdfBlob = pdf.output('blob');

            setSendingStatus('uploading');
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuari no trobat per a la pujada de l'arxiu.");
            
            const filePath = `${user.id}/${quote.id}.pdf`;
            const { error: uploadError } = await supabase.storage.from('quotes').upload(filePath, pdfBlob, { upsert: true });
            if (uploadError) throw uploadError;

            setSendingStatus('sending');
            const result = await sendQuoteAction(quote.id);
            if (!result.success) throw new Error(result.message);
            
            setQuote(q => ({ ...q, status: 'Sent', sent_at: new Date().toISOString() }));
            toast({ variant: "default", title: "Èxit!", description: result.message, className: "bg-green-500 text-white" });

        } catch (error: any) {
            toast({ variant: "destructive", title: "Error en l'enviament", description: error.message });
        } finally {
            setSendingStatus('idle');
        }
    });
  };

  useEffect(() => {
    const fetchOpportunities = async () => {
        if (!quote.contact_id) {
            setContactOpportunities([]);
            return;
        }
        const { data } = await supabase.from('opportunities').select('*').eq('contact_id', quote.contact_id);
        setContactOpportunities(data || []);
    };
    fetchOpportunities();
  }, [quote.contact_id, supabase]);

  return (
    <>
      <CompanyProfileDialog 
        open={isProfileDialogOpen} 
        onOpenChange={setIsProfileDialogOpen} 
        profile={currentCompanyProfile} 
        onProfileUpdate={setCurrentCompanyProfile} 
      />
      <div className="flex flex-col h-full">
        <header className="flex justify-between items-center mb-6 flex-shrink-0">
          <Button variant="ghost" onClick={() => router.push('/crm/quotes')}><ArrowLeft className="w-4 h-4 mr-2" />Tornar</Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setIsProfileDialogOpen(true)} title="Dades de l'empresa"><Building className="w-4 h-4" /></Button>
            {quote.id !== 'new' && <Button variant="outline" size="icon" onClick={() => setIsDeleteDialogOpen(true)} title="Esborrar"><Trash2 className="w-4 h-4 text-destructive" /></Button>}
            <Button onClick={handleSave} disabled={isSaving || isSending}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {quote.id === 'new' ? 'Crear Pressupost' : 'Desar Canvis'}
            </Button>
            {quote.id !== 'new' && (
              <Button onClick={handleSend} disabled={isSaving || isSending}>
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {sendingStatus === 'generating' && 'Generant PDF...'}
                    {sendingStatus === 'uploading' && 'Pujant arxiu...'}
                    {sendingStatus === 'sending' && 'Enviant...'}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {quote.sent_at ? 'Tornar a Enviar' : 'Enviar Pressupost'}
                  </>
                )}
              </Button>
            )}
          </div>
        </header>
        
        {quote.sent_at && (
            <div className="mb-4 p-2 text-center bg-green-100 text-green-800 rounded-md text-sm">
                Pressupost enviat el {new Date(quote.sent_at).toLocaleDateString('ca-ES', { day: '2-digit', month: 'long', year: 'numeric' })}.
            </div>
        )}

        {/* ✅ DISSENY RESTAURAT: Tornem a l'estructura de targetes separades */}
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0">
          <section className="flex flex-col gap-2 overflow-y-auto pr-4">
            <div className="glass-card p-2">
                <QuoteMeta quote={quote} setQuote={setQuote} contacts={contacts} />
            </div>

            <div className="">
  <Label>Oportunitats del client</Label>
  {contactOpportunities.length > 0 ? (
    <Select 
      value={quote.opportunity_id?.toString() || ''} 
      onValueChange={(value) => setQuote(q => ({ ...q, opportunity_id: Number(value) || null }))}
      disabled={!quote.contact_id}
    >
      <SelectTrigger className="mt-2 w-full bg-transparent search-input h-auto py-1.5 ">
        <SelectValue placeholder="Cap oportunitat associada" />
      </SelectTrigger>
      <SelectContent className="glass-effect">
        {contactOpportunities.map(o => (
          <SelectItem 
            key={o.id} 
            value={o.id.toString()}
            // ✅ CORRECCIÓ: Afegim 'text-foreground' per al color per defecte.
            className="text-foreground focus:bg-transparent focus:text-background"
          >
            {o.name} ({o.stage_name})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ) : (<p className="mt-2 text-sm text-muted-foreground">Aquest client no té oportunitats obertes.</p>)}
</div>

            <div className="glass-card p-2">
                 <QuoteItems 
                    items={quote.items} 
                    setItems={(newItems: QuoteItem[]) => setQuote(q => ({...q, items: newItems}))} 
                    products={products} 
                />
                <QuoteTotals 
                    subtotal={subtotal} 
                    discount={quote.discount} 
                    setDiscount={(d) => setQuote(q => ({...q, discount: d}))} 
                    discountAmount={discountAmount} 
                    tax={tax} 
                    total={total} 
                />
            </div>

            <div className="glass-card p-2">
              <Label>Notes Addicionals</Label>
              <Textarea value={quote.notes} onChange={(e) => setQuote(q => ({...q, notes: e.target.value}))} className="mt-2" />
            </div>
          </section>
          
          <aside className="hidden lg:block glass-card p-4 overflow-y-auto">
             <div id="quote-preview-for-pdf">
                <QuotePreview 
                    quote={quote} 
                    contacts={contacts} 
                    companyProfile={currentCompanyProfile} 
                    subtotal={subtotal} 
                    discountAmount={discountAmount} 
                    tax={tax} 
                    total={total} 
                />
             </div>
          </aside>
        </main>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Estàs segur?</AlertDialogTitle><AlertDialogDescription>Aquesta acció esborrarà permanentment aquest pressupost.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isSaving}>Cancel·lar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={isSaving}>
                        {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Sí, esborra'l
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}