// /app/crm/quotes/[id]/_hooks/useQuoteEditor.ts (COMPLET I CORREGIT)
"use client";

import { useReducer, useCallback, useMemo, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from "sonner";
import { createClient } from '@/lib/supabase/client';
import { saveQuoteAction, deleteQuoteAction, sendQuoteAction } from '../actions';
import { type Database } from '@/types/supabase';
// ✅ 1. CORRECCIÓ: Importem 'useTranslations' com a valor.
import { useTranslations } from 'next-intl';

// Definicions de tipus basades en la BD
type Quote = Database['public']['Tables']['quotes']['Row'];
type Opportunity = Database['public']['Tables']['opportunities']['Row'];
type QuoteItem = Database['public']['Tables']['quote_items']['Row'];
type Team = Database['public']['Tables']['teams']['Row'];

// Aquest tipus representa un pressupost que pot ser nou ('id: "new"') o existent ('id: number')
export type EditableQuote = Omit<Quote, 'id'> & { 
    id: 'new' | number;
    items: Partial<QuoteItem>[]; 
};

// Props que espera el hook
interface UseQuoteEditorProps {
    initialQuote: EditableQuote;
    initialOpportunities: Opportunity[];
    companyProfile: Team | null;
    userId: string;
}

// ... (Estat i accions per al Reducer es mantenen igual)
type EditorState = {
    quote: EditableQuote;
    currentTeamData: Team | null;
    contactOpportunities: Opportunity[];
    isDeleteDialogOpen: boolean;
    isProfileDialogOpen: boolean;
    sendingStatus: 'idle' | 'generating' | 'uploading' | 'sending';
};

type EditorAction =
    | { type: 'SET_QUOTE'; payload: EditableQuote }
    | { type: 'UPDATE_QUOTE_FIELD'; payload: { field: keyof EditableQuote; value: EditableQuote[keyof EditableQuote] } }
    | { type: 'SET_TEAM_DATA'; payload: Team | null }
    | { type: 'SET_OPPORTUNITIES'; payload: Opportunity[] }
    | { type: 'SET_DELETE_DIALOG'; payload: boolean }
    | { type: 'SET_PROFILE_DIALOG'; payload: boolean }
    | { type: 'SET_SENDING_STATUS'; payload: EditorState['sendingStatus'] };
    
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

    const [state, dispatch] = useReducer(editorReducer, initialState);
    const [isSaving, startSaveTransition] = useTransition();
    const [isSending, startSendTransition] = useTransition();

    const { subtotal, discountAmount, tax, total } = useMemo(() => {
        const { items, discount, tax_percent } = state.quote;
        const sub = items.reduce((acc, item) => acc + (item.quantity || 0) * (item.unit_price || 0), 0);
        const calculatedDiscountAmount = sub * ((discount || 0) / 100);
        const subAfterDiscount = sub - calculatedDiscountAmount;
        const taxAmount = subAfterDiscount * ((tax_percent ?? 21) / 100);
        return { subtotal: sub, discountAmount: calculatedDiscountAmount, tax: taxAmount, total: subAfterDiscount + taxAmount };
    }, [state.quote]);

    const onQuoteChange = useCallback(<K extends keyof EditableQuote>(field: K, value: EditableQuote[K]) => {
        dispatch({ type: 'UPDATE_QUOTE_FIELD', payload: { field, value } });
    }, []);

    const onItemsChange = useCallback((items: Partial<QuoteItem>[]) => {
        dispatch({ type: 'UPDATE_QUOTE_FIELD', payload: { field: 'items', value: items } });
    }, []);

    const handleSave = useCallback(() => {
        startSaveTransition(async () => {
            // ✅ 2. L'objecte que passem ara és compatible amb el tipus 'QuotePayload' de l'acció.
            const result = await saveQuoteAction({ ...state.quote, subtotal, tax, total });
            if (result.success && typeof result.data === 'number') {
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
        // ✅ 3. GUARD: Aquesta comprovació assegura que només passem un 'number' a l'acció.
        if (typeof state.quote.id !== 'number') return;
        startSaveTransition(async () => {
            if (typeof state.quote.id !== 'number') return;
            const result = await deleteQuoteAction(state.quote.id);
            if (result.success) {
                toast.success(result.message);
                router.push('/crm/quotes');
            } else {
                toast.error(t('toast.errorTitle'), { description: result.message });
            }
        });
    }, [state.quote.id, router, t]);

    const handleSend = useCallback(() => {
        // ✅ 4. GUARD: Mateixa comprovació per a l'acció d'enviament.
        if (typeof state.quote.id !== 'number') {
            toast.error(t('toast.errorTitle'), { description: t('toast.saveFirst') });
            return;
        }

        startSendTransition(async () => {
            const element = document.getElementById('quote-preview-for-pdf');
            if (!element) return;

            try {
                dispatch({ type: 'SET_SENDING_STATUS', payload: 'generating' });
                toast.info(t('quoteEditor.generatingPDF'));

                const { default: html2pdf } = await import('html2pdf.js');
                // ✅ 5. CORRECCIÓ DE TIPUS: Definim explícitament l'orientació.
                const PDF_OPTIONS = {
                    margin: 10,
                    filename: `pressupost-${state.quote.quote_number || 'esborrany'}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 } as const,
                    html2canvas: { scale: 3, useCORS: true },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
                    pagebreak: { mode: 'css' as const, before: '.page-break-before' }
                };

                const pdfBlob = await html2pdf().from(element).set(PDF_OPTIONS).output('blob');
                
                dispatch({ type: 'SET_SENDING_STATUS', payload: 'uploading' });
                const filePath = `${userId}/${state.quote.id}.pdf`;
                const { error: uploadError } = await supabase.storage.from('quotes').upload(filePath, pdfBlob, { upsert: true });
                if (uploadError) throw uploadError;

                dispatch({ type: 'SET_SENDING_STATUS', payload: 'sending' });
                const result = await sendQuoteAction(state.quote.id as number);
                if (!result.success) throw new Error(result.message);

                dispatch({ type: 'UPDATE_QUOTE_FIELD', payload: { field: 'status', value: 'Sent' } });
                dispatch({ type: 'UPDATE_QUOTE_FIELD', payload: { field: 'sent_at', value: new Date().toISOString() } });
                
                toast.success("Èxit!", { description: result.message });
            } catch (error) {
                const e = error instanceof Error ? error : new Error(t('toast.sendError'));
                toast.error(t('toast.errorTitle'), { description: e.message });
            } finally {
                dispatch({ type: 'SET_SENDING_STATUS', payload: 'idle' });
            }
        });
    }, [state.quote, userId, supabase, t]);

    useEffect(() => {
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

    return {
        state,
        quote: state.quote,
        dispatch,
        onQuoteChange,
        onItemsChange,
        setQuote: (newQuote: EditableQuote) => dispatch({ type: 'SET_QUOTE', payload: newQuote }),
        setIsDeleteDialogOpen: (isOpen: boolean) => dispatch({ type: 'SET_DELETE_DIALOG', payload: isOpen }),
        setIsProfileDialogOpen: (isOpen: boolean) => dispatch({ type: 'SET_PROFILE_DIALOG', payload: isOpen }),
        setCurrentTeamData: (data: Team | null) => dispatch({ type: 'SET_TEAM_DATA', payload: data }),
        subtotal, discountAmount, tax, total,
        handleSave, handleDelete, handleSend,
        isSaving, isSending,
        t
    };
}