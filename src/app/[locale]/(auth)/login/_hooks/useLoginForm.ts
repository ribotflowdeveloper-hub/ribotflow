"use client";

import { useTransition, useMemo, useState } from 'react'; // Importem useState
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { loginAction, googleAuthAction } from '@/app/[locale]/(auth)/auth/actions';

/**
 * Custom hook que encapsula tota la lògica d'estat i accions per al formulari de login.
 */
export function useLoginForm() {
    const t = useTranslations('LoginPage');
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [isGoogleLoading, startGoogleTransition] = useTransition();

    // --- ✨ CANVIS CLAU ---
    // 1. Estat local per als errors del formulari
    const [formError, setFormError] = useState<string | null>(null);

    // 2. Llegim l'email dels params (per si venim d'un error de redirect, ex: OAuth)
    const emailFromParams = useMemo(() => {
        return searchParams.get('email');
    }, [searchParams]);

    // 3. Estat controlat per a l'email.
    // L'inicialitzem amb l'email de la URL si existeix.
    const [email, setEmail] = useState<string>(emailFromParams || '');
    // --- FI DELS CANVIS ---


    const handleEmailLogin = (formData: FormData) => {
        startTransition(async () => {
            // Reseteja l'error local abans de començar
            setFormError(null);

            // ✅ Captura el resultat de la Server Action
            const result = await loginAction(formData);

            if (!result.success) {
                // Si hi ha un error, actualitza l'estat local
                // Usem la clau d'error per buscar la traducció
                const errorKey = result.errorKey || 'authFailed';
         
                setFormError(t(`errors.${errorKey}`));
                
                // ✅ CONSERVA L'EMAIL: Actualitzem l'estat de l'email
                // (Encara que ja el controlem, això ho faria més robust
                // si l'acció retornés un email normalitzat, per exemple)
                if (result.email) {
                    setEmail(result.email);
                }
            }
            // Si té èxit (success: true), la Server Action ja haurà redirigit
            // i aquest component es desmuntarà, per la qual cosa no cal fer res aquí.
        });
    };

    const handleGoogleLogin = () => {
        startGoogleTransition(() => {
            googleAuthAction();
        });
    };

    // El missatge d'error ara és una combinació de l'error local (prioritari)
    // i l'error dels searchParams (fallback, p.ex. per OAuth).
    const errorMessage = useMemo(() => {
        // 1. L'error del formulari local (de 'loginAction') té prioritat
        if (formError) return formError;

        // 2. Errors de searchParams (p.ex. OAuth, o errors antics)
        const message = searchParams.get('message');
        const error = searchParams.get('error');

        if (error === 'invalid_credentials') return t('errors.invalidCredentials');
        if (error === 'auth_failed') return t('errors.authFailed');
        if (error === 'invite_failed') return message || t('errors.inviteFailed');
        if (message) return message;
        
        return null;
    }, [searchParams, t, formError]); // <-- Afegim formError a les dependències

    return {
        isPending,
        isGoogleLoading,
        errorMessage,
        email, // <-- Retornem l'email controlat
        setEmail, // <-- Retornem el setter per controlar l'input
        handleEmailLogin,
        handleGoogleLogin,
    };
}