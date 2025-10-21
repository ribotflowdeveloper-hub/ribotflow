import { SignupClient } from './_components/SignupClient'
import { getTranslations } from 'next-intl/server'
import { type Metadata } from 'next'

// Importem els components de contingut legal
import { PrivacyPolicyContent } from '@/app/[locale]/(legal)/_components/PrivacyPolicyContent'
import { TermsContent } from '@/app/[locale]/(legal)/_components/TermsContent' 

// ✅ 1. Modifiquem la interfície per definir 'params' com una Promise.
//    També apliquem el mateix a 'searchParams' per a consistència i evitar futurs errors.
interface SignupPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * Funció per generar les metadades de la pàgina.
 */
export async function generateMetadata(props: SignupPageProps): Promise<Metadata> {
  // ✅ 2. Resolem la promesa per accedir al 'locale'.
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'SignupPage' });
  return {
    title: t('metaTitle'),
  };
}

/**
 * Component de la pàgina de registre (Server Component).
 */
// ✅ 3. Convertim la pàgina a 'async' i resolem la promesa dels paràmetres.
export default async function SignupPage(props: SignupPageProps) {
  const { locale } = await props.params;

  return (
    <SignupClient
      // Passem els Server Components ja renderitzats amb el 'locale' correcte.
      privacyContent={<PrivacyPolicyContent locale={locale} />}
      termsContent={<TermsContent locale={locale} />}
    />
  );
}