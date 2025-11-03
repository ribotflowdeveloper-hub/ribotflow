"use client";

import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Mail, Lock, Loader2, Check, AlertTriangle, ArrowLeft } from 'lucide-react';

// Lògica i components refactoritzats
import { useLoginForm } from '../_hooks/useLoginForm';
import { ForgotPasswordDialog } from './ForgotPasswordDialog';

// Carrega dinàmica per a components pesats només de client
const ParticleBackground = dynamic(() => import('@/app/[locale]/(public)/_components/ParticleBackground').then(mod => mod.ParticleBackground), { ssr: false });

// Component de presentació per a la secció de branding
const BrandingSection = () => {
    const t = useTranslations('LoginPage');
    return (
        <div className="hidden lg:flex flex-col items-center justify-center p-12 relative z-10">
            <div className="text-center max-w-md">
                <Image src="/android-chrome-192x192.png" alt="Logo de Ribotflow" width={80} height={80} className="mx-auto mb-6" />
                <h1 className="text-4xl font-bold mb-4">{t('welcomeTitle')}</h1>
                <p className="text-lg text-muted-foreground mb-8">{t('welcomeSubtitle')}</p>
                <ul className="space-y-4 text-lg text-left">
                    <li className="flex items-start"><Check className="w-6 h-6 text-primary mr-3 mt-1 shrink-0" /><span>{t('feature1')}</span></li>
                    <li className="flex items-start"><Check className="w-6 h-6 text-primary mr-3 mt-1 shrink-0" /><span>{t('feature2')}</span></li>
                    <li className="flex items-start"><Check className="w-6 h-6 text-primary mr-3 mt-1 shrink-0" /><span>{t('feature3')}</span></li>
                </ul>
            </div>
        </div>
    );
};

export default function LoginClient() {
    const t = useTranslations('LoginPage');
    
    // ✅ El hook ara retorna l'estat controlat per l'email
    const { 
        isPending, 
        isGoogleLoading, 
        errorMessage, 
        email,      // <-- ✨ NOU
        setEmail,   // <-- ✨ NOU
        handleEmailLogin, 
        handleGoogleLogin 
    } = useLoginForm();

    return (
        <div className="w-full min-h-screen lg:grid lg:grid-cols-2 relative">
            <ParticleBackground />
            <BrandingSection />

            <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background relative z-10">
                <Link
                    href="/"
                    className="absolute top-6 left-6 lg:top-8 lg:right-8 lg:left-auto"
                >
                    <Button
                        variant="ghost"
                        size="icon"
                        className="lg:w-auto lg:h-10 lg:px-4 lg:py-2"
                        aria-label={t('goBackHome')}
                    >
                        <ArrowLeft className="w-5 h-5 lg:mr-2" />
                        <span className="hidden lg:inline">
                            {t('goBackHome')}
                        </span>
                    </Button>
                </Link>
                
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
                        <p className="mt-2 text-muted-foreground">
                            {t('subtitle')}{" "}
                            <Link href="/signup" className="font-medium text-primary hover:underline">{t('signupLink')}</Link>
                        </p>
                    </div>

                    <div className="space-y-6">
                        <Button variant="outline" className="w-full text-lg py-6 flex items-center justify-center" onClick={handleGoogleLogin} disabled={isGoogleLoading || isPending}>
                            {isGoogleLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Image className="w-5 h-5 mr-3" alt="Google logo" src="https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg" width={20} height={20} />}
                            <span>{t('googleButton')}</span>
                        </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><Separator /></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">{t('separator')}</span></div>
                        </div>

                        <form action={handleEmailLogin} className="space-y-6">
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
                                    {/* ✅ CONVERTIM L'INPUT A CONTROLAT */}
                                    <Input 
                                        id="email" 
                                        name="email" 
                                        type="email" 
                                        placeholder={t('emailPlaceholder')} 
                                        required 
                                        className="pl-10"
                                        value={email} // <-- ✨ Lligat a l'estat
                                        onChange={(e) => setEmail(e.target.value)} // <-- Actualitza l'estat
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">{t('passwordLabel')}</Label>
                                    <ForgotPasswordDialog />
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    {/* El password no el volem controlar per seguretat i UX, 
                                        es manté no controlat i s'esborra, la qual cosa és correcte. */}
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