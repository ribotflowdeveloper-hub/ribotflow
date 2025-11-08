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
} from "@/types/finances/invoices";
import { finalizeInvoiceAction, saveInvoiceAction } from "../actions"; // ✅ Assegura't que la ruta és correcta

import { formatDate } from "@/lib/utils/formatters"; // Import formatDate
// ✅ Importem el tipus de Producte
import { type Database } from "@/types/supabase";
type Product = Database["public"]["Tables"]["products"]["Row"];

interface UseInvoiceDetailProps {
    initialData: InvoiceDetail | null;
    isNew: boolean;
    userId: string; // ✅ Necessitem el User ID per als nous items
    teamId: string; // ✅ Necessitem el Team ID per als nous items
}

// Valors per defecte actualitzats
const defaultInitialData: InvoiceFormData = {
    contact_id: null,
    invoice_number: null,
    issue_date: formatDate(new Date()), // YYYY-MM-DD
    due_date: null,
    status: "Draft",
    notes: null,
    terms: null, // Afegit
    payment_details: null, // Afegit
    client_reference: null, // Afegit
    currency: "EUR", // Afegit
    language: "ca", // Afegit
    project_id: null, // Afegit
    budget_id: null,
    quote_id: null,
    tax: null,
    discount: null,
    extra_data: null,
    id: undefined,
    invoice_items: [],
    subtotal: 0,
    discount_amount: 0, // Descompte general
    tax_rate: 21, // Taxa general
    tax_amount: 0, // Impost general
    shipping_cost: 0, // Afegit
    total_amount: 0,
    // Camps denormalitzats o només lectura
    client_name: null,
    client_tax_id: null,
    client_address: null,
    client_email: null,
    company_name: null,
    company_tax_id: null,
    company_address: null,
    company_email: null,
    company_logo_url: null, // Afegit
};

export function useInvoiceDetail({
    initialData,
    isNew,
    userId, // ✅ Rebem el userId
    teamId, // ✅ Rebem el teamId
}: UseInvoiceDetailProps) {
    const t = useTranslations("InvoiceDetailPage");
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    
    // ✅ *** CORRECCIÓ 1: Canviem useTransition per useState ***
    // const [isFinalizing, startFinalizing] = useTransition(); // <-- Això NO
    const [isFinalizing, setIsFinalizing] = useState(false); // <-- Això SÍ

    // ✅ NOU ESTAT: Determina si el formulari ha d'estar bloquejat
    const [isLocked, setIsLocked] = useState(false);
    useEffect(() => {
        // Està bloquejat si NO és nou I l'estat NO és 'Draft'
        setIsLocked(!isNew && initialData?.status !== "Draft");
    }, [initialData, isNew]);

    const [formData, setFormData] = useState<InvoiceFormData>(() => {
        if (initialData) {
            // Mapeig explícit incloent nous camps
            const mappedData: InvoiceFormData = {
                id: initialData.id,
                contact_id: initialData.contact_id ?? null,
                invoice_number: initialData.invoice_number ?? null,
                issue_date: initialData.issue_date
                    ? formatDate(new Date(initialData.issue_date))
                    : "", // YYYY-MM-DD
                due_date: initialData.due_date
                    ? formatDate(new Date(initialData.due_date))
                    : null, // YYYY-MM-DD
                status: initialData.status as InvoiceStatus, 
                notes: initialData.notes ?? null,
                terms: initialData.terms ?? null, 
                payment_details: initialData.payment_details ?? null, 
                client_reference: initialData.client_reference ?? null, 
                currency: initialData.currency ?? "EUR", 
                language: initialData.language ?? "ca", 
                project_id: initialData.project_id ?? null, 
                budget_id: initialData.budget_id ?? null,
                quote_id: initialData.quote_id ?? null,
                tax: initialData.tax ?? null,
                discount: initialData.discount ?? null,
                extra_data: initialData.extra_data ?? null,
                client_name: initialData.client_name ?? null,
                client_tax_id: initialData.client_tax_id ?? null,
                client_address: initialData.client_address ?? null,
                client_email: initialData.client_email ?? null,
                company_name: initialData.company_name ?? null,
                company_tax_id: initialData.company_tax_id ?? null,
                company_address: initialData.company_address ?? null,
                company_email: initialData.company_email ?? null,
                company_logo_url: initialData.company_logo_url ?? null, 
                invoice_items: initialData.invoice_items?.map((item) => ({
                    ...item,
                    id: item.id ? String(item.id) : `temp-${Date.now()}-${Math.random()}`,
                    discount_percentage: item.discount_percentage ?? null,
                    discount_amount: item.discount_amount ?? null,
                })) || [],
                subtotal: initialData.subtotal ?? 0,
                discount_amount: initialData.discount_amount ?? 0, 
                tax_rate: initialData.tax_rate ?? 21, 
                tax_amount: initialData.tax_amount ?? 0, 
                shipping_cost: initialData.shipping_cost ?? 0, 
                total_amount: initialData.total_amount ?? 0,
            };
            return mappedData;
        }
        return defaultInitialData;
    });

    // --- Càlcul de Totals ---
    const calculateTotals = useCallback((
        items: InvoiceItem[],
        generalDiscountAmount: number = 0,
        generalTaxRate: number = 0,
        shippingCost: number = 0,
    ) => {
        let subtotalBeforeLineDiscounts = 0;
        let totalLineDiscountAmount = 0;

        items.forEach((item) => {
            const quantity = Number(item.quantity) || 0;
            const unitPrice = Number(item.unit_price) || 0;
            const lineTotal = quantity * unitPrice;
            subtotalBeforeLineDiscounts += lineTotal;

            let lineDiscount = 0;
            if (item.discount_amount && item.discount_amount > 0) {
                lineDiscount = Number(item.discount_amount);
            } else if (
                item.discount_percentage && item.discount_percentage > 0
            ) {
                lineDiscount = lineTotal *
                    (Number(item.discount_percentage) / 100);
            }
            totalLineDiscountAmount += lineDiscount;
        });

        const subtotalAfterLineDiscounts = subtotalBeforeLineDiscounts -
            totalLineDiscountAmount;
        const effectiveSubtotal = subtotalAfterLineDiscounts -
            generalDiscountAmount;

        const taxAmount = effectiveSubtotal > 0
            ? effectiveSubtotal * (generalTaxRate / 100)
            : 0;
        const totalAmount = effectiveSubtotal + taxAmount + shippingCost;

        return {
            subtotal: subtotalBeforeLineDiscounts,
            taxAmount,
            totalAmount,
        };
    }, []);

    useEffect(() => {
        const currentGeneralDiscount = Number(formData.discount_amount) || 0;
        const currentGeneralTaxRate = Number(formData.tax_rate) || 0;
        const currentShippingCost = Number(formData.shipping_cost) || 0;

        const { subtotal, taxAmount, totalAmount } = calculateTotals(
            formData.invoice_items || [],
            currentGeneralDiscount,
            currentGeneralTaxRate,
            currentShippingCost,
        );

        if (
            subtotal !== formData.subtotal ||
            taxAmount !== formData.tax_amount ||
            totalAmount !== formData.total_amount
        ) {
            setFormData((prev) => ({
                ...prev,
                subtotal,
                tax_amount: taxAmount,
                total_amount: totalAmount,
            }));
        }
    }, [
        formData.invoice_items,
        formData.discount_amount,
        formData.tax_rate,
        formData.shipping_cost,
        formData.subtotal,
        formData.tax_amount,
        formData.total_amount,
        calculateTotals,
    ]);

    // --- Handlers (handleFieldChange no canvia) ---
    const handleFieldChange = useCallback(<K extends keyof InvoiceFormData>(
        field: K,
        value: InvoiceFormData[K],
    ) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    }, []);

    // --- Handler per a Línies (Gestiona nous camps) ---
    const handleItemChange = useCallback(<K extends keyof InvoiceItem>(
        index: number,
        field: K,
        value: InvoiceItem[K],
    ) => {
        setFormData((prev) => {
            const currentItems = Array.isArray(prev.invoice_items)
                ? [...prev.invoice_items]
                : [];
            if (!currentItems[index]) return prev;

            const updatedItem = { ...currentItems[index], [field]: value };

            if (
                field === "quantity" || field === "unit_price" ||
                field === "discount_percentage" || field === "discount_amount"
            ) {
                const quantity = Number(updatedItem.quantity) || 0;
                const unitPrice = Number(updatedItem.unit_price) || 0;
                const lineTotal = quantity * unitPrice;
                updatedItem.total = lineTotal; 

                const numericValue = Number(value); 

                if (
                    field === "discount_percentage" && value !== null &&
                    numericValue > 0
                ) {
                    updatedItem.discount_amount = null;
                } else if (
                    field === "discount_amount" && value !== null &&
                    numericValue > 0
                ) {
                    updatedItem.discount_percentage = null;
                }
            }

            currentItems[index] = updatedItem;
            return { ...prev, invoice_items: currentItems };
        });
    }, []);

    // --- Afegir Item (Inclou nous camps per defecte) ---
    const handleAddItem = useCallback(() => {
        const newItem: InvoiceItem = {
            id: `temp-${Date.now()}-${Math.random()}`,
            invoice_id: typeof formData.id === "number" ? formData.id : 0,
            description: "",
            quantity: 1,
            unit_price: 0,
            total: 0,
            created_at: new Date().toISOString(),
            tax_rate: null, 
            user_id: userId, 
            team_id: teamId, 
            product_id: null,
            discount_percentage: null, 
            discount_amount: null, 
            reference_sku: null,
        };
        setFormData((prev) => ({
            ...prev,
            invoice_items: [...(prev.invoice_items || []), newItem],
        }));
    }, [formData.id, userId, teamId]); 
    
    // --- Esborrar Item (sense canvis) ---
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

    // ✅ --- NOU HANDLER: Afegir des de la Llibreria (Cridat per ProductSelector -> onProductSelect) ---
    const handleAddProductFromLibrary = useCallback((product: Product) => {
        const newItem: InvoiceItem = {
            id: `temp-${Date.now()}-${Math.random()}`,
            invoice_id: typeof formData.id === "number" ? formData.id : 0,
            description: product.name || product.description || "",
            quantity: 1,
            unit_price: product.price || 0,
            total: product.price || 0,
            created_at: new Date().toISOString(),
            tax_rate: null,
            user_id: userId, 
            team_id: teamId, 
            product_id: product.id, 
            discount_percentage: null,
            discount_amount: null,
            reference_sku: null, 
        };
        setFormData((prev) => ({
            ...prev,
            invoice_items: [...(prev.invoice_items || []), newItem],
        }));
    }, [formData.id, userId, teamId]); 

    // --- Submit Handler (Inclou nous camps a enviar) ---
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (isLocked) {
            toast.error(t("toast.cannotEditSentInvoice")); 
            return;
        }
        const {
            invoice_items,
            ...invoiceData 
        } = formData;

        const itemsForAction = (invoice_items || []).map((item) => {
            const { ...restOfItem } = item;
            
            const isExistingStringId = typeof item.id === 'string' && !item.id.startsWith('temp-') && item.id !== 'null';
            const isExistingNumericId = typeof item.id === 'number';

            return {
                ...restOfItem,
                id: (isExistingStringId || isExistingNumericId) ? item.id : undefined,
                quantity: Number(item.quantity) || 0,
                unit_price: Number(item.unit_price) || 0,
                tax_rate: item.tax_rate ? Number(item.tax_rate) : null,
                product_id: item.product_id ? Number(item.product_id) : null,
                discount_percentage: item.discount_percentage
                    ? Number(item.discount_percentage)
                    : null,
                discount_amount: item.discount_amount
                    ? Number(item.discount_amount)
                    : null,
                reference_sku: item.reference_sku || null,
            };
        });

        const dataForAction: InvoiceFormDataForAction & {
            invoice_items?: InvoiceItem[];
        } = {
            ...(invoiceData as InvoiceFormDataForAction),
            contact_id: invoiceData.contact_id
                ? Number(invoiceData.contact_id)
                : null,
            budget_id: invoiceData.budget_id
                ? Number(invoiceData.budget_id)
                : null,
            quote_id: invoiceData.quote_id
                ? Number(invoiceData.quote_id)
                : null,
            project_id: invoiceData.project_id || null, 
            discount_amount: Number(invoiceData.discount_amount) || 0,
            tax_rate: Number(invoiceData.tax_rate) ?? 0,
            shipping_cost: Number(invoiceData.shipping_cost) || 0,
            tax: invoiceData.tax ? Number(invoiceData.tax) : null,
            discount: invoiceData.discount
                ? Number(invoiceData.discount)
                : null,
            currency: invoiceData.currency || "EUR",
            language: invoiceData.language || "ca",
            invoice_items: itemsForAction as InvoiceItem[],
        };

        startTransition(async () => {
            const currentInvoiceId = typeof formData.id === "number"
                ? formData.id
                : null;
            const result = await saveInvoiceAction(
                dataForAction,
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
    }, [formData, isNew, router, t, startTransition, isLocked]);

    // ✅ *** REFACTORITZAT 'handleFinalize' AMB LA LÒGICA DE 'setIsFinalizing' ***
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
            // Executem l'acció FORA de la transició per poder fer 'await'
            setIsFinalizing(true); // ✅ Activem el loading manualment
            result = await finalizeInvoiceAction(currentInvoiceId);
            
            if (result.success) {
                toast.success(result.message || t("toast.finalizeSuccess"));
                
                // Actualitzem l'estat local a l'instant
                setFormData(prev => ({ ...prev, status: 'Sent' })); 
                setIsLocked(true); // Bloquegem el formulari
                
                // Refresquem la pàgina (ara sense 'startTransition')
                router.refresh(); 
                setIsFinalizing(false); // Desactivem el loading al final
            } else {
                toast.error(result.message || t("toast.finalizeError"));
                setIsFinalizing(false); // Desactivem el loading si hi ha error
            }
        } catch (error) {
            console.error(error);
            toast.error(t("toast.finalizeError"));
            result = { success: false, message: t("toast.finalizeError") };
            setIsFinalizing(false); // Desactivem el loading si hi ha error
        }

        return result; // Retornem el resultat de l'acció
        
    }, [formData.id, isNew, isLocked, router, t]); // ✅ CORRECCIÓ 2: Treiem 'setIsFinalizing' de les dependències

    return {
        formData,
        setFormData, // ✅ ARA SÍ QUE L'EXPORTEM
        isPending,
        isFinalizing, 
        isLocked, 
        handleFieldChange,
        handleItemChange,
        handleAddItem,
        handleAddProductFromLibrary, 
        handleRemoveItem,
        handleSubmit,
        handleFinalize, 
        t,
    };
}