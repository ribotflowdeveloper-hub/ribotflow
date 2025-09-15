/**
 * @file ComposeEmailDialog.tsx
 * @summary Aquest fitxer defineix un component de client reutilitzable que mostra un diàleg
 * per redactar i enviar un correu electrònic. Gestiona l'estat del formulari (destinatari,
 * assumpte, cos) i crida a una Server Action per a l'enviament real del correu.
 */

"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
// Aquesta és la Server Action que s'encarregarà de la lògica d'enviament.
import { sendEmailWithGmailAction } from '@/app/(app)/crm/general/_components/send-email-action';

// Propietats que el diàleg espera rebre.
interface ComposeEmailDialogProps {
  open: boolean; // Controla si el diàleg és visible.
  onOpenChange: (open: boolean) => void; // Funció per tancar el diàleg.
  initialData: { contactId: string; to: string; subject: string; body: string } | null; // Dades inicials per omplir el formulari.
  onEmailSent: () => void; // Funció de callback que s'executa quan l'email s'envia correctament.
}

const ComposeEmailDialog: React.FC<ComposeEmailDialogProps> = ({ open, onOpenChange, initialData, onEmailSent }) => {

  // --- Gestió de l'Estat del Component ---
  const [contactId, setContactId] = useState('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isPending, startTransition] = useTransition(); // Hook per a l'estat de càrrega no bloquejant.

  // Aquest efecte s'executa quan les 'initialData' canvien.
  // La seva funció és omplir els camps del formulari amb les dades rebudes.
  useEffect(() => {
    if (initialData) {
      setContactId(initialData.contactId || '');
      setTo(initialData.to || '');
      setSubject(initialData.subject || '');
      setBody(initialData.body || '');
    }
  }, [initialData]);

  /**
   * @summary Gestor per a l'enviament del correu. Crida a la Server Action 'sendEmailWithGmailAction'.
   */
  const handleSend = () => {
    startTransition(async () => {
      // Validació bàsica de dades al client.
      if (!contactId) {
        toast.error('Error', { description: "Falta l'ID del contacte." });
        return;
      }
      // Cridem a la Server Action, passant les dades necessàries.
      const result = await sendEmailWithGmailAction(contactId, subject, body);
      if (result.success) {
        toast.success('Èxit!', { description: result.message });
        onEmailSent(); // Executem el callback per notificar al component pare.
        onOpenChange(false); // Tanquem el diàleg.
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
          {/* Camps del formulari per al destinatari, assumpte i cos del missatge. */}
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
