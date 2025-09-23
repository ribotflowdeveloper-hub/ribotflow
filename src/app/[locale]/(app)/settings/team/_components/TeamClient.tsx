"use client"; // ✅ AQUESTA ÉS LA LÍNIA QUE HO SOLUCIONA TOT

import { useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, Trash2 } from 'lucide-react';
import { createTeamAction, inviteUserAction, revokeInvitationAction } from '../actions';
import type { User } from '@supabase/supabase-js';
import type { Team, TeamMember, Invitation } from '../page';

/**
 * Component principal de client amb una UI millorada i lògica de permisos.
 */
export function TeamClient({ user, team, teamMembers, pendingInvitations, currentUserRole }: {
    user: User;
    team: Team;
    teamMembers: TeamMember[];
    pendingInvitations: Invitation[];
    currentUserRole: string | null;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const formRef = useRef<HTMLFormElement>(null);

    const getInitials = (name: string | null | undefined) => {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    };

    const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';

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

    if (!team) {
        return (
            <Card className="max-w-lg mx-auto mt-10">
                <CardHeader>
                    <CardTitle>Crea el teu equip</CardTitle>
                    <CardDescription>Comença donant un nom al teu espai de treball.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={handleCreateTeam} className="flex gap-2">
                        <Input name="teamName" placeholder="Nom de la teva empresa" required disabled={isPending} />
                        <Button type="submit" disabled={isPending}>
                            {isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Crear Equip"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold">{team.name}</h1>

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
                                <form action={(formData) => {
                                    const invitationId = formData.get('invitationId') as string;
                                    if (invitationId) {
                                        revokeInvitationAction(invitationId);
                                    }
                                }}>                                    <input type="hidden" name="invitationId" value={invite.id} />
                                    <Button type="submit" variant="ghost" size="sm"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                </form>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader><CardTitle>Membres de l'equip ({teamMembers.length})</CardTitle></CardHeader>
                <CardContent className="divide-y">
                    {/* ✅ NOU: Missatge per quan no es troben membres */}
                    {teamMembers.length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                            <p>No s'han trobat membres a l'equip.</p>
                            <p className="text-xs mt-1">Això pot ser un problema amb la relació entre taules o les polítiques de seguretat (RLS).</p>
                        </div>
                    )}
                    {teamMembers.map(member => member.profiles && (
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
                                {canManage && member.role !== 'owner' && user.id !== member.profiles.id && (
                                     <Button variant="ghost" size="icon" disabled>
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                     </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}

