"use client";

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox"; // ✅ 1. Importem Checkbox
import { useLocale, useTranslations } from 'next-intl';
import type { UITicket } from './index';
import type { EnrichedTicket } from '@/types/db';
import { cn } from '@/lib/utils/utils'; // És probable que necessitis 'cn'
import { motion } from 'framer-motion';

const formatTicketDate = (dateString: string | null, locale: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (date >= startOfToday) {
        return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    } else {
        return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    }
};

const getInitials = (name: string | null | undefined, fallback: string) => {
    if (!name) return fallback;
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
};

interface TicketListItemProps {
    ticket: UITicket;
    isSelected: boolean;
    isCurrentlyViewed: boolean; // Nou: per saber quin està obert ara mateix
    isSelectionMode: boolean; // ✅ 2. Nou estat per saber si mostrem checkboxes
    onSelectTicket: (ticket: EnrichedTicket) => void;
    onToggleSelection: (ticketId: number) => void; // ✅ 3. Nova funció per al checkbox
}

export const TicketListItem: React.FC<TicketListItemProps> = ({ ticket, isSelected, isCurrentlyViewed, isSelectionMode, onSelectTicket, onToggleSelection }) => {
    const t = useTranslations('InboxPage');
    const locale = useLocale();

    // ✅ 4. Gestor unificat de clics
    const handleClick = () => {
        if (ticket.id === null) return;

        if (isSelectionMode) {
            // Si estem en mode selecció, el clic marca/desmarca
            onToggleSelection(ticket.id);
        } else {
            // Si no, el clic l'obre
            onSelectTicket(ticket as EnrichedTicket);
        }
    };
    // Gestor només per al checkbox (per aturar la propagació)
    const handleCheckboxToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (ticket.id === null) return;
        onToggleSelection(ticket.id);
    };

   return (
    // ✅ 2. Canviem 'div' per 'motion.div'
    <motion.div
      layout // Aquesta és la màgia que fa que la resta pugi
      animate={{ opacity: 1, y: 0 }}
      // Animació de sortida: desapareix i redueix l'alçada a 0
      exit={{ 
        opacity: 0, 
        height: 0, 
        y: -10, 
        transition: { duration: 0.2 } 
      }}
      // 'initial' no el posem perquè AnimatePresence ja s'encarrega
      // si ve d'una llista que canvia.
      
      onClick={handleClick}
      className={cn(
        `group cursor-pointer border-l-4 relative transition-colors flex items-center p-2 gap-3 overflow-hidden`, // Afegim overflow-hidden
        isCurrentlyViewed
          ? 'border-primary bg-muted'
          : `${ticket.ownerColorClass || 'border-transparent'} hover:bg-muted/30`,
        isSelectionMode && isSelected && 'bg-primary/10' 
      )}
    >
      {/* El contingut intern (checkbox, avatar, text) no canvia en absolut */}
      {isSelectionMode && (
        <div onClick={handleCheckboxToggle} className="pl-1 py-4 flex items-center cursor-pointer">
          <Checkbox
            checked={isSelected}
            aria-label={`Seleccionar tiquet ${ticket.subject}`}
          />
        </div>
      )}

      <Avatar className="h-8 w-8 mt-0.5 flex-shrink-0">
        <AvatarImage src={ticket.profile_avatar_url ?? undefined} />
        <AvatarFallback>{getInitials(ticket.profile_full_name, t('initialsFallback'))}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <p className={cn(
            `truncate text-sm font-semibold`, 
            ticket.status === 'Llegit' && !isCurrentlyViewed && 'font-normal text-muted-foreground'
          )}>
            {ticket.contact_nom || ticket.sender_name || t('unknownSender')}
          </p>
          <div className="flex items-center gap-2 text-xs flex-shrink-0 ml-2">
            {ticket.status !== 'Llegit' && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>}
            <span className="text-muted-foreground">{formatTicketDate(ticket.sent_at, locale)}</span>
          </div>
        </div>
        <p className="text-xs truncate">{ticket.subject}</p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{ticket.preview}</p>
      </div>

    </motion.div>
  );
};