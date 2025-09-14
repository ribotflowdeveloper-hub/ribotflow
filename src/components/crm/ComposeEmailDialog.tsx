"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner'; // ✅ 1. Importem 'toast' de sonner
import { sendEmailWithGmailAction } from '@/app/(app)/crm/general/_components/send-email-action';

interface ComposeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Ara initialData també inclou el contactId
  initialData: { contactId: string; to: string; subject: string; body: string } | null;
  onEmailSent: () => void;
}

const ComposeEmailDialog: React.FC<ComposeEmailDialogProps> = ({ open, onOpenChange, initialData, onEmailSent }) => {

    const [contactId, setContactId] = useState('');
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (initialData) {
            setContactId(initialData.contactId || '');
            setTo(initialData.to || '');
            setSubject(initialData.subject || '');
            setBody(initialData.body || '');
        }
    }, [initialData]);

    const handleSend = () => {
        startTransition(async () => {
            if (!contactId) {
                toast.error('Error', { description: "Falta l'ID del contacte." });
                return;
            }
            const result = await sendEmailWithGmailAction(contactId, subject, body);
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
                    <DialogTitle>Respondre al Contacte</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="to">Per a</Label>
                        <Input id="to" value={to} readOnly disabled />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="subject">Assumpte</Label>
                        <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="body">Missatge</Label>
                        <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} rows={10} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel·lar</Button>
                    <Button onClick={handleSend} disabled={isPending}>
                        {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        Enviar amb Gmail
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ComposeEmailDialog;