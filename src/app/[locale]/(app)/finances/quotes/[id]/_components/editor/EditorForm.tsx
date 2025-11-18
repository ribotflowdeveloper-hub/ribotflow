"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { QuoteMeta } from "../QuoteMeta";
import { QuoteItems } from "../QuoteItems";
import { QuoteTotals } from "../QuoteTotals";
import { type EditableQuote, type Contact, type Product, type Opportunity, type QuoteItem} from "@/types/finances/quotes";
import { type TaxRate } from "@/types/finances/index";
interface EditorFormProps {
  quote: EditableQuote;
  contacts: Contact[];
  products: Product[];
  opportunities: Opportunity[];
  userId: string;
  taxRates: TaxRate[]; // Nova prop
  totals: {
    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    total_amount: number;
  };
  // Si tens taxBreakdown, afegeix-lo aquí també:
  taxBreakdown?: Record<string, number>; 

  // Tipatge estricte per a les funcions de canvi
  onQuoteChange: <K extends keyof EditableQuote>(field: K, value: EditableQuote[K]) => void;
  onItemsChange: (items: Partial<QuoteItem>[]) => void;
  t: (key: string) => string;
}

export function EditorForm({
  quote,
  contacts,
  products,
  opportunities,
  userId,
  totals,
  taxBreakdown,
  onQuoteChange,
  onItemsChange,
  taxRates,
  t,
}: EditorFormProps) {
  return (
    <section className="flex flex-col gap-4 overflow-y-auto pr-4">

      {/* 1. Meta dades */}
      <Card className="p-4">
        <QuoteMeta
          contact_id={quote.contact_id ? String(quote.contact_id) : null}
          quote_number={quote.quote_number || ""}
          issue_date={quote.issue_date || ""}
          expiry_date={quote.expiry_date ?? null}
          onMetaChange={onQuoteChange}
          contacts={contacts}
        />
      </Card>

      {/* 2. Oportunitats CRM */}
      <Card className="p-4">
        <Label>{t("quoteEditor.clientOpportunitiesLabel")}</Label>
        {opportunities.length > 0 ? (
          <Select
            value={quote.opportunity_id ? String(quote.opportunity_id) : ""}
            onValueChange={(value) => onQuoteChange("opportunity_id", value ? Number(value) : null)}
            disabled={!quote.contact_id}
          >
            <SelectTrigger className="w-full mt-2">
              <SelectValue placeholder="Selecciona una oportunitat" />
            </SelectTrigger>
            <SelectContent>
              {opportunities.map((o) => (
                <SelectItem key={o.id} value={String(o.id)}>
                  {o.name} ({o.stage_name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{t("quoteEditor.noOpenOpportunities")}</p>
        )}
      </Card>

      {/* 3. Items i Totals */}
      <Card className="p-2">
        <QuoteItems
          items={quote.items || []}
          onItemsChange={onItemsChange}
          products={products}
          userId={userId}
          availableTaxes={taxRates} // Passem les taxes disponibles
        />
        <Separator className="my-4" />
        <QuoteTotals
          subtotal={totals.subtotal}
          discountAmountCalculated={totals.discount_amount}
          tax_amount={totals.tax_amount}
          total_amount={totals.total_amount}
          taxBreakdown={taxBreakdown} // Passem el desglossament si està disponible

          discount_percent_input={quote.discount_percent_input ?? null}
          tax_percent_input={quote.tax_percent_input ?? null}

          onQuoteChange={onQuoteChange}
        />
      </Card>

      {/* 4. Opcions Visuals */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{t("options.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Switch
              id="show-quantity"
              checked={quote.show_quantity ?? true}
              onCheckedChange={(checked) => onQuoteChange("show_quantity", checked)}
            />
            <Label htmlFor="show-quantity">{t("options.showQuantitiesLabel")}</Label>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {t("options.showQuantitiesDescription")}
          </p>
        </CardContent>
      </Card>

      {/* 5. Notes */}
      <Card className="p-4">
        <Label>Notes Addicionals</Label>
        <Textarea
          value={quote.notes ?? ""}
          onChange={(e) => onQuoteChange("notes", e.target.value)}
          className="mt-2 min-h-[220px]"
        />
      </Card>
    </section>
  );
}