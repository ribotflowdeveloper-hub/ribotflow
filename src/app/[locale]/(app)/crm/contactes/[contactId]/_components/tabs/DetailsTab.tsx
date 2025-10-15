// /app/[locale]/(app)/crm/contactes/[contactId]/_components/tabs/DetailsTab.tsx (Refactoritzat)

import { FC } from 'react';
// ✅ 1. Importem el tipus directament de la definició de la BD.
import { type Database } from '@/types/supabase';
import { GeneralInfoSection } from './GeneralInfoSection';
import { PersonalInfoSection } from './PersonalInfoSection';
import { NotesSection } from './NotesSection';
import { Locale } from 'date-fns'; // Corregit l'import des de date-fns

// ✅ 2. Definim el tipus per a la fila de la taula 'contacts'.
type Contact = Database['public']['Tables']['contacts']['Row'];

interface Props {
    contact: Contact;
    isEditing: boolean;
    dateLocale: Locale;
    getStatusLabel: (code?: string | null) => string; // Permetem que el codi sigui null
}

export const DetailsTab: FC<Props> = ({ contact, isEditing, dateLocale, getStatusLabel }) => {
    return (
        <div className="space-y-12">
            <GeneralInfoSection 
                contact={contact} 
                isEditing={isEditing} 
                getStatusLabel={getStatusLabel} 
            />
            <PersonalInfoSection 
                contact={contact} 
                isEditing={isEditing} 
                dateLocale={dateLocale} 
            />
            <NotesSection 
                contact={contact} 
                isEditing={isEditing} 
            />
        </div>
    );
};