// /app/[locale]/settings/team/_components/TeamHub.tsx
"use client";

import type { UserTeam, PersonalInvitation } from '../page';
import { useTeamHub } from '../_hooks/useTeamHub';

// Imports de UI
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, ArrowRight } from 'lucide-react';

interface TeamHubProps {
    userTeams: UserTeam[];
    personalInvitations: PersonalInvitation[];
}

export function TeamHub({ userTeams, personalInvitations }: TeamHubProps) {
    // Obtenim tota la lògica del nostre hook
    const {
        isPending,
        handleCreateTeam,
        handleSwitchTeam,
        handleAcceptInvite,
        handleDeclineInvite,
    } = useTeamHub();

    return (
        <div className="max-w-4xl mx-auto space-y-8 p-4">
            {/* Secció d'invitacions pendents */}
            {personalInvitations && personalInvitations.length > 0 && (
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader>
                        <CardTitle>Tens invitacions pendents!</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {personalInvitations.map(invite => (
                            <div key={invite.id} className="flex items-center justify-between p-3 bg-background rounded-lg">
                                <div>
                                    <p className="font-medium">
                                        <strong>{invite.inviter_name}</strong> t'ha convidat a <strong>{invite.team_name}</strong>.
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={() => handleAcceptInvite(invite.id)} disabled={isPending}>
                                        {isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Acceptar"}
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleDeclineInvite(invite.id)} disabled={isPending}>
                                        Rebutjar
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Secció principal de selecció i creació d'equips */}
            <div>
                <h1 className="text-3xl font-bold">Els Teus Equips</h1>
                <p className="text-muted-foreground">Selecciona un equip per a començar a treballar o crea'n un de nou.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {/* Llista dels equips de l'usuari */}
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
                
                {/* Targeta per crear un nou equip */}
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