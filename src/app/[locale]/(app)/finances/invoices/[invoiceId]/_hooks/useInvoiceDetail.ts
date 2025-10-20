"use client";

import { useState, useEffect, useTransition, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import {
    type InvoiceDetail,
    type InvoiceFormData,
    type InvoiceFormDataForAction,
    type InvoiceItem,
    type InvoiceStatus
} from '@/types/finances/invoices';

import { saveInvoiceAction } from '../actions';

interface UseInvoiceDetailProps {
    initialData: InvoiceDetail | null;
    isNew: boolean;
}

const defaultInitialData: InvoiceFormData = {
    contact_id: null,
    invoice_number: null,
    issue_date: new Date().toISOString().split('T')[0],
    due_date: null,
    status: 'Draft',
    notes: null,
    // project_id: null, // Removed
    budget_id: null,
    quote_id: null,
    tax: null,
    discount: null,
    extra_data: null,
    id: undefined,
    invoice_items: [],
    subtotal: 0,
    discount_amount: 0,
    tax_rate: 21,
    tax_amount: 0,
    total_amount: 0,
    client_name: null,
    client_tax_id: null,
    client_address: null,
    client_email: null,
    company_name: null,
    company_tax_id: null,
    company_address: null,
    company_email: null,
    // terms: null, // Removed
};


export function useInvoiceDetail({
    initialData,
    isNew,
}: UseInvoiceDetailProps) {
    const t = useTranslations('InvoiceDetailPage');
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [formData, setFormData] = useState<InvoiceFormData>(() => {
        if (initialData) {
            const mappedData: InvoiceFormData = {
                id: initialData.id,
                contact_id: initialData.contact_id ?? null,
                invoice_number: initialData.invoice_number ?? null,
                issue_date: initialData.issue_date ? new Date(initialData.issue_date).toISOString().split('T')[0] : '',
                due_date: initialData.due_date ? new Date(initialData.due_date).toISOString().split('T')[0] : null,
                status: initialData.status as InvoiceStatus, // Cast status text to InvoiceStatus type
                notes: initialData.notes ?? null,
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
                invoice_items: initialData.invoice_items?.map(item => ({
                     ...item,
                     // Ensure id format matches InvoiceItem (string as per your types)
                     id: String(item.id), // Convert bigint/number id from DB to string
                 })) || [],
                subtotal: initialData.subtotal ?? 0,
                discount_amount: initialData.discount_amount ?? 0,
                tax_rate: initialData.tax_rate ?? 21, // Use default if null
                tax_amount: initialData.tax_amount ?? 0,
                total_amount: initialData.total_amount ?? 0,
                // project_id: initialData.project_id ?? null, // Removed
                // terms: null, // Removed
            };
            return mappedData;
        }
        return defaultInitialData;
    });


    // --- Càlcul de Totals ---
    const calculateTotals = useCallback((
        items: InvoiceItem[],
        discount: number = 0,
        taxRate: number = 0
    ) => {
        const subtotal = items.reduce((acc, item) => {
            const quantity = Number(item.quantity) || 0;
            const unitPrice = Number(item.unit_price) || 0;
            return acc + (quantity * unitPrice);
        }, 0);
        const effectiveSubtotal = subtotal - discount;
        const taxAmount = effectiveSubtotal > 0 ? effectiveSubtotal * (taxRate / 100) : 0;
        const totalAmount = effectiveSubtotal + taxAmount;
        return { subtotal, taxAmount, totalAmount };
    }, []);

    useEffect(() => {
        const currentDiscount = Number(formData.discount_amount) || 0;
        const currentTaxRate = Number(formData.tax_rate) || 0;

        const { subtotal, taxAmount, totalAmount } = calculateTotals(
            formData.invoice_items || [],
            currentDiscount,
            currentTaxRate
        );

        if (subtotal !== formData.subtotal || taxAmount !== formData.tax_amount || totalAmount !== formData.total_amount) {
            setFormData(prev => ({
                ...prev,
                subtotal,
                tax_amount: taxAmount,
                total_amount: totalAmount
            }));
        }
    }, [formData.invoice_items, formData.discount_amount, formData.tax_rate, formData.subtotal, formData.tax_amount, formData.total_amount, calculateTotals]);


    // --- Handlers per a Canvis al Formulari ---
    const handleFieldChange = useCallback(< K extends keyof InvoiceFormData > (
        field: K,
        value: InvoiceFormData[K]
    ) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleItemChange = useCallback(< K extends keyof InvoiceItem > (
        index: number,
        field: K,
        value: InvoiceItem[K]
    ) => {
        setFormData(prev => {
            const currentItems = Array.isArray(prev.invoice_items) ? [...prev.invoice_items] : [];
            if (!currentItems[index]) return prev;

            const updatedItem = { ...currentItems[index], [field]: value };

            if (field === 'quantity' || field === 'unit_price') {
                const quantity = Number(updatedItem.quantity) || 0;
                const unitPrice = Number(updatedItem.unit_price) || 0;
                updatedItem.total = quantity * unitPrice;
            }

            currentItems[index] = updatedItem;
            return { ...prev, invoice_items: currentItems };
        });
    }, []);

    const handleAddItem = useCallback(() => {
        const newItem: InvoiceItem = {
            id: `temp-${Date.now()}-${Math.random()}`,
            invoice_id: typeof formData.id === 'number' ? formData.id : 0, // Needs adjustment based on actual type of invoice_id in InvoiceItem
            description: '',
            quantity: 1,
            unit_price: 0,
            total: 0,
            created_at: new Date().toISOString(),
            tax_rate: null,
            user_id: '', // Type requires it, server assigns
            team_id: '', // Type requires it, server assigns
            product_id: null,
        };
        setFormData(prev => ({
            ...prev,
            invoice_items: [...(prev.invoice_items || []), newItem]
        }));
    }, [formData.id]);

    const handleRemoveItem = useCallback((index: number) => {
        setFormData(prev => {
            const newItems = [...(prev.invoice_items || [])];
            if (index >= 0 && index < newItems.length) {
                newItems.splice(index, 1);
                return { ...prev, invoice_items: newItems };
            }
            return prev;
        });
    }, []);


    // --- Handler per a l'Enviament (Submit) ---
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation...

        // ✅✅✅ CORRECCIÓ A LA DESESTRUCTURACIÓ ✅✅✅
        // Només traiem 'invoice_items' i 'id'. La resta queda a 'invoiceData'.
        const {
            invoice_items,
            // No cal treure res més aquí, InvoiceFormDataForAction ja s'encarrega
            ...invoiceData // Conté la resta de camps de InvoiceFormData
        } = formData;

        // 2. Preparem items per a l'acció (gestió IDs temporals)
        const itemsForAction = (invoice_items || []).map(item => {
             // Excloem camps que no van a la BD (o són gestionats pel servidor) si cal
             // const { created_at, user_id, team_id, ...restOfItem } = item;
             return {
                 // ...restOfItem, // Descomenta si has exclòs camps
                 ...item, // Si tots els camps d'InvoiceItem es poden enviar (excepte id temporal)
                 id: typeof item.id === 'string' && item.id.startsWith('temp-') ? undefined : item.id,
                 quantity: Number(item.quantity) || 0,
                 unit_price: Number(item.unit_price) || 0,
                 tax_rate: item.tax_rate ? Number(item.tax_rate) : null,
                 total: Number(item.total) || 0,
                 product_id: item.product_id ? Number(item.product_id) : null,
             }
         });

        // 3. Construïm l'objecte final per a l'acció
        //    Agafem invoiceData (que ja té els camps correctes per InvoiceFormDataForAction)
        //    i afegim invoice_items processats.
        const dataForAction: InvoiceFormDataForAction & { invoice_items?: InvoiceItem[] } = {
            ...(invoiceData as InvoiceFormDataForAction), // Fem cast a InvoiceFormDataForAction (ja hauria de quadrar)
             // Assegurem tipus numèrics per als camps que queden a invoiceData
             contact_id: invoiceData.contact_id ? Number(invoiceData.contact_id) : null,
             budget_id: invoiceData.budget_id ? Number(invoiceData.budget_id) : null,
             quote_id: invoiceData.quote_id ? Number(invoiceData.quote_id) : null,
             discount_amount: Number(invoiceData.discount_amount) || 0,
             tax_rate: Number(invoiceData.tax_rate) ?? 0,
             tax: invoiceData.tax ? Number(invoiceData.tax) : null,
             discount: invoiceData.discount ? Number(invoiceData.discount) : null,
             // Afegim els items processats
             invoice_items: itemsForAction as InvoiceItem[],
        };


        startTransition(async () => {
            const currentInvoiceId = typeof formData.id === 'number' ? formData.id : null;
            const result = await saveInvoiceAction(dataForAction, currentInvoiceId);

            if (result.success && result.data?.id) {
                toast.success(result.message || t('toast.saveSuccess'));
                if (isNew || !currentInvoiceId) {
                    router.replace(`/finances/invoices/${result.data.id}`);
                } else {
                    router.refresh();
                }
            } else {
                toast.error(result.message || t('toast.saveError'));
            }
        });
    }, [formData, isNew, router, t, startTransition]);


    return {
        formData,
        isPending,
        handleFieldChange,
        handleItemChange,
        handleAddItem,
        handleRemoveItem,
        handleSubmit,
        t,
    };
}