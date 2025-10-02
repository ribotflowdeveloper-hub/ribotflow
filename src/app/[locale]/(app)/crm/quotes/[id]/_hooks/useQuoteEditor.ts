"use client";

import { useState, useMemo, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from "sonner";
import { createClient } from '@/lib/supabase/client';
import { saveQuoteAction, deleteQuoteAction, sendQuoteAction } from '../actions';
import type { Quote, Opportunity, QuoteItem } from '@/types/crm';
import type { TeamData } from '@/types/settings';
import { useTranslations } from 'next-intl';

// Props que el hook necessita per a inicialitzar el seu estat
interface UseQuoteEditorProps {
    initialQuote: Quote;
    initialOpportunities: Opportunity[];
    companyProfile: TeamData | null;
    userId: string;
}

export function useQuoteEditor({
    initialQuote,
    initialOpportunities,
    companyProfile,
    userId
}: UseQuoteEditorProps) {
    const router = useRouter();
    const supabase = createClient();
    const t = useTranslations('QuoteEditor');

    // --- Gestió de l'Estat ---
    const [quote, setQuote] = useState<Quote>(initialQuote);
    const [currentTeamData, setCurrentTeamData] = useState<TeamData | null>(companyProfile);
    const [contactOpportunities, setContactOpportunities] = useState<Opportunity[]>(initialOpportunities);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
    const [isSaving, startSaveTransition] = useTransition();
    const [isSending, startSendTransition] = useTransition();
    const [sendingStatus, setSendingStatus] = useState<'idle' | 'generating' | 'uploading' | 'sending'>('idle');

    // --- Dades Derivades (Càlculs) ---
    const { subtotal, discountAmount, tax, total } = useMemo(() => {
        if (!quote?.items) return { subtotal: 0, discountAmount: 0, tax: 0, total: 0 };
        const sub = quote.items.reduce((acc, item) => acc + (item.quantity || 0) * (item.unit_price || 0), 0);
        const calculatedDiscountAmount = sub * ((quote.discount || 0) / 100);
        const subAfterDiscount = sub - calculatedDiscountAmount;
        // La línia clau: utilitzem el percentatge del pressupost, o 21 per defecte.
        const taxAmount = subAfterDiscount * ((quote.tax_percent ?? 21) / 100);
        return { subtotal: sub, discountAmount: calculatedDiscountAmount, tax: taxAmount, total: subAfterDiscount + taxAmount };
    }, [quote?.items, quote?.discount, quote?.tax_percent]); // ✅ Afegim la nova dependència

    // --- Handlers ---
    const handleSave = () => {
        startSaveTransition(async () => {
            const result = await saveQuoteAction({ ...quote, subtotal, tax, total });
            if (result.success && result.data) {
                toast.success(result.message);
                if (quote.id === 'new') {
                    router.replace(`/crm/quotes/${result.data}`);
                }
            } else {
                toast.error(t('toast.errorTitle'), { description: result.message });
            }
        });
    };

    const handleDelete = () => {
        if (quote.id === 'new') return;
        startSaveTransition(async () => {
            const result = await deleteQuoteAction(quote.id);
            if (result.success) {
                toast.success(result.message);
                router.push('/crm/quotes');
            } else {
                toast.error(t('toast.errorTitle'), { description: result.message });
            }
        });
    };

    const handleSend = () => {
        if (quote.id === 'new') {
            toast.error(t('toast.errorTitle'), { description: t('toast.saveFirst') });
            return;
        }
    
        startSendTransition(async () => {
            const element = document.getElementById('quote-preview-for-pdf');
            if (!element) {
                toast.error(t('toast.errorTitle'), { description: "Element de previsualització no trobat." });
                return;
            }
    
            try {
                setSendingStatus('generating');
                toast.info(t('quoteEditor.generatingPDF'));
    
                // ✅ CORRECCIÓ CLAU: Importem la llibreria dinàmicament
                // Això només s'executarà al navegador, quan l'usuari faci clic.
                const { default: html2pdf } = await import('html2pdf.js');
    
                const PDF_OPTIONS = {
                    // ✅ CORRECCIÓ: 'margin' ha de ser un número o un array, no un objecte.
                    // Un número aplica el mateix marge a tots els costats (top, right, bottom, left).
                    margin: 10, // Marge de 15mm a tots els costats
                    filename: `pressupost-${quote.quote_number || 'esborrany'}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 3, useCORS: true },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                    pagebreak: { mode: 'css', before: '.page-break-before' }
                };
    
                const pdfBlob = await html2pdf().from(element).set(PDF_OPTIONS).output('blob');
    
                setSendingStatus('uploading');
                const filePath = `${userId}/${quote.id}.pdf`;
                const { error: uploadError } = await supabase.storage.from('quotes').upload(filePath, pdfBlob, { upsert: true });
                if (uploadError) throw uploadError;
    
                setSendingStatus('sending');
                const result = await sendQuoteAction(quote.id);
                if (!result.success) throw new Error(result.message);
    
                setQuote(q => ({ ...q, status: 'Sent', sent_at: new Date().toISOString() }));
                toast.success("Èxit!", { description: result.message });
    
            } catch (error) {
                const e = error instanceof Error ? error : new Error(t('toast.sendError'));
                toast.error(t('toast.errorTitle'), { description: e.message });
            } finally {
                setSendingStatus('idle');
            }
        });
    };

    const handleAddNewItem = () => {
        const newItem: QuoteItem = {
            product_id: null,
            description: '',
            quantity: 1,
            unit_price: 0,
            user_id: userId
        };
        setQuote(prevQuote => ({ ...prevQuote, items: [...(prevQuote.items || []), newItem] }));
    };

    // --- Efectes ---
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

    // Retornem tots els estats i funcions que el component necessita
    return {
        quote, setQuote,
        currentTeamData, setCurrentTeamData,
        contactOpportunities,
        isDeleteDialogOpen, setIsDeleteDialogOpen,
        isProfileDialogOpen, setIsProfileDialogOpen,
        isSaving, isSending, sendingStatus,
        subtotal, discountAmount, tax, total,
        handleSave, handleDelete, handleSend, handleAddNewItem,
        t
    };
}