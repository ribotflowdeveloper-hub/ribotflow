import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useTranslations } from 'next-intl';

interface SchedulePostDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onConfirm: (time: string) => void;
    isPending: boolean;
}

export function SchedulePostDialog({ isOpen, onOpenChange, onConfirm, isPending }: SchedulePostDialogProps) {
    const t = useTranslations('Planificador');
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
                    <p className="text-xs text-muted-foreground">
                        {t('timeZone', { timeZone: userTimeZone })}
                    </p>
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
