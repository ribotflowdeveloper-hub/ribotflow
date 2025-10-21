import { LegalNoticeContent } from '../_components/LegalNoticeContent'
import { type Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

// ✅ 1. Modifiquem la interfície perquè 'params' sigui una Promise.
interface PageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Funció per generar les metadades de la pàgina.
 */
export async function generateMetadata(props: PageProps): Promise<Metadata> {
  // ✅ 2. Resolem la promesa per accedir al 'locale'.
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'LegalPages.LegalNotice' });
  return {
    title: t('metaTitle'),
  };
}

/**
 * Component de la pàgina, ara renderitza el component de contingut.
 */
// ✅ 3. Modifiquem la signatura per rebre 'props' i resoldre la promesa.
export default async function LegalNoticeFallbackPage(props: PageProps) {
  const { locale } = await props.params;
  return <LegalNoticeContent locale={locale} />;
}