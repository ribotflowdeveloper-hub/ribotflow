// /src/app/[locale]/(app)/comunicacio/inbox/_components/MobileDetailView.tsx (FITXER COMPLET I CORREGIT)
"use client";

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Reply, Info, UserPlus, Loader2, Lock } from 'lucide-react'; // ✅ Importem Lock
import { useTranslations } from 'next-intl';
import React from 'react';
import Link from 'next/link'; // ✅ Importem Link
import { ContactDialog } from '../../../crm/contactes/_components/ContactDialog';
import { SafeEmailRenderer } from './SafeEmailRenderer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // ✅ Importem Tooltip
import { type UsageCheckResult } from '@/lib/subscription/subscription'; // ✅ Importem el tipus
import type { Contact, EnrichedTicket } from '@/types/db';

interface MobileDetailViewProps {
  ticket: EnrichedTicket;
  body: string | null; // ✅ Aquesta línia ja era correcta
  isLoading: boolean;
  isPending: boolean;
  onClose: () => void;
  onReply: (ticket: EnrichedTicket) => void;
  // ✅ CORRECCIÓ 2: Canviem la signatura per reflectir la del hook 'useInbox'
  onSaveContact: (contactData: Partial<Contact>, ticket: EnrichedTicket) => void;
  // ✅ Afegim els dos límits
  ticketLimitStatus: UsageCheckResult;
  contactLimitStatus: UsageCheckResult;
}

export const MobileDetailView: React.FC<MobileDetailViewProps> = ({ 
  ticket, body, isLoading, isPending, 
  onClose, onReply, onSaveContact,
  ticketLimitStatus, contactLimitStatus // ✅ Extraiem els límits
}) => {
  const t = useTranslations('InboxPage');
  const t_billing = useTranslations('Billing');

  // ✅ CORRECCIÓ 3: Creem un 'adapter' per al ContactDialog
  // ContactDialog crida onContactSaved amb (Partial<Contact>)
  // El nostre hook espera (Partial<Contact>, EnrichedTicket)
  const handleSaveContactAdapter = (contactData: Partial<Contact>) => {
    onSaveContact(contactData, ticket);
  };

  // Calculem els límits
  const isTicketLimitReached = !ticketLimitStatus.allowed;
  const isContactLimitReached = !contactLimitStatus.allowed;

  return (
    <motion.div 
      key={ticket.id} 
      initial={{ x: '100%' }} 
      animate={{ x: 0 }} 
      exit={{ x: '100%' }} 
      transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3 }} 
      className="absolute inset-0 flex flex-col bg-background z-20"
    >
      <div className="p-2 border-b border-border flex justify-between items-center flex-shrink-0">
        <div className="flex items-center min-w-0">
          <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0" aria-label={t('closeButton')}>
            <X className="w-5 h-5" />
          </Button>
          <div className="ml-2 truncate">
            <p className="font-semibold truncate" title={ticket.subject ?? undefined}>{ticket.subject}</p>
            <p className="text-sm text-muted-foreground truncate" title={(ticket.contact_nom || ticket.sender_name) ?? undefined}>
              {t('fromLabel')}: {ticket.contact_nom || ticket.sender_name}
            </p>
          </div>
        </div>
        
        {/* ✅ Botó "Respondre" amb control de límit */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={isTicketLimitReached ? 0 : -1} className="mr-2 flex-shrink-0">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => onReply(ticket)}
                  disabled={isTicketLimitReached}
                >
                  {isTicketLimitReached ? <Lock className="w-4 h-4" /> : <Reply className="mr-2 h-4 w-4" />}
                  {!isTicketLimitReached && t('replyButton')}
                </Button>
              </span>
            </TooltipTrigger>
            {isTicketLimitReached && (
              <TooltipContent>
                 <p>{ticketLimitStatus.error || t_billing('limitReachedDefault')}</p>
                 <Button asChild size="sm" className="mt-2 w-full">
                    <Link href="/settings/billing">{t_billing('upgradePlan')}</Link>
                 </Button>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

      </div>
      
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="p-4 md:p-6 flex-shrink-0">
          <details className="border rounded-lg p-3 bg-muted/50">
            <summary className="cursor-pointer font-semibold flex items-center gap-2 text-sm">
              <Info className="w-4 h-4 text-primary" /> {t('senderDetailsLabel')}
            </summary>
            <div className="mt-3 pt-3 border-t space-y-2 text-sm">
              <p><strong>{t('nameLabel')}:</strong> {ticket.contact_nom || ticket.sender_name}</p>
              <p><strong>{t('emailLabel')}:</strong> {ticket.contact_email || ticket.sender_email}</p>
              {!ticket.contact_id && (
                
                // ✅ Botó "Desar Contacte" amb control de límit
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="w-full" tabIndex={isContactLimitReached ? 0 : -1}>
                        <ContactDialog
                          trigger={
                            <Button size="sm" className="w-full mt-2" disabled={isPending || isContactLimitReached}>
                              {isContactLimitReached ? <Lock className="w-4 h-4 mr-2"/> : <UserPlus className="w-4 h-4 mr-2"/>}
                              {isContactLimitReached ? t('limitReached') : t('saveContactButton')}
                            </Button>
                          }
                          initialData={{
                            nom: ticket.sender_name || '',
                            email: ticket.sender_email || ''
                          }}
                          // ✅ Passem l'adapter
                          onContactSaved={handleSaveContactAdapter}
                          isLimitReached={isContactLimitReached} // Passem el límit al diàleg
                          limitError={contactLimitStatus.error}
                        />
                      </span>
                    </TooltipTrigger>
                     {isContactLimitReached && (
                      <TooltipContent>
                         <p>{contactLimitStatus.error || t_billing('limitReachedDefault')}</p>
                         <Button asChild size="sm" className="mt-2 w-full">
                            <Link href="/settings/billing">{t_billing('upgradePlan')}</Link>
                         </Button>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>

              )}
            </div>
          </details>
        </div>
        <div className="flex-1 relative">
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
    </motion.div>
  );
}