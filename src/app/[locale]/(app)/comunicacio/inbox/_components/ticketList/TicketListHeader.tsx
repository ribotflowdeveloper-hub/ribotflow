"use client";

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PenSquare, RefreshCw, ChevronDown, Search } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { User } from '@supabase/supabase-js';
import type { TeamMember, Permission } from './index';

interface TicketListHeaderProps {
    user: User;
    teamMembers: TeamMember[];
    permissions: Permission[];
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
    searchTerm,       // ✅ CORRECCIÓ: Afegeix les props que faltaven aquí
    onSearchChange    // ✅ CORRECCIÓ: Afegeix les props que faltaven aquí
}) => {
    const permittedMembers = useMemo(() => {
        const permittedIds = new Set(permissions.map(p => p.target_user_id));
        return teamMembers.filter(m => m.profiles && m.profiles.id !== user.id && permittedIds.has(m.profiles.id));
    }, [permissions, teamMembers, user.id]);

    const selectedInboxName = useMemo(() => {
        if (inboxFilter === 'all') return "Totes les bústies";
        if (inboxFilter === user.id) return "Els meus correus";
        const member = teamMembers.find(m => m.profiles?.id === inboxFilter);
        return member?.profiles?.full_name || "Bústia desconeguda";
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
                            member.profiles && (
                                <DropdownMenuItem key={member.profiles.id} onClick={() => onSetInboxFilter(member.profiles!.id)}>
                                    {member.profiles.full_name || 'Usuari sense nom'}
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
            
            {/* La barra de cerca ara funciona correctament */}
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