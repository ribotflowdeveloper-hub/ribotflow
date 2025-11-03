// Ubicació: /app/(app)/comunicacio/marketing/_hooks/useMarketing.ts

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Campaign } from '../_components/MarketingData';

export function useMarketing() {
    const router = useRouter();
    const [view, setView] = useState<'list' | 'calendar'>('list');
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

    const handleRefreshData = () => {
        router.refresh();
    };

    const handleOpenWizard = () => setIsWizardOpen(true);
    
    const handleCloseWizard = () => setIsWizardOpen(false);

    const handleSelectCampaign = (campaign: Campaign | null) => {
        setSelectedCampaign(campaign);
    };

    return {
        view,
        isWizardOpen,
        selectedCampaign,
        setView,
        setIsWizardOpen,
        handleRefreshData,
        handleOpenWizard,
        handleCloseWizard,
        handleSelectCampaign,
    };
}