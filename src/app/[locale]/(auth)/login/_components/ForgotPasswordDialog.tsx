"use client";

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { forgotPasswordAction } from '@/app/[locale]/(auth)/auth/actions';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, MailCheck } from 'lucide-react';

export function ForgotPasswordDialog() {
    // ✅ CORRECCIÓ: Agafem l'espai de noms principal 'LoginPage'.
    const t = useTranslations('LoginPage');
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [emailSent, setEmailSent] = useState(false);
    const [userEmail, setUserEmail] = useState("");

    const handleSubmit = (formData: FormData) => {
        const email = formData.get('email') as string;
        setUserEmail(email);

        startTransition(async () => {
            const result = await forgotPasswordAction(formData);
            if (result.success) {
                setEmailSent(true);
            } else {
                toast.error(t('forgotPassword.errorTitle'), { description: result.message });
            }
        });
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (!open) {
            // Reseteja l'estat quan el diàleg es tanca
            setTimeout(() => {
                setEmailSent(false);
                setUserEmail("");
            }, 300);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <button type="button" className="text-sm font-medium text-primary hover:underline">
                    {/* ✅ CORRECCIÓ: Usem la clau completa i correcta. */}
                    {t('forgotPasswordLink')}
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                {emailSent ? (
                    <div className="text-center p-8">
                        <MailCheck className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold">{t('forgotPassword.successTitle')}</h3>
                        <p className="text-muted-foreground mt-2">
                            {t('forgotPassword.successDescription')} <br />
                            <strong className="text-foreground">{userEmail}</strong>
                        </p>
                        <p className="text-xs text-muted-foreground mt-4">{t('forgotPassword.spamWarning')}</p>
                        <Button onClick={() => setIsOpen(false)} className="mt-6 w-full">{t('forgotPassword.closeButton')}</Button>
                    </div>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>{t('forgotPassword.title')}</DialogTitle>
                            <DialogDescription>{t('forgotPassword.description')}</DialogDescription>
                        </DialogHeader>
                        <form action={handleSubmit}>
                            <div className="grid gap-4 py-4">
                                {/* ✅ CORRECCIÓ: Usem la clau del nivell superior. */}
                                <Label htmlFor="email-forgot">{t('emailLabel')}</Label>
                                <Input id="email-forgot" name="email" type="email" placeholder={t('emailPlaceholder')} required disabled={isPending} />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isPending} className="w-full">
                                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {t('forgotPassword.submitButton')}
                                </Button>
                            </DialogFooter>
                        </form>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

