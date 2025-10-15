import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { EnrichedQuoteForCalendar } from './CalendarData';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

interface Props {
  quote: EnrichedQuoteForCalendar | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuoteDetailDialog({ quote, open, onOpenChange }: Props) {
  if (!quote) return null;

  const quoteUrl = `/crm/quotes/${quote.id}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Detall del Pressupost: {quote.quote_number}</DialogTitle>
          <DialogDescription>Venciment: {format(new Date(quote.expiry_date!), 'PPP')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4">
          <p><strong>Client:</strong> {quote.contacts?.nom || 'N/A'}</p>
          <p><strong>Total:</strong> {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(quote.total)}</p>
          <p><strong>Estat:</strong> {quote.status}</p>
        </div>
        {/* ✅ NOU: Peu del diàleg amb el botó de redirecció */}
        <DialogFooter>
          <Button variant="outline" asChild>
            <Link href={quoteUrl}>
              Veure Detalls
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}