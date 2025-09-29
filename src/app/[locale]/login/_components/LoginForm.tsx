// /app/[locale]/login/_components/LoginForm.tsx

"use client";

import { useTransition, useState } from 'react';
import { loginAction, googleAuthAction, forgotPasswordAction } from '@/app/[locale]/auth/actions'; // Assegura't que la ruta a les teves accions és correcta
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Mail, Lock, Loader2, Check, AlertTriangle, MailCheck } from 'lucide-react'; // ✅ Importem AlertTriangle
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation'; // Import the hook
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'; // Importem components de diàleg
import { toast } from 'sonner';

const ParticleBackground = dynamic(
    () => import('@/app/[locale]/_components/ParticleBackground').then(mod => mod.ParticleBackground),
    { ssr: false }
);

/**
 * Component de client que renderitza el formulari d'inici de sessió.
 */
export default function LoginForm() {
    const searchParams = useSearchParams(); // ✅ Read params here
    const message = searchParams.get('message');
    const error = searchParams.get('error');

    const t = useTranslations('LoginPage');
    const [isPending, startTransition] = useTransition();
    const [isGoogleLoading, startGoogleTransition] = useTransition();

    const [isForgotPending, startForgotTransition] = useTransition();
    const [isForgotDialogOpen, setForgotDialogOpen] = useState(false);
    const [resetEmailSent, setResetEmailSent] = useState(false);
    const [userEmail, setUserEmail] = useState(""); // Per a mostrar l'email de l'usuari

    const handleForgotPassword = (formData: FormData) => {
        const email = formData.get('email') as string;
        setUserEmail(email); // Guardem l'email per al missatge d'èxit

        startForgotTransition(async () => {
            const result = await forgotPasswordAction(formData);
            if (result.success) {
                setResetEmailSent(true); // Canviem a la vista d'èxit
            } else {
                toast.error(t('forgotPassword.errorTitle'), { description: result.message });
            }
        });
    };

    const handleDialogChange = (isOpen: boolean) => {
        setForgotDialogOpen(isOpen);
        if (!isOpen) {
            // Resetejem l'estat quan es tanca el diàleg
            setTimeout(() => setResetEmailSent(false), 300);
        }
    }

    const handleEmailLogin = (formData: FormData) => {
        startTransition(() => {
            // Cridem la Server Action. La redirecció es gestiona al servidor.
            loginAction(formData);
        });
    };

    const handleGoogleLogin = () => {
        startGoogleTransition(() => {
            // Cridem la Server Action per a Google.
            googleAuthAction();
        });
    };
    // ✅ NOVA LÒGICA PER ALS MISSATGES D'ERROR
    // Aquesta funció genera el missatge correcte basat en el codi d'error de la URL.
    const getErrorMessage = () => {
        if (error === 'invalid_credentials') {
            return t('errors.invalidCredentials');
        }
        if (error === 'auth_failed') {
            return t('errors.authFailed');
        }
        if (error === 'invite_failed') {
            return message || t('errors.inviteFailed');
        }
        // També mantenim la compatibilitat amb el 'message' antic per si de cas.
        if (message) {
            return message;
        }
        return null;
    };
    const errorMessage = getErrorMessage();

    return (
        <div className="w-full min-h-screen lg:grid lg:grid-cols-2 relative">
            <ParticleBackground />

            {/* Columna Esquerra: Branding i Missatge */}
            <div className="hidden lg:flex flex-col items-center justify-center p-12 relative z-10">
                <div className="text-center max-w-md">
                    <Image
                        src="/android-chrome-192x192.png"
                        alt="Logo de Ribotflow"
                        width={80}
                        height={80}
                        className="mx-auto mb-6"
                    />
                    <h1 className="text-4xl font-bold mb-4">{t('welcomeTitle')}</h1>
                    <p className="text-lg text-muted-foreground mb-8">{t('welcomeSubtitle')}</p>
                    <ul className="space-y-4 text-lg text-left">
                        <li className="flex items-start"><Check className="w-6 h-6 text-brand-green mr-3 mt-1 shrink-0" /><span>{t('feature1')}</span></li>
                        <li className="flex items-start"><Check className="w-6 h-6 text-brand-green mr-3 mt-1 shrink-0" /><span>{t('feature2')}</span></li>
                        <li className="flex items-start"><Check className="w-6 h-6 text-brand-green mr-3 mt-1 shrink-0" /><span>{t('feature3')}</span></li>
                    </ul>
                </div>
            </div>

            {/* Columna Dreta: Formulari de Login */}
            <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background relative z-10">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
                        <p className="mt-2 text-muted-foreground">
                            {t('subtitle')}{" "}
                            <Link href="/signup" className="font-medium text-primary hover:underline">
                                {t('signupLink')}
                            </Link>
                        </p>
                    </div>

                    <div className="space-y-6">
                        <Button
                            variant="outline"
                            className="w-full text-lg py-6 flex items-center justify-center"
                            onClick={handleGoogleLogin}
                            disabled={isGoogleLoading || isPending}
                        >
                            {isGoogleLoading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <Image
                                    className="w-5 h-5 mr-3"
                                    alt="Google logo"
                                    src="https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg"
                                    width={20}
                                    height={20}
                                />)}
                            <span>{t('googleButton')}</span>
                        </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><Separator /></div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">{t('separator')}</span>
                            </div>
                        </div>

                        <form action={handleEmailLogin} className="space-y-6">
                            {/* ✅ NOU COMPONENT D'ERROR AMB ESTIL */}
                            {errorMessage && (
                                <div className="bg-destructive/10 text-destructive border border-destructive/30 p-3 rounded-md flex items-center gap-3 text-sm">
                                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                    <p>{errorMessage}</p>
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="email">{t('emailLabel')}</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <Input id="email" name="email" type="email" placeholder={t('emailPlaceholder')} required className="pl-10" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">{t('passwordLabel')}</Label>
                                    {/* ✅ AFEGIM EL DIÀLEG DE "HE OBLIDAT LA CONTRASENYA" */}
                                    <Dialog open={isForgotDialogOpen} onOpenChange={handleDialogChange}>
                                        <DialogTrigger asChild>
                                            <button type="button" className="text-sm font-medium text-primary hover:underline">
                                                {t('forgotPasswordLink')}
                                            </button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-md">
                                            {/* ✅ RENDERITZACIÓ CONDICIONAL DINS DEL DIÀLEG */}
                                            {resetEmailSent ? (
                                                <div className="text-center p-8">
                                                    <MailCheck className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                                    <h3 className="text-xl font-bold">{t('forgotPassword.successTitle')}</h3>
                                                    <p className="text-muted-foreground mt-2">
                                                        {t('forgotPassword.successDescription')} <br />
                                                        <strong className="text-foreground">{userEmail}</strong>
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-4">{t('forgotPassword.spamWarning')}</p>
                                                    <Button onClick={() => setForgotDialogOpen(false)} className="mt-6 w-full">{t('forgotPassword.closeButton')}</Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <DialogHeader>
                                                        <DialogTitle>{t('forgotPassword.title')}</DialogTitle>
                                                        <DialogDescription>{t('forgotPassword.description')}</DialogDescription>
                                                    </DialogHeader>
                                                    <form action={handleForgotPassword}>
                                                        <div className="grid gap-4 py-4">
                                                            <Label htmlFor="email-forgot">{t('emailLabel')}</Label>
                                                            <Input id="email-forgot" name="email" type="email" placeholder="nom@exemple.com" required />
                                                        </div>
                                                        <DialogFooter>
                                                            <Button type="submit" disabled={isForgotPending} className="w-full">
                                                                {isForgotPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                                {t('forgotPassword.submitButton')}
                                                            </Button>
                                                        </DialogFooter>
                                                    </form>
                                                </>
                                            )}
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <Input id="password" name="password" type="password" required minLength={6} className="pl-10" />
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

