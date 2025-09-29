// /app/[locale]/signup/_components/SignupForm.tsx

"use client";

import { useTransition } from 'react';
import { signupAction, googleAuthAction } from '@/app/[locale]/auth/actions'; // Assegura't que la ruta és correcta
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Mail, Lock, Loader2, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';

const ParticleBackground = dynamic(
    () => import('@/app/[locale]/_components/ParticleBackground').then(mod => mod.ParticleBackground),
    { ssr: false }
);

/**
 * Component de client que renderitza el formulari de registre.
 * Ara rep el token i l'email com a props.
 */
export function SignupForm({ inviteToken, message, invitedEmail, errorKey }: {
    errorKey?: string;
    inviteToken?: string;
    message?: string;
    invitedEmail?: string;
}) {
    const t = useTranslations('SignupPage');
    const [isPending, startTransition] = useTransition();
    const [isGoogleLoading, startGoogleTransition] = useTransition();

    const handleEmailSignup = (formData: FormData) => {
        // Passem el token d'invitació a la Server Action si existeix
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

    return (
        <div className="w-full min-h-screen lg:grid lg:grid-cols-2 relative">
            <ParticleBackground />

            {/* Columna Esquerra: Branding i Beneficis */}
            <div className="hidden lg:flex flex-col items-center justify-center p-12 relative z-10">
                <div className="text-center max-w-md">
                    <Image
                        src="/android-chrome-192x192.png"
                        alt="Logo de Ribotflow"
                        width={60}
                        height={60}
                        className="mx-auto mb-8"
                    />
                    <h1 className="text-4xl font-bold mb-6">{t('welcomeTitle')}</h1>
                    <p className="text-lg text-muted-foreground mb-8">{t('welcomeSubtitle')}</p>
                    <ul className="space-y-4 text-lg text-left">
                        <li className="flex items-start"><Check className="w-6 h-6 text-brand-green mr-3 mt-1 shrink-0" /><span>{t('feature1')}</span></li>
                        <li className="flex items-start"><Check className="w-6 h-6 text-brand-green mr-3 mt-1 shrink-0" /><span>{t('feature2')}</span></li>
                        <li className="flex items-start"><Check className="w-6 h-6 text-brand-green mr-3 mt-1 shrink-0" /><span>{t('feature3')}</span></li>
                    </ul>
                </div>
            </div>

            {/* Columna Dreta: Formulari de Registre */}
            <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background relative z-10">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
                        <p className="mt-2 text-muted-foreground">
                            {t('subtitle')}{" "}
                            <Link href="/login" className="font-medium text-primary hover:underline">
                                {t('loginLink')}
                            </Link>
                        </p>
                    </div>

                    <div className="space-y-6">
                        <Button
                            variant="outline"
                            className="w-full text-lg py-6 flex items-center justify-center"
                            onClick={handleGoogleSignup}
                            disabled={isGoogleLoading || isPending}
                        >
                            {isGoogleLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Image className="w-5 h-5 mr-3" alt="Google logo" src="https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg" width={20} height={20} />}
                            <span>{t('googleButton')}</span>
                        </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><Separator /></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">{t('separator')}</span></div>
                        </div>

                        <form action={handleEmailSignup} className="space-y-6">
                            {/* ✅ NOVA LÒGICA PER A MOSTRAR L'ERROR */}
                            {errorKey && (
                                <p className="text-sm text-center text-destructive">
                                    {/* Utilitzem la clau per a obtenir la traducció correcta */}
                                    {t(`errors.${errorKey}`)}
                                </p>
                            )}
                            {message && <p className="text-sm text-center text-destructive">{message}</p>}

                            <div className="space-y-2">
                                <Label htmlFor="email">{t('emailLabel')}</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder={t('emailPlaceholder')}
                                        required
                                        className="pl-10"
                                        // ✅ LÒGICA CLAU: Omplim i bloquegem l'email si ve d'una invitació
                                        defaultValue={invitedEmail}
                                        readOnly={!!invitedEmail}
                                    />
                                </div>
                                {invitedEmail && <p className="text-xs text-muted-foreground">Aquesta invitació és exclusiva per a aquest correu electrònic.</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">{t('passwordLabel')}</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <Input id="password" name="password" type="password" required minLength={6} placeholder={t('passwordPlaceholder')} className="pl-10" />
                                </div>
                            </div>
                            <Button type="submit" className="w-full text-lg py-6" disabled={isPending || isGoogleLoading}>
                                {isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                {t('submitButton')}
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}