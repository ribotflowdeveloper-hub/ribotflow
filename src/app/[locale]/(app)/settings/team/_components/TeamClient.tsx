"use client";


import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRouter} from 'next/navigation';
import { Loader2, UserPlus, Trash2, Plus, ArrowRight, LogOut, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTransition, useRef, useEffect } from 'react';

// ✅ PAS 1: IMPORTA EL CLIENT CORRECTE I LES ACCIONS
import { createClient } from '@/lib/supabase/client';
import {
    switchActiveTeamAction,
    clearActiveTeamAction,
    createTeamAction,
    inviteUserAction,
    revokeInvitationAction,
    toggleInboxPermissionAction
} from '../actions';
import type { User } from '@supabase/supabase-js';
import type { UserTeam, ActiveTeamData } from '../page';

type ActionResult = { success: boolean; message?: string; } | void;

// ✅ Añadimos la nueva prop opcional 'invalidTeamState'.
interface TeamClientProps {
    user: User;
    userTeams: UserTeam[];
    activeTeamData: ActiveTeamData | null;
    invalidTeamState?: boolean;
}
/**
 * Component de client intel·ligent que renderitza o el HUB o el DASHBOARD de l'equip.
 */
export function TeamClient({ user, userTeams, activeTeamData, invalidTeamState }: TeamClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const supabase = createClient();
    const formRef = useRef<HTMLFormElement>(null);
    
    
    // ✅ Este efecto corrige automáticamente un estado de equipo inválido.
    useEffect(() => {
        if (invalidTeamState) {
            console.log("[CLIENT] Estado inválido detectado. Ejecutando limpieza de equipo activo...");
            handleClearTeam();
        }
    }, [invalidTeamState]);



    const executeActionAndReload = async (action: () => Promise<ActionResult>) => {
        const result = await action();
        if (result && result.success === false) {
            toast.error("Error", { description: result.message });
            return;
        }
        await supabase.auth.refreshSession();
        // Forzamos una recarga completa para garantizar la sincronización.
        window.location.reload(); 
    };
    // ✅ NOVA FUNCIÓ per a gestionar el canvi de permisos
    const handleTogglePermission = (targetUserId: string, granteeUserId: string) => {
        startTransition(async () => {
            const result = await toggleInboxPermissionAction(targetUserId, granteeUserId);
            if (result.success) {
                toast.success(result.message);
                router.refresh();
            } else {
                toast.error(result.message);
            }
        });
    };


    const handleCreateTeam = (formData: FormData) => {
        startTransition(async () => {
            const result = await createTeamAction(formData);
            if (result?.success === false) {
                toast.error(result.message);
            }
        });
    };

    const handleInvite = (formData: FormData) => {
        startTransition(async () => {
            const result = await inviteUserAction(formData);
            if (result.success) {
                toast.success(result.message);
                formRef.current?.reset();
                router.refresh();
            } else {
                toast.error(result.message);
            }
        });
    };

    const handleRevoke = (invitationId: string) => {
        startTransition(async () => {
            await revokeInvitationAction(invitationId);
            toast.success("Invitació revocada");
            router.refresh();
        });
    };

    const getInitials = (name: string | null | undefined) => {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    };
    
    const handleSwitchTeam = (teamId: string) => {
        startTransition(() => executeActionAndReload(() => switchActiveTeamAction(teamId)));
    };

    const handleClearTeam = () => {
        startTransition(() => executeActionAndReload(() => clearActiveTeamAction()));
    };

     // Si el estado es inválido, mostramos un mensaje de carga mientras se corrige.
     if (invalidTeamState) {
        return <div className="flex justify-center items-center h-64">Corrigiendo estado del equipo...</div>;
    }
    // --- VISTA 1: El "vestíbul" o HUB d'equips ---
    if (!activeTeamData) {
        return (
            <div className="max-w-4xl mx-auto space-y-8 p-4">
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
                                <Button onClick={() => handleSwitchTeam(teams.id)} disabled={isPending} className="w-full">
                                    {isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Entrar"}
                                    {!isPending && <ArrowRight className="w-4 h-4 ml-2" />}
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                    <Card className="border-dashed">
                        <CardHeader><CardTitle>Crear un nou equip</CardTitle></CardHeader>
                        <CardContent>
                            <form action={handleCreateTeam} className="space-y-4">
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

    // --- VISTA 2: El panell de control de l'equip actiu ---
    const { team, teamMembers, pendingInvitations, currentUserRole, inboxPermissions } = activeTeamData;
    const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';

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
                        <form ref={formRef} action={handleInvite} className="flex flex-col sm:flex-row gap-2">
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
                                <form action={() => handleRevoke(invite.id)}>
                                    <Button type="submit" variant="ghost" size="sm" disabled={isPending}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                </form>
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

                        // Comprovem si l'usuari actual té permís per a veure la bústia d'aquest membre
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
                                    <Badge variant={member.role === 'owner' ? 'default' : 'secondary'} className="capitalize">{member.role}</Badge>
                                    {/* ✅ NOVA ICONA DE PERMISOS */}
                                    {/* Només el propietari la veu, i no per a si mateix */}
                                    {currentUserRole === 'owner' && user.id !== member.profiles.id && (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleTogglePermission(member.profiles!.id, user.id)}
                                                        disabled={isPending}
                                                    >
                                                        {hasPermission ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{hasPermission ? `Clica per a deixar de veure la bústia de ${member.profiles.full_name}` : `Clica per a veure la bústia de ${member.profiles.full_name}`}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                    {canManage && member.role !== 'owner' && user.id !== member.profiles.id && (
                                        <Button variant="ghost" size="icon" disabled> {/* Lògica d'eliminar membre pendent */}
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
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