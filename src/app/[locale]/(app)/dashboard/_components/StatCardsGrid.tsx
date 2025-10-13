"use client";

import React, { memo } from "react";
import { useTranslations } from "next-intl";
import { StatCard } from "@/components/shared/StatCard";
import { Users, Target, Euro, BadgePercent } from "lucide-react";
// ✅ CORRECCIÓ #1: Eliminem l'import del tipus antic i innecessari
// import type { DashboardInitialData } from "@/types/crm";

/**
 * @file StatCardsGrid.tsx
 * @description Mostra la graella de targetes de KPI principals del Dashboard.
 */

// ✅ CORRECCIÓ #2: Definim el tipus de 'stats' amb les propietats que realment rep
interface StatCardsGridProps {
  stats: {
    totalContacts: number;
    opportunities: number;
    invoiced: number;
    pending: number;
    // Podríem afegir més si fossin necessàries
  };
}

/**
 * ✅ Component memoitzat per evitar re-render innecessaris.
 */
export const StatCardsGrid = memo(({ stats }: StatCardsGridProps) => {
  const t = useTranslations("DashboardClient");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      <StatCard
        href="/crm/contactes"
        icon={Users}
        title={t("totalContacts")}
        value={stats.totalContacts.toLocaleString()}
        color="bg-[#2d7ef7]"
        openText={t("openLink")}
      />
      <StatCard
        href="/crm/pipeline"
        icon={Target}
        title={t("activeOpportunities")}
        value={stats.opportunities.toLocaleString()}
        color="bg-[#12a150]"
        openText={t("openLink")}
      />
      <StatCard
        href="/finances/facturacio"
        icon={Euro}
        title={t("monthlyInvoicing")}
        value={`€${stats.invoiced.toLocaleString()}`}
        color="bg-[#8a3ffc]"
        openText={t("openLink")}
      />
      <StatCard
        href="/finances/facturacio"
        icon={BadgePercent}
        title={t("pendingVAT")} // Aquest títol potser hauria de ser "Pendent de Cobrament"
        value={`€${stats.pending.toLocaleString()}`}
        color="bg-[#f27917]"
        openText={t("openLink")}
      />
    </div>
  );
});

StatCardsGrid.displayName = "StatCardsGrid";