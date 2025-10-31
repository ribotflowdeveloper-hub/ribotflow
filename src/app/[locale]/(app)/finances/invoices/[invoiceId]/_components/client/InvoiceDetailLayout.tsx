"use client";

import React from "react";
import { InvoiceDetailMain } from "./InvoiceDetailMain";
import { InvoiceDetailSidebar } from "./InvoiceDetailSidebar";
import { type InvoiceFormData, type InvoiceItem, type InvoiceDetail } from "@/types/finances";

interface InvoiceDetailLayoutProps {
  formData: InvoiceFormData;
  initialData: InvoiceDetail | null;
  formIsDisabled: boolean;
  isNew: boolean;
  onAddItem: () => void;
  onItemChange: <K extends keyof InvoiceItem>(
    index: number,
    field: K,
    value: InvoiceItem[K]
  ) => void;
  onRemoveItem: (index: number) => void;
  onFieldChange: <K extends keyof InvoiceFormData>(
    field: K,
    value: InvoiceFormData[K]
  ) => void;
  t: (key: string) => string;
}

export function InvoiceDetailLayout({
  formData,
  initialData,
  formIsDisabled,
  isNew,
  onAddItem,
  onItemChange,
  onRemoveItem,
  onFieldChange,
  t,
}: InvoiceDetailLayoutProps) {
  return (
    <div className="flex flex-col gap-6 w-full">
      {/* ✅ Layout principal amb dues columnes (2/3 + 1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        {/* Línies / conceptes */}
        <InvoiceDetailMain
          formData={formData}
          formIsDisabled={formIsDisabled}
          onAddItem={onAddItem}
          onItemChange={onItemChange}
          onRemoveItem={onRemoveItem}
          onFieldChange={onFieldChange}
          t={t}
        />

        {/* Sidebar — amb fons blanc i estil targeta */}
        <div className="bg-white rounded-2xl shadow-sm border p-5 h-fit">
          <InvoiceDetailSidebar
            formData={formData}
            initialData={initialData}
            formIsDisabled={formIsDisabled}
            isNew={isNew}
            onFieldChange={onFieldChange}
            t={t}
          />
        </div>
      </div>

      {/* Notes separades però integrades visualment */}
      <div className="bg-white rounded-2xl shadow-sm border p-5">
        <h3 className="font-semibold mb-2 text-base">{t("card.notes")}</h3>
        <textarea
          id="notes"
          className="w-full rounded-md border p-2 min-h-[150px] resize-y"
          value={formData.notes || ""}
          onChange={(e) => onFieldChange("notes", e.target.value)}
          disabled={formIsDisabled}
          placeholder={t("placeholder.notes")}
        />
      </div>
    </div>
  );
}
