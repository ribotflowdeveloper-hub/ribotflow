"use client";

import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Save, FileText, AlertTriangle, ArrowLeft, TriangleAlert, Sparkles } from 'lucide-react'; // ✅ Importem Sparkles
import { useTranslations } from 'next-intl';
import Link from 'next/link';
// Tipus
import {
    type ExpenseDetail,
    type ExpenseAttachment,
    type ExpenseItem,
    type ExpensesAnalysisData,
    type AnalyzedExpenseItem
} from '@/types/finances/index'; // ✅ Importem des de l'index
import { type UsageCheckResult } from '@/lib/subscription/subscription';
// ✅ AFEGIR Imports per al nou 'Select'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectGroup, // 👈 AFEGIR
} from "@/components/ui/select";
// Hooks i Components
import { useExpenseDetail } from '../_hooks/useExpenseDetail';
import { ExpenseItemsEditor } from './ExpenseItemsEditor';
import { ExpenseAttachmentCard } from './ExpenseAttachmentCard';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { SupplierCombobox } from './SupplierCombobox';
import { ExpenseAttachmentUploader } from './ExpenseAttachmentUploader';
import { PageHeader } from '@/components/shared/PageHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // ✅ Corregit import
import { ExpenseAIAnalyzer } from './ExpenseAIAnalyzer';
import { CreateCategoryDialog } from './CreateCategoryDialog'; // 👈 AFEGIR

interface ExpenseDetailClientProps {
    initialData: ExpenseDetail | null;
    isNew: boolean;
    userId: string;
    teamId: string;
    title: string;
    description: string;
    limitStatus: UsageCheckResult | null;
}

export function ExpenseDetailClient({
    initialData,
    isNew,
    userId,
    teamId,
    title,
    description,
    limitStatus
}: ExpenseDetailClientProps) {

    const router = useRouter();
    const searchParams = useSearchParams();
    const fromUrl = searchParams.get('from');

    const t = useTranslations('ExpenseDetailPage');
    const tShared = useTranslations('Shared');
    const t_billing = useTranslations('Shared.limits');

    // ✅ 1. DESESTRUCTURACIÓ DEL HOOK (ACTUALITZADA)
    // Recollim els nous valors del hook
    const {
        isPending,
        formData,
        availableTaxes,      // 👈 NOU
        isLoadingTaxes,      // 👈 NOU
        availableCategories, // 👈 NOU
        isLoadingCategories, // 👈 NOU
        handleFieldChange,
        handleSubmit,
        handleItemChange,
        handleItemTaxesChange, // 👈 NOU
        handleAddItem,
        handleRemoveItem,
        setFormData,
        handleCategoryCreated, // 👈 NOU
    } = useExpenseDetail({ initialData, isNew, userId, teamId });

    const [attachments, setAttachments] = useState<ExpenseAttachment[]>(
        initialData?.expense_attachments || []
    );

    const isSaving = isPending;
    const locale = 'ca';
    const [isCategoryDialogOpen, setCategoryDialogOpen] = useState(false);
    const isLimitExceeded = !isNew && limitStatus && !limitStatus.allowed;

    const handleUploadSuccess = (newAttachment: ExpenseAttachment) => {
        setAttachments((prev) => [...prev, newAttachment]);
    };

    const handleDeleteSuccess = (attachmentId: string) => {
        setAttachments((prev) => prev.filter(att => att.id !== attachmentId));
    };

    const handleBackOrCancel = () => {
        if (fromUrl) {
            router.push(fromUrl);
        } else {
            router.push('/finances/expenses');
        }
    };

    // ✅ 2. LÒGICA DE L'IA (ACTUALITZADA)
    // Ara assigna els impostos per defecte
    const handleAnalysisComplete = (data: ExpensesAnalysisData) => {

        const newItems: ExpenseItem[] = (data.items || []).map((item: AnalyzedExpenseItem, index: number) => ({
            id: Date.now() + index,
            expense_id: 0,
            description: item.description || '',
            quantity: item.quantity || 1,
            unit_price: item.unit_price || 0,
            total: (item.quantity || 1) * (item.unit_price || 0),
            taxes: availableTaxes.filter(t => t.is_default), // 👈 Assignem impostos per defecte
            user_id: userId,
            team_id: teamId,
            category_id: formData.category_id || null,
        }));

        setFormData(prev => {
            // Calculem els totals basant-nos en els nous items i impostos
            let subtotal = 0;
            let totalVat = 0;
            let totalRetention = 0;

            newItems.forEach(item => {
                const itemBase = (item.quantity || 0) * (item.unit_price || 0);
                subtotal += itemBase;
                (item.taxes || []).forEach(tax => {
                    const taxAmount = itemBase * (tax.rate / 100);
                    if (tax.type === 'vat') totalVat += taxAmount;
                    else if (tax.type === 'retention') totalRetention += taxAmount;
                });
            });

            const effectiveSubtotal = subtotal - (prev.discount_amount || 0);

            // Prioritzem els totals de l'IA si existeixen
            const finalTaxAmount = data.tax_amount ?? totalVat;
            const finalTotalAmount = data.total_amount ?? (effectiveSubtotal + finalTaxAmount - totalRetention);

            return {
                ...prev,
                description: data.supplier_name ? `Factura de ${data.supplier_name}` : (prev.description || ''),
                supplier_id: data.supplier_id || prev.supplier_id,
                expense_date: data.invoice_date || prev.expense_date,
                invoice_number: data.invoice_number || prev.invoice_number,

                // Assignem els nous totals calculats
                total_amount: finalTotalAmount,
                tax_amount: finalTaxAmount, // Total IVA
                retention_amount: totalRetention, // Total IRPF
                subtotal: subtotal,

                expense_items: newItems.length > 0 ? newItems : prev.expense_items,

                // Eliminem la dependència del 'tax_rate' antic
                // legacy_tax_rate: data.tax_rate ?? prev.legacy_tax_rate, 
            };
        });
    };

    return (
        <div className="flex flex-col gap-4 h-full">

            {isLimitExceeded && (
                <Alert variant="destructive" className="border-yellow-400 bg-yellow-50 text-yellow-900">
                    <TriangleAlert className="h-4 w-4 text-yellow-900" />
                    <AlertTitle className="font-semibold">
                        {t_billing('modalTitle', { default: 'Límit assolit' })}
                    </AlertTitle>
                    <AlertDescription className="text-xs">
                        {limitStatus.error || t_billing('expensesPerMonth', { current: limitStatus.current, max: limitStatus.max })}
                        <Button asChild variant="link" size="sm" className="px-1 h-auto py-0 text-yellow-900 font-semibold underline">
                            <Link href={`/${locale}/settings/billing`}>{t_billing('upgradeButton')}</Link>
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

                <PageHeader
                    title={title}
                    description={description}
                >
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleBackOrCancel}
                        disabled={isSaving}
                        aria-label={tShared('actions.back')}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>

                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        {isSaving ? tShared('actions.saving') : tShared('actions.save')}
                    </Button>
                </PageHeader>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                    <div className="lg:col-span-2 space-y-4">
                        {(isNew || (formData.expense_items || []).length === 0) && (
                            <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
                                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-800 dark:text-blue-300">
                                        <Sparkles className="h-4 w-4" />
                                        {t('aiHelperTitle') || 'Assistent IA'}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-muted-foreground mb-4">
                                        {t('aiHelperText') || 'Puja una imatge (PNG/JPEG) i omplirem la despesa per tu.'}
                                    </p>
                                    <ExpenseAIAnalyzer
                                        isSaving={isSaving}
                                        onAnalysisComplete={handleAnalysisComplete}
                                    />
                                </CardContent>
                            </Card>
                        )}

                        {/* ✅ 2. TARGETA DETALLS (ACTUALITZADA) */}
                        <Card>
                            <CardHeader><CardTitle>{t('card.generalDetails')}</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Proveïdor */}
                                    <div className="space-y-2">
                                        <Label htmlFor="supplier_id">{t('field.supplier')}</Label>
                                        <SupplierCombobox
                                            value={formData.supplier_id}
                                            onChange={(value) => handleFieldChange('supplier_id', value)}
                                            initialSupplier={initialData?.suppliers ? { id: String(initialData.suppliers.id), nom: initialData.suppliers.nom } : null}
                                            disabled={isSaving}
                                        />
                                    </div>
                                    {/* Data */}
                                    <div className="space-y-2">
                                        <Label htmlFor="expense_date">{t('field.expenseDate')}</Label>
                                        <Input
                                            id="expense_date"
                                            type="date"
                                            value={formData.expense_date}
                                            onChange={(e) => handleFieldChange('expense_date', e.target.value)}
                                            disabled={isSaving}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* N. Factura */}
                                    <div className="space-y-2">
                                        <Label htmlFor="invoice_number">{t('field.invoiceNumber')}</Label>
                                        <Input id="invoice_number" value={formData.invoice_number || ''} onChange={(e) => handleFieldChange('invoice_number', e.target.value)} disabled={isSaving} placeholder={t('placeholder.invoiceNumber')} />
                                    </div>

                                    {/* ✅ AFEGIT: Categoria (ara amb Diàleg) */}
                                    <div className="space-y-2">
                                        <Label htmlFor="category_id">{t('field.category')}</Label>
                                        <Select
                                            value={formData.category_id || ''}
                                            onValueChange={(value) => {
                                                if (value === 'create_new') {
                                                    setCategoryDialogOpen(true);
                                                } else {
                                                    handleFieldChange('category_id', value || null);
                                                }
                                            }}
                                            disabled={isSaving || isLoadingCategories}
                                        >
                                            <SelectTrigger id="category_id">
                                                <SelectValue placeholder={
                                                    isLoadingCategories 
                                                    ? t('loading') || 'Carregant...' 
                                                    : t('placeholder.selectCategory') || 'Selecciona una categoria'
                                                } />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="create_new" className="text-blue-600">
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    {t('categories.createNew') || 'Crear nova categoria...'}
                                                </SelectItem>
                                                <SelectGroup>
                                                    {availableCategories.map(category => (
                                                        <SelectItem key={category.id} value={category.id}>
                                                            {category.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                        
                                    </div>
                                </div>



                                <div className="space-y-2">
                                    <Label htmlFor="description">{t('field.description')}</Label>
                                    <Textarea id="description" value={formData.description || ''} onChange={(e) => handleFieldChange('description', e.target.value)} disabled={isSaving} rows={3} placeholder={t('placeholder.description')} />
                                </div>
                            </CardContent>
                        </Card>

                        {/* ✅ 3. EDITOR D'ITEMS (ACTUALITZAT) */}
                        {/* Passem les noves props al component fill */}
                        <Card>
                            <CardHeader className='flex-row justify-between items-center'>
                                <CardTitle>{t('card.expenseItems')}</CardTitle>
                                <Button type="button" size="sm" variant="outline" onClick={handleAddItem} disabled={isSaving}>
                                    <Plus className="w-4 h-4 mr-2" /> {t('button.addItem')}
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <ExpenseItemsEditor
                                    items={formData.expense_items || []}
                                    availableTaxes={availableTaxes}
                                    isLoadingTaxes={isLoadingTaxes}
                                    onItemChange={handleItemChange}
                                    onItemTaxesChange={handleItemTaxesChange}
                                    onRemoveItem={handleRemoveItem}
                                    isSaving={isSaving}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>{t('card.notes')}</CardTitle></CardHeader>
                            <CardContent>
                                <Textarea
                                    id="notes"
                                    value={formData.notes || ''}
                                    onChange={(e) => handleFieldChange('notes', e.target.value)}
                                    disabled={isSaving}
                                    rows={4}
                                    placeholder={t('placeholder.notes')}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-1 space-y-4">

                        {/* ✅ 3. TARGETA TOTALS (ACTUALITZADA) */}
                        <Card>
                            <CardHeader><CardTitle>{t('card.totals')}</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <Label>{t('label.subtotal')}</Label>
                                    <span className="font-medium">{formatCurrency(formData.subtotal, 'EUR', locale)}</span>
                                </div>

                                {/* Descompte (Percentatge) */}
                                <div className="space-y-1">
                                    <Label htmlFor="discount_rate">{t('field.discount')}</Label>
                                    <div className="flex items-center space-x-2">
                                        <Input
                                            id="discount_rate"
                                            type="number"
                                            // ✅ CORRECCIÓ:
                                            // Si el valor és 0, mostra '', altrament mostra el valor.
                                            // Això evita el '0' inicial i permet que el placeholder es vegi.
                                            value={formData.discount_rate === 0 ? '' : formData.discount_rate || ''}
                                            placeholder="0" // Placeholder per quan estigui buit
                                            onChange={(e) => handleFieldChange('discount_rate', parseFloat(e.target.value) || 0)}
                                            disabled={isSaving}
                                            step="0.01"
                                            className="w-2/3"
                                        />
                                        <span className='font-mono text-sm text-muted-foreground w-1/3 text-right'>
                                            %
                                            ({formatCurrency(formData.discount_amount, 'EUR', locale)})
                                        </span>
                                    </div>
                                </div>

                                {/* Total IVA */}
                                <div className="flex justify-between items-center text-sm">
                                    <Label>{t('label.tax') || 'Impostos (IVA)'}</Label>
                                    <span className="font-medium">
                                        {formatCurrency(formData.tax_amount, 'EUR', locale)}
                                    </span>
                                </div>

                                {/* Total Retencions */}
                                <div className="flex justify-between items-center text-sm">
                                    <Label>{t('label.retention') || 'Retencions (IRPF)'}</Label>
                                    <span className="font-medium text-red-600">
                                        -{formatCurrency(formData.retention_amount, 'EUR', locale)}
                                    </span>
                                </div>

                                <div className="pt-2 border-t mt-4 flex justify-between items-center">
                                    <Label className="text-lg font-bold">{t('label.total')}</Label>
                                    <span className="text-xl font-extrabold text-primary">
                                        {formatCurrency(formData.total_amount, 'EUR', locale)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* ✅ 5. TARGETA D'ADJUNTS (ACTUALITZADA) */}
                        {/* Petita correcció: 'initialData!.id' només si no és 'isNew' */}
                        <Card>
                            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />{t('card.attachments')}</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                {attachments.length > 0 ? (
                                    attachments.map(attachment => (
                                        <ExpenseAttachmentCard
                                            key={attachment.id}
                                            attachment={attachment}
                                            onDeleteSuccess={handleDeleteSuccess}
                                        />
                                    ))
                                ) : (
                                    !isNew && <p className="text-sm text-muted-foreground">No hi ha adjunts.</p>
                                )}

                                {isNew ? (
                                    <div className="text-sm text-muted-foreground p-4 text-center border-dashed border rounded-lg">
                                        <AlertTriangle className="h-4 w-4 mx-auto mb-2" />
                                        <p>{t('alert.saveToUpload') || 'Primer has de desar la despesa per poder pujar adjunts.'}</p>
                                    </div>
                                ) : (
                                    <ExpenseAttachmentUploader
                                        expenseId={initialData!.id}
                                        onUploadSuccess={handleUploadSuccess}
                                    />
                                )}
                            </CardContent>
                        </Card>

                        {!isNew && initialData && (
                            <Card>
                                <CardHeader><CardTitle>{t('card.metadata')}</CardTitle></CardHeader>
                                <CardContent className="space-y-2 text-sm text-muted-foreground">
                                    <p><strong>{t('metadata.id')}:</strong> {initialData.id}</p>
                                    <p><strong>{t('metadata.createdBy')}:</strong> {initialData.user_id}</p>
                                    <p><strong>{t('metadata.createdAt')}:</strong> {formatDate(initialData.created_at, locale)}</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </form >
            {/* ✅ NOU: Component del Diàleg (fora del form) */}
            <CreateCategoryDialog
                open={isCategoryDialogOpen}
                onOpenChange={setCategoryDialogOpen}
                onCategoryCreated={handleCategoryCreated}
            />
        </div >
    );
}