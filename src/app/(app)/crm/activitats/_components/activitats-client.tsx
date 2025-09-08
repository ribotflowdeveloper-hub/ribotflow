"use client";

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';
import { type Activity } from '../page'; // Import the type from the page

// --- Sub-component for each history item (Corrected) ---
const HistoricActivityItem: React.FC<{ activity: Activity }> = ({ activity }) => {
    const isRead = activity.is_read;
    const Icon = isRead ? CheckCircle : AlertTriangle;
    const iconColor = isRead ? 'text-green-400' : 'text-yellow-400';

    // We define the common content here
    const activityContent = (
        <div className="flex items-start gap-4">
            <div className="mt-1">
                <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-center">
                    <p className="font-semibold">{activity.type} - <span className="font-normal">{activity.contacts?.nom || 'Contacte esborrat'}</span></p>
                    <p className="text-xs text-muted-foreground">{format(new Date(activity.created_at), "d MMM yyyy 'a les' HH:mm", { locale: ca })}</p>
                </div>
                <p className="text-sm text-muted-foreground mt-1 italic">"{activity.content}"</p>
            </div>
        </div>
    );

    // ✅ THIS IS THE FIX: We use a clear if/else for TypeScript
    // If there is a contact ID, we render a Link component with the required href.
    if (activity.contact_id) {
        return (
            <Link 
                href={`/crm/contactes/${activity.contact_id}`} 
                className="block p-4 rounded-lg hover:bg-white/10 transition-colors border-b border-white/10 last:border-b-0"
            >
                {activityContent}
            </Link>
        );
    }

    // If there is NO contact ID, we render a simple div without an href.
    return (
        <div className="block p-4 rounded-lg border-b border-white/10 last:border-b-0">
            {activityContent}
        </div>
    );
};


interface ActivitatsClientProps {
    initialActivities: Activity[];
}

export const ActivitatsClient: React.FC<ActivitatsClientProps> = ({ initialActivities }) => {
    if (!initialActivities) {
        return <div className="flex-1 flex justify-center items-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
    }

    return (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Historial d'Activitats</h1>
            </div>

            <div className="glass-card">
                {initialActivities.length > 0 ? (
                    <div className="divide-y divide-white/10">
                        {initialActivities.map(activity => (
                            <HistoricActivityItem key={activity.id} activity={activity} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center p-12">
                        <p className="text-muted-foreground">No hi ha cap activitat registrada encara.</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
};