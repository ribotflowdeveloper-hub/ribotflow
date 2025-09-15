/**
 * @file QuoteEditorClient.tsx
 * @summary Aquest és el component de client principal i més complex per a la creació i edició de pressupostos.
 * Orquestra diversos subcomponents i gestiona tot l'estat del pressupost, els càlculs, la generació de PDF,
 * i la comunicació amb les Server Actions per desar, eliminar i enviar el pressupost.
 */

"use client";

import React, { useState, useMemo, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Send, Trash2, Building } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
// Llibreries per a la generació de PDF des del client.
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { createClient } from '@/lib/supabase/client';
import { saveQuoteAction, deleteQuoteAction, sendQuoteAction } from '../actions';
import type { Quote, Contact, Product, CompanyProfile, Opportunity, QuoteItem } from '../page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Importació de subcomponents per mantenir aquest fitxer més net i organitzat.
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
  const supabase = createClient();
  
  // --- Gestió de l'Estat ---
  const [quote, setQuote] = useState<Quote>(initialQuote); // L'estat principal amb totes les dades del pressupost.
  const [currentCompanyProfile, setCurrentCompanyProfile] = useState<CompanyProfile>(companyProfile); // Dades de l'empresa (pot canviar si s'editen al diàleg).
  const [contactOpportunities, setContactOpportunities] = useState<Opportunity[]>(initialOpportunities); // Oportunitats del contacte seleccionat.
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isSaving, startSaveTransition] = useTransition();
  const [isSending, startSendTransition] = useTransition();
  const [sendingStatus, setSendingStatus] = useState<'idle' | 'generating' | 'uploading' | 'sending'>('idle'); // Estat detallat per al procés d'enviament.

  // 'useMemo' s'utilitza per a càlculs que poden ser costosos. Aquest hook només recalcula
  // els totals quan les partides (items) o el descompte canvien, millorant el rendiment.
  const { subtotal, discountAmount, tax, total } = useMemo(() => {
    if (!quote?.items) return { subtotal: 0, discountAmount: 0, tax: 0, total: 0 };
    const sub = quote.items.reduce((acc, item) => acc + (item.quantity || 0) * (item.unit_price || 0), 0);
    const calculatedDiscountAmount = sub * ((quote.discount || 0) / 100);
    const subAfterDiscount = sub - calculatedDiscountAmount;
    const taxAmount = subAfterDiscount * 0.21; // IVA del 21%
    return { subtotal: sub, discountAmount: calculatedDiscountAmount, tax: taxAmount, total: subAfterDiscount + taxAmount };
  }, [quote?.items, quote?.discount]);
  
  /**
   * @summary Gestor per desar el pressupost. Crida a la Server Action 'saveQuoteAction'.
   */
  const handleSave = () => {
    startSaveTransition(async () => {
        const result = await saveQuoteAction({ ...quote, subtotal, tax, total });
        if (result.success) {
            toast.success('Èxit!', { description: result.message });
            // Si és un pressupost nou, fem un 'replace' de la URL per incloure el nou ID.
            // Això evita que l'usuari pugui crear duplicats si refresca la pàgina.
            if (quote.id === 'new' && result.newId) {
                router.replace(`/crm/quotes/${result.newId}`);
            } else {
                router.refresh(); // Si és una edició, només refresquem les dades del servidor.
            }
        } else {
            toast.error('Error', { description: result.message });
        }
    });
  };

  /**
   * @summary Gestor per eliminar el pressupost.
   */

const handleDelete = () => {
  startSaveTransition(async () => {
      const result = await deleteQuoteAction(quote.id);
      if (result.success) {
          toast.success('Esborrat!', { description: result.message });
          router.push('/crm/quotes');
      } else {
          toast.error('Error', { description: result.message });
      }
  });
};
   /**
   * @summary Gestor per enviar el pressupost. Aquest és un procés complex de múltiples passos.
   */
  const handleSend = () => {
    if (quote.id === 'new') {
        // ✅ 6. Canviem la crida a 'toast'
        toast.error("Acció no permesa", { description: "Desa el pressupost abans d'enviar-lo." });
        return;
    }

    startSendTransition(async () => {
      // 1. Generar el PDF a partir del HTML de la previsualització.

      try {
        setSendingStatus('generating');
        toast.info("Preparant enviament...", { description: "Generant el PDF optimitzat." });
        const element = document.getElementById('quote-preview-for-pdf');
        if (!element) throw new Error("Element de previsualització no trobat.");
        
        const canvas = await html2canvas(element, { 
            scale: 1.5,
            useCORS: true 
        });
  
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  
        const imgData = canvas.toDataURL('image/jpeg', 0.90);
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        
        const pdfBlob = pdf.output('blob');
        
        // 2. Pujar el PDF generat a Supabase Storage.
        setSendingStatus('uploading');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuari no autenticat.");
        const filePath = `${user.id}/${quote.id}.pdf`;
        const { error: uploadError } = await supabase.storage.from('quotes').upload(filePath, pdfBlob, { upsert: true });
        if (uploadError) throw uploadError;
        
        // 3. Cridar a la Server Action 'sendQuoteAction' que enviarà el correu.
        setSendingStatus('sending');
        const result = await sendQuoteAction(quote.id);
        if (!result.success) throw new Error(result.message);
        // 4. Actualitzar l'estat local i mostrar notificació d'èxit.
        setQuote(q => ({ ...q, status: 'Sent', sent_at: new Date().toISOString() }));
        toast.success("Èxit!", { description: result.message });
  
      } catch(error) {
        const e = error instanceof Error ? error : new Error("Error desconegut");
        toast.error("Error en l'enviament", { description: e.message });
      } finally {
        setSendingStatus('idle');
      }
    });
  };
// Efecte per carregar les oportunitats del contacte seleccionat.
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
    {/* ... (Renderització dels diàlegs i la capçalera) ... */}
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
                {/* Ara passem l'estat 'quote' directament, ja que el seu tipus és correcte */}
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

