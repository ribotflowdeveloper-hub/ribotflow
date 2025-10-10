// src/app/[locale]/(app)/finances/despeses/_components/expenses/hooks/useExpenseForm.ts

"use client";

import { useState, useEffect } from 'react';
import type { Expense, Supplier, ExpenseItem, ExpenseFormState , OcrExpenseData} from '@/types/finances/index';

// Aquesta funció ara és vàlida perquè els camps que falten són opcionals
const getInitialExpenseState = (): ExpenseFormState => ({
  supplier_id: null,
  invoice_number: null,
  expense_date: new Date().toISOString(),
  category: null,
  description: "",
  notes: "",
  discount_amount: 0,
  tax_rate: 21,
  expense_items: [{ description: "", quantity: 1, unit_price: 0 }],
  expense_attachments: [],
  subtotal: 0,
  tax_amount: 0,
  total_amount: 0,
});

const mapExpenseToFormState = (exp: Expense): ExpenseFormState => ({
  id: exp.id ?? undefined,
  supplier_id: exp.supplier_id ?? null,
  invoice_number: exp.invoice_number ?? null,
  expense_date: exp.expense_date ?? new Date().toISOString(),
  category: exp.category ?? null,
  description: exp.description ?? "",
  notes: exp.notes ?? "",
  discount_amount: exp.discount_amount ?? 0,
  tax_rate: exp.tax_rate ?? 21,
  expense_items:
    (Array.isArray(exp.expense_items) && exp.expense_items.length > 0)
      ? exp.expense_items
      : [{ description: "", quantity: 1, unit_price: 0 }],
  expense_attachments: exp.expense_attachments ?? [],
  subtotal: exp.subtotal ?? 0,
  tax_amount: exp.tax_amount ?? 0,
  total_amount: exp.total_amount ?? 0,
  created_at: exp.created_at ?? undefined,
  user_id: exp.user_id ?? undefined,
});


// --- El Hook Principal ---

export function useExpenseForm(initialData: Expense | null, suppliers: Supplier[], isOpen: boolean) {
    
    // --- Estats del formulari ---
    const [currentExpense, setCurrentExpense] = useState<ExpenseFormState>(getInitialExpenseState());
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [comboboxOpen, setComboboxOpen] = useState(false);
    
    // --- Efectes per sincronitzar l'estat ---

    // Efecte per inicialitzar o reiniciar el formulari quan s'obre el diàleg
    useEffect(() => {
        if (isOpen) {
            const newState = initialData ? mapExpenseToFormState(initialData) : getInitialExpenseState();
            setCurrentExpense(newState);

            if (newState.supplier_id) {
                setSelectedSupplier(suppliers.find((s) => s.id === newState.supplier_id) ?? null);
            } else {
                setSelectedSupplier(null);
            }
        }
    }, [initialData, isOpen, suppliers]);

    // Efecte per recalcular els totals automàticament
    useEffect(() => {
        const items = currentExpense.expense_items ?? [];
        const subtotal = items.reduce(
            (acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
            0
        );
        const discount = Number(currentExpense.discount_amount || 0);
        const taxRate = Number(currentExpense.tax_rate ?? 21);
        const baseImposable = subtotal - discount;
        const taxAmount = baseImposable * (taxRate / 100);
        const totalAmount = baseImposable + taxAmount;

        setCurrentExpense((prev) => ({
            ...prev,
            subtotal,
            tax_amount: taxAmount,
            total_amount: totalAmount,
        }));
    }, [currentExpense.expense_items, currentExpense.tax_rate, currentExpense.discount_amount]);

    // --- Gestors d'esdeveniments (Handlers) ---

    const handleItemChange = (index: number, field: keyof ExpenseItem, value: string | number) => {
        setCurrentExpense((prev) => {
            const items = [...prev.expense_items];
            items[index] = { ...items[index], [field]: value };
            return { ...prev, expense_items: items };
        });
    };

    const addItem = () => {
        setCurrentExpense((prev) => ({
            ...prev,
            expense_items: [...prev.expense_items, { description: "", quantity: 1, unit_price: 0 }],
        }));
    };

    const removeItem = (index: number) => {
        setCurrentExpense((prev) => ({
            ...prev,
            expense_items: prev.expense_items.filter((_, i) => i !== index),
        }));
    };
    


    const updateFormWithOcrData = (data: OcrExpenseData) => {
        const newItems: ExpenseItem[] = Array.isArray(data.expense_items)
            ? data.expense_items.map((item) => ({
                description: typeof item.description === "string" ? item.description : "",
                quantity: Number(item.quantity ?? 1),
                unit_price: Number(item.unit_price ?? 0),
            }))
            : [{ description: "", quantity: 1, unit_price: 0 }];

        const partialUpdate: Partial<ExpenseFormState> = {
            expense_items: newItems,
            expense_date: data.issue_date ? new Date(data.issue_date).toISOString() : undefined,
            description: data.description ? String(data.description) : undefined,
            invoice_number: data.invoice_number ? String(data.invoice_number) : undefined,
        };
        
        // Filtrem per no sobreescriure camps amb 'undefined'
        const update = Object.fromEntries(Object.entries(partialUpdate).filter(([, v]) => v !== undefined));

        setCurrentExpense((prev) => ({ ...prev, ...update }));
    };

    // --- Retornem l'estat i les funcions que el component necessitarà ---
    return {
        currentExpense,
        setCurrentExpense,
        selectedSupplier,
        setSelectedSupplier,
        comboboxOpen,
        setComboboxOpen,
        handleItemChange,
        addItem,
        removeItem,
        updateFormWithOcrData,
    };
}