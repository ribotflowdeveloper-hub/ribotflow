// fitxer: src/components/comunicacio/ComposeEmailDialog.jsx (NOU FITXER)

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Send } from 'lucide-react';

const ComposeEmailDialog = ({ open, onOpenChange, initialData, onEmailSent }) => {
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if (initialData) {
            setTo(initialData.to || '');
            setSubject(initialData.subject || '');
            setBody(initialData.body || '');
        }
    }, [initialData]);

    const handleSend = async () => {
        setIsSending(true);
        // Aquí aniria la lògica per cridar una Edge Function 'send-email'
        console.log("Enviant email a:", { to, subject, body });
        // Simulem un enviament
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsSending(false);
        onEmailSent(); // Notifiquem que s'ha enviat
        onOpenChange(false); // Tanquem el diàleg
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="glass-effect text-white">
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
                    <Button onClick={handleSend} disabled={isSending}>
                        {isSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        Enviar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ComposeEmailDialog;