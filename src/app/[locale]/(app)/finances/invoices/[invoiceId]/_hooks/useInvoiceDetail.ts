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
    const [isFinalizing, startFinalizing] = useTransition(); // ✅ Nou estat per a la finalització

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
                status: initialData.status as InvoiceStatus, // status a la BD és 'text', però el tractem com a enum aquí
                notes: initialData.notes ?? null,
                terms: initialData.terms ?? null, // Nou
                payment_details: initialData.payment_details ?? null, // Nou
                client_reference: initialData.client_reference ?? null, // Nou
                currency: initialData.currency ?? "EUR", // Nou
                language: initialData.language ?? "ca", // Nou
                project_id: initialData.project_id ?? null, // Nou
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
                company_logo_url: initialData.company_logo_url ?? null, // Nou
                invoice_items: initialData.invoice_items?.map((item) => ({
                    ...item,
                    id: String(item.id), // L'ID de item és UUID (string)
                    // Assegurem tipus numèrics per als nous camps d'item si són nulls
                    discount_percentage: item.discount_percentage ?? null,
                    discount_amount: item.discount_amount ?? null,
                })) || [],
                subtotal: initialData.subtotal ?? 0,
                discount_amount: initialData.discount_amount ?? 0, // Descompte general
                tax_rate: initialData.tax_rate ?? 21, // Taxa general
                tax_amount: initialData.tax_amount ?? 0, // Impost general
                shipping_cost: initialData.shipping_cost ?? 0, // Nou
                total_amount: initialData.total_amount ?? 0,
            };
            return mappedData;
        }
        return defaultInitialData;
    });

    // --- Càlcul de Totals ---
    // Ara inclou el cost d'enviament i considera descomptes per línia si vols
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

            // Calcula descompte per línia (prioritza amount si existeix, sinó percentage)
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
        // Aplica descompte general DESPRÉS dels descomptes de línia
        const effectiveSubtotal = subtotalAfterLineDiscounts -
            generalDiscountAmount;

        const taxAmount = effectiveSubtotal > 0
            ? effectiveSubtotal * (generalTaxRate / 100)
            : 0;
        // Suma l'enviament DESPRÉS d'impostos
        const totalAmount = effectiveSubtotal + taxAmount + shippingCost;

        return {
            subtotal: subtotalBeforeLineDiscounts, // Subtotal abans de cap descompte
            taxAmount, // Impost calculat sobre subtotal efectiu
            totalAmount, // Total final
            // Podries retornar més valors si els necessites mostrar (totalLineDiscountAmount, etc.)
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
                subtotal, // Actualitza subtotal (abans de descomptes)
                tax_amount: taxAmount,
                total_amount: totalAmount,
                // discount_amount i shipping_cost ja estan a l'estat, no cal actualitzar-los aquí
            }));
        }
        // Incloem shipping_cost a les dependències
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

            // Recalcular total i possiblement descompte si canvien camps rellevants
            if (
                field === "quantity" || field === "unit_price" ||
                field === "discount_percentage" || field === "discount_amount"
            ) {
                const quantity = Number(updatedItem.quantity) || 0;
                const unitPrice = Number(updatedItem.unit_price) || 0;
                const lineTotal = quantity * unitPrice;
                updatedItem.total = lineTotal; // Total base de la línia

                // ✅✅✅ CORRECCIÓ COMPARACIÓ ✅✅✅
                // Comprovem si NO és null ABANS de comparar amb 0
                const numericValue = Number(value); // Convertim a número per comparar

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
            tax_rate: null, // Taxa per línia (si la implementes)
            user_id: userId, // ✅ Assignem el user ID
            team_id: teamId, // ✅ Assignem el team ID
            product_id: null,
            // Nous camps
            discount_percentage: null, // O 0
            discount_amount: null, // O 0
            reference_sku: null,
        };
        setFormData((prev) => ({
            ...prev,
            invoice_items: [...(prev.invoice_items || []), newItem],
        }));
    }, [formData.id, userId, teamId]); // ✅ Afegim dependències
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
            user_id: userId, // ✅ Assignem el user ID
            team_id: teamId, // ✅ Assignem el team ID
            product_id: product.id, // ✅ Assignem el product ID
            discount_percentage: null,
            discount_amount: null,
            reference_sku: null, // Podries afegir 'product.sku' si existeix
        };
        setFormData((prev) => ({
            ...prev,
            invoice_items: [...(prev.invoice_items || []), newItem],
        }));
    }, [formData.id, userId, teamId]); // ✅ Afegim dependències
    // --- Submit Handler (Inclou nous camps a enviar) ---
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        // Validation...
        // ✅ Comprovació de seguretat al client
        if (isLocked) {
            toast.error(t("toast.cannotEditSentInvoice")); // Afegeix aquesta traducció
            return;
        }
        const {
            invoice_items,
            ...invoiceData // La resta queda aquí
        } = formData;

        const itemsForAction = (invoice_items || []).map((item) => {
            // Excloem camps interns o no editables de l'item
            const { ...restOfItem } = item;
            return {
                ...restOfItem,
                id: typeof item.id === "string" && item.id.startsWith("temp-")
                    ? undefined
                    : item.id,
                quantity: Number(item.quantity) || 0,
                unit_price: Number(item.unit_price) || 0,
                tax_rate: item.tax_rate ? Number(item.tax_rate) : null,
                product_id: item.product_id ? Number(item.product_id) : null,
                // Assegurem tipus per als nous camps
                discount_percentage: item.discount_percentage
                    ? Number(item.discount_percentage)
                    : null,
                discount_amount: item.discount_amount
                    ? Number(item.discount_amount)
                    : null,
                reference_sku: item.reference_sku || null,
                // El 'total' de la línia es recalcularà al servidor amb els descomptes/impostos correctes
            };
        });

        // Construïm l'objecte final per a l'acció
        // Construïm l'objecte final per a l'acció
        const dataForAction: InvoiceFormDataForAction & {
            invoice_items?: InvoiceItem[];
        } = {
            // Usem directament invoiceData (després d'excloure items/id)
            // Fem un cast per assegurar que compleix amb InvoiceFormDataForAction
            ...(invoiceData as InvoiceFormDataForAction),
            // Assegurem tipus per als camps clau que s'envien
            contact_id: invoiceData.contact_id
                ? Number(invoiceData.contact_id)
                : null,
            budget_id: invoiceData.budget_id
                ? Number(invoiceData.budget_id)
                : null,
            quote_id: invoiceData.quote_id
                ? Number(invoiceData.quote_id)
                : null,
            // ✅✅✅ CORRECCIÓ project_id ✅✅✅
            project_id: invoiceData.project_id || null, // Ja és string | null, només assegurem null si és buit
            discount_amount: Number(invoiceData.discount_amount) || 0,
            tax_rate: Number(invoiceData.tax_rate) ?? 0,
            shipping_cost: Number(invoiceData.shipping_cost) || 0,
            tax: invoiceData.tax ? Number(invoiceData.tax) : null,
            discount: invoiceData.discount
                ? Number(invoiceData.discount)
                : null,
            currency: invoiceData.currency || "EUR",
            language: invoiceData.language || "ca",
            // Afegim els items
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
                    router.refresh(); // Refresca dades si era edició
                }
            } else {
                toast.error(result.message || t("toast.saveError"));
            }
        });
    }, [formData, isNew, router, t, startTransition, isLocked]); // ✅ Afegeix isLocked
    // ✅ NOVA ACCIÓ: Handler per Finalitzar/Emetre la factura
    const handleFinalize = useCallback(async () => {
        const currentInvoiceId = typeof formData.id === "number"
            ? formData.id
            : null;

        if (isNew || !currentInvoiceId) {
            toast.error(t("toast.mustSaveDraftFirst")); // Afegeix aquesta traducció
            return;
        }

        if (isLocked) {
            toast.error(t("toast.alreadySent")); // Afegeix aquesta traducció
            return;
        }

        startFinalizing(async () => {
            const result = await finalizeInvoiceAction(currentInvoiceId);

            if (result.success) {
                toast.success(result.message || t("toast.finalizeSuccess")); // Afegeix traducció
                router.refresh(); // Refresca les dades per bloquejar el formulari
            } else {
                toast.error(result.message || t("toast.finalizeError")); // Afegeix traducció
            }
        });
    }, [formData.id, isNew, isLocked, router, t, startFinalizing]);

    return {
        formData,
        isPending,
        isFinalizing, // ✅ Retorna el nou estat
        isLocked, // ✅ Retorna l'estat de bloqueig
        handleFieldChange,
        handleItemChange,
        handleAddItem,
        handleAddProductFromLibrary, // ✅ Retornem el nou handler per 'onProductSelect'
        handleRemoveItem,
        handleSubmit,
        handleFinalize, // ✅ Retorna el nou handler
        t,
    };
}
