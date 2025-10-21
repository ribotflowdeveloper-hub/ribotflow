// /app/[locale]/(app)/crm/contactes/[contactId]/_components/tabs/DetailsTab.tsx (Refactoritzat)

import { FC } from 'react';
// ✅ 1. Importem el tipus directament de la definició de la BD.
import { GeneralInfoSection } from './GeneralInfoSection';
import { PersonalInfoSection } from './PersonalInfoSection';
import { NotesSection } from './NotesSection';
import { Locale } from 'date-fns'; // Corregit l'import des de date-fns
import { type ContactDetail } from '../../actions'; // Importem el tipus correcte

// ✅ 2. Definim el tipus per a la fila de la taula 'contacts'.
interface Props {
    contact: ContactDetail;
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