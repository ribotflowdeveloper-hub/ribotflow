// src/app/[locale]/(app)/finances/expenses/[expenseId]/_hooks/useExpenseDetail.ts

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
    type ExpenseCategory, // 👈 AFEGIR
    type ExpenseDetail,
    type ExpenseFormDataForAction,
    type ExpenseItem,
    type TaxRate,
} from "@/types/finances/index";
import {
    fetchExpenseCategoriesAction,
    fetchTaxRatesAction,
    saveExpenseAction,
} from "../actions";

interface UseExpenseDetailProps {
    initialData: ExpenseDetail | null;
    isNew: boolean;
    userId: string;
    teamId: string;
}

// ✅ MODIFICAT: Afegim 'discount_rate'
const defaultInitialData: Omit<ExpenseFormDataForAction, "status"> = {
    id: "new",
    description: "",
    total_amount: 0,
    expense_date: new Date().toISOString().split("T")[0],
    category_id: null, // 👈 CANVIAT    
    invoice_number: null,
    tax_amount: 0,
    subtotal: 0,
    discount_rate: 0, // 👈 AFEGIT (font de la veritat)
    discount_amount: 0, // (ara serà calculat)
    notes: null,
    supplier_id: null,
    payment_method: null,
    payment_date: null,
    is_billable: false,
    project_id: null,
    is_reimbursable: false,
    expense_items: [],
    retention_amount: 0,
    currency: "EUR",
    due_date: null,
};

export function useExpenseDetail({
    initialData,
    isNew,
}: UseExpenseDetailProps) {
    const t = useTranslations("ExpenseDetailPage");
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [formData, setFormData] = useState<ExpenseFormDataForAction>(() => {
        if (initialData) {
            return {
                ...defaultInitialData,
                ...initialData,
                id: initialData.id.toString(),
                expense_items: initialData.expense_items || [],
                // Assegurem que 'discount_rate' no sigui null
                discount_rate: initialData.discount_rate || 0,
                category_id: initialData.category_id || null, // 👈 CANVIAT
            };
        }
        return defaultInitialData as ExpenseFormDataForAction;
    });

    const [availableTaxes, setAvailableTaxes] = useState<TaxRate[]>([]);
    const [isLoadingTaxes, setIsLoadingTaxes] = useState(true);

    // ✅ NOU: Estat per a les categories
    const [availableCategories, setAvailableCategories] = useState<ExpenseCategory[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(true);

    // ✅ MODIFICAT: useEffect per carregar-ho tot
    useEffect(() => {
      async function loadInitialData() {
        setIsLoadingTaxes(true);
        setIsLoadingCategories(true);

        const [taxResult, categoryResult] = await Promise.all([
            fetchTaxRatesAction(),
            fetchExpenseCategoriesAction() // 👈 CANVIAT
        ]);

        if (taxResult.success && taxResult.data) {
          setAvailableTaxes(taxResult.data);
        } else {
          toast.error(t('toast.loadTaxesError') || 'Error al carregar els impostos.');
        }
        setIsLoadingTaxes(false);

        if (categoryResult.success && categoryResult.data) {
          setAvailableCategories(categoryResult.data);
        } else {
          toast.error(t('toast.loadCategoriesError') || 'Error al carregar les categories.');
        }
        setIsLoadingCategories(false);
      }
      loadInitialData();
    }, [t]);

    // ✅ REESCRIT: Lògica de càlcul de totals (amb descompte per %)
    const calculateTotals = (
        items: ExpenseItem[],
        discountRate: number, // 👈 Ara rep el percentatge
    ): {
        subtotal: number;
        discountAmount: number; // 👈 Retorna l'import calculat
        totalVat: number;
        totalRetention: number;
        totalAmount: number;
    } => {
        let subtotal = 0;
        let totalVat = 0;
        let totalRetention = 0;

        (items || []).forEach((item) => {
            const itemBase = (item.quantity || 0) * (item.unit_price || 0);
            subtotal += itemBase;

            // Els impostos es calculen sobre la base de CADA item
            (item.taxes || []).forEach((tax) => {
                const taxAmount = itemBase * (tax.rate / 100);
                if (tax.type === "vat") {
                    totalVat += taxAmount;
                } else if (tax.type === "retention") {
                    totalRetention += taxAmount;
                }
            });
        });

        // Calculem el descompte sobre el subtotal
        const discountAmount = subtotal * (discountRate / 100);
        const effectiveSubtotal = subtotal - discountAmount;

        // Recalculem impostos sobre la base post-descompte (si és així com funciona)
        // O... més simple: els impostos es calculen sobre la base original
        // i el descompte es resta del subtotal.
        // Mantenim la lògica simple actual:

        if (effectiveSubtotal <= 0) {
            // Si el descompte és major que el subtotal, no hi ha impostos
            totalVat = 0;
            totalRetention = 0;
        }

        const totalAmount = effectiveSubtotal + totalVat - totalRetention;

        return {
            subtotal,
            discountAmount,
            totalVat,
            totalRetention,
            totalAmount,
        };
    };

    // ✅ MODIFICAT: 'useEffect' per recalcular totals
    useEffect(() => {
        const {
            subtotal,
            discountAmount, // 👈 Rebem l'import
            totalVat,
            totalRetention,
            totalAmount,
        } = calculateTotals(
            formData.expense_items,
            formData.discount_rate || 0, // 👈 Passem el percentatge
        );

        setFormData((prev) => ({
            ...prev,
            subtotal: subtotal,
            discount_amount: discountAmount, // 👈 Desem l'import calculat
            tax_amount: totalVat,
            retention_amount: totalRetention,
            total_amount: totalAmount,
        }));
    }, [formData.expense_items, formData.discount_rate]); // 👈 El 'trigger' ara és 'discount_rate'

    const handleFieldChange = <K extends keyof ExpenseFormDataForAction>(
        field: K,
        value: ExpenseFormDataForAction[K],
    ) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleItemChange = <K extends keyof ExpenseItem>(
        index: number,
        field: K,
        value: ExpenseItem[K],
    ) => {
        const newItems = [...(formData.expense_items || [])];
        if (!newItems[index]) return;

        newItems[index] = { ...newItems[index], [field]: value };

        if (field === "quantity" || field === "unit_price") {
            newItems[index].total = (Number(newItems[index].quantity) || 0) *
                (Number(newItems[index].unit_price) || 0);
        }

        setFormData((prev) => ({ ...prev, expense_items: newItems }));
    };

    const handleItemTaxesChange = (index: number, taxes: TaxRate[]) => {
        const newItems = [...(formData.expense_items || [])];
        if (!newItems[index]) return;
        newItems[index] = { ...newItems[index], taxes: taxes };
        setFormData((prev) => ({ ...prev, expense_items: newItems }));
    };

    const handleAddItem = () => {
        const newItem: ExpenseItem = {
            id: Date.now(),
            expense_id: 0,
            description: "",
            quantity: 1,
            unit_price: 0,
            total: 0,
            taxes: availableTaxes.filter((t) => t.is_default),
        };
        setFormData((prev) => ({
            ...prev,
            expense_items: [...(prev.expense_items || []), newItem],
        }));
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...(formData.expense_items || [])];
        newItems.splice(index, 1);
        setFormData((prev) => ({ ...prev, expense_items: newItems }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            // 'formData' ja conté 'discount_rate' i 'discount_amount' calculat
            const result = await saveExpenseAction(
                formData,
                isNew ? null : (formData.id ?? null),
            );
            if (result.success) {
                toast.success(t("toast.saveSuccess"));
                router.push("/finances/expenses");
                router.refresh();
            } else {
                toast.error(result.message || t("toast.saveError"));
            }
        });
    };
    // ✅ NOU: Handler per afegir la nova categoria a l'estat
    const handleCategoryCreated = (newCategory: ExpenseCategory) => {
        // Afegim la nova categoria a la llista del desplegable
        setAvailableCategories(prev => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)));
        
        // La seleccionem automàticament al formulari
        handleFieldChange('category_id', newCategory.id);
    };

    return {
        isPending,
        formData,
        availableTaxes,
        isLoadingTaxes,
        availableCategories, // 👈 RETORNAR (ara són objectes {id, name})
        isLoadingCategories, // 👈 RETORNAR
        handleFieldChange,
        handleSubmit,
        handleItemChange,
        handleItemTaxesChange,
        handleAddItem,
        handleRemoveItem,
        t,
        setFormData,
        handleCategoryCreated, // 👈 RETORNAR
    };
}
