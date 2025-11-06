"use client";

import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Save, FileText, AlertTriangle, ArrowLeft, TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

// Tipus
import { type ExpenseDetail, type ExpenseAttachment} from '@/types/finances/expenses';
import { type UsageCheckResult } from '@/lib/subscription/subscription';

// Hooks i Components
import { useExpenseDetail } from '../_hooks/useExpenseDetail';
import { ExpenseItemsEditor } from './ExpenseItemsEditor';
import { ExpenseAttachmentCard } from './ExpenseAttachmentCard';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { SupplierCombobox } from './SupplierCombobox';
import { ExpenseAttachmentUploader } from './ExpenseAttachmentUploader';
import {  AlertDialog, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { PageHeader } from '@/components/shared/PageHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui';

// Interfície de Props (correcta de la resposta anterior)
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

    const {
        isPending,
        formData,
        handleFieldChange,
        handleSubmit,
        handleItemChange,
        handleAddItem,
        handleRemoveItem,
    } = useExpenseDetail({ initialData, isNew, userId, teamId });

    const [attachments, setAttachments] = useState<ExpenseAttachment[]>(
        initialData?.expense_attachments || []
    );

    const isSaving = isPending;
    const expenseTitle = title;
    const locale = 'ca'; // O idealment `useLocale()`

    const isLimitExceeded = !isNew && limitStatus && !limitStatus.allowed;

    const handleUploadSuccess = (newAttachment: ExpenseAttachment) => {
        setAttachments((prev) => [...prev, newAttachment]);
    };

    const handleDeleteSuccess = (attachmentId: string) => {
        setAttachments((prev) => prev.filter(att => att.id !== attachmentId));
    };

    // ✅ AQUESTA ÉS LA FUNCIÓ QUE ARA S'UTILITZARÀ
    const handleBackOrCancel = () => {
        if (fromUrl) {
            router.push(fromUrl);
        } else {
            router.push('/finances/expenses');
        }
    };

    return (
        <div className="flex flex-col gap-4 h-full">
            
            {/* Alerta de límit (només en edició) */}
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
                
                {/* ✅ CORRECCIÓ AQUÍ: Eliminem 'showBackButton' i afegim el botó com a 'child' */}
                <PageHeader 
                    title={expenseTitle} 
                    description={description} 
                    // ❗ 'showBackButton' eliminat
                >
                    {/* ✅ Aquest és el botó de tornar correcte */}
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
                    
                    {/* Botó de desar */}
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        {isSaving ? tShared('actions.saving') : tShared('actions.save')}
                    </Button>
                </PageHeader>

                {/* Contingut Principal: Grid (2/3 + 1/3) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    
                    {/* Columna Esquerra (Formulari Principal) - 2/3 */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Targeta 1: Detalls Bàsics */}
                        <Card>
                            <CardHeader><CardTitle>{t('card.generalDetails')}</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Proveïdor (Selector) */}
                                    <div className="space-y-2">
                                        <Label htmlFor="supplier_id">{t('field.supplier')}</Label>
                                        <SupplierCombobox
                                            value={formData.supplier_id}
                                            onChange={(value) => handleFieldChange('supplier_id', value)}
                                            initialSupplier={initialData?.suppliers ? { id: String(initialData.suppliers.id), nom: initialData.suppliers.nom } : null}
                                            disabled={isSaving}
                                        />
                                    </div>
                                    {/* Data de la Despesa */}
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
                                 <div className="space-y-2">
                                     <Label htmlFor="invoice_number">{t('field.invoiceNumber')}</Label>
                                     <Input id="invoice_number" value={formData.invoice_number || ''} onChange={(e) => handleFieldChange('invoice_number', e.target.value)} disabled={isSaving} placeholder={t('placeholder.invoiceNumber')} />
                                 </div>
                                 <div className="space-y-2">
                                     <Label htmlFor="description">{t('field.description')}</Label>
                                     <Textarea id="description" value={formData.description} onChange={(e) => handleFieldChange('description', e.target.value)} disabled={isSaving} rows={3} placeholder={t('placeholder.description')} />
                                 </div>
                            </CardContent>
                        </Card>

                        {/* Targeta 2: Conceptes/Línies d'Article */}
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
                                    onItemChange={handleItemChange}
                                    onRemoveItem={handleRemoveItem}
                                    isSaving={isSaving}
                                />
                            </CardContent>
                        </Card>

                        {/* Targeta 3: Notes Adicionals */}
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

                    {/* Columna Dreta (Metadades i Totals) - 1/3 */}
                    <div className="lg:col-span-1 space-y-4">
                        {/* Targeta 4: Totals i Impostos */}
                        <Card>
                            <CardHeader><CardTitle>{t('card.totals')}</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                            <div className="flex justify-between items-center">
                                <Label>{t('label.subtotal')}</Label>
                                <span className="font-medium">{formatCurrency(formData.subtotal, 'EUR', locale)}</span>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="discount_amount">{t('field.discount')}</Label>
                                <Input
                                id="discount_amount"
                                type="number"
                                value={formData.discount_amount || 0}
                                onChange={(e) => handleFieldChange('discount_amount', parseFloat(e.target.value) || 0)}
                                disabled={isSaving}
                                step="0.01"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="tax_rate">{t('field.taxRate')}</Label>
                                <div className="flex items-center space-x-2">
                                <Input
                                    id="tax_rate"
                                    type="number"
                                    value={formData.tax_rate || 0}
                                    onChange={(e) => handleFieldChange('tax_rate', parseFloat(e.target.value) || 0)}
                                    disabled={isSaving}
                                    step="0.01"
                                />
                                <span className='font-mono text-sm text-muted-foreground'>({formatCurrency(formData.tax_amount, 'EUR', locale)})</span>
                                </div>
                            </div>
                            <div className="pt-2 border-t mt-4 flex justify-between items-center">
                                <Label className="text-lg font-bold">{t('label.total')}</Label>
                                <span className="text-xl font-extrabold text-primary">{formatCurrency(formData.total_amount, 'EUR', locale)}</span>
                            </div>
                            </CardContent>
                        </Card>

                        {/* Targeta 5: Adjunts (Documents) */}
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
                                <AlertDialog>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDialogTitle>Desa la despesa</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Primer has de desar la despesa abans de poder pujar adjunts.
                                    </AlertDialogDescription>
                                </AlertDialog>
                            ) : (
                                <ExpenseAttachmentUploader
                                expenseId={initialData!.id} 
                                onUploadSuccess={handleUploadSuccess}
                                />
                            )}
                            </CardContent>
                        </Card>

                        {/* Targeta 6: Informació de Creació (Solo mode Edició) */}
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
            </form>
        </div>
    );
}