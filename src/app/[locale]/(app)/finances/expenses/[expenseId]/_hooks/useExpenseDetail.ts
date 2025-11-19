"use client";

import { useState, useEffect, useTransition, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

// Serveis de càlcul centralitzats
import { calculateDocumentTotals, calculateLineValues, type FinancialItem } from '@/lib/services/finances/calculations';

// Tipus
import { 
  type ExpenseDetail, 
  type ExpenseFormDataForAction, 
  type ExpenseItemForm,
  type ExpenseCategory,

} from '@/types/finances/expenses'; 
import type { TaxRate } from '@/types/finances/index';
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

// ✅ CORRECCIÓ: Definim l'objecte i fem cast al final per evitar errors de tipus estrictes amb camps opcionals/nullables de la BD
const defaultInitialData = {
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
    status: 'pending',
    // Si la BD requereix extra_data i no és opcional en el tipus:
    extra_data: {}, 
} as unknown as ExpenseFormDataForAction; // Cast segur per inicialització

export function useExpenseDetail({ 
    initialData, 
    isNew, 
    userId, 
    teamId 
}: UseExpenseDetailProps) {
    
    const t = useTranslations('ExpenseDetailPage');
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [formData, setFormData] = useState<ExpenseFormDataForAction>(() => {
        if (initialData) {
            // Mapegem els items de la BD al format del form
            const initialItems = (initialData.expense_items || []).map(item => {
                // Calculem valors de línia inicials
                const calc = calculateLineValues({
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    taxes: item.taxes || [],
                    discount_percentage: 0, // Si tens descompte de línia, posa'l aquí
                    discount_amount: 0
                });
                
                return {
                    ...item,
                    taxes: item.taxes || [], 
                    total: calc.finalLineTotal // Utilitzem el càlcul centralitzat
                } as ExpenseItemForm;
            });

            return {
                ...defaultInitialData,
                ...initialData,
                id: initialData.id.toString(),
                expense_items: initialItems, 
                discount_rate: initialData.discount_rate || 0,
                category_id: initialData.category_id || null,
            };
        }
        return defaultInitialData;
    });

    const [availableTaxes, setAvailableTaxes] = useState<TaxRate[]>([]);
    const [isLoadingTaxes, setIsLoadingTaxes] = useState(true);
    const [availableCategories, setAvailableCategories] = useState<ExpenseCategory[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(true);

    useEffect(() => {
      async function loadInitialData() {
        setIsLoadingTaxes(true);
        setIsLoadingCategories(true);
        const [taxResult, categoryResult] = await Promise.all([
            fetchTaxRatesAction(),
            fetchExpenseCategoriesAction()
        ]);
        
        if (taxResult.success && taxResult.data) {
          setAvailableTaxes(taxResult.data as unknown as TaxRate[]);
        } else {
          toast.error(t('toast.loadTaxesError') || 'Error al carregar impostos.');
        }
        setIsLoadingTaxes(false);
        
        if (categoryResult.success && categoryResult.data) {
          setAvailableCategories(categoryResult.data);
        } else {
          toast.error(t('toast.loadCategoriesError') || 'Error al carregar categories.');
        }
        setIsLoadingCategories(false);
      }
      loadInitialData();
    }, [t]);


    // SYNC TOTALS
    useEffect(() => {
        const financialItems: FinancialItem[] = (formData.expense_items || []).map(item => ({
            quantity: item.quantity,
            unit_price: item.unit_price,
            taxes: item.taxes || [], 
            discount_percentage: 0, 
            discount_amount: 0
        }));

        const totals = calculateDocumentTotals(
            financialItems,
            formData.discount_amount || 0, // Si fas servir amount com a input
            0, 
            false 
        );
        
        setFormData((prev: ExpenseFormDataForAction) => {
            const isSame = 
                prev.subtotal === totals.subtotal &&
                prev.tax_amount === totals.taxAmount &&
                prev.retention_amount === totals.retentionAmount &&
                prev.total_amount === totals.totalAmount;
                // Nota: Si discount_amount ve de l'input d'usuari, no l'hauríem de sobreescriure si no ha canviat per càlcul.
                // Si ve de discount_rate, llavors sí.

            if (isSame) return prev; 

            return {
                ...prev,
                subtotal: totals.subtotal,
                // Si el descompte global es calcula via rate, actualitzem l'amount
                // discount_amount: totals.globalDiscountAmount, 
                tax_amount: totals.taxAmount,
                retention_amount: totals.retentionAmount,
                total_amount: totals.totalAmount
            };
        });
    }, [formData.expense_items, formData.discount_amount, formData.discount_rate]); 


    const handleFieldChange = useCallback(<K extends keyof ExpenseFormDataForAction>(field: K, value: ExpenseFormDataForAction[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleItemChange = useCallback(
        <K extends keyof ExpenseItemForm>(index: number, field: K, value: ExpenseItemForm[K]) => {
            setFormData((prev: ExpenseFormDataForAction) => {
                const newItems = [...(prev.expense_items || [])];
                if (!newItems[index]) return prev;

                newItems[index] = { ...newItems[index], [field]: value };
                
                // Recalculem el total de la línia usant la funció centralitzada
                const calc = calculateLineValues({
                    quantity: newItems[index].quantity,
                    unit_price: newItems[index].unit_price,
                    taxes: newItems[index].taxes,
                    discount_percentage: 0,
                    discount_amount: 0
                });
                newItems[index].total = calc.finalLineTotal;
                
                return { ...prev, expense_items: newItems };
            });
        },
        []
    );

    const handleItemTaxesChange = useCallback((index: number, taxes: TaxRate[]) => {
        setFormData((prev: ExpenseFormDataForAction) => {
            const newItems = [...(prev.expense_items || [])];
            if (!newItems[index]) return prev;

            newItems[index] = { ...newItems[index], taxes: taxes };
            
            // Recalculem total
            const calc = calculateLineValues({
                quantity: newItems[index].quantity,
                unit_price: newItems[index].unit_price,
                taxes: taxes,
                discount_percentage: 0,
                discount_amount: 0
            });
            newItems[index].total = calc.finalLineTotal;
            
            return { ...prev, expense_items: newItems };
        });
    }, []);

    const handleAddItem = useCallback(() => {
        const newItem: ExpenseItemForm = {
            id: Date.now(),
            expense_id: 0,
            description: "",
            quantity: 1,
            unit_price: 0,
            total: 0, 
            taxes: availableTaxes.filter((t) => t.is_default),
            user_id: userId,
            team_id: teamId,
            category_id: null,
        };
        
        // Càlcul inicial
        const calc = calculateLineValues({
            quantity: newItem.quantity,
            unit_price: newItem.unit_price,
            taxes: newItem.taxes,
            discount_percentage: 0,
            discount_amount: 0
        });
        newItem.total = calc.finalLineTotal;

        setFormData((prev: ExpenseFormDataForAction) => ({
            ...prev,
            expense_items: [...(prev.expense_items || []), newItem],
        }));
    }, [availableTaxes, userId, teamId]);

    const handleRemoveItem = useCallback((index: number) => {
        setFormData((prev: ExpenseFormDataForAction) => {
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
    }, [formData, isNew, router, t]);
    
    const handleCategoryCreated = useCallback((newCategory: ExpenseCategory) => {
        setAvailableCategories(prev => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)));
        handleFieldChange('category_id', newCategory.id);
    }, [handleFieldChange]); 

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