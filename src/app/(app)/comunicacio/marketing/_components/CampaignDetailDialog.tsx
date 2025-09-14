"use client";

import React, { useState, useEffect, useTransition, FC } from 'react';
import { toast } from "sonner"; // ✅ 1. Importem 'toast' de sonner
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { type Campaign } from '../page';
import { updateCampaignAction } from './actions';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';

interface CampaignDetailDialogProps {
  campaign: Campaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCampaignUpdated: () => void;
}

export const CampaignDetailDialog: FC<CampaignDetailDialogProps> = ({ campaign, open, onOpenChange, onCampaignUpdated }) => {
   
    const [editedCampaign, setEditedCampaign] = useState(campaign);
    const [isPending, startTransition] = useTransition();

    useEffect(() => { setEditedCampaign(campaign); }, [campaign]);

    const handleSave = () => {
        if (!editedCampaign) return;
        startTransition(async () => {
            const { error } = await updateCampaignAction(editedCampaign.id, editedCampaign.name, editedCampaign.content);
            if (error) {
              toast.error('Error', { description: 'No s\'ha pogut actualitzar la campanya.' });
            } else {
              toast.success('Èxit!', { description: 'Campanya actualitzada.' });
              onCampaignUpdated();
                onOpenChange(false);
            }
        });
    };

    if (!campaign) return null;
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="glass-effect max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Detall de la Campanya</DialogTitle>
                    <div className="flex items-center gap-4 pt-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className={undefined}>{editedCampaign?.type}</Badge>
                        <span>|</span>
                        <span>Planificada per al: {format(new Date(editedCampaign?.campaign_date || new Date()), "d MMMM yyyy", { locale: ca })}</span>
                    </div>
                </DialogHeader>
                <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="campaignName" className="font-semibold">Nom de la Campanya</Label>
                      <Input 
                        id="campaignName"
                        value={editedCampaign?.name || ''} 
                        onChange={(e) => setEditedCampaign(c => c ? {...c, name: e.target.value} : null)} 
                        className="text-lg" 
                      />
                    </div>
                     <div className="space-y-2">
                      <Label htmlFor="campaignAudience" className="font-semibold">Públic Objectiu</Label>
                      <Input 
                        id="campaignAudience"
                        value={editedCampaign?.target_audience || ''} 
                        onChange={(e) => setEditedCampaign(c => c ? {...c, target_audience: e.target.value} : null)} 
                      />
                    </div>
                    <div className="space-y-2 flex-1 flex flex-col">
                      <Label htmlFor="campaignContent" className="font-semibold">Contingut</Label>
                      <Textarea 
                        id="campaignContent"
                        value={editedCampaign?.content || ''} 
                        onChange={(e) => setEditedCampaign(c => c ? {...c, content: e.target.value} : null)} 
                        className="flex-1 text-base" 
                        rows={15}
                      />
                    </div>
                </div>
                <DialogFooter className="pt-4 border-t border-border">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Tancar</Button>
                    <Button onClick={handleSave} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Desar Canvis
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};