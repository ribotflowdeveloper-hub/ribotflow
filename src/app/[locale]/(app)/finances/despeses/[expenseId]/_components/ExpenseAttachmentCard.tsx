// src/app/[locale]/(app)/finances/despeses/[expenseId]/_components/ExpenseAttachmentCard.tsx
"use client";

import React from 'react';
import { FileText, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExpenseAttachment } from '@/types/finances/expenses';
import { useTranslations } from 'next-intl';

interface ExpenseAttachmentCardProps {
    attachment: ExpenseAttachment;
    // L'ID de la despesa és útil per a la lògica d'eliminació/descàrrega
    expenseId: number; 
    // Assumim una funció d'eliminació passada com a prop o injectada amb un hook
    onDelete?: (attachmentId: string) => void;
}

/**
 * Component per visualitzar i gestionar un adjunt d'una despesa.
 * ✅ El Per Què: Centralitza la lògica de previsualització, descàrrega i eliminació 
 * d'adjunts de Supabase Storage, mantenint net el component pare.
 */
export function ExpenseAttachmentCard({ attachment, onDelete }: ExpenseAttachmentCardProps) {
    const t = useTranslations('ExpenseDetail.attachments');
    
    // URL simulada de Supabase Storage
    const downloadUrl = `/api/attachments/download?path=${attachment.file_path}&filename=${attachment.filename}`; 

    return (
        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
            <div className="flex items-center space-x-3 truncate">
                <FileText className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm font-medium truncate" title={attachment.filename}>
                    {attachment.filename}
                </span>
            </div>
            <div className="flex space-x-2 shrink-0">
                <Button asChild variant="ghost" size="icon" title={t('download')}>
                    <a href={downloadUrl} download>
                        <Download className="w-4 h-4" />
                    </a>
                </Button>
                {onDelete && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        title={t('delete')} 
                        onClick={() => onDelete(attachment.id)}
                    >
                        <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                )}
            </div>
        </div>
    );
}