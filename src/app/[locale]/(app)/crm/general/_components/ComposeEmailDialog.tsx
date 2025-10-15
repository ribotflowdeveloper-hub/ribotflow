// /app/[locale]/(app)/crm/general/_components/ComposeEmailDialog.tsx (CORREGIT)

"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { sendEmailWithGmailAction } from '@/app/[locale]/(app)/crm/general/_components/send-email-action';
import { useTranslations } from 'next-intl';

// ✅ 1. Definim el tipus correcte per a les dades inicials.
interface ComposeEmailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // 'contactId' ara és un 'number', alineat amb la resta de l'aplicació.
    initialData: { contactId: number; to: string; subject: string; body: string } | null;
    onEmailSent: () => void;
}

const ComposeEmailDialog: React.FC<ComposeEmailDialogProps> = ({ open, onOpenChange, initialData, onEmailSent }) => {
    const t = useTranslations('ComposeEmailDialog');

    // ✅ 2. L'estat intern ara gestiona 'contactId' com a 'number | null'.
    const [contactId, setContactId] = useState<number | null>(null);
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (initialData) {
            setContactId(initialData.contactId ?? null);
            setTo(initialData.to || '');
            setSubject(initialData.subject || '');
            setBody(initialData.body || '');
        }
    }, [initialData]);

    const handleSend = () => {
        startTransition(async () => {
            // ✅ 3. Validació actualitzada per a un ID numèric.
            if (!contactId) {
                toast.error('Error', { description: "Falta l'ID del contacte." });
                return;
            }
            // ✅ 4. Cridem a la Server Action amb el 'contactId' numèric.
            const result = await sendEmailWithGmailAction(String(contactId), subject, body);
            if (result.success) {
                toast.success('Èxit!', { description: result.message });
                onEmailSent();
                onOpenChange(false);
            } else {
                toast.error('Error', { description: result.message });
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="glass-effect">
                <DialogHeader>
                    <DialogTitle>{t('dialogTitle')}</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="to">{t('toLabel')}</Label>
                        <Input id="to" value={to} readOnly disabled />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="subject">{t('subjectLabel')}</Label>
                        <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="body">{t('messageLabel')}</Label>
                        <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} rows={10} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('cancelButton')}</Button>
                    <Button onClick={handleSend} disabled={isPending}>
                        {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        {t('sendButton')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ComposeEmailDialog;