import { FC, ElementType } from 'react';
import { TabsTrigger } from "@/components/ui/tabs";

interface Props { value: string; icon: ElementType; count: number; label: string; }

export const TabTriggerWithCount: FC<Props> = ({ value, icon: Icon, count, label }) => (
    <TabsTrigger value={value} className="flex items-center gap-2 text-sm px-4">
        <Icon className="w-4 h-4" />
        <span className="font-semibold">{label}</span>
        {count > 0 && <span className="ml-1 px-2 py-0.5 text-xs font-bold rounded-full bg-primary/20 text-primary">{count}</span>}
    </TabsTrigger>
);