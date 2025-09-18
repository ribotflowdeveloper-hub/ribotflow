"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
 * @summary Pàgina d'inici de sessió de la plataforma.
 */
export default function LoginPage() {
  const t = useTranslations('LoginPage');
  const router = useRouter();
  const supabase = createClient();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => { setIsClient(true); }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  };

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(t('toastErrorTitle'), { description: t('toastErrorDescription') });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // ✅ CORRECCIÓ: Contenidor principal amb 'relative' per al 'z-index'
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2 relative">
      {/* CAPA 1 (Fons): Les partícules. Ocuparan tota la pantalla per sota de la resta. */}
      {isClient && <ParticleBackground />}

      {/* Columna Esquerra: Branding i Missatge */}
      {/* ✅ CORRECCIÓ: Afegim 'relative z-10' per posar-la per sobre del fons */}
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
          <p className="text-lg text-muted-foreground mb-8">
            {t('welcomeSubtitle')}
          </p>
          <ul className="space-y-4 text-lg text-left">
            <li className="flex items-start"><Check className="w-6 h-6 text-brand-green mr-3 mt-1 shrink-0" /><span>{t('feature1')}</span></li>
            <li className="flex items-start"><Check className="w-6 h-6 text-brand-green mr-3 mt-1 shrink-0" /><span>{t('feature2')}</span></li>
            <li className="flex items-start"><Check className="w-6 h-6 text-brand-green mr-3 mt-1 shrink-0" /><span>{t('feature3')}</span></li>
          </ul>
        </div>
      </div>

      {/* Columna Dreta: Formulari de Login */}
      {/* ✅ CORRECCIÓ: Afegim 'relative z-10' i 'bg-background' per posar-la per sobre */}
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

            <form onSubmit={handleEmailLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">{t('emailLabel')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input id="email" type="email" placeholder={t('emailPlaceholder')} required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t('passwordLabel')}</Label>
                  <Link href="#" className="text-sm font-medium text-primary hover:underline">
                    {t('forgotPasswordLink')}
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" />
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