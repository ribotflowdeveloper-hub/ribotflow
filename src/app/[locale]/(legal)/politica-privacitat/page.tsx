import { getTranslations } from 'next-intl/server';
import { type Metadata } from 'next';

// ✅ 1. Definim la interfície amb 'params' com a Promise.
interface LegalPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata(props: LegalPageProps): Promise<Metadata> {
  const { locale } = await props.params; // ✅ 2. Resolem la promesa.
  const t = await getTranslations({ locale, namespace: 'LegalPages.PrivacyPolicy' });
  return {
    title: t('metaTitle'),
  };
}

export default async function PrivacyPolicyPage(props: LegalPageProps) {
  const { locale } = await props.params; // ✅ 3. Resolem la promesa.
  const t = await getTranslations({ locale, namespace: 'LegalPages.PrivacyPolicy' });
  // Pots estructurar el contingut com vulguis (headings, paràgrafs)
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl prose dark:prose-invert"> {/* Usa 'prose' per estils bàsics */}
      <h1>{t('title')}</h1>
      <p>{t('lastUpdated', { date: new Date().toLocaleDateString(locale) })}</p>

      <section>
        <h2>{t('section1.title')}</h2> {/* 1. Qui som (Responsable) */}
        <p>{t('section1.content.p1', { companyName: 'El Teu Nom/Empresa', companyVat: 'El Teu NIF/CIF', companyAddress: 'La Teva Adreça', companyEmail: 'El Teu Email de Contacte' })}</p>
      </section>

      <section>
        <h2>{t('section2.title')}</h2> {/* 2. Quines dades tractem i per què */}
        <p>{t('section2.content.p1')}</p>
        <ul>
          <li>{t('section2.content.item1')}</li> {/* Dades d'identificació i contacte */}
          <li>{t('section2.content.item2')}</li> {/* Dades professionals */}
          <li>{t('section2.content.item3')}</li> {/* Dades introduïdes per l'usuari (clients, factures...) -> ROL ENCARREGAT */}
          <li>{t('section2.content.item4')}</li> {/* Dades de navegació/ús */}
          <li>{t('section2.content.item5')}</li> {/* Dades de pagament (si aplica) */}
        </ul>
        <p>{t('section2.content.p2')}</p> {/* Finalitats */}
         <ul>
          <li>{t('section2.content.purpose1')}</li> {/* Prestació servei */}
          <li>{t('section2.content.purpose2')}</li> {/* Comunicacions */}
          <li>{t('section2.content.purpose3')}</li> {/* Millores */}
          <li>{t('section2.content.purpose4')}</li> {/* Seguretat */}
          <li>{t('section2.content.purpose5')}</li> {/* Compliment legal */}
        </ul>
      </section>

      <section>
        <h2>{t('section3.title')}</h2> {/* 3. Base Legal */}
         <p>{t('section3.content.p1')}</p>
         <ul>
          <li>{t('section3.content.basis1')}</li> {/* Contracte */}
          <li>{t('section3.content.basis2')}</li> {/* Consentiment (ex: newsletter) */}
          <li>{t('section3.content.basis3')}</li> {/* Interès legítim (ex: seguretat) */}
          <li>{t('section3.content.basis4')}</li> {/* Obligació legal */}
        </ul>
      </section>

      <section>
          <h2>{t('section4.title')}</h2> {/* 4. Rol com a Encarregat del Tractament */}
          <p>{t('section4.content.p1')}</p> {/* Explicació dades clients/proveïdors de l'usuari */}
          <p>{t('section4.content.p2')}</p> {/* Referència a Termes i Condicions (DPA) */}
      </section>

      <section>
        <h2>{t('section5.title')}</h2> {/* 5. Amb qui compartim les dades */}
        <p>{t('section5.content.p1')}</p>
        <ul>
          <li>{t('section5.content.item1', { provider: 'Supabase' })}</li> {/* Proveïdor infraestructura */}
          {/* Afegeix altres si cal: Passarel·les pagament, Emailing, Analytics... */}
        </ul>
         <p>{t('section5.content.p2')}</p> {/* Transferències internacionals */}
      </section>

      <section>
        <h2>{t('section6.title')}</h2> {/* 6. Quant temps guardem les dades */}
        <p>{t('section6.content.p1')}</p>
      </section>

      <section>
        <h2>{t('section7.title')}</h2> {/* 7. Quins són els teus drets */}
        <p>{t('section7.content.p1')}</p> {/* Drets ARSLOP */}
        <p>{t('section7.content.p2', { email: 'El Teu Email de Contacte' })}</p> {/* Com exercir-los */}
        <p>{t('section7.content.p3')}</p> {/* Dret a reclamar AEPD */}
      </section>

      <section>
        <h2>{t('section8.title')}</h2> {/* 8. Mesures de Seguretat */}
        <p>{t('section8.content.p1')}</p>
      </section>

       <section>
        <h2>{t('section9.title')}</h2> {/* 9. Canvis a la Política */}
        <p>{t('section9.content.p1')}</p>
      </section>

      {/* ... Afegeix altres seccions necessàries (Cookies, Menors...) */}
    </div>
  );
}