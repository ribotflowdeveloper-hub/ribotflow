"use client";

import type { User } from "@supabase/supabase-js";
// ✅ Importem els tipus des del servei
import type { ActiveTeamData, TeamMember } from '@/lib/services/settings/team/team.service';
import type { UsageCheckResult } from '@/lib/subscription/subscription';
import type { Role } from '@/lib/permissions/permissions'; 
import { useTeamManagement } from "../_hooks/useTeamManagement";
import Link from 'next/link';

// Imports de UI
import {
  Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Avatar, AvatarFallback, AvatarImage, Badge,
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
  Alert, AlertDescription, AlertTitle
} from "@/components/ui/index";
import { Loader2, UserPlus, Trash2, LogOut, Eye, EyeOff, Terminal, Info } from "lucide-react";

// Definim les props que rebem del Server Component (ActiveTeamManagerData.tsx)
interface TeamDashboardProps {
  user: User;
  activeTeamData: ActiveTeamData;
  permissions: {
    canManageTeam: boolean; // Basat en RBAC (owner/admin)
    isOwner: boolean;       // Basat en RBAC (owner)
  };
  limits: {
    teamMembers: UsageCheckResult; // Límit de quantitat
  };
  features: {
    canManageRoles: boolean; // Feature Flag del Pla
  };
}

export function TeamDashboard({ user, activeTeamData, permissions, limits, features }: TeamDashboardProps) {
  // Hook que gestiona 'isPending' i les crides a Server Actions
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

  const { team, teamMembers, pendingInvitations, inboxPermissions } = activeTeamData;

  // Obtenim els valors de les props per a més claredat
  const { canManageTeam, isOwner } = permissions;
  const { teamMembers: teamLimit } = limits;
  const { canManageRoles } = features;

  const getInitials = (name?: string | null) => (name ? name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() : "??");

  // ✅ LÒGICA DE FILTRAT VISUAL DE MEMBRES
  let visibleMembers: TeamMember[] = [];
  const limitExceeded = !teamLimit.allowed && teamLimit.current > teamLimit.max;

  if (!limitExceeded) {
    visibleMembers = teamMembers; // Tot bé, els mostrem tots
  } else {
    // Límit superat. Mostrem només el propietari i l'usuari actual.
    const owner = teamMembers.find(m => m.role === 'owner');
    const self = teamMembers.find(m => m.profiles?.id === user.id);
    
    // Fem servir un Map per assegurar que no hi hagi duplicats si l'usuari ÉS el propietari
    const memberMap = new Map<string, TeamMember>();
    if (owner && owner.profiles) memberMap.set(owner.profiles.id, owner);
    if (self && self.profiles) memberMap.set(self.profiles.id, self);
    
    visibleMembers = Array.from(memberMap.values());
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-3 sm:px-6 pb-8">
      {/* 🔹 Header responsive */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:items-center">
        <h1 className="text-2xl sm:text-3xl font-bold">{team.name}</h1>
        <Button
          variant="outline"
          onClick={handleClearTeam}
          disabled={isPending}
          className="w-full sm:w-auto"
        >
          <LogOut className="w-4 h-4 mr-2" /> Canviar d'equip
        </Button>
      </div>

      {/* 🔹 Formulari d'invitació (Controlat per RBAC i Límit) */}
      {canManageTeam && (
        !teamLimit.allowed ? (
          // UI de Límit Aconseguit
          <Alert variant="default" className="border-primary">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Límit de membres assolit ({teamLimit.current}/{teamLimit.max})</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <span>
                {limitExceeded
                  ? `El teu pla actual només permet ${teamLimit.max} membres. Actualitza el pla per gestionar tots els ${teamLimit.current} membres.`
                  : `Has assolit el límit de ${teamLimit.max} membres per al teu pla.`
                }
              </span>
              <Button asChild size="sm" className="flex-shrink-0 w-full sm:w-auto">
                <Link href="/settings/billing">Actualitzar Pla</Link>
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          // UI d'Invitació Normal
          <Card>
            <CardHeader>
              <CardTitle>Convida nous membres</CardTitle>
              {teamLimit.max !== Infinity && (
                <CardDescription>
                  Pots convidar {teamLimit.max - teamLimit.current} membres més.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <form ref={inviteFormRef} action={handleInvite} className="flex flex-col sm:flex-row gap-3">
                <Input name="email" type="email" placeholder="correu@exemple.com" required disabled={isPending} className="flex-grow" />
                <Select name="role" defaultValue="member" required>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Membre</SelectItem>
                    {/* ✅ Controlat pel Feature Flag del Pla */}
                    <SelectItem value="admin" disabled={!canManageRoles}>
                      Admin {!canManageRoles ? '(Pla Pro+)' : ''}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button type="submit" disabled={isPending} className="w-full sm:w-auto px-5">
                  {isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  <span className="sm:hidden ml-2">Convidar</span>
                </Button>
              </form>
            </CardContent>
          </Card>
        )
      )}

      {/* 🔹 Invitacions pendents (Controlat per RBAC) */}
      {canManageTeam && pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invitacions Pendents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingInvitations.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border rounded-lg p-3"
              >
                <div>
                  <p className="font-medium">{invite.email}</p>
                  <p className="text-sm text-muted-foreground capitalize">{invite.role}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleRevokeInvite(invite.id)}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                  <span className="sm:hidden ml-2">Revocar invitació</span>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 🔹 Membres (Controlat per RBAC i Feature Flag) */}
      <Card>
        <CardHeader>
          <CardTitle>
            Membres de l'equip ({teamMembers.length}
            {teamLimit.max !== Infinity ? ` / ${teamLimit.max}` : ''})
          </CardTitle>
          {/* ✅ Mostrem una descripció si la llista està filtrada */}
          {limitExceeded && (
            <CardDescription className="text-warning-foreground">
              Límit del pla superat. Només es mostren el propietari i el teu usuari.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="divide-y">
          {/* ✅ UTILITZEM LA LLISTA FILTRADA 'visibleMembers' */}
          {visibleMembers.map((member) => {
            if (!member.profiles) return null;
            const isOwnerRole = member.role === "owner"; 
            const isSelf = user.id === member.profiles.id;
            
            const hasInboxPermission =
              Array.isArray(inboxPermissions) &&
              inboxPermissions.some(
                (p) =>
                  p.grantee_user_id === user.id &&
                  p.target_user_id === member.profiles!.id
              );

            return (
              <div
                key={member.profiles.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                {/* Info usuari */}
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={member.profiles.avatar_url ?? undefined} />
                    <AvatarFallback>{getInitials(member.profiles.full_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{member.profiles.full_name || "Usuari sense nom"}</p>
                    <p className="text-sm text-muted-foreground">{member.profiles.email}</p>
                  </div>
                </div>

                {/* Accions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {isOwnerRole ? (
                    <Badge variant="default" className="capitalize">
                      {member.role}
                    </Badge>
                  ) : (
                    // ✅ Select de Rol (Controlat per RBAC, Feature Flag i Límit)
                    <Select
                      value={member.role}
                      onValueChange={(newRole) => handleRoleChange(member.profiles!.id, newRole as Role)}
                      // Desactivat si no es pot gestionar, és ell mateix, o el límit està superat
                      disabled={!canManageTeam || !canManageRoles || isSelf || isPending || limitExceeded}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Membre</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  
                  {/* Tooltip per explicar per què està desactivat */}
                  {canManageTeam && !isOwnerRole && (limitExceeded || !canManageRoles) && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <Info className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {limitExceeded
                              ? "Actualitza el pla per gestionar rols."
                              : "La gestió de rols requereix un pla Pro."
                            }
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {/* Permís d'Inbox (Controlat per RBAC 'isOwner') */}
                  {isOwner && !isSelf && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleTogglePermission(member.profiles!.id)}
                            disabled={isPending}
                          >
                            {hasInboxPermission ? (
                              <Eye className="w-4 h-4 text-primary" />
                            ) : (
                              <EyeOff className="w-4 h-4 text-muted-foreground" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {hasInboxPermission
                              ? "Deixar de veure la bústia"
                              : "Veure la bústia"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {/* Eliminar Membre (Controlat per RBAC 'canManageTeam') */}
                  {/* ✅ Només es mostra si el límit NO està superat */}
                  {canManageTeam && !isOwnerRole && !isSelf && !limitExceeded && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isPending}
                            onClick={() => handleRemoveMember(member.profiles!.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Eliminar membre</p>
                        </TooltipContent>
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