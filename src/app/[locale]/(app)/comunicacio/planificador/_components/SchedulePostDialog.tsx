import { useState } from 'react';
// ❌ Ja no necessitem 'ReactNode' aquí
// import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
// ✅ 1. Importem el hook de traduccions
import { useTranslations } from 'next-intl';

interface SchedulePostDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onConfirm: (time: string) => void;
    isPending: boolean;
    // ❌ 2. Eliminem 't' de les propietats. Ja no la necessitem.
    // t: (key: string, values?: Record<string, ReactNode>) => string;
}

// ❌ 3. Eliminem 't' dels paràmetres de la funció
export function SchedulePostDialog({ isOpen, onOpenChange, onConfirm, isPending }: SchedulePostDialogProps) {
    // ✅ 4. Cridem al hook per obtenir la nostra pròpia funció 't'
    const t = useTranslations('SocialPlanner');
    const [time, setTime] = useState('10:00');
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xs">
                <DialogHeader>
                    <DialogTitle>{t('schedulePostTitle')}</DialogTitle>
                    <DialogDescription>{t('schedulePostDescription')}</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center p-4 gap-2">
                    <input 
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="p-2 rounded-md border bg-transparent text-2xl"
                    />
                    <p className="text-xs text-muted-foreground">{t('timeZone', { timeZone: userTimeZone })}</p>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
                    <Button onClick={() => onConfirm(time)} disabled={isPending}>
                        {isPending ? t('planning') : t('confirm')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}