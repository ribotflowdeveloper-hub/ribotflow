"use client";

import { useTransition, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { loginAction, googleAuthAction } from '@/app/[locale]/auth/actions';

/**
 * Custom hook que encapsula tota la lògica d'estat i accions per al formulari de login.
 */
export function useLoginForm() {
    const t = useTranslations('LoginPage');
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [isGoogleLoading, startGoogleTransition] = useTransition();

    const handleEmailLogin = (formData: FormData) => {
        startTransition(() => {
            loginAction(formData);
        });
    };

    const handleGoogleLogin = () => {
        startGoogleTransition(() => {
            googleAuthAction();
        });
    };

    // useMemo assegura que el missatge d'error només es calculi quan canviïn els paràmetres de la URL.
    const errorMessage = useMemo(() => {
        const message = searchParams.get('message');
        const error = searchParams.get('error');

        if (error === 'invalid_credentials') return t('errors.invalidCredentials');
        if (error === 'auth_failed') return t('errors.authFailed');
        if (error === 'invite_failed') return message || t('errors.inviteFailed');
        if (message) return message;
        
        return null;
    }, [searchParams, t]);

    return {
        isPending,
        isGoogleLoading,
        errorMessage,
        handleEmailLogin,
        handleGoogleLogin,
    };
}
