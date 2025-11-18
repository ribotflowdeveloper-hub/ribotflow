// src/app/[locale]/(app)/crm/contactes/[contactId]/_components/ContactDetailHeader.tsx
"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Edit,  Trash2, X, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ContactDetail } from '@/lib/services/crm/contacts/contacts.service';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ContactDetailHeaderProps {
    contact: ContactDetail;
    isEditing: boolean;
    isPending: boolean;
    onEdit: () => void;
    onCancel: () => void;
    onDelete: () => void;
}

export function ContactDetailHeader({
    contact,
    isEditing,
    isPending,
    onEdit,
    onCancel,
    onDelete,
}: ContactDetailHeaderProps) {
    const router = useRouter();
    const t = useTranslations('ContactDetailPage');

    return (
        <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
            <div className="flex items-center gap-4 w-full max-w-3xl">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => isEditing ? onCancel() : router.back()}
                    disabled={isPending}
                >
                    {isEditing ? <X className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
                </Button>

                <div className="flex-1 min-w-0">
                    {isEditing ? (
                        <div className="flex flex-col gap-1 animate-in fade-in slide-in-from-left-2">
                            <Input
                                name="nom"
                                defaultValue={contact.nom || ''}
                                required
                                className="text-xl md:text-2xl font-bold h-auto px-2 py-1 -ml-2 border-transparent hover:border-input focus:border-primary"
                                placeholder={t('details.labels.name')}
                            />
                            <p className="text-sm text-muted-foreground px-1">
                                {t('header.editingContact')}
                            </p>
                        </div>
                    ) : (
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold truncate">{contact.nom}</h1>
                            <p className="text-sm text-muted-foreground truncate">
                                {contact.suppliers?.nom ? (
                                    <span className="font-medium text-primary">{contact.suppliers.nom}</span>
                                ) : contact.empresa || contact.email}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                {isEditing ? (
                    <>
                        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
                            {t('header.cancel')}
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            {t('header.save')}
                        </Button>
                    </>
                ) : (
                    <>
                        <Button type="button" variant="outline" onClick={onEdit}>
                            <Edit className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">{t('header.edit')}</span>
                        </Button>
                        
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button type="button" variant="destructive" size="icon">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {t('deleteDialog.description', { name: contact.nom })}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>{t('deleteDialog.cancel')}</AlertDialogCancel>
                                    <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        {t('deleteDialog.confirm')}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </>
                )}
            </div>
        </div>
    );
}