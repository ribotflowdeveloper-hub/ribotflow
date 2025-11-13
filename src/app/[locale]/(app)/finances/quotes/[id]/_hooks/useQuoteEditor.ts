// /app/crm/quotes/[id]/_hooks/useQuoteEditor.ts (COMPLET I CORREGIT)
"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useReducer,
    useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
    deleteQuoteAction,
    saveQuoteAction,
    sendQuoteAction,
} from "../actions";
import { type Database } from "@/types/supabase";
// ✅ 1. CORRECCIÓ: Importem 'useTranslations' com a valor.
import { useTranslations } from "next-intl";

// Definicions de tipus basades en la BD
type Quote = Database["public"]["Tables"]["quotes"]["Row"];
type Opportunity = Database["public"]["Tables"]["opportunities"]["Row"];
type QuoteItem = Database["public"]["Tables"]["quote_items"]["Row"];
type Team = Database["public"]["Tables"]["teams"]["Row"];

// Aquest tipus representa un pressupost que pot ser nou ('id: "new"') o existent ('id: number')
export type EditableQuote = Omit<Quote, "id"> & {
    id: "new" | number;
    items: Partial<QuoteItem>[];
    // Camps temporals per la UI
    discount_percent_input?: number | null;
    tax_percent_input?: number | null;
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
    sendingStatus: "idle" | "generating" | "uploading" | "sending";
};

type EditorAction =
    | { type: "SET_QUOTE"; payload: EditableQuote }
    | {
        type: "UPDATE_QUOTE_FIELD";
        payload: {
            field: keyof EditableQuote;
            value: EditableQuote[keyof EditableQuote];
        };
    }
    | { type: "SET_TEAM_DATA"; payload: Team | null }
    | { type: "SET_OPPORTUNITIES"; payload: Opportunity[] }
    | { type: "SET_DELETE_DIALOG"; payload: boolean }
    | { type: "SET_PROFILE_DIALOG"; payload: boolean }
    | { type: "SET_SENDING_STATUS"; payload: EditorState["sendingStatus"] };

function editorReducer(state: EditorState, action: EditorAction): EditorState {
    switch (action.type) {
        case "SET_QUOTE":
            return { ...state, quote: action.payload };
        case "UPDATE_QUOTE_FIELD":
            return {
                ...state,
                quote: {
                    ...state.quote,
                    [action.payload.field]: action.payload.value,
                },
            };
        case "SET_TEAM_DATA":
            return { ...state, currentTeamData: action.payload };
        case "SET_OPPORTUNITIES":
            return { ...state, contactOpportunities: action.payload };
        case "SET_DELETE_DIALOG":
            return { ...state, isDeleteDialogOpen: action.payload };
        case "SET_PROFILE_DIALOG":
            return { ...state, isProfileDialogOpen: action.payload };
        case "SET_SENDING_STATUS":
            return { ...state, sendingStatus: action.payload };
        default:
            throw new Error("Unhandled action type");
    }
}

export function useQuoteEditor({
    initialQuote,
    initialOpportunities,
    companyProfile,
}: UseQuoteEditorProps) {
    const router = useRouter();
    const supabase = createClient();
    const t = useTranslations("QuoteEditor");

    const initialState: EditorState = {
        // ✅ MILLORA 1: Corregim l'estat inicial.
        // Si és un pressupost nou, forcem 'items' a ser un array buit,
        // evitant el "concepte per defecte" que es pugui haver injectat
        // a la 'page.tsx' (que és on s'hauria d'evitar, però ho blindem aquí).
        quote: {
            ...initialQuote,
            items: initialQuote.id === "new" ? [] : initialQuote.items,
            // ✅✅✅ CORRECCIÓ DE LECTURA ✅✅✅
            // Deixem de llegir 'discount' i 'tax_percent'.
            // Calculem els percentatges a partir dels valors nous.
            tax_percent_input: (initialQuote.tax_rate ?? 0.21) * 100, // ex: 0.21 -> 21

            // Calculem el % de descompte a partir del valor i el subtotal
            discount_percent_input:
                (initialQuote.subtotal && initialQuote.subtotal > 0 &&
                        initialQuote.discount_amount)
                    ? parseFloat(
                        ((initialQuote.discount_amount /
                            initialQuote.subtotal) * 100).toFixed(2),
                    )
                    : 0,
        },
        currentTeamData: companyProfile,
        contactOpportunities: initialOpportunities,
        isDeleteDialogOpen: false,
        isProfileDialogOpen: false,
        sendingStatus: "idle",
    };

    const [state, dispatch] = useReducer(editorReducer, initialState);
    const [isSaving, startSaveTransition] = useTransition();
    const [isSending, startSendTransition] = useTransition();

    // ✅ 3. RECONSTRUÏM EL useMemo amb LÒGICA DE PERCENTATGES
    const {
        computedSubtotal,
        computedDiscountAmount,
        computedTaxAmount,
        computedTotalAmount,
    } = useMemo(() => {
        const { items, discount_percent_input, tax_percent_input } =
            state.quote;

        // 1. Subtotal
        const sub = items.reduce(
            (acc, item) => acc + (item.quantity || 0) * (item.unit_price || 0),
            0,
        );

        // 2. Descompte (calculat a partir del % de l'input)
        const discountPercent = discount_percent_input || 0;
        const discountAmount = sub * (discountPercent / 100);
        const subAfterDiscount = sub - discountAmount;

        // 3. Impost (calculat a partir del % de l'input)
        const taxPercent = tax_percent_input || 0;
        const taxAmount = subAfterDiscount * (taxPercent / 100);

        // 4. Total
        const total = subAfterDiscount + taxAmount;

        return {
            computedSubtotal: sub,
            computedDiscountAmount: discountAmount,
            computedTaxAmount: taxAmount,
            computedTotalAmount: total,
        };
    }, [
        state.quote,
    ]);

    const onQuoteChange = useCallback(
        <K extends keyof EditableQuote>(field: K, value: EditableQuote[K]) => {
            dispatch({ type: "UPDATE_QUOTE_FIELD", payload: { field, value } });
        },
        [],
    );

    const onItemsChange = useCallback((items: Partial<QuoteItem>[]) => {
        dispatch({
            type: "UPDATE_QUOTE_FIELD",
            payload: { field: "items", value: items },
        });
    }, []);

    const handleSave = useCallback(() => {
        // ✅ MILLORA 2: Validació robusta al client abans d'enviar.
        // (Nota: Afegeix aquestes claus al teu arxiu de traduccions 'ca.json')
        if (!state.quote.contact_id) {
            toast.error(t("toast.errorTitle"), {
                description: t("toast.validation.missingContact"), // "Cal seleccionar un client."
            });
            return;
        }
        if (state.quote.items.length === 0) {
            toast.error(t("toast.errorTitle"), {
                description: t("toast.validation.minOneItem"), // "El pressupost ha de tenir almenys un concepte."
            });
            return;
        }
        const hasInvalidItem = state.quote.items.some(
            (item) =>
                !item.description?.trim() || // Descripció no pot ser buida
                (item.quantity ?? 1) <= 0, // Quantitat ha de ser positiva
        );
        if (hasInvalidItem) {
            toast.error(t("toast.errorTitle"), {
                description: t("toast.validation.invalidItem"), // "Un o més conceptes tenen dades invàlides (descripció buida o quantitat 0)."
            });
            return;
        }

        startSaveTransition(async () => {
            // ✅✅✅ INICI DE LA CORRECCIÓ ✅✅✅
            // Hem de passar explícitament els percentatges de la UI
            // perquè el SQL els pugui desar a les columnes antigues.
            const result = await saveQuoteAction({
                ...state.quote,

                // Camps Nous (Valors Calculats)
                subtotal: computedSubtotal,
                discount_amount: computedDiscountAmount, // El valor en € (ex: 50)
                tax_amount: computedTaxAmount,
                total_amount: computedTotalAmount,
                tax_rate: (state.quote.tax_percent_input || 0) / 100, // El decimal (ex: 0.21)

        
            });
            if (result.success && typeof result.data === "number") {
                toast.success(result.message);
                if (state.quote.id === "new") {
                    router.replace(`/finances/quotes/${result.data}`);
                }
            } else {
                toast.error(t("toast.errorTitle"), {
                    description: result.message, // Aquest missatge ara serà específic
                });
            }
        });
    }, [
        state.quote,
        computedSubtotal,
        computedDiscountAmount,
        computedTaxAmount,
        computedTotalAmount,
        router,
        t,
    ]);

    const handleDelete = useCallback(() => {
        // ✅ 3. GUARD: Aquesta comprovació assegura que només passem un 'number' a l'acció.
        if (typeof state.quote.id !== "number") return;
        startSaveTransition(async () => {
            if (typeof state.quote.id !== "number") return;
            const result = await deleteQuoteAction(state.quote.id);
            if (result.success) {
                toast.success(result.message);
                router.push("/finances/quotes");
            } else {
                toast.error(t("toast.errorTitle"), {
                    description: result.message,
                });
            }
        });
    }, [state.quote.id, router, t]);

    const handleSend = useCallback(() => {
        if (typeof state.quote.id !== "number" || !state.quote.team_id) { // ✅ Assegura't de tenir team_id
            toast.error(t("toast.errorTitle"), {
                description: t("toast.saveFirst"),
            }); // Missatge més clar
            return;
        }

        startSendTransition(async () => {
            const element = document.getElementById("quote-preview-for-pdf");
            if (!element) return;

            try {
                dispatch({ type: "SET_SENDING_STATUS", payload: "generating" });
                toast.info(t("quoteEditor.generatingPDF"));

                const { default: html2pdf } = await import("html2pdf.js");
                const PDF_OPTIONS = {
                    margin: 10,
                    filename: `pressupost-${
                        state.quote.quote_number || "esborrany"
                    }.pdf`,
                    image: { type: "jpeg", quality: 0.98 } as const,
                    html2canvas: { scale: 3, useCORS: true },
                    jsPDF: {
                        unit: "mm",
                        format: "a4",
                        orientation: "portrait" as const,
                    },
                    pagebreak: {
                        mode: "css" as const,
                        before: ".page-break-before",
                    },
                };
                const pdfBlob = await html2pdf().from(element).set(PDF_OPTIONS)
                    .output("blob");

                dispatch({ type: "SET_SENDING_STATUS", payload: "uploading" });

                // ✅ --- CORRECCIÓ CLAU ---
                // Construïm el path correcte per al bucket privat
                const correctFilePath =
                    `quotes/${state.quote.team_id}/${state.quote.id}.pdf`;

                const { error: uploadError } = await supabase.storage
                    .from("fitxers-privats") // Pujem al bucket PRIVAT
                    .upload(correctFilePath, pdfBlob, { upsert: true }); // Usem el path CORRECTE
                // ✅ --- FI CORRECCIÓ ---

                if (uploadError) {
                    console.error("Error pujant PDF:", uploadError);
                    throw new Error(
                        `Error en pujar el PDF: ${uploadError.message}`,
                    ); // Llença un error més descriptiu
                }

                dispatch({ type: "SET_SENDING_STATUS", payload: "sending" });
                const result = await sendQuoteAction(state.quote.id as number); // Crida a l'Edge Function
                if (!result.success) throw new Error(result.message);

                // ... (actualització d'estat i toasts d'èxit)
                dispatch({
                    type: "UPDATE_QUOTE_FIELD",
                    payload: { field: "status", value: "Sent" },
                });
                dispatch({
                    type: "UPDATE_QUOTE_FIELD",
                    payload: {
                        field: "sent_at",
                        value: new Date().toISOString(),
                    },
                });
                toast.success("Èxit!", { description: result.message });
            } catch (error) {
                // ... (gestió d'errors)
                const e = error instanceof Error
                    ? error
                    : new Error(t("toast.sendError"));
                toast.error(t("toast.errorTitle"), { description: e.message });
            } finally {
                dispatch({ type: "SET_SENDING_STATUS", payload: "idle" });
            }
        });
    }, [state.quote, supabase, t]); //

    useEffect(() => {
        const fetchOpportunities = async () => {
            if (!state.quote.contact_id) {
                dispatch({ type: "SET_OPPORTUNITIES", payload: [] });
                return;
            }
            const { data } = await supabase.from("opportunities").select("*")
                .eq("contact_id", state.quote.contact_id);
            dispatch({ type: "SET_OPPORTUNITIES", payload: data || [] });
        };
        fetchOpportunities();
    }, [state.quote.contact_id, supabase]);

    return {
        state,
        quote: state.quote,
        dispatch,
        onQuoteChange,
        onItemsChange,
        setQuote: (newQuote: EditableQuote) =>
            dispatch({ type: "SET_QUOTE", payload: newQuote }),
        setIsDeleteDialogOpen: (isOpen: boolean) =>
            dispatch({ type: "SET_DELETE_DIALOG", payload: isOpen }),
        setIsProfileDialogOpen: (isOpen: boolean) =>
            dispatch({ type: "SET_PROFILE_DIALOG", payload: isOpen }),
        setCurrentTeamData: (data: Team | null) =>
            dispatch({ type: "SET_TEAM_DATA", payload: data }),
        // Valors calculats per la UI
        subtotal: computedSubtotal,
        discountAmount: computedDiscountAmount, // El valor calculat en €
        tax_amount: computedTaxAmount, // El valor calculat en €
        total_amount: computedTotalAmount, // El valor calculat en €
        handleSave,
        handleDelete,
        handleSend,
        isSaving,
        isSending,
        t,
    };
}
