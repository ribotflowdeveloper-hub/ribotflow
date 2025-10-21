import { getTranslations } from 'next-intl/server'
import { Separator } from '@/components/ui/separator' // Importem el Separator

interface ContentProps {
  locale: string
}

export async function PrivacyPolicyContent({ locale }: ContentProps) {
  const t = await getTranslations({
    locale,
    namespace: 'LegalPages.PrivacyPolicy',
  })

  return (
    <div className="space-y-8">
      {/* --- Títol Principal --- */}
      <div className="space-y-2 pb-4 border-b"> {/* Afegim una línia sota el títol */}
        <h1 className="text-3xl font-bold tracking-tight text-primary"> {/* Títol amb color primari */}
          {t('title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('lastUpdated', { date: new Date().toLocaleDateString(locale) })}
        </p>
      </div>

      {/* === Seccions === */}
      <section className="space-y-4">
        {/* ✅ Títol amb barra lateral i padding */}
        <h2 className="text-xl font-semibold border-l-4 border-primary pl-4 py-1">
          {t('section1.title')}
        </h2>
        <p className="text-muted-foreground leading-relaxed pl-5"> {/* Alineem text amb el títol */}
          {t('section1.content.p1', {
            companyName: 'El Teu Nom/Empresa',
            companyVat: 'El Teu NIF/CIF',
            companyAddress: 'La Teva Adreça',
            companyEmail: 'El Teu Email de Contacte',
          })}
        </p>
      </section>

      {/* ✅ Separador entre seccions */}
      <Separator className="my-8" /> 

      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-l-4 border-primary pl-4 py-1">
          {t('section2.title')}
        </h2>
        <div className="pl-5 space-y-4"> {/* Agrupem i indentem contingut de la secció */}
            <p className="text-muted-foreground leading-relaxed">
            {t('section2.content.p1')}
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>{t('section2.content.item1')}</li>
            <li>{t('section2.content.item2')}</li>
            <li>{t('section2.content.item3')}</li>
            <li>{t('section2.content.item4')}</li>
            <li>{t('section2.content.item5')}</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed pt-2">
            {t('section2.content.p2')}
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>{t('section2.content.purpose1')}</li>
            <li>{t('section2.content.purpose2')}</li>
            <li>{t('section2.content.purpose3')}</li>
            <li>{t('section2.content.purpose4')}</li>
            <li>{t('section2.content.purpose5')}</li>
            </ul>
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
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>{t('section3.content.basis1')}</li>
            <li>{t('section3.content.basis2')}</li>
            <li>{t('section3.content.basis3')}</li>
            <li>{t('section3.content.basis4')}</li>
            </ul>
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
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>{t('section5.content.item1', { provider: 'Supabase' })}</li>
            </ul>
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
        <div className="pl-5 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
            {t('section7.content.p1')}
            </p>
            <p className="text-muted-foreground leading-relaxed">
            {t('section7.content.p2', { email: 'El Teu Email de Contacte' })}
            </p>
            <p className="text-muted-foreground leading-relaxed">
            {t('section7.content.p3')}
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