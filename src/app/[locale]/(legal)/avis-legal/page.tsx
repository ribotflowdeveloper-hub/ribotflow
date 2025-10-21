import { LegalNoticeContent } from '../_components/LegalNoticeContent' // <-- Importa el nou component
import { type Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

interface PageProps {
  params: { locale: string }
}

export async function generateMetadata({
  params: { locale },
}: PageProps): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'LegalPages.LegalNotice' })
  return {
    title: t('metaTitle'),
  }
}

// Ara la pàgina només renderitza el component de contingut
export default async function LegalNoticeFallbackPage({
  params: { locale },
}: PageProps) {
  return <LegalNoticeContent locale={locale} />
}