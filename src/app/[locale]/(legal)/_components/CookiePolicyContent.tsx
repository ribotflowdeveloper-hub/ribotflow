import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Separator } from '@/components/ui/separator'

interface ContentProps {
  locale: string
}

export async function CookiePolicyContent({ locale }: ContentProps) {
  const t = await getTranslations({ locale, namespace: 'LegalPages.CookiePolicy' })
  const commonT = await getTranslations({ locale, namespace: 'LegalPages.Common' })

  // Link helper
  const LegalLink = ({
    href,
    children,
  }: {
    href: string
    children: React.ReactNode
  }) => (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline-offset-4 hover:underline"
    >
      {children}
    </Link>
  )
  
  // Link extern per als navegadors
  const ExternalLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
     <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline-offset-4 hover:underline"
    >
      {children}
    </a>
  )

  return (
    <div className="space-y-8">
      {/* --- Títol Principal --- */}
      <div className="space-y-2 pb-4 border-b">
        <h1 className="text-3xl font-bold tracking-tight text-primary">
          {t('title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {commonT('lastUpdated', { date: new Date().toLocaleDateString(locale) })}
        </p>
      </div>

      {/* === Seccions === */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-l-4 border-primary pl-4 py-1">
          {t('section1.title')}
        </h2>
        <div className="pl-5">
          <p className="text-muted-foreground leading-relaxed">
            {t('section1.content.p1')}
          </p>
        </div>
      </section>

      <Separator className="my-8" />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-l-4 border-primary pl-4 py-1">
          {t('section2.title')}
        </h2>
        <div className="pl-5 space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            {t('section2.content.p1', { appName: commonT('appName') })}
          </p>
          {/* Tipus 1: Tècniques */}
          <div>
            <p className="font-semibold text-foreground">
              {t('section2.content.type1.name')}
            </p>
            <p className="text-muted-foreground leading-relaxed mt-1">
              {t('section2.content.type1.description')}
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-2">
              <li>{t('section2.content.type1.cookie1', { name: 'supabase-auth-token (o similar)'})}</li>
              <li>{t('section2.content.type1.cookie2', { name: 'next-intl-locale'})}</li>
              {/* Llista altres cookies tècniques si cal */}
            </ul>
          </div>

          {/* Secció Opcional: Analítiques (descomenta si les utilitzes) */}
          {/*
          <div className="pt-4">
            <p className="font-semibold text-foreground">
              {t('section2.content.type2.name')}
            </p>
            <p className="text-muted-foreground leading-relaxed mt-1">
              {t('section2.content.type2.description')}
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-2">
              <li>{t('section2.content.type2.cookie1', { name: '_ga, _gid (Google Analytics)'})}</li>
            </ul>
             <p className="text-sm text-muted-foreground mt-2">
              {t('section2.content.type2.thirdPartyInfo')}
            </p>
          </div>
          */}

          {/* Secció Opcional: Publicitat (descomenta si les utilitzes) */}
          {/* ... */}
        </div>
      </section>

      <Separator className="my-8" />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-l-4 border-primary pl-4 py-1">
          {t('section3.title')}
        </h2>
        <div className="pl-5 space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            {t('section3.content.p1')}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {t('section3.content.p2')}
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
             <li><ExternalLink href="https://support.google.com/chrome/answer/95647">Google Chrome</ExternalLink></li>
             <li><ExternalLink href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias">Mozilla Firefox</ExternalLink></li>
             <li><ExternalLink href="https://support.apple.com/es-es/guide/safari/sfri11471/mac">Apple Safari</ExternalLink></li>
             <li><ExternalLink href="https://support.microsoft.com/es-es/windows/eliminar-y-administrar-cookies-168dab11-0753-043d-7c16-ede5947fc64d">Microsoft Edge</ExternalLink></li>
          </ul>
           <p className="text-muted-foreground leading-relaxed">
            {t('section3.content.p3')}
          </p>
        </div>
      </section>

      <Separator className="my-8" />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-l-4 border-primary pl-4 py-1">
          {t('section4.title')}
        </h2>
        <div className="pl-5">
          <p className="text-muted-foreground leading-relaxed">
            {t('section4.content.p1')}{' '}
            <LegalLink href={commonT('privacyPolicyLink')}>{commonT('privacyPolicyTitle')}</LegalLink>.
          </p>
        </div>
      </section>

      <Separator className="my-8" />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-l-4 border-primary pl-4 py-1">
          {t('section5.title')}
        </h2>
        <div className="pl-5">
          <p className="text-muted-foreground leading-relaxed">
            {t('section5.content.p1')}
          </p>
        </div>
      </section>
    </div>
  )
}