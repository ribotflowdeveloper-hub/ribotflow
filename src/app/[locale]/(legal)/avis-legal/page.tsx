import { getTranslations } from 'next-intl/server';
import { type Metadata } from 'next';
import Link from 'next/link';

// ✅ 1. Definim la interfície amb 'params' com a Promise.
interface LegalPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata(props: LegalPageProps): Promise<Metadata> {
  const { locale } = await props.params; // ✅ 2. Resolem la promesa.
  const t = await getTranslations({ locale, namespace: 'LegalPages.LegalNotice' });
  return {
    title: t('metaTitle'),
  };
}

export default async function LegalNoticePage(props: LegalPageProps) {
  const { locale } = await props.params; // ✅ 3. Resolem la promesa.
  const t = await getTranslations({ locale, namespace: 'LegalPages.LegalNotice' });
  const commonT = await getTranslations({ locale, namespace: 'LegalPages.Common' });

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl prose dark:prose-invert">
      <h1>{t('title')}</h1>
      <p>{commonT('lastUpdated', { date: new Date().toLocaleDateString(locale) })}</p>

      <section>
        <h2>{t('section1.title')}</h2> {/* 1. Dades Identificatives */}
        <p>{t('section1.content.p1', {
          companyName: commonT('companyData.name'),
          companyVat: commonT('companyData.vat'),
          companyAddress: commonT('companyData.address'),
          companyEmail: commonT('companyData.email'),
          // companyRegistry: commonT('companyData.registry'), // Afegeix si ets empresa
        })}</p>
      </section>

      <section>
        <h2>{t('section2.title')}</h2> {/* 2. Objecte */}
        <p>{t('section2.content.p1', { appName: commonT('appName') })}</p>
      </section>

      <section>
        <h2>{t('section3.title')}</h2> {/* 3. Propietat Intel·lectual i Industrial */}
        <p>{t('section3.content.p1', { appName: commonT('appName'), companyName: commonT('companyData.name') })}</p>
        <p>{t('section3.content.p2')}</p>
      </section>

      <section>
        <h2>{t('section4.title')}</h2> {/* 4. Condicions d'Ús */}
        <p>{t('section4.content.p1')}</p>
        <p>{t('section4.content.p2')}</p>
        {/* Llista d'obligacions */}
        <ul>
          <li>{t('section4.content.obligation1')}</li>
          <li>{t('section4.content.obligation2')}</li>
          <li>{t('section4.content.obligation3')}</li>
          {/* ... més obligacions ... */}
        </ul>
      </section>

       <section>
        <h2>{t('section5.title')}</h2> {/* 5. Exclusió de Responsabilitat */}
        <p>{t('section5.content.p1')}</p>
        <p>{t('section5.content.p2')}</p>
        {/* ... altres exclusions ... */}
      </section>

       <section>
        <h2>{t('section6.title')}</h2> {/* 6. Enllaços */}
        <p>{t('section6.content.p1')}</p>
      </section>

       <section>
        <h2>{t('section7.title')}</h2> {/* 7. Protecció de Dades i Cookies */}
        {/* Utilitzem Link de next/link per a la navegació SPA */}
        <p>{t('section7.content.p1')} <Link href={commonT('privacyPolicyLink')}>{commonT('privacyPolicyTitle')}</Link> {commonT('and')} <Link href={commonT('cookiePolicyLink')}>{commonT('cookiePolicyTitle')}</Link>.</p>
      </section>

       <section>
        <h2>{t('section8.title')}</h2> {/* 8. Modificacions */}
        <p>{t('section8.content.p1')}</p>
      </section>

      <section>
        <h2>{t('section9.title')}</h2> {/* 9. Llei Aplicable i Jurisdicció */}
        <p>{t('section9.content.p1')}</p>
      </section>

    </div>
  );
}