// src/app/[locale]/(app)/crm/calendari/_components/EmailDetailDialog.tsx (AQUEST CODI ERA CORRECTE)
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { EnrichedEmailForCalendar } from './CalendarData';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

interface Props {
  email: EnrichedEmailForCalendar | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmailDetailDialog({ email, open, onOpenChange }: Props) {
  if (!email) return null;

  // La construcció de la URL sempre ha estat correcta.
  const emailUrl = `/comunicacio/inbox?ticketId=${email.id}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Detall del Correu</DialogTitle>
          <DialogDescription>Data: {format(new Date(email.sent_at!), 'PPP p')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4">
          <p><strong>{email.type === 'enviat' ? 'Per a:' : 'De:'}</strong> {email.contacts?.nom || email.sender_name}</p>
          <p><strong>Assumpte:</strong> {email.subject}</p>
          <hr/>
          <div className="text-sm text-muted-foreground max-h-48 overflow-y-auto" dangerouslySetInnerHTML={{ __html: email.preview || '' }} />
        </div>
        <DialogFooter>
          <Button variant="outline" asChild>
            <Link href={emailUrl}>
              Anar al Correu
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}