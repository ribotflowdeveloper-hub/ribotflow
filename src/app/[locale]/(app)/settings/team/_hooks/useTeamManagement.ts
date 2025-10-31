// /src/app/[locale]/(app)/settings/team/_hooks/useTeamManagement.ts (VERSIÓ FINAL)
"use client";

import { useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
    inviteUserAction, removeMemberAction,
    revokeInvitationAction, toggleInboxPermissionAction, updateMemberRoleAction
} from '../actions';
import type { Role } from '@/lib/permissions/permissions.config';

export function useTeamManagement() {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const inviteFormRef = useRef<HTMLFormElement>(null);

    // Define a type for the expected result structure
    type ActionResult = { success: boolean; message?: string };

    // Funció genèrica per a accions que refresquen les dades
    const executeActionAndRefresh = (action: () => Promise<ActionResult>, successMessage?: string) => {
        startTransition(async () => {
            const result = await action();
            if (result?.success === false) {
                toast.error(result.message || "Hi ha hagut un error.");
            } else {
                if (successMessage) toast.success(successMessage);
                router.refresh();
            }
        });
    };

    const handleClearTeam = () => {
        // Simplement naveguem a la pàgina d'equips. Res més.
        // Com que ja som a la pàgina, un 'refresh' és suficient
        // per a que el 'page.tsx' es torni a executar i ens mostri el lobby.
        router.push('/settings/team?view=select');
    };

    const handleInvite = (formData: FormData) => {
        executeActionAndRefresh(() => inviteUserAction(formData));
        inviteFormRef.current?.reset();
    };

    const handleRemoveMember = (userId: string) => {
        if (!confirm("Estàs segur que vols eliminar aquest membre? Aquesta acció no es pot desfer.")) return;
        executeActionAndRefresh(() => removeMemberAction(userId));
    };

    const handleRoleChange = (userId: string, newRole: Role) => {
        executeActionAndRefresh(() => updateMemberRoleAction(userId, newRole));
    };

    const handleRevokeInvite = (invitationId: string) => {
        executeActionAndRefresh(() => revokeInvitationAction(invitationId));
    };

    const handleTogglePermission = (targetUserId: string) => {
        executeActionAndRefresh(() => toggleInboxPermissionAction(targetUserId));
    };

    const getInitials = (name: string | null | undefined) => {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    };

    return {
        isPending, inviteFormRef, handleClearTeam, handleInvite,
        handleRemoveMember, handleRoleChange, handleRevokeInvite,
        handleTogglePermission, getInitials,
    };
}