"use client";

import React, { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { ImapSmtpSchema, type ImapSmtpFormData } from '../schemas';
import { connectImapSmtpAction } from '../actions';

interface ImapSmtpDialogProps {
  children: React.ReactNode;
  onSuccess: () => void;
}

export function ImapSmtpDialog({ children, onSuccess }: ImapSmtpDialogProps) {
  const t = useTranslations('SettingsPage.integrations.customEmailDialog');
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = React.useState(false);

  const form = useForm<ImapSmtpFormData>({
    resolver: zodResolver(ImapSmtpSchema),
    defaultValues: {
      email: '',
      password: '',
      imapHost: '',
      imapPort: 993,
      smtpHost: '',
      smtpPort: 465,
    },
  });

  const { register, handleSubmit, formState: { errors } } = form;

  const onSubmit = (data: ImapSmtpFormData) => {
    startTransition(async () => {
      const result = await connectImapSmtpAction(data);
      if (result.success) {
        toast.success(t('toast.success'), { description: result.message });
        onSuccess();
        setIsOpen(false);
        form.reset();
      } else {
        toast.error(t('toast.error'), { description: result.message || t('toast.genericError') });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                {t('emailLabel')}
              </Label>
              <div className="col-span-3">
                <Input id="email" {...register('email')} />
                {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                {t('passwordLabel')}
              </Label>
              <div className="col-span-3">
                <Input id="password" type="password" {...register('password')} />
                {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="imapHost" className="text-right">
                {t('imapHostLabel')}
              </Label>
              <div className="col-span-3">
                <Input id="imapHost" {...register('imapHost')} placeholder="imap.exemple.com" />
                {errors.imapHost && <p className="text-sm text-red-500 mt-1">{errors.imapHost.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="imapPort" className="text-right">
                {t('imapPortLabel')}
              </Label>
              <div className="col-span-3">
                <Input id="imapPort" type="number" {...register('imapPort')} />
                {errors.imapPort && <p className="text-sm text-red-500 mt-1">{errors.imapPort.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="smtpHost" className="text-right">
                {t('smtpHostLabel')}
              </Label>
              <div className="col-span-3">
                <Input id="smtpHost" {...register('smtpHost')} placeholder="smtp.exemple.com" />
                {errors.smtpHost && <p className="text-sm text-red-500 mt-1">{errors.smtpHost.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="smtpPort" className="text-right">
                {t('smtpPortLabel')}
              </Label>
              <div className="col-span-3">
                <Input id="smtpPort" type="number" {...register('smtpPort')} />
                {errors.smtpPort && <p className="text-sm text-red-500 mt-1">{errors.smtpPort.message}</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">{t('cancelButton')}</Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('connectButton')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}