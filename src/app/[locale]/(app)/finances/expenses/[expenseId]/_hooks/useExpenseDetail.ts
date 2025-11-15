"use client";

import { useState, useEffect, useTransition, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { 
  type ExpenseDetail, 
  type ExpenseFormDataForAction, 
  type ExpenseItem,
  type TaxRate,
  type ExpenseCategory
} from '@/types/finances/index'; 
import { 
  saveExpenseAction,

  fetchExpenseCategoriesAction,
 
} from '../actions'; 
import { fetchTaxRatesAction } from '@/components/features/taxs/fetchTaxRatesAction';


interface UseExpenseDetailProps {
    initialData: ExpenseDetail | null;
    isNew: boolean;
    userId: string;
    teamId: string;
}

const defaultInitialData: Omit<ExpenseFormDataForAction, 'status' | 'category'> = {
    id: 'new',
    description: '',
    total_amount: 0,
    expense_date: new Date().toISOString().split('T')[0],
    category_id: null,
    invoice_number: null,
    tax_amount: 0,
    subtotal: 0,
    discount_rate: 0,
    discount_amount: 0,
    notes: null,
    supplier_id: null,
    payment_method: null,
    payment_date: null,
    is_billable: false,
    project_id: null,
    is_reimbursable: false,
    expense_items: [],
    retention_amount: 0,
    currency: 'EUR',
    due_date: null,
};

// ✅ Funció Helper per calcular el total D'UNA LÍNIA
function calculateLineTotal(item: ExpenseItem): number {
    const itemBase = (item.quantity || 0) * (item.unit_price || 0);
    let itemVat = 0;
    let itemRetention = 0;

    (item.taxes || []).forEach(tax => {
        const taxAmount = itemBase * (tax.rate / 100);
        if (tax.type === 'vat') {
            itemVat += taxAmount;
        } else if (tax.type === 'retention') {
            itemRetention += taxAmount;
        }
    });
    
    return itemBase + itemVat - itemRetention;
}

// ✅ Funció Helper per calcular els totals GENERALS
function calculateMainTotals(
  items: ExpenseItem[], 
  discountRate: number
) {
    let subtotal = 0;
    let totalVat = 0;
    let totalRetention = 0;

    (items || []).forEach(item => {
        const itemBase = (item.quantity || 0) * (item.unit_price || 0);
        subtotal += itemBase; // El subtotal general és la suma de les bases
        
        (item.taxes || []).forEach(tax => {
            const taxAmount = itemBase * (tax.rate / 100);
            if (tax.type === 'vat') {
                totalVat += taxAmount;
            } else if (tax.type === 'retention') {
                totalRetention += taxAmount;
            }
        });
    });

    const discountAmount = subtotal * (discountRate / 100);
    const totalAmount = subtotal - discountAmount + totalVat - totalRetention;
    
    return { 
        subtotal, 
        discountAmount, 
        totalVat, 
        totalRetention, 
        totalAmount
    };
}


export function useExpenseDetail({ 
    initialData, 
    isNew, 
    userId, // ✅ Aquests FALTAVEN
    teamId  // ✅ AQUESTS FALTAVEN
}: UseExpenseDetailProps) {
    
    const t = useTranslations('ExpenseDetailPage');
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [formData, setFormData] = useState<ExpenseFormDataForAction>(() => {
        if (initialData) {
             // Calculem els totals de línia inicials
            const initialItems = (initialData.expense_items || []).map(item => ({
                ...item,
                total: calculateLineTotal(item) // 👈 Calculem el total real a l'inici
            }));
            
            return {
                ...defaultInitialData,
                ...initialData,
                id: initialData.id.toString(),
                expense_items: initialItems, // 👈 Assignem els items amb totals correctes
                discount_rate: initialData.discount_rate || 0,
                category_id: initialData.category_id || null,
            };
        }
        return defaultInitialData as ExpenseFormDataForAction;
    });

    const [availableTaxes, setAvailableTaxes] = useState<TaxRate[]>([]);
    const [isLoadingTaxes, setIsLoadingTaxes] = useState(true);
    const [availableCategories, setAvailableCategories] = useState<ExpenseCategory[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(true);

    // ... (useEffect per carregar 'availableTaxes' i 'availableCategories' es queda igual)
    useEffect(() => {
      async function loadInitialData() {
        setIsLoadingTaxes(true);
        setIsLoadingCategories(true);
        const [taxResult, categoryResult] = await Promise.all([
            fetchTaxRatesAction(),
            fetchExpenseCategoriesAction()
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


    // ✅✅✅
    // INICI DE LA CORRECCIÓ DEL BUCLE INFINIT
    // ✅✅✅
    useEffect(() => {
        const { 
            subtotal, 
            discountAmount,
            totalVat, 
            totalRetention, 
            totalAmount
        } = calculateMainTotals( // 👈 Crida a la funció de totals generals
            formData.expense_items,
            formData.discount_rate || 0
        );
        
        // Només actualitzem els totals generals, MAI els 'expense_items' aquí
        setFormData(prev => {
            // Comprovem si els totals han canviat realment abans de cridar 'setState'
            if (
                prev.subtotal === subtotal &&
                prev.discount_amount === discountAmount &&
                prev.tax_amount === totalVat &&
                prev.retention_amount === totalRetention &&
                prev.total_amount === totalAmount
            ) {
                return prev; // No hi ha canvis, evitem el re-render
            }
            
            return {
                ...prev,
                // ❌ NO actualitzem 'expense_items' aquí
                subtotal: subtotal,
                discount_amount: discountAmount,
                tax_amount: totalVat,
                retention_amount: totalRetention,
                total_amount: totalAmount
            };
        });
    // Les dependències ara són correctes
    }, [formData.expense_items, formData.discount_rate]); 
    // ✅✅✅
    // FI DE LA CORRECCIÓ
    // ✅✅✅


    const handleFieldChange = useCallback(<K extends keyof ExpenseFormDataForAction>(field: K, value: ExpenseFormDataForAction[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleItemChange = useCallback(
        <K extends keyof ExpenseItem>(index: number, field: K, value: ExpenseItem[K]) => {
            setFormData(prev => {
                const newItems = [...(prev.expense_items || [])];
                if (!newItems[index]) return prev;

                newItems[index] = { ...newItems[index], [field]: value };
                
                // ✅ Actualitzem el total de la línia aquí
                newItems[index].total = calculateLineTotal(newItems[index]);
                
                return { ...prev, expense_items: newItems };
            });
        },
        []
    );

    const handleItemTaxesChange = useCallback((index: number, taxes: TaxRate[]) => {
        setFormData(prev => {
            const newItems = [...(prev.expense_items || [])];
            if (!newItems[index]) return prev;

            newItems[index] = { ...newItems[index], taxes: taxes };
            
            // ✅ Actualitzem el total de la línia aquí
            newItems[index].total = calculateLineTotal(newItems[index]);
            
            return { ...prev, expense_items: newItems };
        });
    }, []);

    const handleAddItem = useCallback(() => {
        const newItem: ExpenseItem = {
            id: Date.now(),
            expense_id: 0,
            description: "",
            quantity: 1,
            unit_price: 0,
            total: 0, // Es calcularà
            taxes: availableTaxes.filter((t) => t.is_default),
            user_id: userId,
            team_id: teamId,
            category_id: null,
            legacy_category_name: null,
        };
        newItem.total = calculateLineTotal(newItem); // Calculem el total inicial
        setFormData((prev) => ({
            ...prev,
            expense_items: [...(prev.expense_items || []), newItem],
        }));
    }, [availableTaxes, userId, teamId]);

    const handleRemoveItem = useCallback((index: number) => {
        setFormData((prev) => {
            const newItems = [...(prev.expense_items || [])];
            newItems.splice(index, 1);
            return { ...prev, expense_items: newItems };
        });
    }, []);
    
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            const result = await saveExpenseAction(formData, isNew ? null : (formData.id ?? null));
            if (result.success) {
                toast.success(t('toast.saveSuccess'));
                router.push('/finances/expenses'); 
                router.refresh();
            } else {
                toast.error(result.message || t('toast.saveError'));
            }
        });
    }, [formData, isNew, router, t, startTransition]);
    
    const handleCategoryCreated = useCallback((newCategory: ExpenseCategory) => {
        setAvailableCategories(prev => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)));
        handleFieldChange('category_id', newCategory.id);
    }, [handleFieldChange]); // ✅ 'handleFieldChange' és estable gràcies a 'useCallback'

    return {
        isPending,
        formData,
        availableTaxes,
        isLoadingTaxes,
        availableCategories,
        isLoadingCategories,
        handleFieldChange,
        handleSubmit,
        handleItemChange,
        handleItemTaxesChange,
        handleAddItem,
        handleRemoveItem,
        t,
        setFormData,
        handleCategoryCreated
    };
}