
// ✅ NOU: Tipus per a les dades inicials del diàleg de composició de correu
export type ComposeEmailData = {
  contactId: string;
  to: string;
  subject: string;
  body: string;
};
export type CompanyProfileObject = {
  id: string;
  user_id: string;
  company_name?: string | null;
  company_tax_id?: string | null;
  company_address?: string | null;
  company_email?: string | null;
  company_phone?: string | null;
  logo_url?: string | null;
};
// ✅ NOU: Definim i exportem el tipus per a una Tasca (Task)
export type Task = {
  id: string; // O number, depenent de la teva BD
  created_at: string;
  title: string;
  is_completed: boolean;
  contact_id: string | null;
  user_id: string;
  is_completed: boolean;
  contacts: { id: string; nom: string; } | null;

  // ✅ NOU CAMP: Pot ser un objecte Contact o null si no hi ha cap contacte associat.
  contacts: {
    id: string;
    nom: string;
  } | null;

  // ✅ NOUS CAMPS AFEGITS
  description: string | null;
  due_date: string | null; // El tipus 'date' de SQL es representa com a string (YYYY-MM-DD)
  priority: 'Baixa' | 'Mitjana' | 'Alta' | null;
};
export type CompanyProfile = CompanyProfileObject | null;