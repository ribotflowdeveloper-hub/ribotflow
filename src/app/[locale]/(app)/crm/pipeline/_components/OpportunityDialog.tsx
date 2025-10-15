// /app/[locale]/(app)/crm/pipeline/_components/OpportunityDialog.tsx (Refactoritzat)
import React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ca, es, enUS } from "date-fns/locale";
import { format } from "date-fns";
// ✅ 1. Importem els tipus correctes des del component de dades.
import { type Stage, type Contact, type OpportunityWithContact } from './PipelineData';
import { PIPELINE_STAGES_MAP } from '@/config/pipeline'; // ✅ Importem la constant des de /config

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils/utils";
import { useOpportunityForm } from '../_hooks/useOpportunityForm';
import { ContactSelector } from '@/components/features/contactes/ContactSelector';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contacts: Contact[];
    stages: Stage[];
    onSuccess: () => void;
    // ✅ 2. La prop ara espera el tipus enriquit.
    opportunityToEdit: Partial<OpportunityWithContact> | null;
}

export function OpportunityDialog({ open, onOpenChange, contacts, stages, onSuccess, opportunityToEdit }: Props) {
    const t = useTranslations('OpportunityDialog');
    const statePipline = useTranslations('PipelinePage');
    const locale = useLocale();
    
    const { isPending, selectedContactId, setSelectedContactId, closeDate, setCloseDate, handleSubmit } = useOpportunityForm({
        opportunityToEdit,
        onSuccess,
        onOpenChange
    });

    const dateLocale = { ca, es, en: enUS }[locale] || ca;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader><DialogTitle>{opportunityToEdit?.id ? t('editTitle') : t('newTitle')}</DialogTitle></DialogHeader>
                <form action={handleSubmit} className="grid gap-4 pt-4">
                    <Input name="name" placeholder={t('namePlaceholder')} defaultValue={opportunityToEdit?.name || ''} required />
                    
                    {/* El ContactSelector necessita ser adaptat per gestionar 'number | null' */}
                    <ContactSelector contacts={contacts} selectedId={selectedContactId} onSelect={setSelectedContactId} />
                    
                    <Select name="stage_name" defaultValue={opportunityToEdit?.stage_name || stages[0]?.name}>
                        <SelectTrigger><SelectValue placeholder={t('selectStagePlaceholder')} /></SelectTrigger>
                        <SelectContent>
                            {PIPELINE_STAGES_MAP.map(stage => (
                                <SelectItem key={stage.key} value={stage.name}>
                                    {statePipline(`stageNames.${stage.key}`)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="value">{t('valueLabel')}</Label>
                            <Input id="value" name="value" type="number" step="0.01" placeholder="0.00" defaultValue={opportunityToEdit?.value || ''} />
                        </div>
                        <div>
                            <Label>{t('closeDateLabel')}</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !closeDate && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {closeDate ? format(closeDate, "PPP", { locale: dateLocale }) : <span>{t('pickDate')}</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={closeDate} onSelect={setCloseDate} /></PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    
                    <Textarea name="description" placeholder={t('descriptionPlaceholder')} defaultValue={opportunityToEdit?.description || ''} />
                    
                    <DialogFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t('cancelButton')}</Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t('saveButton')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}