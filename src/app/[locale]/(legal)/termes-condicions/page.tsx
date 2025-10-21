import { getTranslations } from 'next-intl/server';
import { type Metadata } from 'next';
import Link from 'next/link';

// ✅ 1. Definim la interfície amb 'params' com a Promise.
interface LegalPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata(props: LegalPageProps): Promise<Metadata> {
  const { locale } = await props.params; // ✅ 2. Resolem la promesa.
  const t = await getTranslations({ locale, namespace: 'LegalPages.TermsAndConditions' });
  return {
    title: t('metaTitle'),
  };
}

export default async function TermsAndConditionsPage(props: LegalPageProps) {
  const { locale } = await props.params; // ✅ 3. Resolem la promesa.
  const t = await getTranslations({ locale, namespace: 'LegalPages.TermsAndConditions' });
  const commonT = await getTranslations({ locale, namespace: 'LegalPages.Common' });
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl prose dark:prose-invert">
      <h1>{t('title')}</h1>
      <p>{commonT('lastUpdated', { date: new Date().toLocaleDateString(locale) })}</p>

      <section>
        <h2>{t('section1.title')}</h2> {/* 1. Acceptació */}
        <p>{t('section1.content.p1', { appName: commonT('appName'), companyName: commonT('companyData.name') })}</p>
        <p>{t('section1.content.p2')} <Link href={commonT('privacyPolicyLink')}>{commonT('privacyPolicyTitle')}</Link>.</p>
      </section>

      <section>
        <h2>{t('section2.title')}</h2> {/* 2. Descripció del Servei */}
        <p>{t('section2.content.p1', { appName: commonT('appName') })}</p>
         {/* Descriu les funcionalitats principals */}
      </section>

      <section>
        <h2>{t('section3.title')}</h2> {/* 3. Accés i Compte d'Usuari */}
        <p>{t('section3.content.p1')}</p>
        <p>{t('section3.content.p2')}</p>
        <p>{t('section3.content.p3')}</p>
      </section>

      <section>
        <h2>{t('section4.title')}</h2> {/* 4. Obligacions de l'Usuari */}
        <p>{t('section4.content.p1')}</p>
         <ul>
          <li>{t('section4.content.obligation1')}</li>
          <li>{t('section4.content.obligation2')}</li>
          <li>{t('section4.content.obligation3')}</li>
          <li>{t('section4.content.obligation4')}</li>
           {/* ... més obligacions */}
        </ul>
      </section>

       <section>
        <h2>{t('section5.title')}</h2> {/* 5. Condicions Econòmiques (SI APLICA) */}
        {/* Si és gratuït, indica-ho. Si és de pagament, detalla plans, preus, pagament, renovació, cancel·lació... */}
        <p>{t('section5.content.p1')}</p>
      </section>

      <section>
        <h2>{t('section6.title')}</h2> {/* 6. Propietat Intel·lectual */}
        <p>{t('section6.content.p1', { appName: commonT('appName'), companyName: commonT('companyData.name') })}</p>
        <p>{t('section6.content.p2')}</p>
      </section>

      <section>
        <h2>{t('section7.title')}</h2> {/* 7. Protecció de Dades (DPA) */}
        <p>{t('section7.content.p1')} <Link href={commonT('privacyPolicyLink')}>{commonT('privacyPolicyTitle')}</Link>.</p>
        <p><strong>{t('section7.content.dpaTitle')}</strong></p>
        <p>{t('section7.content.dpaP1', { appName: commonT('appName') })}</p>
        <p>{t('section7.content.dpaP2')}</p>
        {/* Detalla aquí o en un annex les obligacions com a Encarregat del Tractament */}
      </section>

      <section>
        <h2>{t('section8.title')}</h2> {/* 8. Garanties i Limitació de Responsabilitat */}
        <p>{t('section8.content.p1')}</p>
        <p>{t('section8.content.p2')}</p>
        {/* ... límits específics de responsabilitat ... */}
      </section>

       <section>
        <h2>{t('section9.title')}</h2> {/* 9. Modificació dels Termes */}
        <p>{t('section9.content.p1')}</p>
      </section>

       <section>
        <h2>{t('section10.title')}</h2> {/* 10. Durada i Terminació */}
        <p>{t('section10.content.p1')}</p>
        <p>{t('section10.content.p2')}</p>
      </section>

      <section>
        <h2>{t('section11.title')}</h2> {/* 11. Llei Aplicable i Jurisdicció */}
        <p>{t('section11.content.p1')}</p>
      </section>

    </div>
  );
}