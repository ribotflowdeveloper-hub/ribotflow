/**
 * @file types.ts (Dashboard)
 * @summary Aquest fitxer centralitza totes les definicions de tipus de dades
 * utilitzades a la pàgina del Dashboard per a una millor organització i reutilització.
 */

// Tipus bàsics que venen de la base de dades.
export type Task = { 
    id: string; 
    title: string; 
    is_completed: boolean; 
    contact_id: string; 
    created_at: string; 
  };
  
  export type Invoice = { 
    id: string; 
    due_date: string; 
    contacts?: { nom: string } 
  };
  
  export type Contact = { 
    created_at: string | number | Date; 
    id: string; 
    nom: string 
  };
  
  // Tipus compost per al feed d'activitats.
  export type ActivityFeedItem = (Invoice & { type: 'invoice' }) | (Contact & { type: 'contact' });
  
  // Interfície per a les estadístiques principals.
  export interface DashboardStats {
    totalContacts: number;
    activeClients: number;
    opportunities: number;
    invoiced: number;
    pending: number;
    expenses: number;
    invoicedChange: string;
    expensesChange: string;
    invoicedIsPositive: boolean;
    expensesIsPositive: boolean;
  }
  
  // Interfície per al conjunt de dades inicials que el component de servidor
  // passa al component de client.
  export interface DashboardInitialData {
    stats: DashboardStats;
    tasks: Task[];
    contacts: Contact[];
    overdueInvoices: Invoice[];
    attentionContacts: Contact[];
  }