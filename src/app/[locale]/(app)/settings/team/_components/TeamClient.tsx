// /app/settings/team/_components/TeamClient.tsx

"use client";

import { useTransition, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UserPlus, Trash2 } from 'lucide-react';
import { createTeamAction, inviteUserAction, revokeInvitationAction } from '../actions';
import type { User } from '@supabase/supabase-js';
import type { Team, TeamMember, Invitation } from '../page'; // Importem els tipus de la pàgina
import { useRouter } from 'next/navigation';

/**
 * Component intern per al formulari de creació
 */
function CreateTeamForm() {
    const [isPending, startTransition] = useTransition();
    
    const handleSubmit = (formData: FormData) => {
        startTransition(async () => {
            const result = await createTeamAction(formData);
            // La redirecció del servidor s'encarrega de tot. Només mostrem l'error si n'hi ha.
            if (result?.success === false) {
                toast.error(result.message);
            }
        });
    };

    return (
        <Card className="max-w-lg mx-auto">
            <CardHeader>
                <CardTitle>Crea el teu equip</CardTitle>
                <CardDescription>Comença donant un nom al teu espai de treball.</CardDescription>
            </CardHeader>
            <CardContent>
                <form action={handleSubmit} className="flex gap-2">
                    <Input name="teamName" placeholder="Nom de la teva empresa" required disabled={isPending} />
                    <Button type="submit" disabled={isPending}>
                        {isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Crear Equip"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

/**
 * Component intern per al panell de l'equip
 */
function TeamDashboard({ team, teamMembers, pendingInvitations }: {
    team: NonNullable<Team>,
    teamMembers: TeamMember[],
    pendingInvitations: Invitation[]
}) {
    // ✅ 2. Inicialitzem el router
    const router = useRouter();
    const [isInvitePending, startInviteTransition] = useTransition();
    const formRef = useRef<HTMLFormElement>(null);

    const handleInvite = (formData: FormData) => {
        startInviteTransition(async () => {
            const result = await inviteUserAction(formData);
            if (result.success) {
                toast.success(result.message);
                formRef.current?.reset();
                // ✅ 3. Refresquem les dades del servidor
                // Això tornarà a executar la càrrega de dades a 'page.tsx' i actualitzarà la llista
                router.refresh();
            } else {
                toast.error(result.message);
            }
        });
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold">{team.name}</h1>
            
            <Card>
                <CardHeader>
                    <CardTitle>Convida nous membres</CardTitle>
                </CardHeader>
                <CardContent>
                    <form ref={formRef} action={handleInvite} className="flex flex-col sm:flex-row gap-2">
                        <Input name="email" type="email" placeholder="correu@exemple.com" required disabled={isInvitePending} className="flex-grow" />
                        <Select name="role" defaultValue="member" required>
                            <SelectTrigger className="w-full sm:w-[150px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="member">Membre</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button type="submit" disabled={isInvitePending} className="sm:w-auto">
                            {isInvitePending ? <Loader2 className="animate-spin w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {pendingInvitations.length > 0 && (
                <Card>
                    <CardHeader><CardTitle>Invitacions Pendents</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        {pendingInvitations.map(invite => (
                            <div key={invite.id} className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">{invite.email}</p>
                                    <p className="text-sm text-muted-foreground capitalize">{invite.role}</p>
                                </div>
                                <form action={() => revokeInvitationAction(invite.id)}>
                                    <Button type="submit" variant="ghost" size="sm"><Trash2 className="w-4 h-4 text-destructive"/></Button>
                                </form>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader><CardTitle>Membres de l'equip</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                    {teamMembers.map(member => member.profiles && (
                        <div key={member.profiles.id} className="flex items-center justify-between">
                            <p>{member.profiles.full_name || member.profiles.email}</p>
                            <span className="text-sm font-medium capitalize">{member.role}</span>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}

/**
 * Component principal de client que decideix quina vista mostrar.
 */
export function TeamClient({ user, team, teamMembers, pendingInvitations }: {
    user: User,
    team: Team,
    teamMembers: TeamMember[],
    pendingInvitations: Invitation[]
}) {
    if (!team) {
        return <CreateTeamForm />;
    }
    
    return <TeamDashboard team={team} teamMembers={teamMembers} pendingInvitations={pendingInvitations} />;
}