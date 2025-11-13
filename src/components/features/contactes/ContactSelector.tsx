// /src/components/features/contactes/ContactSelector.tsx (REFACTORITZAT)
"use client";

import { FC } from 'react';
import { useTranslations } from 'next-intl';
import { EntitySelector } from '@/components/shared/EntitySelector'; // ✅ Importem el genèric
import { type Database } from '@/types/supabase';

// Tipus local
type MinimalContact = Pick<Database['public']['Tables']['contacts']['Row'], 'id' | 'nom'>;

interface Props {
    contacts: MinimalContact[];
    selectedId: number | null;
    onSelect: (contactId: number | null) => void;
    disabled?: boolean;
}

export const ContactSelector: FC<Props> = ({ 
    contacts, 
    selectedId, 
    onSelect, 
    disabled = false 
}) => {
    const t = useTranslations('OpportunityDialog');

    return (
      <EntitySelector<MinimalContact>
        // --- Props del Selector ---
        value={selectedId}
        onChange={onSelect}
        disabled={disabled}
        
        // --- Gestió de Dades (Estàtica) ---
        items={contacts}
        
        // --- Renderitzat i Textos ---
        getSearchValue={(contact) => contact.nom || 'Sense nom'}
        triggerPlaceholder={t('selectContactPlaceholder')}
        searchPlaceholder={t('searchContactPlaceholder')}
        emptySearchText={t('noContactFound')}
        
        // --- Accions Addicionals ---
        allowClear={true}
        clearText={t('noContact')}
      />
    );
};