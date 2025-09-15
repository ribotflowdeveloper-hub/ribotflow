"use client";

import React from 'react';
// Framer Motion per a animacions suaus d'entrada.
import { motion } from 'framer-motion';
// Link de Next.js per a navegació optimitzada del costat del client.
import Link from 'next/link';
// Icones i format de dates.
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';
// Importem el tipus de dades definit a la pàgina del servidor per a consistència.
import { type Activity } from '../page';

/**
 * Sub-component reutilitzable per mostrar un únic element de l'historial d'activitats.
 * Aquesta separació manté el codi més net i organitzat.
 */
const HistoricActivityItem: React.FC<{ activity: Activity }> = ({ activity }) => {
    // Determina l'estat i l'estil de la icona basant-se en si l'activitat ha estat llegida.
    const isRead = activity.is_read;
    const Icon = isRead ? CheckCircle : AlertTriangle;
    const iconColor = isRead ? 'text-green-400' : 'text-yellow-400';

    // Definim el contingut de l'activitat en una variable per no repetir codi.
    const activityContent = (
        <div className="flex items-start gap-4">
            <div className="mt-1">
                <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-center">
                    <p className="font-semibold">{activity.type} - <span className="font-normal">{activity.contacts?.nom || 'Contacte esborrat'}</span></p>
                    {/* Formategem la data de creació per a una millor llegibilitat. */}
                    <p className="text-xs text-muted-foreground">{format(new Date(activity.created_at), "d MMM yyyy 'a les' HH:mm", { locale: ca })}</p>
                </div>
                <p className="text-sm text-muted-foreground mt-1 italic">"{activity.content}"</p>
            </div>
        </div>
    );

    // Renderitzat condicional: si l'activitat està associada a un contacte, la fem clicable.
    // Això evita errors si un contacte ha estat esborrat però la seva activitat encara existeix.
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

    // Si no hi ha contacte associat, renderitzem un 'div' simple que no és un enllaç.
    return (
        <div className="block p-4 rounded-lg border-b border-white/10 last:border-b-0">
            {activityContent}
        </div>
    );
};


// Definim les propietats que espera el component principal.
interface ActivitatsClientProps {
    initialActivities: Activity[];
}

/**
 * Component de Client principal per a la pàgina d'historial d'activitats.
 * La seva funció és rebre les dades del servidor i renderitzar-les.
 */
export const ActivitatsClient: React.FC<ActivitatsClientProps> = ({ initialActivities }) => {
    // Si per alguna raó les dades no arriben, mostrem un indicador de càrrega.
    if (!initialActivities) {
        return <div className="flex-1 flex justify-center items-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
    }

    return (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Historial d'Activitats</h1>
            </div>

            <div className="glass-card">
                {/* Si hi ha activitats, les mapegem per renderitzar-les. */}
                {initialActivities.length > 0 ? (
                    <div className="divide-y divide-white/10">
                        {/* El mètode .map() és la forma estàndard de React per renderitzar llistes. */}
                        {initialActivities.map(activity => (
                            <HistoricActivityItem key={activity.id} activity={activity} />
                        ))}
                    </div>
                ) : (
                    // Si no n'hi ha, mostrem un missatge informatiu.
                    <div className="text-center p-12">
                        <p className="text-muted-foreground">No hi ha cap activitat registrada encara.</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
};