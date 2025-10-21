import { CookiePolicyContent } from '../_components/CookiePolicyContent' // <-- Importa el nou component
import { type Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;

  const t = await getTranslations({ locale, namespace: 'LegalPages.CookiePolicy' })
  return {
    title: t('metaTitle'),
  }
}

// Ara la pàgina només renderitza el component de contingut
export default async function CookiePolicyFallbackPage(props: PageProps) {
  const { locale } = await props.params;
  return <CookiePolicyContent locale={locale} />
}