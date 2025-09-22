"use client";

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Mail, Lock, Loader2, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';

// Carreguem el fons de partícules de manera dinàmica per optimitzar el rendiment
const ParticleBackground = dynamic(
    () => import('@/app/[locale]/_components/ParticleBackground').then(mod => mod.ParticleBackground),
    { ssr: false }
);

/**
 * @summary Pàgina de registre per a nous usuaris, amb disseny millorat i traduccions.
 */
export default function SignupPage() {
    const t = useTranslations('SignupPage');
    const supabase = createClient()
;

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    const handleGoogleSignup = async () => {
        setIsGoogleLoading(true);
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${location.origin}/auth/callback` },
        });
    };

    const handleEmailSignup = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: { emailRedirectTo: `${location.origin}/auth/callback` },
            });
            if (error) throw error;
            toast.success(t('toastSuccessTitle'), { description: t('toastSuccessDescription') });
        } catch (error) {
            toast.error(t('toastErrorTitle'), {
                description: (error as Error).message || t('toastErrorDescription')
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full min-h-screen lg:grid lg:grid-cols-2 relative">
            {/* El fons de partícules ara és per a tota la pàgina */}
            <ParticleBackground />

            {/* Columna Esquerra: Branding i Beneficis */}
            {/* ✅ CORRECCIÓ: Apliquem 'justify-center' per alinear verticalment */}
            <div className="hidden lg:flex flex-col items-center justify-center p-12 relative z-10">
                {/* ✅ CORRECCIÓ: Apliquem 'text-center' per centrar el text */}
                <div className="text-center max-w-md">
                    <Image
                        src="/android-chrome-192x192.png"
                        alt="Logo de Ribotflow"
                        width={60}
                        height={60}
                        className="mx-auto mb-8" // 'mx-auto' per centrar la imatge
                    />
                    <h1 className="text-4xl font-bold mb-6">{t('welcomeTitle')}</h1>
                    <p className="text-lg text-muted-foreground mb-8">{t('welcomeSubtitle')}</p>
                    <ul className="space-y-4 text-lg text-left"> {/* Deixem els ítems alineats a l'esquerra per llegibilitat */}
                        <li className="flex items-start"><Check className="w-6 h-6 text-brand-green mr-3 mt-1 shrink-0" /><span>{t('feature1')}</span></li>
                        <li className="flex items-start"><Check className="w-6 h-6 text-brand-green mr-3 mt-1 shrink-0" /><span>{t('feature2')}</span></li>
                        <li className="flex items-start"><Check className="w-6 h-6 text-brand-green mr-3 mt-1 shrink-0" /><span>{t('feature3')}</span></li>
                    </ul>
                </div>
            </div>

            {/* Columna Dreta: Formulari de Registre */}
            {/* ✅ CORRECCIÓ: Apliquem 'justify-center' per alinear-la igual que l'altra columna */}
            <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background relative z-10">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center"> {/* Centrem tot el text del formulari */}
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
                            disabled={isGoogleLoading || isLoading}
                        >
                            {isGoogleLoading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <Image
                                    className="w-5 h-5 mr-3"
                                    alt="Google logo"
                                    src="https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg"
                                    width={20}  // ✅ AFEGEIX AIXÒ
                                    height={20} // ✅ AFEGEIX AIXÒ
                                />)}
                            <span>{t('googleButton')}</span>
                        </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><Separator /></div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">{t('separator')}</span>
                            </div>
                        </div>

                        <form onSubmit={handleEmailSignup} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="email">{t('emailLabel')}</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <Input id="email" type="email" placeholder={t('emailPlaceholder')} required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">{t('passwordLabel')}</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <Input id="password" type="password" required minLength={6} placeholder={t('passwordPlaceholder')} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" />
                                </div>
                            </div>
                            <Button type="submit" className="w-full text-lg py-6" disabled={isLoading || isGoogleLoading}>
                                {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                {t('submitButton')}
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}