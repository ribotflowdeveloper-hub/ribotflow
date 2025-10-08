"use client";

// ✅ Importem 'useReducer' i 'useCallback' a més dels altres hooks
import { useMemo, useTransition, useEffect, useReducer, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from "sonner";
import { createClient } from '@/lib/supabase/client';
import { saveQuoteAction, deleteQuoteAction, sendQuoteAction } from '../actions';
import type { Quote, Opportunity, QuoteItem } from '@/types/crm';
import type { TeamData } from '@/types/settings';
import { useTranslations } from 'next-intl';

// ----------------------------------------------------------------
// 1. DEFINICIÓ DE PROPS (Això no canvia)
// ----------------------------------------------------------------
interface UseQuoteEditorProps {
    initialQuote: Quote;
    initialOpportunities: Opportunity[];
    companyProfile: TeamData | null;
    userId: string;
}

// ----------------------------------------------------------------
// 2. DEFINICIÓ DE L'ESTAT I LES ACCIONS PER AL REDUCER
// ----------------------------------------------------------------
type EditorState = {
    quote: Quote;
    currentTeamData: TeamData | null;
    contactOpportunities: Opportunity[];
    isDeleteDialogOpen: boolean;
    isProfileDialogOpen: boolean;
    sendingStatus: 'idle' | 'generating' | 'uploading' | 'sending';
};

type EditorAction =
    | { type: 'SET_QUOTE'; payload: Quote }
    | { type: 'UPDATE_QUOTE_FIELD'; payload: { field: keyof Quote; value: Quote[keyof Quote] } } // <-- Línia corregida
    | { type: 'SET_TEAM_DATA'; payload: TeamData | null }
    | { type: 'SET_OPPORTUNITIES'; payload: Opportunity[] }
    | { type: 'SET_DELETE_DIALOG'; payload: boolean }
    | { type: 'SET_PROFILE_DIALOG'; payload: boolean }
    | { type: 'SET_SENDING_STATUS'; payload: EditorState['sendingStatus'] };

// ----------------------------------------------------------------
// 3. LA FUNCIÓ REDUCER (EL "PANELL DE CONTROL")
// Aquesta funció pura rep l'estat actual i una acció, i retorna el nou estat.
// ----------------------------------------------------------------
function editorReducer(state: EditorState, action: EditorAction): EditorState {
    switch (action.type) {
        case 'SET_QUOTE':
            return { ...state, quote: action.payload };
        case 'UPDATE_QUOTE_FIELD':
            return { ...state, quote: { ...state.quote, [action.payload.field]: action.payload.value } };
        case 'SET_TEAM_DATA':
            return { ...state, currentTeamData: action.payload };
        case 'SET_OPPORTUNITIES':
            return { ...state, contactOpportunities: action.payload };
        case 'SET_DELETE_DIALOG':
            return { ...state, isDeleteDialogOpen: action.payload };
        case 'SET_PROFILE_DIALOG':
            return { ...state, isProfileDialogOpen: action.payload };
        case 'SET_SENDING_STATUS':
            return { ...state, sendingStatus: action.payload };
        default:
            throw new Error('Unhandled action type');
    }
}

// ----------------------------------------------------------------
// 4. EL HOOK 'useQuoteEditor' REFACTORITZAT
// ----------------------------------------------------------------
export function useQuoteEditor({
    initialQuote,
    initialOpportunities,
    companyProfile,
    userId
}: UseQuoteEditorProps) {
    const router = useRouter();
    const supabase = createClient();
    const t = useTranslations('QuoteEditor');

    const initialState: EditorState = {
        quote: initialQuote,
        currentTeamData: companyProfile,
        contactOpportunities: initialOpportunities,
        isDeleteDialogOpen: false,
        isProfileDialogOpen: false,
        sendingStatus: 'idle',
    };

    // Utilitzem useReducer en lloc de múltiples useStates
    const [state, dispatch] = useReducer(editorReducer, initialState);

    const [isSaving, startSaveTransition] = useTransition();
    const [isSending, startSendTransition] = useTransition();

    // Dades Derivades (llegeixen de 'state.quote')
    const { subtotal, discountAmount, tax, total } = useMemo(() => {
        const { items, discount, tax_percent } = state.quote;
        if (!items) return { subtotal: 0, discountAmount: 0, tax: 0, total: 0 };
        const sub = items.reduce((acc, item) => acc + (item.quantity || 0) * (item.unit_price || 0), 0);
        const calculatedDiscountAmount = sub * ((discount || 0) / 100);
        const subAfterDiscount = sub - calculatedDiscountAmount;
        const taxAmount = subAfterDiscount * ((tax_percent ?? 21) / 100);
        // ✅ CORRECCIÓ: Utilitza la variable correcta 'calculatedDiscountAmount'
        return {
            subtotal: sub,
            discountAmount: calculatedDiscountAmount, // <-- Aquí estava l'error
            tax: taxAmount,
            total: subAfterDiscount + taxAmount
        };
    }, [state.quote]);


    // --- Handlers que despatxen accions ---
    const onQuoteChange = useCallback(<K extends keyof Quote>(field: K, value: Quote[K]) => {
        dispatch({ type: 'UPDATE_QUOTE_FIELD', payload: { field, value } });
    }, []);

    const onItemsChange = useCallback((items: QuoteItem[]) => {
        dispatch({ type: 'UPDATE_QUOTE_FIELD', payload: { field: 'items', value: items } });
    }, []);

    // Handlers d'Accions (despatxen accions al reducer)
    const handleSave = useCallback(() => {
        startSaveTransition(async () => {
            const result = await saveQuoteAction({ ...state.quote, subtotal, tax, total });
            if (result.success && result.data) {
                toast.success(result.message);
                if (state.quote.id === 'new') {
                    router.replace(`/crm/quotes/${result.data}`);
                }
            } else {
                toast.error(t('toast.errorTitle'), { description: result.message });
            }
        });
    }, [state.quote, subtotal, tax, total, router, t]);

    const handleDelete = useCallback(() => {
        if (state.quote.id === 'new') return;
        startSaveTransition(async () => {
            const result = await deleteQuoteAction(state.quote.id);
            if (result.success) {
                toast.success(result.message);
                router.push('/crm/quotes');
            } else {
                toast.error(t('toast.errorTitle'), { description: result.message });
            }
        });
    }, [state.quote.id, router, t]);

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


    // Efectes (despatxen accions)
    useEffect(() => {
        // Sincronitza l'estat si les props inicials canvien (ex: després d'un router.refresh)
        dispatch({ type: 'SET_QUOTE', payload: initialQuote });
    }, [initialQuote]);

    useEffect(() => {
        const fetchOpportunities = async () => {
            if (!state.quote.contact_id) {
                dispatch({ type: 'SET_OPPORTUNITIES', payload: [] });
                return;
            }
            const { data } = await supabase.from('opportunities').select('*').eq('contact_id', state.quote.contact_id);
            dispatch({ type: 'SET_OPPORTUNITIES', payload: data || [] });
        };
        fetchOpportunities();
    }, [state.quote.contact_id, supabase]);

    // Retornem l'estat i les funcions que el component de UI necessita
    return {
        // L'estat sencer
        state,
        // Accés directe a les parts de l'estat més usades
        quote: state.quote,
        // Funcions per a modificar l'estat (per a passar als fills)
        dispatch, // Podem passar 'dispatch' directament o crear funcions més específiques
        // ✅ Retornem els callbacks amb els noms correctes
        onQuoteChange,
        onItemsChange,
        setQuote: (newQuote: Quote) => dispatch({ type: 'SET_QUOTE', payload: newQuote }),
        setIsDeleteDialogOpen: (isOpen: boolean) => dispatch({ type: 'SET_DELETE_DIALOG', payload: isOpen }),
        setIsProfileDialogOpen: (isOpen: boolean) => dispatch({ type: 'SET_PROFILE_DIALOG', payload: isOpen }),
        setCurrentTeamData: (data: TeamData | null) => dispatch({ type: 'SET_TEAM_DATA', payload: data }),
        // Dades derivades
        subtotal, discountAmount, tax, total,
        // Handlers d'accions
        handleSave, handleDelete, handleSend,
        // Estats de transició
        isSaving, isSending,
        // Traduccions
        t
    };
}