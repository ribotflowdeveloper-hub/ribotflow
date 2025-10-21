import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Separator } from '@/components/ui/separator' // <-- Importa Separator

interface ContentProps {
  locale: string
}

export async function TermsContent({ locale }: ContentProps) {
  const t = await getTranslations({
    locale,
    namespace: 'LegalPages.TermsAndConditions',
  })
  const commonT =
    await getTranslations({ locale, namespace: 'LegalPages.Common' })
  const companyName = commonT('companyData.name')

  // Component 'helper' per estilitzar els enllaços de forma consistent
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

  return (
    <div className="space-y-8">
      {/* --- Títol Principal --- */}
      <div className="space-y-2 pb-4 border-b"> {/* Línia sota el títol */}
        <h1 className="text-3xl font-bold tracking-tight text-primary"> {/* Color primari */}
          {t('title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {commonT('lastUpdated', {
            date: new Date().toLocaleDateString(locale),
          })}
        </p>
      </div>

      {/* === Seccions === */}
      <section className="space-y-4">
        {/* Títol amb barra lateral */}
        <h2 className="text-xl font-semibold border-l-4 border-primary pl-4 py-1">
          {t('section1.title')}
        </h2>
        {/* Contingut indentat */}
        <div className="pl-5 space-y-4"> 
          <p className="text-muted-foreground leading-relaxed">
            {t('section1.content.p1', {
              appName: commonT('appName'),
              companyName: companyName,
            })}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {t('section1.content.p2')}{' '}
            <LegalLink href={commonT('privacyPolicyLink')}>
              {commonT('privacyPolicyTitle')}
            </LegalLink>
            .
          </p>
        </div>
      </section>

      <Separator className="my-8" /> {/* Separador */}

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
            {t('section3.content.p1')}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {t('section3.content.p2')}
          </p>
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
        <div className="pl-5 space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            {t('section4.content.p1')}
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>{t('section4.content.obligation1')}</li>
            <li>{t('section4.content.obligation2')}</li>
            <li>{t('section4.content.obligation3')}</li>
            <li>
              {t('section4.content.obligation4', { companyName: companyName })}
            </li>
          </ul>
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

      <Separator className="my-8" />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-l-4 border-primary pl-4 py-1">
          {t('section6.title')}
        </h2>
        <div className="pl-5 space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            {t('section6.content.p1', {
              appName: commonT('appName'),
              companyName: companyName,
            })}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {t('section6.content.p2')}
          </p>
        </div>
      </section>

      <Separator className="my-8" />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-l-4 border-primary pl-4 py-1">
          {t('section7.title')}
        </h2>
        <div className="pl-5 space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            {t('section7.content.p1')}{' '}
            <LegalLink href={commonT('privacyPolicyLink')}>
              {commonT('privacyPolicyTitle')}
            </LegalLink>
            .
          </p>
          <p className="font-semibold text-foreground pt-2">
            {t('section7.content.dpaTitle')}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {t('section7.content.dpaP1', { appName: commonT('appName') })}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {t('section7.content.dpaP2')}
          </p>
        </div>
      </section>

      <Separator className="my-8" />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-l-4 border-primary pl-4 py-1">
          {t('section8.title')}
        </h2>
        <div className="pl-5 space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            {t('section8.content.p1')}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {t('section8.content.p2', { companyName: companyName })}
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

      <Separator className="my-8" />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-l-4 border-primary pl-4 py-1">
          {t('section10.title')}
        </h2>
        <div className="pl-5 space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            {t('section10.content.p1')}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {t('section10.content.p2')}
          </p>
        </div>
      </section>

      <Separator className="my-8" />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-l-4 border-primary pl-4 py-1">
          {t('section11.title')}
        </h2>
        <div className="pl-5">
          <p className="text-muted-foreground leading-relaxed">
            {t('section11.content.p1')}
          </p>
        </div>
      </section>
    </div>
  )
}