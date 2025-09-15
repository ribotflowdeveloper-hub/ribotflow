// Ruta del fitxer: src/app/(app)/settings/billing/page.tsx
import { BillingClient } from './_components/BillingClient';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Facturació i Plans | Ribot',
};

// En una aplicació real, aquestes dades probablement vindrien d'una base de dades
// o d'un servei extern com Stripe. Aquí, les definim com una constant per simplicitat.
const plansData = [
  {
    name: 'Free',
    iconName: 'Gift', // <-- Canvi aquí
    priceMonthly: 0,
    priceYearly: 0,
    description: 'Perfecte per començar i explorar les funcionalitats bàsiques.',
    features: [ 'Gestió de fins a 100 contactes', 'Funcionalitats bàsiques de CRM', '1 Pipeline de vendes', 'Suport per email', ],
    colors: {
      border: "border-muted", text: "text-muted-foreground", bg: "bg-muted", hoverBg: "hover:bg-muted/80",
    }
  },
  {
    name: 'Plus',
    iconName: 'Star', // <-- Canvi aquí
    priceMonthly: 29,
    priceYearly: 290,
    description: 'Ideal per a professionals i equips petits que volen créixer.',
    features: [ 'Contactes il·limitats', 'Totes les funcionalitats de CRM', '3 Pipelines de vendes', 'Automatitzacions bàsiques', 'Integració amb calendari', 'Suport prioritari per email', ],
    isPopular: true,
    colors: {
      border: "border-primary", text: "text-primary", bg: "bg-primary", hoverBg: "hover:bg-primary/90",
    }
  },
  {
    name: 'Premium',
    iconName: 'Gem', // <-- Canvi aquí
    priceMonthly: 79,
    priceYearly: 790,
    description: 'La solució completa per a empreses que necessiten el màxim rendiment.',
    features: [ 'Tot el del pla Plus', 'Pipelines il·limitats', 'Automatitzacions avançades i IA', 'Informes i anàlisis detallades', 'Gestió d\'equips i permisos', 'Suport per telèfon i videotrucada', ],
    colors: {
      border: "border-teal-500", text: "text-teal-500", bg: "bg-teal-500", hoverBg: "hover:bg-teal-500/90",
    }
  },
  {
    name: 'Personalitzat',
    iconName: 'Settings', // <-- Canvi aquí
    priceMonthly: null,
    priceYearly: null,
    description: 'Una solució a mida per a grans empreses amb necessitats específiques.',
    features: [ 'Tot el del pla Premium', 'Gestor de compte dedicat', 'Integracions personalitzades (API)', 'Formació per a l\'equip', 'Acords de nivell de servei (SLA)', ],
     colors: {
      border: "border-foreground", text: "text-foreground", bg: "bg-foreground", hoverBg: "hover:bg-foreground/90",
    }
  },
];

/**
 * @function BillingPage
 * @summary El component de servidor asíncron que construeix la pàgina.
 */
export default async function BillingPage() {
      const cookieStore = cookies();
      const supabase = createClient(cookieStore);
  
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        redirect('/login');
      }
  
      // Lògica del servidor per determinar el pla actual de l'usuari.
      // Això podria venir d'una consulta a la taula 'subscriptions' de Supabase.
      // Aquí, ho simulem amb un valor fix.
      const userPlanName = "Plus"; 
  
      // Processem les dades dels plans al servidor per afegir la propietat 'isCurrent'.
      // Això evita haver de fer aquesta lògica al client.
      const finalPlansData = plansData.map(plan => ({
        ...plan,
        isCurrent: plan.name === userPlanName,
      }));
  
      return (
        <div>
          <h1 className="text-3xl font-bold mb-2">Facturació i Plans</h1>
          <p className="text-muted-foreground mb-8">Gestiona la teva subscripció i tria el pla que millor s'adapti a tu.</p>
          {/* Passem les dades ja processades al component de client. */}
          <BillingClient plans={finalPlansData} />
        </div>
      );
  }

