import { useState, useEffect, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import { type ExpenseDetail, type ExpenseFormDataForAction, type ExpenseItem } from '@/types/finances/expenses';
import { saveExpenseAction } from '../actions';

// ✅ 1. Actualitzem la interfície per acceptar les noves props
interface UseExpenseDetailProps {
    initialData: ExpenseDetail | null;
    isNew: boolean;
    userId: string; // <-- AFEGIT
    teamId: string; // <-- AFEGIT
}

// (Aquesta constant és correcta)
const defaultInitialData: Omit<ExpenseFormDataForAction, 'status'> = {
    id: 'new',
    description: '',
    total_amount: 0,
    expense_date: new Date().toISOString().split('T')[0],
    category: null,
    invoice_number: null,
    tax_amount: 0,
    subtotal: 0,
    discount_amount: 0,
    notes: null,
    tax_rate: 21,
    supplier_id: null,
    payment_method: null,
    payment_date: null,
    is_billable: false,
    project_id: null,
    is_reimbursable: false,
    expense_items: [],
};

// ✅ 2. Desestructurem les noves props a la signatura de la funció
export function useExpenseDetail({ 
    initialData, 
    isNew, 

}: UseExpenseDetailProps) {
    
    const t = useTranslations('ExpenseDetailPage');
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [formData, setFormData] = useState<ExpenseFormDataForAction>(
        initialData ? { ...initialData, id: initialData.id.toString() } : defaultInitialData as ExpenseFormDataForAction
    );

    const calculateTotals = (items: ExpenseItem[], discount: number, taxRate: number) => {
        const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
        const effectiveSubtotal = subtotal - discount;
        const taxAmount = effectiveSubtotal > 0 ? effectiveSubtotal * (taxRate / 100) : 0;
        const totalAmount = effectiveSubtotal + taxAmount;
        return { subtotal, taxAmount, totalAmount };
    };

    useEffect(() => {
        const { subtotal, taxAmount, totalAmount } = calculateTotals(
            formData.expense_items || [],
            formData.discount_amount || 0,
            formData.tax_rate || 0
        );
        setFormData(prev => ({
            ...prev,
            subtotal,
            tax_amount: taxAmount,
            total_amount: totalAmount
        }));
    }, [formData.expense_items, formData.discount_amount, formData.tax_rate]);

    const handleFieldChange = <K extends keyof ExpenseFormDataForAction>(field: K, value: ExpenseFormDataForAction[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleItemChange = <K extends keyof ExpenseItem>(index: number, field: K, value: ExpenseItem[K]) => {
        const newItems = [...(formData.expense_items || [])];
        if (!newItems[index]) return;
        newItems[index] = { ...newItems[index], [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
            newItems[index].total = (Number(newItems[index].quantity) || 0) * (Number(newItems[index].unit_price) || 0);
        }
        setFormData(prev => ({ ...prev, expense_items: newItems }));
    };

    const handleAddItem = () => {
        const newItem: ExpenseItem = {
            id: Date.now(),
            expense_id: typeof formData.id === 'string' && formData.id !== 'new' ? Number(formData.id) : 0,
            description: '',
            quantity: 1,
            unit_price: 0,
            total: 0,
            // Nota: No cal afegir userId/teamId aquí.
            // La Server Action (Capa 3) ja els obté de la sessió validada
            // i els passa al servei de BBDD.
        };
        setFormData(prev => ({ ...prev, expense_items: [...(prev.expense_items || []), newItem] }));
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...(formData.expense_items || [])];
        newItems.splice(index, 1);
        setFormData(prev => ({ ...prev, expense_items: newItems }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            // La Server Action ja està blindada i gestiona els permisos/límits
            const result = await saveExpenseAction(formData, isNew ? null : (formData.id ?? null));
            if (result.success) {
                toast.success(t('toast.saveSuccess'));
                router.push('/finances/expenses'); 
                router.refresh();
            } else {
                // Si la Capa 3 (Server Action) bloqueja per límit, es mostrarà aquí
                toast.error(result.message || t('toast.saveError'));
            }
        });
    };

    return {
        isPending,
        formData,
        handleFieldChange,
        handleSubmit,
        handleItemChange,
        handleAddItem,
        handleRemoveItem,
        t,
        setFormData, // 👈 AFEGIR AQUESTA LÍNIA
    };
}