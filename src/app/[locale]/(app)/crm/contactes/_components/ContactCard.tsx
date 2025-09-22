"use client";

import React from 'react';
// Framer Motion per a animacions fluides.
import { motion } from 'framer-motion';
// Icones de Lucide React.
import { User, Building, Mail, Phone, Euro, Star } from 'lucide-react';
// Importem el tipus de dades 'Contact' i el nostre mapa d'estats.
import type { Contact } from '@/types/crm';
import { CONTACT_STATUS_MAP } from '@/types/crm';
// Importem el hook de traduccions.
import { useTranslations } from 'next-intl';

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
    // Inicialitzem el hook de traduccions per al namespace que correspongui.
    // Canvia 'ContactsClient' si has organitzat les teves traduccions de manera diferent.
    const t = useTranslations('ContactsClient');

    /**
     * @summary Funció interna per obtenir el text traduït de l'estat a partir del seu codi.
     * @param statusCode El codi de l'estat (ex: 'L', 'P', 'C').
     * @returns El text complet i traduït (ex: "Lead", "Cliente", "Proveedor").
     */
    const getStatusLabel = (statusCode?: string) => {
        if (!statusCode) return ''; // Si no hi ha estat, no retornem res.
        // Busquem l'objecte corresponent al codi dins del nostre mapa central.
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
                            {/* 📛 Nom — Truncat normalment, desplegat en hover */}
                            <h3
                                className="
              font-bold text-lg text-foreground truncate max-w-[200px]
              group-hover:max-w-[500px] group-hover:whitespace-normal transition-all duration-300
            "
                            >
                                {contact.nom}
                            </h3>
                            {/* Empresa */}
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5 truncate max-w-[200px]">
                                <Building className="w-4 h-4 shrink-0" />
                                <span className="truncate">{contact.empresa || t('noCompany')}</span>
                            </p>
                        </div>
                    </div>
                    {/* 🏷 Estat — Badge que es fa petit en hover */}
                    <span
                        className={`
          status-badge status-${contact.estat?.toLowerCase()}
          shrink-0 transition-transform duration-300
          group-hover:scale-75 group-hover:opacity-80
        `}
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
                        <span className="truncate">{contact.telefon || t('notSpecified')}</span>
                    </p>
                </div>
            </div>

            {/* Secció inferior 
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/10">
                <div className="text-lg font-semibold text-green-400 flex items-center">
                    <Euro className="w-4 h-4 mr-1" />
                    {contact.valor?.toLocaleString() || '0'}
                </div>
                <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-400">4.5</span>
                </div>
            </div>*/}
        </motion.div>

    );
}

export default ContactCard;