"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
    type InvoiceDetail,
    type InvoiceFormData,
    type InvoiceFormDataForAction,
    type InvoiceItem,
    type InvoiceStatus,
    type TaxRate,
} from "@/types/finances/index";
import { finalizeInvoiceAction, saveInvoiceAction } from "../actions";
import { fetchTaxRatesAction } from "@/components/features/taxs/fetchTaxRatesAction"; 
import { type Database } from "@/types/supabase";

// ✅ IMPORTEM EL CERVELL FINANCER
import { calculateLineValues, calculateDocumentTotals } from "@/lib/services/finances/calculations";

type Product = Database["public"]["Tables"]["products"]["Row"] & {
    sku?: string | null;
};

interface UseInvoiceDetailProps {
    initialData: InvoiceDetail | null;
    isNew: boolean;
    userId: string;
    teamId: string;
}

const defaultInitialData: InvoiceFormData = {
    contact_id: null,
    invoice_number: null,
    // Usem format ISO per defecte per evitar problemes amb inputs type="date"
    issue_date: new Date().toISOString().split("T")[0],
    due_date: null,
    status: "Draft",
    notes: null,
    terms: null,
    payment_details: null,
    client_reference: null,
    currency: "EUR",
    language: "ca",
    project_id: null,
    budget_id: null,
    quote_id: null,
    extra_data: null,
    id: undefined,
    invoice_items: [],
    subtotal: 0,
    discount_amount: 0,
    shipping_cost: 0,
    tax_amount: 0, 
    retention_amount: 0,
    total_amount: 0,
    client_name: null,
    client_tax_id: null,
    client_address: null,
    client_email: null,
    company_name: null,
    company_tax_id: null,
    company_address: null,
    company_email: null,
    company_logo_url: null,
    tax: null,
    discount: null,
};

export function useInvoiceDetail({
    initialData,
    isNew,
    userId,
    teamId,
}: UseInvoiceDetailProps) {
    const t = useTranslations("InvoiceDetailPage");
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [isLocked, setIsLocked] = useState(false);

    useEffect(() => {
        setIsLocked(!isNew && initialData?.status !== "Draft");
    }, [initialData, isNew]);

    const [formData, setFormData] = useState<InvoiceFormData>(() => {
        if (initialData) {
            const initialItems = (initialData.invoice_items || []).map(
                (item) => ({
                    ...item,
                    id: String(item.id),
                    taxes: (item as InvoiceItem).taxes || [],
                    // ✅ Càlcul inicial consistent
                    total: calculateLineValues(item as InvoiceItem).finalLineTotal,
                }),
            );

            return {
                ...defaultInitialData,
                ...initialData,
                id: initialData.id,
                issue_date: initialData.issue_date
                    ? new Date(initialData.issue_date).toISOString().split("T")[0]
                    : new Date().toISOString().split("T")[0],
                due_date: initialData.due_date
                    ? new Date(initialData.due_date).toISOString().split("T")[0]
                    : null,
                status: initialData.status as InvoiceStatus,
                invoice_items: initialItems,
                subtotal: initialData.subtotal ?? 0,
                tax_amount: initialData.total_amount ?? 0,
                retention_amount: initialData.retention_amount ?? 0,
                discount_amount: initialData.discount_amount ?? 0,
                shipping_cost: initialData.shipping_cost ?? 0,
                total_amount: initialData.total_amount ?? 0,
            };
        }
        return defaultInitialData;
    });

    const [availableTaxes, setAvailableTaxes] = useState<TaxRate[]>([]);
    const [isLoadingTaxes, setIsLoadingTaxes] = useState(true);

    useEffect(() => {
        let isMounted = true;
        async function loadTaxes() {
            setIsLoadingTaxes(true);
            try {
                const result = await fetchTaxRatesAction();
                if (!isMounted) return;
                
                if (result.success && result.data) {
                    setAvailableTaxes(result.data);
                } else {
                    console.warn("[useInvoiceDetail] No s'han pogut carregar els impostos:", result.message);
                }
            } catch (error) {
                console.error("[useInvoiceDetail] Error de xarxa carregant impostos:", error);
            } finally {
                if (isMounted) setIsLoadingTaxes(false);
            }
        }
        loadTaxes();
        return () => { isMounted = false; };
    }, []);

    // ✅ useEffect REFACTORITZAT: Recalcula totals globals utilitzant la lògica compartida
    useEffect(() => {
        const totals = calculateDocumentTotals(
            formData.invoice_items || [],
            Number(formData.discount_amount) || 0,
            Number(formData.shipping_cost) || 0,
            false // Assumim que el descompte és un import fix (euros), no %
        );

        setFormData((prev) => {
            // Evitem re-renders innecessaris si res ha canviat
            if (
                prev.subtotal === totals.subtotal &&
                prev.tax_amount === totals.taxAmount &&
                prev.retention_amount === totals.retentionAmount &&
                prev.total_amount === totals.totalAmount
            ) {
                return prev;
            }

            return {
                ...prev,
                subtotal: totals.subtotal,
                tax_amount: totals.taxAmount,
                retention_amount: totals.retentionAmount,
                total_amount: totals.totalAmount,
            };
        });
    }, [
        formData.invoice_items,
        formData.discount_amount,
        formData.shipping_cost,
    ]);

    const handleFieldChange = useCallback(<K extends keyof InvoiceFormData>(
        field: K,
        value: InvoiceFormData[K],
    ) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    }, []);

    // ✅ handleItemChange REFACTORITZAT: Recalcula línia amb lògica compartida
    const handleItemChange = useCallback(<K extends keyof InvoiceItem>(
        index: number,
        field: K,
        value: InvoiceItem[K],
    ) => {
        setFormData((prev) => {
            const currentItems = [...(prev.invoice_items || [])];
            if (!currentItems[index]) return prev;

            const updatedItem = { ...currentItems[index], [field]: value };

            if (field === "discount_percentage" && Number(value) > 0) {
                updatedItem.discount_amount = null;
            } else if (field === "discount_amount" && Number(value) > 0) {
                updatedItem.discount_percentage = null;
            }

            // Recàlcul automàtic del total de la línia
            updatedItem.total = calculateLineValues(updatedItem).finalLineTotal;

            currentItems[index] = updatedItem;
            return { ...prev, invoice_items: currentItems };
        });
    }, []);

    // ✅ handleItemTaxesChange REFACTORITZAT
    const handleItemTaxesChange = useCallback(
        (index: number, taxes: TaxRate[]) => {
            setFormData((prev) => {
                const newItems = [...(prev.invoice_items || [])];
                if (!newItems[index]) return prev;

                newItems[index] = { ...newItems[index], taxes: taxes };
                
                // Recàlcul automàtic del total de la línia
                newItems[index].total = calculateLineValues(newItems[index]).finalLineTotal;

                return { ...prev, invoice_items: newItems };
            });
        },
        [],
    );

    // ✅ handleAddItem REFACTORITZAT
    const handleAddItem = useCallback(() => {
        const newItem: InvoiceItem = {
            id: `temp-${Date.now()}-${Math.random()}`,
            invoice_id: typeof formData.id === "number" ? formData.id : 0,
            description: "",
            quantity: 1,
            unit_price: 0,
            total: 0,
            created_at: new Date().toISOString(),
            taxes: availableTaxes.filter((t) => t.is_default),
            user_id: userId,
            team_id: teamId,
            product_id: null,
            discount_percentage: null,
            discount_amount: null,
            reference_sku: null,
        };
        
        // Recàlcul inicial
        newItem.total = calculateLineValues(newItem).finalLineTotal;
        
        setFormData((prev) => ({
            ...prev,
            invoice_items: [...(prev.invoice_items || []), newItem],
        }));
    }, [formData.id, userId, teamId, availableTaxes]);

    // ✅ handleAddProductFromLibrary REFACTORITZAT
    const handleAddProductFromLibrary = useCallback((product: Product) => {
        const newItem: InvoiceItem = {
            id: `temp-${Date.now()}-${Math.random()}`,
            invoice_id: typeof formData.id === "number" ? formData.id : 0,
            description: product.name || product.description || "",
            quantity: 1,
            unit_price: product.price || 0,
            total: 0,
            created_at: new Date().toISOString(),
            taxes: availableTaxes.filter((t) => t.is_default),
            user_id: userId,
            team_id: teamId,
            product_id: product.id,
            discount_percentage: null,
            discount_amount: null,
            reference_sku: product.sku || null,
        };
        
        // Recàlcul inicial
        newItem.total = calculateLineValues(newItem).finalLineTotal;

        setFormData((prev) => ({
            ...prev,
            invoice_items: [...(prev.invoice_items || []), newItem],
        }));
    }, [formData.id, userId, teamId, availableTaxes]);

    const handleRemoveItem = useCallback((index: number) => {
        setFormData((prev) => {
            const newItems = [...(prev.invoice_items || [])];
            if (index >= 0 && index < newItems.length) {
                newItems.splice(index, 1);
                return { ...prev, invoice_items: newItems };
            }
            return prev;
        });
    }, []);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLocked) {
            toast.error(t("toast.cannotEditSentInvoice"));
            return;
        }
        startTransition(async () => {
            const currentInvoiceId = typeof formData.id === "number"
                ? formData.id
                : null;
            
            const result = await saveInvoiceAction(
                formData as InvoiceFormDataForAction & {
                    invoice_items?: InvoiceItem[];
                },
                currentInvoiceId,
            );
            
            if (result.success && result.data?.id) {
                toast.success(result.message || t("toast.saveSuccess"));
                if (isNew || !currentInvoiceId) {
                    router.replace(`/finances/invoices/${result.data.id}`);
                } else {
                    router.refresh();
                }
            } else {
                toast.error(result.message || t("toast.saveError"));
            }
        });
    }, [formData, isNew, router, t, isLocked]);

    const handleFinalize = useCallback(async () => {
        const currentInvoiceId = typeof formData.id === "number"
            ? formData.id
            : null;

        if (isNew || !currentInvoiceId) {
            toast.error(t("toast.mustSaveDraftFirst"));
            return { success: false, message: t("toast.mustSaveDraftFirst") };
        }

        if (isLocked) {
            toast.error(t("toast.alreadySent"));
            return { success: false, message: t("toast.alreadySent") };
        }

        let result;
        try {
            setIsFinalizing(true);
            result = await finalizeInvoiceAction(currentInvoiceId);

            if (result.success) {
                toast.success(result.message || t("toast.finalizeSuccess"));
                setFormData((prev) => ({ ...prev, status: "Sent" }));
                setIsLocked(true);
                router.refresh();
                setIsFinalizing(false);
            } else {
                toast.error(result.message || t("toast.finalizeError"));
                setIsFinalizing(false);
            }
        } catch (error) {
            console.error(error);
            toast.error(t("toast.finalizeError"));
            result = { success: false, message: t("toast.finalizeError") };
            setIsFinalizing(false);
        }
        return result;
    }, [formData.id, isNew, isLocked, router, t]);

    return {
        formData,
        setFormData,
        isPending,
        isFinalizing,
        isLocked,
        handleFieldChange,
        handleItemChange,
        handleItemTaxesChange,
        handleAddItem,
        handleAddProductFromLibrary,
        handleRemoveItem,
        handleSubmit,
        handleFinalize,
        t,
        availableTaxes,
        isLoadingTaxes,
    };
}