// /app/accept-invite/page.tsx
"use client";

import { acceptInviteAction } from '@/app/[locale]/(app)/settings/team/actions'; // Ajusta la ruta si cal

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Aquest Server Component s'activa quan un usuari fa clic a l'enllaç de l'email.
 * No mostra res, només executa la lògica i redirigeix.
 */
function AcceptInviteHandler() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const [message, setMessage] = useState("Processant invitació...");

    useEffect(() => {
        const processInvitation = async () => {
            if (!token) {
                setMessage("Token d'invitació invàlid.");
                return;
            }

            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                // Si no hi ha usuari, el redirigim a registrar-se, passant el token.
                router.push(`/signup?invite_token=${token}`);
            } else {
                // Si hi ha usuari, cridem l'acció del servidor.
                // La redirecció en cas d'èxit es farà des del servidor.
                const result = await acceptInviteAction(token);
                if (result?.success === false) {
                    setMessage(`Error: ${result.message}`);
                }
            }
        };

        processInvitation();
    }, [token, router]);

    return <div>{message}</div>;
}

export default function AcceptInvitePage() {
    return (
        <div className="flex items-center justify-center h-screen">
            {/* Suspense és necessari per a l'ús de useSearchParams */}
            <Suspense fallback={<div>Carregant...</div>}>
                <AcceptInviteHandler />
            </Suspense>
        </div>
    );
}