// src/app/[locale]/(app)/comunicacio/inbox/_components/ticketList/TicketListFilters.tsx
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LayoutGrid, Inbox, Mail, Send } from "lucide-react";
// ✨ CANVI: Importem el tipus directament de db.ts
import type { TicketFilter } from '@/types/db';

interface TicketListFiltersProps {
  activeFilter: string;
  onSetFilter: (filter: TicketFilter) => void;
  totalCount: number;
  sentCount: number;
  unreadCount: number;
}

export const TicketListFilters: React.FC<TicketListFiltersProps> = ({ activeFilter, onSetFilter, totalCount, sentCount, unreadCount }) => {
  const filters: { id: TicketFilter, label: string, icon: React.ElementType, count?: number | string }[] = [
    { id: 'tots', label: 'Tots', icon: LayoutGrid, count: totalCount },
    { id: 'rebuts', label: 'Rebuts', icon: Inbox, count: totalCount - sentCount },
    { id: 'noLlegits', label: 'No llegits', icon: Mail, count: unreadCount },
    { id: 'enviats', label: 'Enviats', icon: Send, count: sentCount },
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <div className="p-2 grid grid-cols-4 gap-2 border-b border-border flex-shrink-0">
        {filters.map(filter => (
          <Tooltip key={filter.id}>
            <TooltipTrigger asChild>
              <Button variant={
                activeFilter === filter.id ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => onSetFilter(filter.id)} 
                className="w-full flex items-center justify-center gap-2">
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