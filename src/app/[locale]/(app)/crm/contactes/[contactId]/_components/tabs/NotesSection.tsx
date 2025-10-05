import { FC } from 'react';
import { useTranslations } from 'next-intl';
import { type Contact } from '@/types/crm';
import { Textarea } from '@/components/ui/textarea';

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