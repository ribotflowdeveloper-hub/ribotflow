import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { EnrichedEmailForCalendar } from './CalendarData';
import { format } from 'date-fns';

interface Props {
  email: EnrichedEmailForCalendar | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmailDetailDialog({ email, open, onOpenChange }: Props) {
  if (!email) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Detall del Correu</DialogTitle>
          <DialogDescription>Data: {format(new Date(email.sent_at!), 'PPP p')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <p><strong>{email.type === 'enviat' ? 'Per a:' : 'De:'}</strong> {email.contacts?.nom || email.sender_name}</p>
          <p><strong>Assumpte:</strong> {email.subject}</p>
          <hr/>
          <div className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: email.preview || '' }} />
        </div>
      </DialogContent>
    </Dialog>
  );
}