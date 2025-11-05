// /src/app/[locale]/(app)/comunicacio/inbox/_components/ticketList/TicketListHeader.tsx (FITXER COMPLET I CORREGIT)
"use client";

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// ✅ 1. Importem 'Lock' i 'Tooltip'
import { PenSquare, RefreshCw, ChevronDown, Search, ListChecks, Trash2, Lock } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslations } from 'next-intl';
import Link from 'next/link'; // ✅ Importem 'Link'
import type { User } from '@supabase/supabase-js';
import type { TeamMemberWithProfile, InboxPermission } from '@/types/db';
import { type UsageCheckResult } from '@/lib/subscription/subscription'; // ✅ 2. Importem el tipus de límit

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
  isSelectionMode: boolean;
  selectedCount: number;
  onToggleSelectionMode: () => void;
  onDeleteSelected: () => void;
  limitStatus: UsageCheckResult; // ✅ 3. Afegim la prop que faltava
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
  onSearchChange,
  isSelectionMode,
  selectedCount,
  onToggleSelectionMode,
  onDeleteSelected,
  limitStatus, // ✅ 4. Extraiem la prop
}) => {
  const t = useTranslations('InboxPage');
  const t_billing = useTranslations('Billing'); // Per als missatges de límit

  // ✅ 5. Calculem si el botó de composar s'ha de bloquejar
  const isComposeLimitReached = !limitStatus.allowed;

  const permittedMembers = useMemo(() => {
    const permittedIds = new Set(permissions.map(p => p.target_user_id));
    return teamMembers.filter(m => m.user_id && m.user_id !== user.id && permittedIds.has(m.user_id));
  }, [permissions, teamMembers, user.id]);

  const selectedInboxName = useMemo(() => {
    if (inboxFilter === 'all') return t('allInboxes');
    if (inboxFilter === user.id) return t('myEmails');
    const member = teamMembers.find(m => m.user_id === inboxFilter);
    return member?.full_name || t('unknownMailbox');
  }, [inboxFilter, teamMembers, user.id, t]);

  return (
    <div className="flex-shrink-0 border-b border-border">
      <div className="flex justify-between items-center px-2 py-1">
        
        {/* Aquest bloc utilitza les props que donaven 'warning', ara estan correctes */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="text-lg font-bold p-2 -ml-2">
              <span className="flex items-center">
                {selectedInboxName}
                <ChevronDown className="w-5 h-5 ml-2 text-muted-foreground" />
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onSetInboxFilter('all')}>{t('allInboxes')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetInboxFilter(user.id)}>{t('myEmails')}</DropdownMenuItem>
            {permittedMembers.length > 0 && <DropdownMenuSeparator />}
            {permittedMembers
              .filter(member => !!member.user_id)
              .map(member => (
                <DropdownMenuItem key={member.user_id} onClick={() => onSetInboxFilter(member.user_id!)}>
                  {member.full_name || t('unnamedUser')}
                </DropdownMenuItem>
              ))
            }
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-1">
          {/* ✅ 6. Botó de "Redactar" amb control de límit */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={isComposeLimitReached ? 0 : -1}>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onComposeNew} 
                    title={t('composeButtonTooltip')} 
                    disabled={isSelectionMode || isComposeLimitReached}
                  >
                    {isComposeLimitReached ? <Lock className="w-4 h-4" /> : <PenSquare className="w-4 h-4" />}
                  </Button>
                </span>
              </TooltipTrigger>
              {isComposeLimitReached && (
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

          <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isPendingRefresh || isSelectionMode} title={t('refreshButtonTooltip')}>
            <RefreshCw className={`w-4 h-4 ${isPendingRefresh ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant={isSelectionMode ? "secondary" : "ghost"} size="icon" onClick={onToggleSelectionMode} title={t('selectMultiple')}>
            <ListChecks className="w-4 h-4" />
          </Button>
          {isSelectionMode && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDeleteSelected}
              disabled={selectedCount === 0}
              title={t('deleteSelected')}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
              {selectedCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {selectedCount}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>


      <div className="p-1 border-t border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t('searchInboxPlaceholder')}
            className="px-8 pl-7 h-8 text-sm"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};