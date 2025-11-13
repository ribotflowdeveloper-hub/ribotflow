"use client";

import React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils/utils';
import Link from 'next/link';
import { Tables } from '@/types/supabase';
import { ArrowUpRight, Check, X, Send } from 'lucide-react';

// Tipus enriquit per als pressupostos amb la informació del contacte
export type EnrichedQuote = Tables<'quotes'> & {
  contacts: { nom: string } | null;
};

interface RecentQuotesProps {
  quotes: EnrichedQuote[];
}

// Sub-component per a les targetes de mètriques
const QuoteStat = ({ title, value, className }: { title: string, value: number, className: string }) => (
  <div className="flex-1 text-center bg-muted/50 dark:bg-muted/20 p-2 rounded-md">
    <p className="text-2xl font-bold">{value}</p>
    <p className={cn("text-xs font-semibold", className)}>{title}</p>
  </div>
);

// Sub-component per a cada ítem de la llista
const QuoteItem = ({ quote }: { quote: EnrichedQuote }) => {
  const statusConfig = {
    Accepted: { icon: Check, className: "text-green-600 dark:text-green-400" },
    Sent: { icon: Send, className: "text-blue-600 dark:text-blue-400" },
    Declined: { icon: X, className: "text-red-600 dark:text-red-400" },
    Draft: { icon: Send, className: "text-muted-foreground" },
    Invoiced: { icon: Check, className: "text-purple-600 dark:text-purple-400" },
  };
  
  const currentStatus = quote.status as keyof typeof statusConfig;
  const Icon = statusConfig[currentStatus]?.icon || Send;

  return (
    <Link href={`/crm/quotes/${quote.id}`} className="block p-3 -mx-3 rounded-lg hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm">{quote.contacts?.nom || 'Client desconegut'}</p>
          <p className="text-xs text-muted-foreground">
            # {quote.id} · {quote.created_at ? new Date(quote.created_at).toLocaleDateString() : 'Data desconeguda'}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-sm">€{quote.total_amount?.toLocaleString('es-ES') || '0'}</p>
          <div className={cn("flex items-center justify-end gap-1 text-xs font-semibold", statusConfig[currentStatus]?.className)}>
            <Icon className="w-3 h-3" />
            <span>{quote.status}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};


export function RecentQuotes({ quotes }: RecentQuotesProps) {
  const t = useTranslations('DashboardClient');

  const sentCount = quotes.filter(q => q.status === 'Sent').length;
  const acceptedCount = quotes.filter(q => q.status === 'Accepted').length;
  const declinedCount = quotes.filter(q => q.status === 'Declined').length;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <QuoteStat title="Enviats" value={sentCount} className="text-blue-600 dark:text-blue-400" />
        <QuoteStat title="Acceptats" value={acceptedCount} className="text-green-600 dark:text-green-400" />
        <QuoteStat title="Declinats" value={declinedCount} className="text-red-600 dark:text-red-400" />
      </div>

      <div className="space-y-1">
        {quotes.slice(0, 3).map(quote => (
          <QuoteItem key={quote.id} quote={quote} />
        ))}
      </div>

      {quotes.length > 3 && (
        <Link href="/finances/quotes" className="flex items-center justify-center gap-1 text-sm font-semibold text-primary hover:underline">
          {t('viewAll')} <ArrowUpRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}