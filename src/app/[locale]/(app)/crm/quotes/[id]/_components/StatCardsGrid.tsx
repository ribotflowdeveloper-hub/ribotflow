"use client";

import React, { memo } from "react";
import { useTranslations } from "next-intl";
import { StatCard } from "@/components/shared/StatCard";
import { Users, Target, Euro, BadgePercent } from "lucide-react";
import type { DashboardInitialData } from "@/types/crm";

/**
 * @file StatCardsGrid.tsx
 * @description Mostra la graella de targetes de KPI principals del Dashboard.
 */

interface StatCardsGridProps {
  stats: DashboardInitialData["stats"];
}

/**
 * ✅ Component memoitzat per evitar re-render innecessaris.
 * S’encarrega només de representar les targetes de mètriques principals.
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
        title={t("pendingVAT")}
        value={`€${stats.pending.toLocaleString()}`}
        color="bg-[#f27917]"
        openText={t("openLink")}
      />
    </div>
  );
});

StatCardsGrid.displayName = "StatCardsGrid";
