"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { createContactAction } from '../actions';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
//import { CONTACT_STATUS_MAP } from '@/types/crm';

import { CONTACT_STATUS_MAP } from '@/config/contacts';


// Props que el nostre diàleg acceptarà
interface ContactDialogProps {
    trigger: React.ReactNode; // El botó o element que obrirà el diàleg
    initialData?: {          // Dades opcionals per a pre-omplir el formulari
        nom?: string | null;
        email?: string | null;
    };
    onContactSaved?: (newContact: unknown) => void; // Funció que s'executa quan es desa
}

export function ContactDialog({ trigger, initialData, onContactSaved }: ContactDialogProps) {
    const t = useTranslations('ContactsClient');
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const formRef = React.useRef<HTMLFormElement>(null);

    // Reseteja el formulari cada vegada que s'obre per a asegurar dades fresques
    useEffect(() => {
        if (isOpen) {
            formRef.current?.reset();
        }
    }, [isOpen]);

    const handleFormAction = (formData: FormData) => {
        startTransition(async () => {
            const result = await createContactAction(formData);
            if (result.error) {
                toast.error(t('toastErrorTitle'), { description: result.error.message });
            } else if (result.data) {
                toast.success(t('toastSuccessTitle'), { description: t('toastSuccessDescription') });
                setIsOpen(false);
                onContactSaved?.(result.data); // Cridem el callback amb el nou contacte
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('dialogTitle')}</DialogTitle>
                    <DialogDescription>{t('dialogDescription')}</DialogDescription>
                </DialogHeader>
                <form ref={formRef} action={handleFormAction} className="space-y-4 pt-4">
                    <Input name="nom" placeholder={t('namePlaceholder')} required defaultValue={initialData?.nom ?? ''} />
                    <Input name="empresa" placeholder={t('companyPlaceholder')} />
                    <Input name="email" type="email" placeholder={t('emailPlaceholder')} required defaultValue={initialData?.email ?? ''} />
                    <Input name="telefon" placeholder={t('phonePlaceholder')} />
                    <Input name="valor" type="number" placeholder={t('valuePlaceholder')} defaultValue={0} />
                    <Select name="estat" defaultValue="Lead">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {CONTACT_STATUS_MAP.map(status => (
                                <SelectItem key={status.code} value={status.code}>
                                    {t(`contactStatuses.${status.key}`)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">{t('cancelButton')}</Button></DialogClose>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('saveButton')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}