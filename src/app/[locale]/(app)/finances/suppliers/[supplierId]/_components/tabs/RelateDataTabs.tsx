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
  t: (key: string) => string; // Tipus de la funció de traducció (ajusta'l segons next-intl)
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
      <TabsList className="grid w-full grid-cols-3 mb-4">
        <TabsTrigger value="contacts">
          <Users className="h-4 w-4 mr-2"/> {t('contactsCard.title')} ({contacts.length})
        </TabsTrigger>
        <TabsTrigger value="expenses">
          <CreditCard className="h-4 w-4 mr-2"/> {t('expensesCard.title')} ({expenses.length})
        </TabsTrigger>
        <TabsTrigger value="tickets">
          <Inbox className="h-4 w-4 mr-2"/> {t('ticketsCard.title')} ({tickets.length})
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