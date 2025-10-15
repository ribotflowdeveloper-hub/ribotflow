import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { EnrichedQuoteForCalendar } from './CalendarData';
import { format } from 'date-fns';

interface Props {
  quote: EnrichedQuoteForCalendar | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuoteDetailDialog({ quote, open, onOpenChange }: Props) {
  if (!quote) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Detall del Pressupost: {quote.quote_number}</DialogTitle>
          <DialogDescription>Venciment: {format(new Date(quote.expiry_date!), 'PPP')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <p><strong>Client:</strong> {quote.contacts?.nom || 'N/A'}</p>
          <p><strong>Total:</strong> {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(quote.total)}</p>
          <p><strong>Estat:</strong> {quote.status}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}