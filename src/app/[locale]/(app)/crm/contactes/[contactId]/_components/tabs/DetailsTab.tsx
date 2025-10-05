import { FC } from 'react';
import { type Contact } from '@/types/crm';

// ✅ Importa les noves seccions
import { GeneralInfoSection } from './GeneralInfoSection';
import { PersonalInfoSection } from './PersonalInfoSection';
import { NotesSection } from './NotesSection';

interface Props {
    contact: Contact;
    isEditing: boolean;
    dateLocale: Locale;
    getStatusLabel: (code?: string) => string;
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