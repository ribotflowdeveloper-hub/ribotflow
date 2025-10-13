"use client";

import React, { memo } from "react";
import { useTranslations } from "next-intl";
import { StatCard } from "@/components/shared/StatCard";
import { Users, Target, Euro, BadgePercent } from "lucide-react";

interface StatCardsGridProps {
  stats: {
    totalContacts: number;
    opportunities: number;
    invoiced: number;
    pending: number;
  };
}

export const StatCardsGrid = memo(({ stats }: StatCardsGridProps) => {
  const t = useTranslations("DashboardClient");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      <StatCard
        href="/crm/contactes"
        icon={Users}
        title={t("totalContacts")}
        value={stats.totalContacts.toLocaleString()}
        // ✅ CANVI: Passem classes de text
        color="text-blue-500"
        openText={t("openLink")}
      />
      <StatCard
        href="/crm/pipeline"
        icon={Target}
        title={t("activeOpportunities")}
        value={stats.opportunities.toLocaleString()}
        color="text-green-500"
        openText={t("openLink")}
      />
      <StatCard
        href="/finances/facturacio"
        icon={Euro}
        title={t("monthlyInvoicing")}
        value={`€${stats.invoiced.toLocaleString()}`}
        color="text-violet-500"
        openText={t("openLink")}
      />
      <StatCard
        href="/finances/facturacio"
        icon={BadgePercent}
        title={t("pendingVAT")}
        value={`€${stats.pending.toLocaleString()}`}
        color="text-orange-500"
        openText={t("openLink")}
      />
    </div>
  );
});

StatCardsGrid.displayName = "StatCardsGrid";