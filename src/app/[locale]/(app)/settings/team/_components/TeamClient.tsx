"use client";

import { useTransition, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { toast } from 'sonner';

// Components d'UI
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, UserPlus, Trash2, Plus, ArrowRight, LogOut, Eye, EyeOff } from 'lucide-react';

// Lògica de l'aplicació
import { createClient } from '@/lib/supabase/client';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import {
    // Importem les accions des del seu nou fitxer
    removeMemberAction,
    switchActiveTeamAction,
    clearActiveTeamAction,
    createTeamAction,
    inviteUserAction,
    revokeInvitationAction,
    toggleInboxPermissionAction,
    acceptPersonalInviteAction,
    declinePersonalInviteAction,
    updateMemberRoleAction
} from '../actions'; // ✅ CANVI: Importem des del nou fitxer refactoritzat
import type { UserTeam, ActiveTeamData } from '../page';

type ActionResult = { success: boolean; message?: string; } | void;

interface TeamClientProps {
    user: User;
    userTeams: UserTeam[];
    activeTeamData: ActiveTeamData | null;
    invalidTeamState?: boolean;
    personalInvitations: { id: string; team_name: string; inviter_name: string }[];
}

export function TeamClient({ user, userTeams, activeTeamData, invalidTeamState, personalInvitations }: TeamClientProps) {
    const router = useRouter();
    const supabase = createClient();
    const [isPending, startTransition] = useTransition();
    const formRef = useRef<HTMLFormElement>(null);

    // --- ✅ MILLORA: Handler genèric per a executar accions ---
    // Aquesta funció centralitza la lògica de 'startTransition', 'toast' i 'refresh'.
    const handleAction = useCallback(async (
        action: () => Promise<ActionResult>,
        options: {
            successMessage?: string;
            fullReload?: boolean; // Per a canvis de context importants
            refresh?: boolean;
        } = {}
    ) => {
        startTransition(async () => {
            const result = await action();
            if (result?.success === false) {
                toast.error("Error", { description: result.message });
                return;
            }

            if (options.successMessage) {
                toast.success(options.successMessage, { description: result?.message });
            }

            if (options.fullReload) {
                // Forcem una recàrrega completa per garantir que tot el context de l'app s'actualitza.
                await supabase.auth.refreshSession();
                window.location.reload();
            } else if (options.refresh !== false) { // Per defecte, sempre refresca
                router.refresh();
            }
        });
    }, [router, supabase.auth]);

    // L'efecte per a corregir estats invàlids es manté igual.
    useEffect(() => {
        if (invalidTeamState) {
            handleAction(() => clearActiveTeamAction(), { fullReload: true });
        }
    }, [invalidTeamState, handleAction]);

    // Si no hi ha un equip actiu, estem al "vestíbul".
    if (!activeTeamData) {
        return (
            <div className="max-w-4xl mx-auto space-y-8 p-4">
                {/* Bloc d'invitacions personals */}
                {personalInvitations && personalInvitations.length > 0 && (
                    <Card className="bg-primary/5 border-primary/20">
                        <CardHeader><CardTitle>Tens invitacions pendents!</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            {personalInvitations.map(invite => (
                                <div key={invite.id} className="flex items-center justify-between p-3 bg-background rounded-lg">
                                    <p className="font-medium"><strong>{invite.inviter_name}</strong> t'ha convidat a <strong>{invite.team_name}</strong>.</p>
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={() => handleAction(() => acceptPersonalInviteAction(invite.id), { fullReload: true })} disabled={isPending}>
                                            {isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Acceptar"}
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => handleAction(() => declinePersonalInviteAction(invite.id), { successMessage: "Invitació rebutjada." })} disabled={isPending}>Rebutjar</Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
                
                {/* Llista d'equips i opció de crear */}
                <div>
                    <h1 className="text-3xl font-bold">Els Teus Equips</h1>
                    <p className="text-muted-foreground">Selecciona un equip per a començar a treballar o crea'n un de nou.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {userTeams.map(({ teams, role }) => teams && (
                        <Card key={teams.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle>{teams.name}</CardTitle>
                                <CardDescription>El teu rol: <span className="font-semibold capitalize">{role}</span></CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow flex items-end">
                                <Button onClick={() => handleAction(() => switchActiveTeamAction(teams.id), { fullReload: true })} disabled={isPending} className="w-full">
                                    {isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Entrar"}
                                    {!isPending && <ArrowRight className="w-4 h-4 ml-2" />}
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                    <Card className="border-dashed">
                        <CardHeader><CardTitle>Crear un nou equip</CardTitle></CardHeader>
                        <CardContent>
                            {/* ✅ CORRECCIÓ: Embolcallem la crida a l'acció per gestionar el resultat i complir amb el tipat de 'action'. */}
                            <form 
                                action={async (formData) => {
                                    startTransition(async () => {
                                        const result = await createTeamAction(formData);
                                        // createTeamAction fa un redirect en cas d'èxit, així que només gestionem l'error.
                                        if (result?.success === false) {
                                            toast.error("Error", { description: result.message });
                                        }
                                    });
                                }} 
                                className="space-y-4"
                            >
                                <Input name="teamName" placeholder="Nom del nou equip" required disabled={isPending} />
                                <Button type="submit" disabled={isPending} className="w-full">
                                    {isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <Plus className="w-4 h-4 mr-2" />} Crear Equip
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Si tenim un equip actiu, mostrem el panell de control de l'equip.
    const { team, teamMembers, pendingInvitations, currentUserRole, inboxPermissions } = activeTeamData;
    // ✅ MILLORA: Usem el helper de permisos per a la lògica de la UI.
    const canManageTeam = hasPermission(currentUserRole, PERMISSIONS.MANAGE_TEAM);

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">{team.name}</h1>
                <Button variant="outline" onClick={() => handleAction(() => clearActiveTeamAction(), { fullReload: true })} disabled={isPending}>
                    <LogOut className="w-4 h-4 mr-2" /> Canviar d'equip
                </Button>
            </div>

            {/* Formulari d'invitació */}
            {canManageTeam && (
                <Card>
                    <CardHeader><CardTitle>Convida nous membres</CardTitle></CardHeader>
                    <CardContent>
                        <form ref={formRef} action={(formData) => handleAction(() => inviteUserAction(formData), { successMessage: "Invitació enviada." })} className="flex flex-col sm:flex-row gap-2">
                            <Input name="email" type="email" placeholder="correu@exemple.com" required disabled={isPending} className="flex-grow" />
                            <Select name="role" defaultValue="member" required>
                                <SelectTrigger className="w-full sm:w-[150px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="member">Membre</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button type="submit" disabled={isPending} className="sm:w-auto"><UserPlus className="w-4 h-4" /></Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Llista d'invitacions pendents */}
            {canManageTeam && pendingInvitations.length > 0 && (
                <Card>
                    <CardHeader><CardTitle>Invitacions Pendents</CardTitle></CardHeader>
                    <CardContent className="divide-y">
                        {pendingInvitations.map(invite => (
                            <div key={invite.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                                <div>
                                    <p className="font-medium">{invite.email}</p>
                                    <p className="text-sm text-muted-foreground capitalize">{invite.role}</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleAction(() => revokeInvitationAction(invite.id), { successMessage: "Invitació revocada." })} disabled={isPending}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Llista de membres de l'equip */}
            <Card>
                <CardHeader><CardTitle>Membres de l'equip ({teamMembers.length})</CardTitle></CardHeader>
                <CardContent className="divide-y">
                    {teamMembers.map(member => {
                        if (!member.profiles) return null;
                        const isOwner = member.role === 'owner';
                        const isSelf = user.id === member.profiles.id;
                        const hasInboxPermission = Array.isArray(inboxPermissions) && inboxPermissions.some(p => p.grantee_user_id === user.id && p.target_user_id === member.profiles!.id);

                        return (
                            <div key={member.profiles.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                                <div className="flex items-center gap-4">
                                    <Avatar>
                                        <AvatarImage src={member.profiles.avatar_url ?? undefined} />
                                        <AvatarFallback>{member.profiles.full_name?.split(' ').map(n => n[0]).join('')}</AvatarFallback>
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
                                            onValueChange={(newRole) => handleAction(() => updateMemberRoleAction(member.profiles!.id, newRole as 'admin' | 'member'), { successMessage: "Rol actualitzat." })}
                                            disabled={!canManageTeam || isSelf || isPending}
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
                                                    <Button variant="ghost" size="icon" onClick={() => handleAction(() => toggleInboxPermissionAction(member.profiles!.id), { successMessage: "Permís actualitzat." })} disabled={isPending}>
                                                        {hasInboxPermission ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>{hasInboxPermission ? `Deixar de veure la bústia` : `Veure la bústia`}</p></TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                    {canManageTeam && !isOwner && !isSelf && (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" disabled={isPending} onClick={() => { if(confirm("Estàs segur?")) { handleAction(() => removeMemberAction(member.profiles!.id), { successMessage: "Membre eliminat." }) } }}>
                                                        <Trash2 className="w-4 h-4 text-destructive" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>Eliminar {member.profiles.full_name}</p></TooltipContent>
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

