"use client"

import Image from 'next/image'
// Importem el NOSTRE nou component modal
import { LegalModalTrigger } from '@/components/ui/LegalModalTrigger'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import Link from 'next/link' // Encara el fem servir per anar a /login

// UI Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Mail, Lock, Loader2, Check, AlertTriangle, ArrowLeft } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox' // Importa el Checkbox de shadcn/ui

// Lògica
import { useSignupForm } from '../_hooks/useSignupForm'

const ParticleBackground = dynamic(
  () =>
    import('@/app/[locale]/(public)/_components/ParticleBackground').then(
      (mod) => mod.ParticleBackground,
    ),
  { ssr: false },
)

// Component de presentació per a la secció de branding
const BrandingSection = () => {
  const t = useTranslations('SignupPage')
  return (
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
        <p className="text-lg text-muted-foreground mb-8">
          {t('welcomeSubtitle')}
        </p>
        <ul className="space-y-4 text-lg text-left">
          <li className="flex items-start">
            <Check className="w-6 h-6 text-primary mr-3 mt-1 shrink-0" />
            <span>{t('feature1')}</span>
          </li>
          <li className="flex items-start">
            <Check className="w-6 h-6 text-primary mr-3 mt-1 shrink-0" />
            <span>{t('feature2')}</span>
          </li>
          <li className="flex items-start">
            <Check className="w-6 h-6 text-primary mr-3 mt-1 shrink-0" />
            <span>{t('feature3')}</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

// ✅ 1. Definim les props que rebrem del Servidor
interface SignupClientProps {
  privacyContent: React.ReactNode
  termsContent: React.ReactNode
}

export function SignupClient({
  privacyContent,
  termsContent,
}: SignupClientProps) {
  const t = useTranslations('SignupPage')
  const commonLegalT = useTranslations('LegalPages.Common')
  const {
    isPending,
    isGoogleLoading,
    errorMessage,
    handleEmailSignup,
    handleGoogleSignup,
    invitedEmail,
  } = useSignupForm()

  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2 relative">
      <ParticleBackground />
      <BrandingSection />

      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background relative z-10">
        <Link
          href="/"
          // Posició mòbil: dalt a l'esquerra
          // Posició escriptori: dalt a la dreta (i esborra l'esquerra)
          className="absolute top-6 left-6 lg:top-8 lg:right-8 lg:left-auto"
        >
          <Button
            variant="ghost" // "ghost" és més net per a això que "outline"
            // Mida mòbil: 'icon' (quadrat)
            // Mida escriptori: automàtic amb padding
            size="icon"
            className="lg:w-auto lg:h-10 lg:px-4 lg:py-2"
            aria-label={t('goBackHome')}
          >
            {/* Icona: en escriptori té marge a la dreta */}
            <ArrowLeft className="w-5 h-5 lg:mr-2" />

            {/* Text: ocult en mòbil, visible en escriptori */}
            <span className="hidden lg:inline">
              {t('goBackHome')}
            </span>
          </Button>
        </Link>
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
            <p className="mt-2 text-muted-foreground">
              {t('subtitle')}{' '}
              <Link
                href="/login"
                className="font-medium text-primary hover:underline"
              >
                {t('loginLink')}
              </Link>
            </p>
          </div>

          <div className="space-y-6">
            <Button
              variant="outline"
              className="w-full text-lg py-6"
              onClick={handleGoogleSignup}
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
                />
              )}
              <span>{t('googleButton')}</span>
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {t('separator')}
                </span>
              </div>
            </div>

            <form action={handleEmailSignup} className="space-y-6">
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
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder={t('emailPlaceholder')}
                    required
                    className="pl-10"
                    defaultValue={invitedEmail ?? undefined}
                    readOnly={!!invitedEmail}
                  />
                </div>
                {invitedEmail && (
                  <p className="text-xs text-muted-foreground">
                    Aquesta invitació és exclusiva per a aquest correu
                    electrònic.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('passwordLabel')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    placeholder={t('passwordPlaceholder')}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* --- Checkboxes Legals AMB MODAL --- */}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="terms"
                  name="termsAccepted"
                  required
                  disabled={isPending || isGoogleLoading}
                  className="mt-0.5" // Ajusta l'alineació
                />
                <Label
                  htmlFor="terms"
                  className="text-sm font-normal leading-snug text-muted-foreground"
                >
                  {t('acceptTermsPrefix')}{' '}
                  {/* ✅ 2. Fem servir el LegalModalTrigger */}
                  <LegalModalTrigger
                    title={commonLegalT('termsConditionsTitle')}
                    triggerText={commonLegalT('termsConditionsTitle')}
                  >
                    {/* ✅ 3. Passem el contingut rebut per props */}
                    {termsContent}
                  </LegalModalTrigger>
                </Label>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="privacy"
                  name="privacyAccepted"
                  required
                  disabled={isPending || isGoogleLoading}
                  className="mt-0.5" // Ajusta l'alineació
                />
                <Label
                  htmlFor="privacy"
                  className="text-sm font-normal leading-snug text-muted-foreground"
                >
                  {t('acceptPrivacyPrefix')}{' '}
                  {/* ✅ 2. Fem servir el LegalModalTrigger */}
                  <LegalModalTrigger
                    title={commonLegalT('privacyPolicyTitle')}
                    triggerText={commonLegalT('privacyPolicyTitle')}
                  >
                    {/* ✅ 3. Passem el contingut rebut per props */}
                    {privacyContent}
                  </LegalModalTrigger>
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full text-lg py-6"
                disabled={isPending || isGoogleLoading}
              >
                {isPending && (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                )}
                {t('submitButton')}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}