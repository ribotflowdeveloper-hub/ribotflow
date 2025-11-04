// /app/[locale]/(app)/finances/suppliers/[supplierId]/_components/tabs/RelateDataTabs.tsx (MILLORAT PER A MÒBIL)
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, CreditCard, Inbox } from 'lucide-react';

// Importa els tipus de dades
import { type ContactForSupplier } from '@/types/db';
import { type ExpenseForSupplier } from '@/app/[locale]/(app)/finances/expenses/actions';
import { type TicketForSupplier } from '@/types/db';

// Importa els components de contingut de cada pestanya
import { ContactsTabContent } from './ContactsTabContent';
import { ExpensesTabContent } from './ExpensesTabContent';
import { TicketsTabContent } from './TicketsTabContent';

interface RelatedDataTabsProps {
  contacts: ContactForSupplier[];
  expenses: ExpenseForSupplier[];
  tickets: TicketForSupplier[];
  supplierId: string | null; // ID per als botons "Nou"
  supplierEmail: string | null | undefined; // Email per al botó "Cercar Inbox"
  t: (key: string) => string; 
}

export function RelatedDataTabs({
  contacts,
  expenses,
  tickets,
  supplierId,
  supplierEmail,
  t
}: RelatedDataTabsProps) {

  // Assegura't que supplierId no sigui null abans de passar-lo als fills
  const validSupplierId = supplierId ?? ''; 

  return (
    <Tabs defaultValue="contacts" className="w-full">
      
      {/* ✅ SOLUCIÓ: 
        Mantenim el teu 'grid-cols-3' perquè les pestanyes ocupin tot l'ample,
        però fem que el contingut s'adapti.
      */}
      <TabsList className="grid w-full grid-cols-3 mb-4">
        
        <TabsTrigger value="contacts">
          {/* L'icona sempre és visible. El marge dret (mr-2) només s'aplica en 'sm' (desktop) */}
          <Users className="h-4 w-4 sm:mr-2"/> 
          {/* El text s'amaga per defecte (mòbil) i es mostra com 'inline' a partir de 'sm' (desktop) */}
          <span className="hidden sm:inline">
            {t('contactsCard.title')} ({contacts.length})
          </span>
        </TabsTrigger>
        
        <TabsTrigger value="expenses">
          <CreditCard className="h-4 w-4 sm:mr-2"/> 
          <span className="hidden sm:inline">
            {t('expensesCard.title')} ({expenses.length})
          </span>
        </TabsTrigger>
        
        <TabsTrigger value="tickets">
          <Inbox className="h-4 w-4 sm:mr-2"/> 
          <span className="hidden sm:inline">
            {t('ticketsCard.title')} ({tickets.length})
          </span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="contacts">
        <ContactsTabContent 
            contacts={contacts} 
            supplierId={validSupplierId} 
            t={t} 
        />
      </TabsContent>

      <TabsContent value="expenses">
        <ExpensesTabContent 
            expenses={expenses} 
            supplierId={validSupplierId} 
            t={t} 
        />
      </TabsContent>

      <TabsContent value="tickets">
        <TicketsTabContent 
            tickets={tickets} 
            supplierEmail={supplierEmail} 
            t={t} 
        />
      </TabsContent>
    </Tabs>
  );
}