// Ubicació: /app/(app)/comunicacio/marketing/_components/CampaignDetailDialog.tsx

"use client";

import React, { useState, useEffect, useTransition, FC } from 'react';
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { type Campaign } from '../page';
import { updateCampaignAction } from './actions';
import { format } from 'date-fns';
import { ca, es, enUS } from 'date-fns/locale';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';

interface CampaignDetailDialogProps {
    campaign: Campaign | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCampaignUpdated: () => void;
}

export const CampaignDetailDialog: FC<CampaignDetailDialogProps> = ({ campaign, open, onOpenChange, onCampaignUpdated }) => {
    const t = useTranslations('Marketing');
    const locale = useLocale();

    const [editedCampaign, setEditedCampaign] = useState<Campaign | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        // ✅ CORRECCIÓ: Només actualitzem l'estat intern si la 'prop' 'campaign' canvia.
        // Això evita que l'estat local es reseteji a cada render.
        setEditedCampaign(campaign);
    }, [campaign]);

    const handleSave = () => {
        if (!editedCampaign) return;
        startTransition(async () => {
            const { error } = await updateCampaignAction(editedCampaign.id, editedCampaign.name, editedCampaign.content);
            if (error) {
                toast.error('Error', { description: t('toastErrorUpdate') });
            } else {
                toast.success('Èxit!', { description: t('toastSuccessUpdate') });
                onCampaignUpdated();
                onOpenChange(false);
            }
        });
    };

    const getDateLocale = () => {
        switch(locale) {
            case 'es': return es;
            case 'en': return enUS;
            default: return ca;
        }
    }

    // ✅ CORRECCIÓ: No fem un retorn anticipat de 'null' si la campanya no existeix.
    // El component Dialog s'encarrega de no renderitzar el contingut si 'open' és fals.
    // Això garanteix que les animacions de sortida del diàleg funcionin correctament.

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="glass-effect max-w-4xl h-[90vh] flex flex-col">
                {/* Només renderitzem el contingut si tenim una campanya per editar */}
                {editedCampaign && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-2xl">{t('detailDialogTitle')}</DialogTitle>
                            <div className="flex items-center gap-4 pt-2 text-sm text-muted-foreground">
                                <Badge variant="outline" className={undefined}>{editedCampaign.type}</Badge>
                                <span>|</span>
                                <span>{t('detailDialogScheduledFor')}: {format(new Date(editedCampaign.campaign_date), "d MMMM yyyy", { locale: getDateLocale() })}</span>
                            </div>
                        </DialogHeader>
                        <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="campaignName" className="font-semibold">{t('detailDialogNameLabel')}</Label>
                                <Input
                                    id="campaignName"
                                    value={editedCampaign.name}
                                    onChange={(e) => setEditedCampaign(c => c ? { ...c, name: e.target.value } : null)}
                                    className="text-lg"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="campaignAudience" className="font-semibold">{t('detailDialogAudienceLabel')}</Label>
                                <Input
                                    id="campaignAudience"
                                    value={editedCampaign.target_audience}
                                    disabled
                                />
                            </div>
                            <div className="space-y-2 flex-1 flex flex-col">
                                <Label htmlFor="campaignContent" className="font-semibold">{t('detailDialogContentLabel')}</Label>
                                <Textarea
                                    id="campaignContent"
                                    value={editedCampaign.content}
                                    onChange={(e) => setEditedCampaign(c => c ? { ...c, content: e.target.value } : null)}
                                    className="flex-1 text-base"
                                    rows={15}
                                />
                            </div>
                        </div>
                        <DialogFooter className="pt-4 border-t border-border">
                            <Button variant="ghost" onClick={() => onOpenChange(false)}>Tancar</Button>
                            <Button onClick={handleSave} disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t('saveChangesButton')}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};