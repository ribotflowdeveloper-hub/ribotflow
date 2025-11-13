// src/app/[locale]/(app)/finances/expenses/[expenseId]/_hooks/useExpenseDetail.ts
import { useState, useEffect, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import { 
  type ExpenseDetail, 
  type ExpenseFormDataForAction, 
  type ExpenseItem,
  type TaxRate // 👈 AFEGIR
} from '@/types/finances/index'; // Assegura't que importes 'TaxRate'
import { saveExpenseAction, fetchTaxRatesAction } from '../actions'; // 👈 AFEGIR 'fetchTaxRatesAction'

interface UseExpenseDetailProps {
    initialData: ExpenseDetail | null;
    isNew: boolean;
    userId: string;
    teamId: string;
}

// ✅ MODIFICAT: Eliminem 'legacy' i afegim els nous camps
const defaultInitialData: Omit<ExpenseFormDataForAction, 'status'> = {
    id: 'new',
    description: '',
    total_amount: 0,
    expense_date: new Date().toISOString().split('T')[0],
    category: null,
    invoice_number: null,
    tax_amount: 0, // Total IVA
    subtotal: 0,
    discount_amount: 0,
    notes: null,
    supplier_id: null,
    payment_method: null,
    payment_date: null,
    is_billable: false,
    project_id: null,
    is_reimbursable: false,
    expense_items: [],
    retention_amount: 0, // Total IRPF
    currency: 'EUR', 
    due_date: null, 
};

export function useExpenseDetail({ 
    initialData, 
    isNew, 
  
}: UseExpenseDetailProps) {
    
    const t = useTranslations('ExpenseDetailPage');
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // ✅ MODIFICAT: Assegurem que les dades inicials tinguin el format correcte
    const [formData, setFormData] = useState<ExpenseFormDataForAction>(() => {
        if (initialData) {
            return { 
                // Comencem amb el 'default' per assegurar que tots els camps nous hi són
                ...defaultInitialData, 
                // Sobre-escrivim amb les dades de la BBDD
                ...initialData, 
                id: initialData.id.toString(),
                // Assegurem que 'expense_items' no és null
                expense_items: initialData.expense_items || [] 
            };
        }
        return defaultInitialData as ExpenseFormDataForAction;
    });

    // ✅ NOU: Estat per al catàleg d'impostos
    const [availableTaxes, setAvailableTaxes] = useState<TaxRate[]>([]);
    const [isLoadingTaxes, setIsLoadingTaxes] = useState(true);

    // ✅ NOU: Obtenim els impostos de l'equip en carregar
    useEffect(() => {
      async function loadTaxes() {
        setIsLoadingTaxes(true);
        const result = await fetchTaxRatesAction();
        if (result.success && result.data) {
          setAvailableTaxes(result.data);
        } else {
          toast.error(t('toast.loadTaxesError') || 'Error al carregar els impostos.');
        }
        setIsLoadingTaxes(false);
      }
      loadTaxes();
    }, [t]);


    // ✅ REESCRIT: Lògica de càlcul de totals
    const calculateTotals = (
      items: ExpenseItem[], 
      discount: number
    ): { 
      subtotal: number, 
      totalVat: number, 
      totalRetention: number, 
      totalAmount: number 
    } => {
        let subtotal = 0;
        let totalVat = 0;
        let totalRetention = 0;

        (items || []).forEach(item => { // Afegim un 'guard' per si 'items' és undefined
            const itemBase = (item.quantity || 0) * (item.unit_price || 0);
            subtotal += itemBase;
            
            (item.taxes || []).forEach(tax => { // Afegim un 'guard' per si 'taxes' és undefined
                const taxAmount = itemBase * (tax.rate / 100);
                if (tax.type === 'vat') {
                    totalVat += taxAmount;
                } else if (tax.type === 'retention') {
                    totalRetention += taxAmount;
                }
            });
        });

        const effectiveSubtotal = subtotal - (discount || 0);
        
        if (effectiveSubtotal <= 0) {
            totalVat = 0;
            totalRetention = 0;
        }

        const totalAmount = effectiveSubtotal + totalVat - totalRetention;
        
        return { subtotal, totalVat, totalRetention, totalAmount };
    };

    // ✅ MODIFICAT: 'useEffect' per recalcular totals
    useEffect(() => {
        const { subtotal, totalVat, totalRetention, totalAmount } = calculateTotals(
            formData.expense_items,
            formData.discount_amount || 0
        );
        
        setFormData(prev => ({
            ...prev,
            subtotal: subtotal,
            tax_amount: totalVat,
            retention_amount: totalRetention,
            total_amount: totalAmount
        }));
    }, [formData.expense_items, formData.discount_amount]);

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

    // ✅ NOU: Handler per canviar els impostos d'un item
    const handleItemTaxesChange = (index: number, taxes: TaxRate[]) => {
      const newItems = [...(formData.expense_items || [])];
      if (!newItems[index]) return;

      newItems[index] = { ...newItems[index], taxes: taxes };
      
      setFormData(prev => ({ ...prev, expense_items: newItems }));
    };

    const handleAddItem = () => {
        const newItem: ExpenseItem = {
            id: Date.now(),
            expense_id: 0,
            description: '',
            quantity: 1,
            unit_price: 0,
            total: 0,
            taxes: availableTaxes.filter(t => t.is_default), // Apliquem impostos per defecte
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
            const result = await saveExpenseAction(formData, isNew ? null : (formData.id ?? null));
            if (result.success) {
                toast.success(t('toast.saveSuccess'));
                router.push('/finances/expenses'); 
                router.refresh();
            } else {
                toast.error(result.message || t('toast.saveError'));
            }
        });
    };

    return {
        isPending,
        formData,
        availableTaxes, // 👈 RETORNAR
        isLoadingTaxes, // 👈 RETORNAR
        handleFieldChange,
        handleSubmit,
        handleItemChange,
        handleItemTaxesChange, // 👈 RETORNAR
        handleAddItem,
        handleRemoveItem,
        t,
        setFormData,
    };
}