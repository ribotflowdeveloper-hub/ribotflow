// /app/settings/team/_components/TeamClient.tsx

"use client";

import { useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UserPlus, Trash2 } from 'lucide-react';
import { createTeamAction, inviteUserAction, revokeInvitationAction } from '../actions';
import type { User } from '@supabase/supabase-js';
import type { Team, TeamMember, Invitation } from '../page';

/**
 * Component principal de client que decideix quina vista mostrar:
 * - El formulari de creació si no hi ha equip.
 * - El panell de l'equip si ja existeix.
 */
export function TeamClient({ team, teamMembers, pendingInvitations }: {
    user: User,
    team: Team,
    teamMembers: TeamMember[],
    pendingInvitations: Invitation[]
}) {
    // ✅ TRAMPA DE DEPURACIÓ 2: MIREM QUÈ ARRIBA AL CLIENT
    console.log("--- DADES DEL CLIENT (TeamClient.tsx) ---");
    console.log("Props rebudes:", { team, teamMembers, pendingInvitations });
    console.log("---------------------------------------");
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const formRef = useRef<HTMLFormElement>(null);

    // --- Lògica per al formulari de creació d'equip ---
    const handleCreateTeam = (formData: FormData) => {
        startTransition(async () => {
            const result = await createTeamAction(formData);
            if (result?.success === false) {
                toast.error(result.message);
            }
            // La redirecció del servidor s'encarrega de refrescar la pàgina en cas d'èxit.
        });
    };

    // --- Lògica per al panell d'invitació ---
    const handleInvite = (formData: FormData) => {
        startTransition(async () => {
            const result = await inviteUserAction(formData);
            if (result.success) {
                toast.success(result.message);
                formRef.current?.reset();
                router.refresh(); // Refresquem per veure la nova invitació a la llista
            } else {
                toast.error(result.message);
            }
        });
    };

    // =================================================================
    // RENDERITZAT CONDICIONAL: CREAR EQUIP O MOSTRAR PANELL
    // =================================================================

    // CAS 1: L'usuari NO té equip -> Mostrem el formulari de creació.
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

    // CAS 2: L'usuari SÍ té equip -> Mostrem el panell de control complet.
    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold">{team.name}</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Convida nous membres</CardTitle>
                </CardHeader>
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
                                    <Button type="submit" variant="ghost" size="sm"><Trash2 className="w-4 h-4 text-destructive" /></Button>
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