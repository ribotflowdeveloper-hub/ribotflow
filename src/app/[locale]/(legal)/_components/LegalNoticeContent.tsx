import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Separator } from '@/components/ui/separator'

interface ContentProps {
  locale: string
}

export async function LegalNoticeContent({ locale }: ContentProps) {
  const t = await getTranslations({ locale, namespace: 'LegalPages.LegalNotice' })
  const commonT = await getTranslations({ locale, namespace: 'LegalPages.Common' })

  // Link helper (pots moure'l a un fitxer compartit si vols)
  const LegalLink = ({
    href,
    children,
  }: {
    href: string
    children: React.ReactNode
  }) => (
    <Link
      href={href}
      target="_blank" // Obliguem a obrir en nova pestanya des del modal
      rel="noopener noreferrer"
      className="text-primary underline-offset-4 hover:underline"
    >
      {children}
    </Link>
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
            {t('section1.content.p1', {
              companyName: commonT('companyData.name'),
              companyVat: commonT('companyData.vat'),
              companyAddress: commonT('companyData.address'),
              companyEmail: commonT('companyData.email'),
              // companyRegistry: commonT('companyData.registry'), // Descomenta si cal
            })}
          </p>
        </div>
      </section>

      <Separator className="my-8" />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-l-4 border-primary pl-4 py-1">
          {t('section2.title')}
        </h2>
        <div className="pl-5">
          <p className="text-muted-foreground leading-relaxed">
            {t('section2.content.p1', { appName: commonT('appName') })}
          </p>
        </div>
      </section>

      <Separator className="my-8" />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-l-4 border-primary pl-4 py-1">
          {t('section3.title')}
        </h2>
        <div className="pl-5 space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            {t('section3.content.p1', { appName: commonT('appName'), companyName: commonT('companyData.name') })}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {t('section3.content.p2')}
          </p>
        </div>
      </section>

      <Separator className="my-8" />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-l-4 border-primary pl-4 py-1">
          {t('section4.title')}
        </h2>
        <div className="pl-5 space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            {t('section4.content.p1')}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {t('section4.content.p2')}
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>{t('section4.content.obligation1')}</li>
            <li>{t('section4.content.obligation2')}</li>
            <li>{t('section4.content.obligation3')}</li>
          </ul>
        </div>
      </section>

      <Separator className="my-8" />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-l-4 border-primary pl-4 py-1">
          {t('section5.title')}
        </h2>
        <div className="pl-5 space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            {t('section5.content.p1')}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {t('section5.content.p2')}
          </p>
        </div>
      </section>

      <Separator className="my-8" />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-l-4 border-primary pl-4 py-1">
          {t('section6.title')}
        </h2>
        <div className="pl-5">
          <p className="text-muted-foreground leading-relaxed">
            {t('section6.content.p1')}
          </p>
        </div>
      </section>

      <Separator className="my-8" />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-l-4 border-primary pl-4 py-1">
          {t('section7.title')}
        </h2>
        <div className="pl-5">
          <p className="text-muted-foreground leading-relaxed">
            {t('section7.content.p1')}{' '}
            <LegalLink href={commonT('privacyPolicyLink')}>{commonT('privacyPolicyTitle')}</LegalLink>
            {' '} {commonT('and')} {' '}
            <LegalLink href={commonT('cookiePolicyLink')}>{commonT('cookiePolicyTitle')}</LegalLink>.
          </p>
        </div>
      </section>

      <Separator className="my-8" />

       <section className="space-y-4">
        <h2 className="text-xl font-semibold border-l-4 border-primary pl-4 py-1">
          {t('section8.title')}
        </h2>
        <div className="pl-5">
          <p className="text-muted-foreground leading-relaxed">
            {t('section8.content.p1')}
          </p>
        </div>
      </section>

       <Separator className="my-8" />

       <section className="space-y-4">
        <h2 className="text-xl font-semibold border-l-4 border-primary pl-4 py-1">
          {t('section9.title')}
        </h2>
        <div className="pl-5">
          <p className="text-muted-foreground leading-relaxed">
            {t('section9.content.p1')}
          </p>
        </div>
      </section>
    </div>
  )
}