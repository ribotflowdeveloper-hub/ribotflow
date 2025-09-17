"use client";

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, User, Edit, Ban, Loader2, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useTranslations } from 'next-intl';
import { deleteContactAction } from './actions';
import type { Contact } from '@/types/crm';

interface HeaderProps {
  contact: Contact;
  isEditing: boolean;
  isPending: boolean;
  onSetEditing: (isEditing: boolean) => void;
  onCancel: () => void;
}

export function ContactDetailHeader({ contact, isEditing, isPending, onSetEditing, onCancel }: HeaderProps) {
  const t = useTranslations('ContactDetailPage');
  const router = useRouter();
  const [isDeletePending, startDeleteTransition] = useTransition();

  const handleDelete = () => {
    startDeleteTransition(async () => {
      const res = await deleteContactAction(contact.id);
      if (!res.success) {
        toast.error(t('toast.errorTitle'), { description: res.message });
      } else {
        toast.success(t('toast.successTitle'), { description: t('toast.deleteSuccess') });
        router.push('/crm/contactes');
      }
    });
  };

  return (
    <div>
      <Button variant="ghost" onClick={() => router.push('/crm/contactes')} type="button" className="mb-4 -ml-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> {t('backToContacts')}
      </Button>
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shrink-0">
            <User className="w-10 h-10 text-white" />
          </div>
          <div>
            {isEditing ? <Input name="nom" defaultValue={contact.nom || ''} className="text-3xl font-bold px-3 py-2" placeholder={t('placeholderName')} /> : <h1 className="text-4xl font-bold">{contact.nom}</h1>}
            {isEditing ? <Input name="empresa" defaultValue={contact.empresa || ''} className="text-xl px-3 py-2 mt-2" placeholder={t('placeholderCompany')} /> : <p className="text-xl text-muted-foreground mt-1">{contact.empresa}</p>}
          </div>
        </div>
        <div className="flex gap-2 items-center self-start sm:self-end pt-4">
          {isEditing ? (
            <>
              <Button variant="ghost" onClick={onCancel} type="button"><Ban className="w-4 h-4 mr-2" />{t('buttons.cancel')}</Button>
              <Button type="submit" disabled={isPending}>{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('buttons.saveChanges')}</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onSetEditing(true)} type="button"><Edit className="w-4 h-4 mr-2" />{t('buttons.editDetails')}</Button>
              <Dialog>
                <DialogTrigger asChild><Button variant="destructive" type="button" className="gap-2"><Trash className="w-4 h-4" />{t('buttons.delete')}</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{t('deleteDialog.title')}</DialogTitle><DialogDescription>{t('deleteDialog.description1')}</DialogDescription></DialogHeader>
                  <DialogFooter>
                    <DialogTrigger asChild><Button variant="outline">{t('buttons.cancel')}</Button></DialogTrigger>
                    <Button variant="destructive" onClick={handleDelete} disabled={isDeletePending}>{isDeletePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('buttons.confirmDelete')}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>
    </div>
  );
}