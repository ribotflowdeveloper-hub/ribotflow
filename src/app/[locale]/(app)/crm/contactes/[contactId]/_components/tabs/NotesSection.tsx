// /app/[locale]/(app)/crm/contactes/[contactId]/_components/tabs/NotesSection.tsx (Refactoritzat)

import { FC } from 'react';
import { useTranslations } from 'next-intl';
import { Textarea } from '@/components/ui/textarea';
// ✅ 1. Importem el tipus de la base de dades.
import { type Database } from '@/types/supabase';

// ✅ 2. Definim el tipus 'Contact' a partir de la fila de la taula.
type Contact = Database['public']['Tables']['contacts']['Row'];

interface Props {
    contact: Contact;
    isEditing: boolean;
}

export const NotesSection: FC<Props> = ({ contact, isEditing }) => {
    const t = useTranslations('ContactDetailPage');

    return (
        <div>
            <h3 className="text-2xl font-bold mb-6">{t('details.notes')}</h3>
            {isEditing ? (
                <Textarea name="notes" defaultValue={contact.notes || ''} rows={6} />
            ) : (
                <p className="text-base text-muted-foreground whitespace-pre-wrap min-h-[120px]">
                    {contact.notes || t('details.noNotes')}
                </p>
            )}
        </div>
    );
};