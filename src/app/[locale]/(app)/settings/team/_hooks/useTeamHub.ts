// /app/[locale]/settings/team/_hooks/useTeamHub.ts
"use client";

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
    createTeamAction,
    switchActiveTeamAction,
    acceptPersonalInviteAction,
    declinePersonalInviteAction
} from '../actions';

export function useTeamHub() {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    // Funció genèrica per a accions que requereixen una recàrrega completa
    // (canviar d'equip o acceptar una invitació canvien el token d'usuari)
    type ActionResult = { success: boolean; message?: string };
    
    const executeActionAndReload = (action: () => Promise<ActionResult>) => {
        startTransition(async () => {
            const result = await action();
            if (result && result.success === false) {
                toast.error(result.message || "Hi ha hagut un error.");
            } else {
                // ✅ Redirigeix a la vista principal de l’equip
                router.replace("/settings/team");
                router.refresh();
            }
        });
    };

    // Handlers que utilitzen la funció genèrica
    const handleCreateTeam = (formData: FormData) => {
        executeActionAndReload(() => createTeamAction(formData));
    };

    const handleSwitchTeam = (teamId: string) => {
        executeActionAndReload(() => switchActiveTeamAction(teamId));
    };

    const handleAcceptInvite = (invitationId: string) => {
        executeActionAndReload(() => acceptPersonalInviteAction(invitationId));
    };

    // Handler per rebutjar, que només necessita un refresc de dades
    const handleDeclineInvite = (invitationId: string) => {
        startTransition(async () => {
            await declinePersonalInviteAction(invitationId);
            toast.info("Invitació rebutjada.");
            router.refresh(); // No cal recarregar tota la pàgina, només les dades del servidor.
        });
    };

    // Retornem la nostra caixa d'eines 🧰
    return {
        isPending,
        handleCreateTeam,
        handleSwitchTeam,
        handleAcceptInvite,
        handleDeclineInvite,
    };
}