"use client";

import React from "react";
import { useRouter } from "next/navigation";

// Importem NOMÉS la funció del hook
import { useQuoteEditor } from "../_hooks/index";

// Importem TOTS els tipus des de la font de la veritat global.
import {
  type Team,
  type Contact,
  type Product,
  type Opportunity,
  type EditableQuote,

} from "@/types/finances/quotes";
// Sub-components
import { EditorHeader } from "./editor/EditorHeader";
import { EditorForm } from "./editor/EditorForm";
import { DeleteDialog } from "./editor/DeleteDialog";
import { CompanyProfileDialog } from "./CompanyProfileDialog";
import { QuotePreview } from "./QuotePreview";

interface QuoteEditorClientProps {
  initialQuote: EditableQuote;
  contacts: Contact[];
  products: Product[];
  companyProfile: Team | null;
  initialOpportunities: Opportunity[];
  userId: string;
  locale: string;
}

export function QuoteEditorClient(props: QuoteEditorClientProps) {
  const router = useRouter();
  // Utilitzem el Hook
  const {
    state,
    quote,
    onQuoteChange,
    onItemsChange,
    setCurrentTeamData,
    setIsDeleteDialogOpen,
    setIsProfileDialogOpen,
    subtotal,
    tax_amount,
    total_amount,
    discountAmount,
    taxBreakdown,
    handleSave,
    handleDelete,
    handleSend,
    isSaving,
    isSending,
    t,
    availableTaxes, // ✅ Agafem les taxes del hook
  } = useQuoteEditor(props);

  const handleBack = () => router.push(`/${props.locale}/finances/quotes`);
  const currentContact = props.contacts.find((c) => c.id === quote.contact_id) || null;

 // ✅ 2. CORRECCIÓ CRÍTICA: Afegim taxBreakdown a l'objecte que passem al Header
  const calculatedTotals = {
    subtotal,
    discount_amount: discountAmount,
    tax_amount,
    total_amount,
    taxBreakdown, // 👈 AQUESTA LÍNIA FALTAVA! Sense això, el PDF no rep res.
  };

  return (
    <>
      <CompanyProfileDialog
        open={state.isProfileDialogOpen}
        onOpenChange={setIsProfileDialogOpen}
        profile={state.currentTeamData}
        onProfileUpdate={setCurrentTeamData}
      />

      <DeleteDialog
        open={state.isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        isSaving={isSaving}
        t={t}
      />

      <div className="flex flex-col h-full">

        <EditorHeader
          quote={quote}
          companyProfile={state.currentTeamData}
          contact={currentContact}
          totals={calculatedTotals}
          isSaving={isSaving}
          isSending={isSending}
          sendingStatus={state.sendingStatus}
          onBack={handleBack}
          onSave={handleSave}
          onSend={handleSend}
          onDelete={() => setIsDeleteDialogOpen(true)}
          onOpenProfile={() => setIsProfileDialogOpen(true)}
          locale={props.locale}
          t={t}
        />

        <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0">

          <EditorForm
            quote={quote}
            contacts={props.contacts}
            products={props.products}
            opportunities={state.contactOpportunities}
            userId={props.userId}
            totals={calculatedTotals}
            taxBreakdown={taxBreakdown}
            onQuoteChange={onQuoteChange}
            onItemsChange={onItemsChange}
            taxRates={availableTaxes} // ✅ Passem les taxes carregades al client            
            t={t}
          />

          <aside id="quote-preview-for-pdf-wrapper" className="hidden lg:block glass-card p-4 overflow-y-auto">
            <QuotePreview
              quote={quote}
              contacts={props.contacts}
              companyProfile={state.currentTeamData}
              subtotal={subtotal}
              discount_amount={discountAmount}
              tax_amount={tax_amount}
              total_amount={total_amount}
              taxBreakdown={taxBreakdown} // ✅ AFEGIT
            />
          </aside>

        </main>
      </div>
    </>
  );
}