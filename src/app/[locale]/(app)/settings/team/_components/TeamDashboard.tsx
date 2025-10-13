// /app/[locale]/settings/team/_components/TeamDashboard.tsx
"use client";

import type { User } from '@supabase/supabase-js';
import type { ActiveTeamData } from '../page';
import { useTeamManagement } from '../_hooks/useTeamManagement';

// Imports de UI (de shadcn/ui o el teu sistema de components)
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent,CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, UserPlus, Trash2, LogOut, Eye, EyeOff } from 'lucide-react';

interface TeamDashboardProps {
    user: User;
    activeTeamData: ActiveTeamData;
}

export function TeamDashboard({ user, activeTeamData }: TeamDashboardProps) {
    // 1. Tota la lògica complexa s'obté amb una sola línia!
    const {
        isPending,
        inviteFormRef,
        handleClearTeam,
        handleInvite,
        handleRemoveMember,
        handleRoleChange,
        handleRevokeInvite,
        handleTogglePermission,
    } = useTeamManagement();

    // 2. Les dades i variables per a la vista es preparen aquí
    const { team, teamMembers, pendingInvitations, currentUserRole, inboxPermissions } = activeTeamData;
    const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';

    const getInitials = (name: string | null | undefined) => {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    };

    // 3. El return és gairebé 100% JSX. Molt fàcil de llegir.
    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">{team.name}</h1>
                <Button variant="outline" onClick={handleClearTeam} disabled={isPending}>
                    <LogOut className="w-4 h-4 mr-2" /> Canviar d'equip
                </Button>
            </div>

            {canManage && (
                <Card>
                    <CardHeader><CardTitle>Convida nous membres</CardTitle></CardHeader>
                    <CardContent>
                        <form ref={inviteFormRef} action={handleInvite} className="flex flex-col sm:flex-row gap-2">
                            <Input name="email" type="email" placeholder="correu@exemple.com" required disabled={isPending} className="flex-grow" />
                            <Select name="role" defaultValue="member" required>
                                <SelectTrigger className="w-full sm:w-[150px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="member">Membre</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button type="submit" disabled={isPending} className="sm:w-auto">
                                {isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {canManage && pendingInvitations.length > 0 && (
                <Card>
                    <CardHeader><CardTitle>Invitacions Pendents</CardTitle></CardHeader>
                    <CardContent className="divide-y">
                        {pendingInvitations.map(invite => (
                            <div key={invite.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                                <div>
                                    <p className="font-medium">{invite.email}</p>
                                    <p className="text-sm text-muted-foreground capitalize">{invite.role}</p>
                                </div>
                                <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={() => handleRevokeInvite(invite.id)}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader><CardTitle>Membres de l'equip ({teamMembers.length})</CardTitle></CardHeader>
                <CardContent className="divide-y">
                    {teamMembers.map(member => {
                         if (!member.profiles) return null;
                         const isOwner = member.role === 'owner';
                         const isSelf = user.id === member.profiles.id;
                         const hasPermission = Array.isArray(inboxPermissions) && inboxPermissions.some(
                             p => p.grantee_user_id === user.id && p.target_user_id === member.profiles!.id
                         );

                        return (
                            <div key={member.profiles.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                                <div className="flex items-center gap-4">
                                    <Avatar>
                                        <AvatarImage src={member.profiles.avatar_url ?? undefined} />
                                        <AvatarFallback>{getInitials(member.profiles.full_name)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{member.profiles.full_name || 'Usuari sense nom'}</p>
                                        <p className="text-sm text-muted-foreground">{member.profiles.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-4">
                                     {isOwner ? (
                                        <Badge variant="default" className="capitalize">{member.role}</Badge>
                                     ) : (
                                        <Select
                                            value={member.role}
                                            onValueChange={(newRole) => handleRoleChange(member.profiles!.id, newRole as 'admin' | 'member')}
                                            disabled={!canManage || isSelf || isPending}
                                        >
                                            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="admin">Admin</SelectItem>
                                                <SelectItem value="member">Membre</SelectItem>
                                            </SelectContent>
                                        </Select>
                                     )}
                                     {currentUserRole === 'owner' && !isSelf && (
                                         <TooltipProvider>
                                             <Tooltip>
                                                 <TooltipTrigger asChild>
                                                     <Button variant="ghost" size="icon" onClick={() => handleTogglePermission(member.profiles!.id)} disabled={isPending}>
                                                         {hasPermission ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                                                     </Button>
                                                 </TooltipTrigger>
                                                 <TooltipContent>
                                                     <p>{hasPermission ? `Deixar de veure la bústia` : `Veure la bústia`}</p>
                                                 </TooltipContent>
                                             </Tooltip>
                                         </TooltipProvider>
                                     )}
                                     {canManage && !isSelf && (
                                         <TooltipProvider>
                                             <Tooltip>
                                                 <TooltipTrigger asChild>
                                                     <Button variant="ghost" size="icon" disabled={isPending} onClick={() => handleRemoveMember(member.profiles!.id)}>
                                                         <Trash2 className="w-4 h-4 text-destructive" />
                                                     </Button>
                                                 </TooltipTrigger>
                                                 <TooltipContent><p>Eliminar membre</p></TooltipContent>
                                             </Tooltip>
                                         </TooltipProvider>
                                     )}
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>
        </div>
    );
}