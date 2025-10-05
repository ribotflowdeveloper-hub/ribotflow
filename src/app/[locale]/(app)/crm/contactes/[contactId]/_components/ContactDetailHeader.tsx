// @/app/[locale]/(app)/crm/contactes/[id]/_components/ContactDetailHeader.tsx
import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, User, Edit, Ban, Loader2, Trash } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type Contact } from '@/types/crm';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog'; // Crearem aquest component a continuació

interface Props {
    contact: Contact;
    isEditing: boolean;
    isPending: boolean;
    onEdit: () => void;
    onCancel: () => void;
    onDelete: () => void;
}

export function ContactDetailHeader({ contact, isEditing, isPending, onEdit, onCancel, onDelete }: Props) {
    const t = useTranslations('ContactDetailPage');
    const router = useRouter();

    return (
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
            <div className="flex-1">
                <Button variant="ghost" onClick={() => router.push('/crm/contactes')} type="button" className="-ml-4">
                    <ArrowLeft className="w-4 h-4 mr-2" /> {t('backToContacts')}
                </Button>
                <div className="flex items-center gap-4 mt-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shrink-0">
                        <User className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>
                    <div>
                        {isEditing ? (
                            <Input name="nom" defaultValue={contact.nom} className="text-2xl sm:text-3xl font-bold" />
                        ) : (
                            <h1 className="text-3xl sm:text-4xl font-bold">{contact.nom}</h1>
                        )}
                        {isEditing ? (
                            <Input name="empresa" defaultValue={contact.empresa || ''} className="text-lg sm:text-xl mt-1" />
                        ) : (
                            <p className="text-lg sm:text-xl text-muted-foreground mt-1">{contact.empresa}</p>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="flex gap-2 items-center self-end w-full sm:w-auto">
                {isEditing ? (
                    <>
                        <Button variant="ghost" onClick={onCancel} type="button">
                            <Ban className="w-4 h-4 mr-2" />{t('buttons.cancel')}
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('buttons.saveChanges')}
                        </Button>
                    </>
                ) : (
                    <>
                        <Button variant="outline" onClick={onEdit} type="button">
                            <Edit className="w-4 h-4 mr-2" />{t('buttons.editDetails')}
                        </Button>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="destructive" type="button" className="gap-2">
                                    <Trash className="w-4 h-4" />{t('buttons.delete')}
                                </Button>
                            </DialogTrigger>
                            <DeleteConfirmationDialog onConfirm={onDelete} isPending={isPending} />
                        </Dialog>
                    </>
                )}
            </div>
        </div>
    );
}