// /src/app/[locale]/(app)/settings/team/_components/TeamHub.tsx (FITXER CLIENT COMPLET)
"use client";

import type { UserTeam, PersonalInvitation } from '@/lib/services/settings/team/team.service';
import type { UsageCheckResult } from '@/lib/subscription/subscription';
import { useTeamHub } from '../_hooks/useTeamHub'; // Hook per a la lògica de client

// Imports de UI
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, ArrowRight, Info, Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Link from 'next/link';

interface TeamHubProps {
  userTeams: UserTeam[];
  personalInvitations: PersonalInvitation[];
  // ✅ Rep el resultat complet de la comprovació de 'maxTeams'
  teamUsage: UsageCheckResult; 
}

export function TeamHub({ userTeams, personalInvitations, teamUsage }: TeamHubProps) {
  // Hook que gestiona 'isPending' i les crides a Server Actions
  const {
    isPending,
    handleCreateTeam,
    handleSwitchTeam,
    handleAcceptInvite,
    handleDeclineInvite,
  } = useTeamHub();

  // ✅ Aquesta línia és la que petava. Ara 'teamUsage' no hauria de ser 'undefined'.
  const { allowed: canCreateTeam, error: teamUsageError, current, max } = teamUsage;
  const hasExceededTeamLimit = !canCreateTeam && current > max;

  // Ordenem els equips per nom per tenir un ordre estable
  const sortedTeams = [...userTeams].sort((a, b) => 
    a.teams?.name.localeCompare(b.teams?.name || '') || 0
  );

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
              <div key={invite.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-background rounded-lg gap-3">
                <div>
                  <p className="font-medium">
                    <strong>{invite.inviter_name}</strong> t'ha convidat a <strong>{invite.team_name}</strong>.
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
                  <Button size="sm" onClick={() => handleAcceptInvite(invite.id)} disabled={isPending} className="flex-1">
                    {isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Acceptar"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDeclineInvite(invite.id)} disabled={isPending} className="flex-1">
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
        <p className="text-muted-foreground">
          {hasExceededTeamLimit 
            ? `El teu pla actual només permet accés a ${max} equip${max > 1 ? 's' : ''} (${current}/${max}). Actualitza el pla per accedir a tots.`
            : "Selecciona un equip per a començar a treballar o crea'n un de nou."
          }
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        
        {/* Llista dels equips de l'usuari */}
        {sortedTeams.map(({ teams, role }, index) => {
          if (!teams) return null;

          // Lògica de bloqueig
          const isAllowed = !hasExceededTeamLimit || index < max;

          return (
            <Card 
              key={teams.id} 
              className={`flex flex-col ${!isAllowed ? 'bg-muted/50 border-dashed' : ''}`}
            >
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${!isAllowed ? 'text-muted-foreground' : ''}`}>
                  {!isAllowed && <Lock className="w-4 h-4 flex-shrink-0" />}
                  <span className="truncate">{teams.name}</span>
                </CardTitle>
                <CardDescription>El teu rol: <span className="font-semibold capitalize">{role}</span></CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex items-end">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild className="w-full">
                      <Button 
                        onClick={() => handleSwitchTeam(teams.id)} 
                        disabled={!isAllowed || isPending} 
                        className="w-full"
                        variant={!isAllowed ? 'outline' : 'default'}
                      >
                        {isPending ? <Loader2 className="animate-spin w-4 h-4" /> : (isAllowed ? "Entrar" : "Bloquejat")}
                        {!isPending && isAllowed && <ArrowRight className="w-4 h-4 ml-2" />}
                      </Button>
                    </TooltipTrigger>
                    {!isAllowed && (
                      <TooltipContent>
                        <p>Actualitza el teu pla per accedir a aquest equip.</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </CardContent>
            </Card>
          );
        })}
        
        {/* Targeta per crear un nou equip (amb lògica de límit) */}
        <Card className={!canCreateTeam ? "border-dashed bg-muted/50" : "border-dashed"}>
          <CardHeader>
            <CardTitle className={!canCreateTeam ? "text-muted-foreground" : ""}>
              Crear un nou equip
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!canCreateTeam ? (
              <Alert variant="default" className="border-warning text-warning-foreground">
                <Info className="h-4 w-4 text-warning-foreground" />
                <AlertTitle>Límit d'equips assolit</AlertTitle>
                <AlertDescription>
                  {teamUsageError || "Has assolit el límit d'equips per al teu pla."}
                  <Button asChild variant="link" size="sm" className="px-0 h-auto py-1 text-warning-foreground">
                    <Link href="/settings/billing">Actualitzar Pla</Link>
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <form action={handleCreateTeam} className="space-y-4">
                <Input name="teamName" placeholder="Nom del nou equip" required disabled={isPending} />
                <Button type="submit" disabled={isPending} className="w-full">
                  {isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <Plus className="w-4 h-4 mr-2" />} 
                  Crear Equip
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}