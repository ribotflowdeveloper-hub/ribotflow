// @/app/[locale]/(app)/crm/contactes/[id]/_components/DeleteConfirmationDialog.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import {
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose, // Utilitzem DialogClose per al botó de cancel·lar
} from "@/components/ui/dialog";
import { Loader2, Trash } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Props {
    onConfirm: () => void;
    isPending: boolean;
}

export function DeleteConfirmationDialog({ onConfirm, isPending }: Props) {
    const t = useTranslations('ContactDetailPage');
    return (
        <DialogContent className="sm:max-w-lg">
            <DialogHeader className="space-y-4 text-center">
                <Trash className="w-12 h-12 mx-auto text-red-600" />
                <DialogTitle className="text-2xl font-bold text-red-600">{t('deleteDialog.title')}</DialogTitle>
                <DialogDescription className="text-base text-muted-foreground">
                    {t('deleteDialog.description1')} <span className="font-semibold text-red-600">{t('deleteDialog.irreversible')}</span>. {t('deleteDialog.description2')}
                </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex justify-end gap-3">
                <DialogClose asChild>
                    <Button variant="outline">{t('buttons.cancel')}</Button>
                </DialogClose>
                <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('buttons.confirmDelete')}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}