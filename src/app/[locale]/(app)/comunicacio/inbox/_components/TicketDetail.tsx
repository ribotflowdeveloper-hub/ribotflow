// /src/app/[locale]/(app)/comunicacio/inbox/_components/TicketDetail.tsx (FITXER COMPLET I CORREGIT)
"use client";

import React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Reply, MoreVertical, Loader2, Info, Lock } from 'lucide-react'; // ✅ 1. Importem 'Lock'
import { SafeEmailRenderer } from './SafeEmailRenderer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // ✅ 2. Importem
import Link from 'next/link';
import { type UsageCheckResult } from '@/lib/subscription/subscription'; // ✅ 3. Importem

// ✨ CANVI: Importem el tipus correcte des de la nostra font de veritat.
import type { EnrichedTicket } from '@/types/db';

interface TicketDetailProps {
  ticket: EnrichedTicket | null; 
  body: string | null;
  isLoading: boolean;
  onReply: (ticket: EnrichedTicket) => void;
  isContactPanelOpen: boolean;
  onToggleContactPanel: () => void;
  limitStatus: UsageCheckResult; // ✅ 4. Afegim la prop de límit de tiquets
}

export const TicketDetail: React.FC<TicketDetailProps> = ({
  ticket,
  body,
  isLoading,
  onReply,
  isContactPanelOpen,
  onToggleContactPanel,
  limitStatus, // ✅ 5. Extraiem el límit
}) => {
  
  const t = useTranslations('InboxPage');
  const t_billing = useTranslations('Billing'); // Per al missatge de límit

  // ✅ 6. Calculem si s'ha assolit el límit
  const isLimitReached = !limitStatus.allowed;

  if (!ticket) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">{t('noTicketSelected')}</p>
      </div>
    );
  }

  const senderName = ticket.contact_nom || ticket.sender_name || t('unknownSender');
  const senderEmail = ticket.contact_email || ticket.sender_email;
  const avatarUrl = ticket.profile_avatar_url;

  const getInitials = (name: string, fallback: string) => {
    if (!name) return fallback;
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar>
            <AvatarImage src={avatarUrl ?? undefined} />
            <AvatarFallback>{getInitials(senderName, t('initialsFallback'))}</AvatarFallback>
          </Avatar>
          <div className="truncate">
            <p className="font-semibold truncate">{senderName}</p>
            <p className="text-sm text-muted-foreground truncate" title={senderEmail ?? undefined}>{senderEmail}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onToggleContactPanel}>
            <Info className={`w-5 h-5 ${isContactPanelOpen ? 'text-primary' : ''}`} />
          </Button>

          {/* ✅ 7. Botó "Respondre" amb control de límit */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={isLimitReached ? 0 : -1}>
                  <Button onClick={() => onReply(ticket)} disabled={isLimitReached}>
                    {isLimitReached ? (
                      <Lock className="w-4 h-4 mr-2" />
                    ) : (
                      <Reply className="mr-2 h-4 w-4" />
                    )}
                    {isLimitReached ? t('limitReached') : t('replyButton')}
                  </Button>
                </span>
              </TooltipTrigger>
              {isLimitReached && (
                <TooltipContent className="max-w-xs p-3 shadow-lg rounded-lg border-2 border-yellow-400 bg-yellow-50">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-yellow-900" />
                      <h3 className="font-semibold">{t_billing('limitReachedTitle')}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {limitStatus.error || t_billing('limitReachedDefault')}
                    </p>
                    <Button asChild size="sm" className="mt-1 w-full">
                      <Link href="/settings/billing">{t_billing('upgradePlan')}</Link>
                    </Button>
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          <Button variant="ghost" size="icon">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="p-4 border-b flex-shrink-0">
        <h2 className="text-xl font-bold">{ticket.subject}</h2>
      </div>

      <div className="flex-1 relative min-h-0">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="absolute inset-0">
            <SafeEmailRenderer htmlBody={body || ''} />
          </div>
        )}
      </div>
    </div>
  );
};