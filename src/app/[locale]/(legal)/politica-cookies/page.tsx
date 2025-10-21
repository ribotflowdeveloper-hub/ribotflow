import { getTranslations } from 'next-intl/server';
import { type Metadata } from 'next';
import Link from 'next/link';

// ✅ 1. Definim la interfície amb 'params' com a Promise.
interface LegalPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata(props: LegalPageProps): Promise<Metadata> {
  const { locale } = await props.params; // ✅ 2. Resolem la promesa.
  const t = await getTranslations({ locale, namespace: 'LegalPages.CookiePolicy' });
  return {
    title: t('metaTitle'),
  };
}

export default async function CookiePolicyPage(props: LegalPageProps) {
  const { locale } = await props.params; // ✅ 3. Resolem la promesa.
  const t = await getTranslations({ locale, namespace: 'LegalPages.CookiePolicy' });
  const commonT = await getTranslations({ locale, namespace: 'LegalPages.Common' });

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl prose dark:prose-invert">
      <h1>{t('title')}</h1>
      <p>{commonT('lastUpdated', { date: new Date().toLocaleDateString(locale) })}</p>

      <section>
        <h2>{t('section1.title')}</h2> {/* 1. Què són les cookies? */}
        <p>{t('section1.content.p1')}</p>
      </section>

      <section>
        <h2>{t('section2.title')}</h2> {/* 2. Quin tipus de cookies utilitzem? */}
        <p>{t('section2.content.p1', { appName: commonT('appName') })}</p>
        <p><strong>{t('section2.content.type1.name')}:</strong></p> {/* Tècniques/Necessàries */}
        <p>{t('section2.content.type1.description')}</p>
        <ul>
          {/* Llista les cookies tècniques concretes */}
          <li>{t('section2.content.type1.cookie1', { name: 'supabase-auth-token (o similar)'})}</li> {/* Exemple Supabase */}
          <li>{t('section2.content.type1.cookie2', { name: 'next-intl-locale'})}</li> {/* Exemple idioma */}
          {/* ... altres cookies tècniques */}
        </ul>
         {/* Secció Opcional: Cookies Analítiques */}
        {/*
        <p><strong>{t('section2.content.type2.name')}:</strong></p>
        <p>{t('section2.content.type2.description')}</p>
        <ul>
          <li>{t('section2.content.type2.cookie1', { name: '_ga, _gid (Google Analytics)'})}</li>
        </ul>
        <p>{t('section2.content.type2.thirdPartyInfo')}</p>
        */}
         {/* Secció Opcional: Cookies de Publicitat/Màrqueting */}
        {/* ... */}
      </section>

      <section>
        <h2>{t('section3.title')}</h2> {/* 3. Com pots gestionar les cookies? */}
        <p>{t('section3.content.p1')}</p>
        <p>{t('section3.content.p2')}</p>
         {/* Enllaços a configuració de navegadors */}
        <ul>
          <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
          <li><a href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
          <li><a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">Apple Safari</a></li>
          <li><a href="https://support.microsoft.com/es-es/windows/eliminar-y-administrar-cookies-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>
        </ul>
        <p>{t('section3.content.p3')}</p> {/* Eina de consentiment */}
      </section>

       <section>
        <h2>{t('section4.title')}</h2> {/* 4. Més informació */}
        <p>{t('section4.content.p1')} <Link href={commonT('privacyPolicyLink')}>{commonT('privacyPolicyTitle')}</Link>.</p>
      </section>

      <section>
        <h2>{t('section5.title')}</h2> {/* 5. Canvis a la Política */}
        <p>{t('section5.content.p1')}</p>
      </section>
    </div>
  );
}