// /app/[locale]/signup/_hooks/useSignupForm.ts

"use client";

import { useTransition, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { signupAction, googleAuthAction } from '@/app/[locale]/(auth)/auth/actions';

/**
 * Hook que encapsula tota la lògica d'estat i accions per al formulari de registre.
 */
// ✅ JA NO NECESSITA REBRE EL TOKEN COM A ARGUMENT
export function useSignupForm() {
    const t = useTranslations('SignupPage');
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [isGoogleLoading, startGoogleTransition] = useTransition();

    // ✅ LLEGIM EL TOKEN I L'EMAIL DIRECTAMENT AQUÍ
    const inviteToken = useMemo(() => searchParams.get('invite_token'), [searchParams]);
    const invitedEmail = useMemo(() => searchParams.get('email'), [searchParams]);

    const handleEmailSignup = (formData: FormData) => {
        if (inviteToken) {
            formData.append('invite_token', inviteToken);
        }
        startTransition(() => {
            signupAction(formData);
        });
    };

    const handleGoogleSignup = () => {
        startGoogleTransition(() => {
            googleAuthAction(inviteToken);
        });
    };

    const errorMessage = useMemo(() => {
        const errorKey = searchParams.get('errorKey');
        const message = searchParams.get('message');

        if (errorKey) {
            // Intenta obtenir la traducció. Si no existeix, mostra la clau com a fallback.
            return t(`errors.${errorKey}`) || errorKey;
        }
        if (message) {
            return message;
        }
        return null;
    }, [searchParams, t]);


    return {
        isPending,
        isGoogleLoading,
        errorMessage,
        handleEmailSignup,
        handleGoogleSignup,
        inviteToken,    // ✅ RETORNEM ELS VALORS LLEGITS
        invitedEmail,   // ✅ RETORNEM ELS VALORS LLEGITS
    };
}