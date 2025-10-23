"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";

type LeadSource = {
  source: string;
  count: number;
};

type LeadSourceChartProps = {
  data: LeadSource[];
};

// Col·lecció de colors per al gràfic
const COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // purple
  "#06B6D4", // cyan
];

// Tooltip personalitzat amb proteccions
type PiePayload = {
  name: string;
  value: number;
  [key: string]: unknown;
};

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: PiePayload[];
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-white p-2 rounded-lg shadow text-sm">
      <p className="font-semibold">{name}</p>
      <p>{value} leads</p>
    </div>
  );
};

export function LeadSourceChart({ data }: LeadSourceChartProps) {
  // Evitem renderitzar si no hi ha dades vàlides
  if (!data || data.length === 0) {
    return (
      <Card className="text-center text-muted-foreground p-6">
        <CardContent>
          <p>No hi ha dades de fonts de leads disponibles.</p>
        </CardContent>
      </Card>
    );
  }

  // Normalitzem dades per evitar valors nuls o buits
  const cleanData = data.map((d) => ({
    name: d.source || "Desconegut",
    value: d.count ?? 0,
  }));

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={cleanData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label
          >
            {cleanData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
