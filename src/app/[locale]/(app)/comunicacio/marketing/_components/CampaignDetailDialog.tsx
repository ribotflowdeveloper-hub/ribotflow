/**
 * @file CampaignDetailDialog.tsx
 * @summary Component de client que mostra un diàleg (popup/modal) per veure i editar
 * els detalls d'una campanya de màrqueting seleccionada.
 */

"use client"; // És un component de client per la seva naturalesa interactiva i la gestió d'estat.

import React, { useState, useEffect, useTransition, FC } from 'react';
import { toast } from "sonner"; // Sistema de notificacions (toasts) modern per a React.
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { type Campaign } from '../page';
import { updateCampaignAction } from './actions'; // Importem la Server Action per desar els canvis.
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';

// Interfície de propietats del component.
interface CampaignDetailDialogProps {
  campaign: Campaign | null; // La campanya a mostrar, o null si no n'hi ha cap.
  open: boolean; // Controla si el diàleg és visible.
  onOpenChange: (open: boolean) => void; // Funció per notificar canvis en la visibilitat.
  onCampaignUpdated: () => void; // Funció per notificar que la campanya s'ha actualitzat, per refrescar les dades.
}

export const CampaignDetailDialog: FC<CampaignDetailDialogProps> = ({ campaign, open, onOpenChange, onCampaignUpdated }) => {
   
  // Estat local per guardar els canvis fets al formulari.
  // Això evita modificar directament les dades originals (props) fins que es desa.
  const [editedCampaign, setEditedCampaign] = useState(campaign);
  // 'useTransition' és un hook de React que permet gestionar estats de càrrega
  // sense bloquejar la interfície d'usuari. 'isPending' serà cert mentre l'acció de desar s'està executant.
  const [isPending, startTransition] = useTransition();

  // Aquest efecte sincronitza l'estat local amb les propietats externes.
  // Si l'usuari tanca el diàleg i el torna a obrir amb una altra campanya, l'estat s'actualitza.
  useEffect(() => { setEditedCampaign(campaign); }, [campaign]);

  /**
   * @summary Funció que s'executa en desar els canvis.
   * Crida a la Server Action per actualitzar les dades a la base de dades.
   */
  const handleSave = () => {
      if (!editedCampaign) return;
      // Embolcallem la crida a la Server Action amb 'startTransition' per activar l'estat 'isPending'.
      startTransition(async () => {
          const { error } = await updateCampaignAction(editedCampaign.id, editedCampaign.name, editedCampaign.content);
          if (error) {
            toast.error('Error', { description: 'No s\'ha pogut actualitzar la campanya.' });
          } else {
            toast.success('Èxit!', { description: 'Campanya actualitzada.' });
            onCampaignUpdated(); // Cridem a la funció per refrescar les dades de la pàgina.
            onOpenChange(false); // Tanquem el diàleg.
          }
      });
  };

  if (!campaign) return null; // Si no hi ha cap campanya per mostrar, no renderitzem res.
  
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
              {/* Contenidor principal del formulari, amb scroll vertical si el contingut és massa llarg. */}
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
                        disabled // Aquest camp no és editable en aquesta vista.
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
