// src/app/[locale]/(app)/comunicacio/inbox/_components/ticketList/TicketListHeader.tsx
"use client";

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PenSquare, RefreshCw, ChevronDown, Search } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { User } from '@supabase/supabase-js';
// ✨ CANVI: Importem els tipus directament de db.ts
import type { TeamMemberWithProfile, InboxPermission } from '@/types/db';

interface TicketListHeaderProps {
  user: User;
  teamMembers: TeamMemberWithProfile[];
  permissions: InboxPermission[];
  inboxFilter: string;
  onSetInboxFilter: (userId: string) => void;
  onComposeNew: () => void;
  onRefresh: () => void;
  isPendingRefresh: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export const TicketListHeader: React.FC<TicketListHeaderProps> = ({
  user,
  teamMembers,
  permissions,
  inboxFilter,
  onSetInboxFilter,
  onComposeNew,
  onRefresh,
  isPendingRefresh,
  searchTerm,
  onSearchChange
}) => {
  const permittedMembers = useMemo(() => {
    const permittedIds = new Set(permissions.map(p => p.target_user_id));
    // ✨ CORRECCIÓ: Ara el tipus 'TeamMemberWithProfile' és pla. Accedim a 'user_id'.
    return teamMembers.filter(m => m.user_id && m.user_id !== user.id && permittedIds.has(m.user_id));
  }, [permissions, teamMembers, user.id]);

  const selectedInboxName = useMemo(() => {
    if (inboxFilter === 'all') return "Totes les bústies";
    if (inboxFilter === user.id) return "Els meus correus";
    // ✨ CORRECCIÓ: Accedim a les propietats del tipus pla 'TeamMemberWithProfile'.
    const member = teamMembers.find(m => m.user_id === inboxFilter);
    return member?.full_name || "Bústia desconeguda";
  }, [inboxFilter, teamMembers, user.id]);

  return (
    <>
      <div className="p-4 border-b border-border flex justify-between items-center flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="text-lg font-bold p-2 -ml-2">
              {selectedInboxName}
              <ChevronDown className="w-5 h-5 ml-2 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onSetInboxFilter('all')}>Totes les bústies</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetInboxFilter(user.id)}>Els meus correus</DropdownMenuItem>
            {permittedMembers.length > 0 && <DropdownMenuSeparator />}
            {permittedMembers.map(member => (
              // ✨ CORRECCIÓ: Afegim comprovació i accés correcte a les propietats.
              member.user_id && (
                <DropdownMenuItem key={member.user_id} onClick={() => onSetInboxFilter(member.user_id!)}>
                  {member.full_name || 'Usuari sense nom'}
                </DropdownMenuItem>
              )
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onComposeNew} title="Redacta"><PenSquare className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isPendingRefresh} title="Actualitza"><RefreshCw className={`w-4 h-4 ${isPendingRefresh ? 'animate-spin' : ''}`} /></Button>
        </div>
      </div>
      
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca a la bústia..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
    </>
  );
};