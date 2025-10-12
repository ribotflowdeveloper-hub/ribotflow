"use client";

import React from 'react';
// Framer Motion per a animacions fluides.
import { motion } from 'framer-motion';
// Icones de Lucide React.
import { User, Building, Mail, Phone} from 'lucide-react';
// Hook de traduccions.
import { useTranslations } from 'next-intl';

// 👇 PAS 1: Importem la definició de la nostra base de dades
import { type Database } from '@/types/supabase';
// 👇 PAS 2: Importem la constant des de la seva nova llar a /config
import { CONTACT_STATUS_MAP } from '@/config/contacts';

// 👇 PAS 3: Definim el tipus 'Contact' a partir de l'esquema de la base de dades
type Contact = Database['public']['Tables']['contacts']['Row'];

// Definim les propietats (props) que el nostre component espera rebre.
interface ContactCardProps {
    contact: Contact; // L'objecte amb totes les dades d'un contacte.
    onClick: () => void; // Una funció que s'executarà quan es faci clic a la targeta.
}

/**
 * @summary Aquest és un component presentacional reutilitzable i internacionalitzat.
 * La seva única responsabilitat és mostrar les dades d'un contacte en un format de targeta visual.
 * Rep tota la lògica i les dades del seu component pare.
 */
const ContactCard: React.FC<ContactCardProps> = ({ contact, onClick }) => {
    // Inicialitzem el hook de traduccions.
    const t = useTranslations('ContactsClient');

    /**
     * @summary Funció interna per obtenir el text traduït de l'estat a partir del seu codi.
     * @param statusCode El codi de l'estat (ex: 'L', 'P', 'C').
     * @returns El text complet i traduït (ex: "Lead", "Cliente", "Proveedor").
     */
    const getStatusLabel = (statusCode?: string | null) => {
        if (!statusCode) return ''; // Si no hi ha estat, no retornem res.
        const statusObject = CONTACT_STATUS_MAP.find(s => s.code === statusCode);
        // Si el trobem, utilitzem la seva 'key' per obtenir la traducció.
        // Si no, retornem el codi original com a fallback.
        return statusObject ? t(`contactStatuses.${statusObject.key}`) : statusCode;
    };

    return (
        // Utilitzem 'motion.div' de Framer Motion per a animacions.
        <motion.div
            layoutId={`contact-card-${contact.id}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={onClick}
            className="group glass-effect p-6 rounded-xl hover:border-primary/50 border border-transparent transition-all cursor-pointer flex flex-col justify-between h-full"
        >
            <div className="min-w-0">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shrink-0">
                            <User className="w-6 h-6 text-white" />
                        </div>
                        <div className="min-w-0">
                            {/* 📛 Nom — Corregit a 'contact.name' per coincidir amb la base de dades */}
                            <h3
                                className="font-bold text-lg text-foreground truncate max-w-[200px] group-hover:max-w-[500px] group-hover:whitespace-normal transition-all duration-300"
                            >
                                {contact.nom} 
                            </h3>
                            {/* Empresa — Corregit a 'contact.company' */}
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5 truncate max-w-[200px]">
                                <Building className="w-4 h-4 shrink-0" />
                                <span className="truncate">{contact.empresa || t('noCompany')}</span>
                            </p>
                        </div>
                    </div>
                    {/* 🏷 Estat — Corregit a 'contact.status' */}
                    <span
                        className={`status-badge status-${contact.estat?.toLowerCase()} shrink-0 transition-transform duration-300 group-hover:scale-75 group-hover:opacity-80`}
                    >
                        {getStatusLabel(contact.estat)}
                    </span>
                </div>

                {/* Info de contacte */}
                <div className="space-y-2 text-sm min-w-0">
                    <p className="flex items-center gap-2 text-muted-foreground truncate max-w-[250px]">
                        <Mail className="w-4 h-4 text-primary/70 shrink-0" />
                        <span className="truncate">{contact.email}</span>
                    </p>
                    <p className="flex items-center gap-2 text-muted-foreground truncate max-w-[200px]">
                        <Phone className="w-4 h-4 text-primary/70 shrink-0" />
                        {/* Corregit a 'contact.phone' */}
                        <span className="truncate">{contact.telefon || t('notSpecified')}</span>
                    </p>
                </div>
            </div>
        </motion.div>
    );
}

export default ContactCard;