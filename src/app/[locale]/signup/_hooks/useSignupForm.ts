"use client";

import { useTransition, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { signupAction, googleAuthAction } from '@/app/[locale]/auth/actions';

/**
 * Hook que encapsula tota la lògica d'estat i accions per al formulari de registre.
 * @param inviteToken - El token d'invitació opcional que es passarà a les accions.
 */
export function useSignupForm(inviteToken?: string) {
    const t = useTranslations('SignupPage');
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [isGoogleLoading, startGoogleTransition] = useTransition();

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
    };
}
