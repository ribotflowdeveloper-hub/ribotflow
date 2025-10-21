import { CookiePolicyContent } from '../_components/CookiePolicyContent' // <-- Importa el nou component
import { type Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

interface PageProps {
  params: { locale: string }
}

export async function generateMetadata({
  params: { locale },
}: PageProps): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'LegalPages.CookiePolicy' })
  return {
    title: t('metaTitle'),
  }
}

// Ara la pàgina només renderitza el component de contingut
export default async function CookiePolicyFallbackPage({
  params: { locale },
}: PageProps) {
  return <CookiePolicyContent locale={locale} />
}