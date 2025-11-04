// src/app/[locale]/(app)/comunicacio/inbox/_components/ticketList/TicketListFilters.tsx
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LayoutGrid, Inbox, Mail, Send, Filter } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTranslations } from 'next-intl';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { TicketFilter } from '@/types/db';

interface TicketListFiltersProps {
  activeFilter: string;
  onSetFilter: (filter: TicketFilter) => void;
  totalCount: number;
  sentCount: number;
  unreadCount: number;
}

export const TicketListFilters: React.FC<TicketListFiltersProps> = ({
  activeFilter,
  onSetFilter,
  totalCount,
  sentCount,
  unreadCount
}) => {  
  const t = useTranslations('InboxPage');
  const isMobile = useMediaQuery('(max-width: 1023px)');

  const filters: { id: TicketFilter, label: string, icon: React.ElementType, count?: number | string }[] = [
    { id: 'tots', label: t('allFilter'), icon: LayoutGrid, count: totalCount },
    { id: 'rebuts', label: t('receivedFilter'), icon: Inbox, count: totalCount - sentCount },
    { id: 'noLlegits', label: t('unreadFilter'), icon: Mail, count: unreadCount },
    { id: 'enviats', label: t('sentFilter'), icon: Send, count: sentCount },
  ];

  if (isMobile) {
    // 🧭 MODE MÒBIL: mostrem un botó amb menú desplegable
    const active = filters.find(f => f.id === activeFilter) ?? filters[0];
    return (
      <div className="p-2 border-b border-border flex items-center justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-2 w-full justify-between">
              <span className="flex items-center gap-2">
                <active.icon className="h-4 w-4" />
                {active.label}
              </span>
              <Filter className="w-4 h-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[180px]">
            {filters.map(filter => (
              <DropdownMenuItem key={filter.id} onClick={() => onSetFilter(filter.id)}>
                <filter.icon className="h-4 w-4 mr-2" />
                {filter.label}
                <span className="ml-auto text-xs text-muted-foreground">{filter.count}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // 🧱 MODE DESKTOP: disseny original amb 4 botons
  return (
    <TooltipProvider delayDuration={0}>
      <div className="p-2 grid grid-cols-4 gap-2 border-b border-border flex-shrink-0">
        {filters.map(filter => (
          <Tooltip key={filter.id}>
            <TooltipTrigger asChild>
              <Button
                variant={activeFilter === filter.id ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => onSetFilter(filter.id)} 
                className="w-full flex items-center justify-center gap-2"
              >
                <filter.icon className="h-4 w-4" />
                {filter.id === 'noLlegits' ? (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${unreadCount > 0 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground bg-muted'}`}>{filter.count}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">{filter.count}</span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>{filter.label}</p></TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};
