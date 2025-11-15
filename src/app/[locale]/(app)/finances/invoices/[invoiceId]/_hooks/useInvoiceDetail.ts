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
import { fetchTaxRatesAction } from "@/components/features/taxs/fetchTaxRatesAction"; // Ruta centralitzada

import { formatDate } from "@/lib/utils/formatters";
import { type Database } from "@/types/supabase";
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
    issue_date: formatDate(new Date()),
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
    tax_amount: 0, // Total IVA
    retention_amount: 0, // Total IRPF
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

// ✅ NOU: Funció Helper per calcular el total D'UNA LÍNIA
// Aquesta és la lògica que volies
function calculateLineTotal(item: InvoiceItem): number {
    const itemBase = (item.quantity || 0) * (item.unit_price || 0);
    let itemVat = 0;
    let itemRetention = 0;

    // Descomptes de línia primer
    let lineDiscount = 0;
    if (item.discount_amount && item.discount_amount > 0) {
        lineDiscount = Number(item.discount_amount);
    } else if (item.discount_percentage && item.discount_percentage > 0) {
        lineDiscount = itemBase * (Number(item.discount_percentage) / 100);
    }

    const baseAfterLineDiscount = itemBase - lineDiscount;

    // Els impostos s'apliquen sobre la base post-descompte
    (item.taxes || []).forEach((tax) => {
        const taxAmount = baseAfterLineDiscount * (tax.rate / 100);
        if (tax.type === "vat") {
            itemVat += taxAmount;
        } else if (tax.type === "retention") {
            itemRetention += taxAmount;
        }
    });

    // El total de la línia és la base (després de descompte de línia) + impostos - retencions
    return baseAfterLineDiscount + itemVat - itemRetention;
}

// ✅ NOU: Funció Helper per calcular els totals GENERALS
// (Aquest és el 'calculateTotals' que l'usuari ja tenia, però separat)
function calculateMainTotals(
    items: InvoiceItem[],
    generalDiscountAmount: number = 0,
    shippingCost: number = 0,
) {
    let subtotal = 0; // Subtotal brut (qty * price)
    let totalVat = 0;
    let totalRetention = 0;
    let totalLineDiscountAmount = 0;

    (items || []).forEach((item) => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unit_price) || 0;
        const lineTotal = quantity * unitPrice;
        subtotal += lineTotal;

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

        const itemBase = lineTotal - lineDiscount;

        (item.taxes || []).forEach((tax) => {
            const taxAmount = itemBase * (tax.rate / 100);
            if (tax.type === "vat") {
                totalVat += taxAmount;
            } else if (tax.type === "retention") {
                totalRetention += taxAmount;
            }
        });
    });

    const subtotalAfterLineDiscounts = subtotal - totalLineDiscountAmount;
    const effectiveSubtotal = subtotalAfterLineDiscounts -
        generalDiscountAmount;
    const totalAmount = effectiveSubtotal + totalVat - totalRetention +
        shippingCost;

    return {
        subtotal: subtotal, // Retornem el subtotal brut
        taxAmount: totalVat,
        retentionAmount: totalRetention,
        totalAmount: totalAmount,
    };
}

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
            // ✅ Calculem els totals de línia a l'inici
            const initialItems = (initialData.invoice_items || []).map(
                (item) => ({
                    ...item,
                    id: String(item.id),
                    taxes: (item as InvoiceItem).taxes || [], // Assegurem que 'taxes' existeix
                    total: calculateLineTotal(item as InvoiceItem), // 👈 Total real inicial
                }),
            );

            return {
                ...defaultInitialData,
                ...initialData,
                id: initialData.id,
                issue_date: initialData.issue_date
                    ? formatDate(new Date(initialData.issue_date))
                    : "",
                due_date: initialData.due_date
                    ? formatDate(new Date(initialData.due_date))
                    : null,
                status: initialData.status as InvoiceStatus,
                invoice_items: initialItems, // 👈 Items amb total real
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
        async function loadTaxes() {
            setIsLoadingTaxes(true);
            const result = await fetchTaxRatesAction();
            if (result.success && result.data) {
                setAvailableTaxes(result.data);
            } else {
                toast.error(
                    t("toast.loadTaxesError") ||
                        "Error al carregar els impostos.",
                );
            }
            setIsLoadingTaxes(false);
        }
        loadTaxes();
    }, [t]);

    // ✅ MODIFICAT: useEffect ara NOMÉS calcula totals generals
    // (Això corregeix el bucle infinit)
    useEffect(() => {
        const { subtotal, taxAmount, retentionAmount, totalAmount } =
            calculateMainTotals(
                formData.invoice_items || [],
                Number(formData.discount_amount) || 0,
                Number(formData.shipping_cost) || 0,
            );

        setFormData((prev) => {
            // Comprovem si els totals han canviat per evitar bucle
            if (
                subtotal === prev.subtotal &&
                taxAmount === prev.tax_amount &&
                retentionAmount === prev.retention_amount &&
                totalAmount === prev.total_amount
            ) {
                return prev; // No hi ha canvis
            }

            return {
                ...prev,
                subtotal,
                tax_amount: taxAmount,
                retention_amount: retentionAmount,
                total_amount: totalAmount,
            };
        });
    }, [
        formData.invoice_items,
        formData.discount_amount,
        formData.shipping_cost,
        // Afegim dependències per seguretat
        formData.subtotal,
        formData.tax_amount,
        formData.retention_amount,
        formData.total_amount,
    ]);

    const handleFieldChange = useCallback(<K extends keyof InvoiceFormData>(
        field: K,
        value: InvoiceFormData[K],
    ) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    }, []);

    // ✅ MODIFICAT: handleItemChange ara calcula el total de la línia
    const handleItemChange = useCallback(<K extends keyof InvoiceItem>(
        index: number,
        field: K,
        value: InvoiceItem[K],
    ) => {
        setFormData((prev) => {
            const currentItems = [...(prev.invoice_items || [])];
            if (!currentItems[index]) return prev;

            const updatedItem = { ...currentItems[index], [field]: value };

            // Lògica de descompte de línia
            if (
                field === "discount_percentage" &&
                Number(value) > 0
            ) {
                updatedItem.discount_amount = null;
            } else if (
                field === "discount_amount" &&
                Number(value) > 0
            ) {
                updatedItem.discount_percentage = null;
            }

            // ✅ RECALCULEM EL TOTAL REAL DE LA LÍNIA
            updatedItem.total = calculateLineTotal(updatedItem);

            currentItems[index] = updatedItem;
            return { ...prev, invoice_items: currentItems };
        });
    }, []);

    // ✅ NOU: handleItemTaxesChange
    const handleItemTaxesChange = useCallback(
        (index: number, taxes: TaxRate[]) => {
            setFormData((prev) => {
                const newItems = [...(prev.invoice_items || [])];
                if (!newItems[index]) return prev;

                // 1. Actualitzem els impostos
                newItems[index] = { ...newItems[index], taxes: taxes };

                // 2. Recalculem el total D'AQUESTA LÍNIA
                newItems[index].total = calculateLineTotal(newItems[index]);

                return { ...prev, invoice_items: newItems };
            });
        },
        [],
    );

    // ✅ MODIFICAT: 'handleAddItem' (afegeix 'taxes' i calcula 'total')
    const handleAddItem = useCallback(() => {
        const newItem: InvoiceItem = {
            id: `temp-${Date.now()}-${Math.random()}`,
            invoice_id: typeof formData.id === "number" ? formData.id : 0,
            description: "",
            quantity: 1,
            unit_price: 0,
            total: 0, // Es calcularà
            created_at: new Date().toISOString(),
            taxes: availableTaxes.filter((t) => t.is_default), // ✅ NOU
            user_id: userId,
            team_id: teamId,
            product_id: null,
            discount_percentage: null,
            discount_amount: null,
            reference_sku: null,
        };
        newItem.total = calculateLineTotal(newItem); // Calculem total inicial
        setFormData((prev) => ({
            ...prev,
            invoice_items: [...(prev.invoice_items || []), newItem],
        }));
    }, [formData.id, userId, teamId, availableTaxes]);

    // ✅ MODIFICAT: 'handleAddProductFromLibrary' (afegeix 'taxes' i calcula 'total')
    const handleAddProductFromLibrary = useCallback((product: Product) => {
        const newItem: InvoiceItem = {
            id: `temp-${Date.now()}-${Math.random()}`,
            invoice_id: typeof formData.id === "number" ? formData.id : 0,
            description: product.name || product.description || "",
            quantity: 1,
            unit_price: product.price || 0,
            total: 0, // Es calcularà
            created_at: new Date().toISOString(),
            taxes: availableTaxes.filter((t) => t.is_default), // ✅ NOU
            user_id: userId,
            team_id: teamId,
            product_id: product.id,
            discount_percentage: null,
            discount_amount: null,
            reference_sku: product.sku || null,
        };
        newItem.total = calculateLineTotal(newItem); // Calculem total inicial
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
                setFormData((prev) => ({ ...prev, status: "Sent" }));
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
