"use client";

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PenSquare, RefreshCw, ChevronDown, Search, ListChecks, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTranslations } from 'next-intl';
import type { User } from '@supabase/supabase-js';
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

  // ✅ 2. Noves props per a la selecció múltiple
  isSelectionMode: boolean;
  selectedCount: number;
  onToggleSelectionMode: () => void;
  onDeleteSelected: () => void;
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
  // ✅ 3. Rebem les noves props
  isSelectionMode,
  selectedCount,
  onToggleSelectionMode,
  onDeleteSelected
}) => {
  const t = useTranslations('InboxPage');

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
    // ✅ CORRECCIÓ DE LAYOUT:
    // L'arrel és un 'div' amb 'flex-shrink-0' (NO un Fragment <>)
    <div className="flex-shrink-0 border-b border-border">
      <div className="flex justify-between items-center px-2 py-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="text-lg font-bold p-2 -ml-2">
              {/* ✅ CORRECCIÓ DE CRASH:
                  Un 'span' embolcalla els dos fills del botó */}
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
        {/* ✅ 4. Controls de la capçalera actualitzats */}
        <div className="flex items-center gap-1">
          {/* Botó de "Redactar" - es deshabilita en mode selecció */}
          <Button variant="ghost" size="icon" onClick={onComposeNew} title={t('composeButtonTooltip')} disabled={isSelectionMode}>
            <PenSquare className="w-4 h-4" />
          </Button>

          {/* Botó de "Refrescar" - es deshabilita en mode selecció */}
          <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isPendingRefresh || isSelectionMode} title={t('refreshButtonTooltip')}>
            <RefreshCw className={`w-4 h-4 ${isPendingRefresh ? 'animate-spin' : ''}`} />
          </Button>

          {/* Botó per activar/desactivar mode selecció */}
          <Button variant={isSelectionMode ? "secondary" : "ghost"} size="icon" onClick={onToggleSelectionMode} title={t('selectMultiple')}>
            <ListChecks className="w-4 h-4" />
          </Button>

          {/* Botó per esborrar seleccionats - NOMÉS visible en mode selecció */}
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


      {/* Cerca: molt més petita */}
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