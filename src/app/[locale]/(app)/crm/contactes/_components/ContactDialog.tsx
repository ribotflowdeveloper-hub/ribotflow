"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Lock } from 'lucide-react'; // ✅ Eliminat 'Link' de lucide-react
import Link from 'next/link'; // ✅ Afegit 'Link' de next/link per a la navegació
import { createContactAction } from '../actions';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CONTACT_STATUS_MAP } from '@/config/contacts';

// Props que el nostre diàleg acceptarà
interface ContactDialogProps {
    trigger: React.ReactNode; 
    initialData?: {
        nom?: string | null;
        email?: string | null;
    };
    onContactSaved?: (newContact: unknown) => void;
    isLimitReached?: boolean;
    limitError?: string;
}

export function ContactDialog({ trigger, initialData, onContactSaved, isLimitReached, limitError }: ContactDialogProps) {
    const t = useTranslations('ContactsClient');
    const t_billing = useTranslations('Billing'); // ✅ Afegit per a les traduccions de l'alerta
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const formRef = React.useRef<HTMLFormElement>(null);

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
                onContactSaved?.(result.data); 
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
                
                {/* Bloc d'Alerta */}
                {isLimitReached && (
                    <Alert variant="destructive" className="mt-2">
                        <Lock className="h-4 w-4" />
                        <AlertTitle>{t_billing('limitReachedTitle')}</AlertTitle>
                        <AlertDescription>
                            {limitError || t_billing('limitReachedDefault')}
                            <Button asChild size="sm" variant="link" className="p-0 h-auto ml-1">
                                <Link href="/settings/billing">{t_billing('upgradePlan')}</Link>
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}
                
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
                        
                        {/* ✅ SOLUCIÓ 1: Canviat 'form.formState.isSubmitting' per 'isPending' */}
                        <Button type="submit" disabled={isPending || isLimitReached}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isPending ? t('savingButton') : t('saveButton')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}