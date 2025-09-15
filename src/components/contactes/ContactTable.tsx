"use client";

import React from 'react';
// Importem els components de taula de shadcn/ui.
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User } from 'lucide-react';
import type { Contact } from '@/types/crm';
import { CONTACT_STATUS_DISPLAY, ContactStatusKey } from '@/types/crm';

// Definim les propietats que el component espera.
interface ContactTableProps {
  contacts: Contact[]; // Un array amb tots els contactes a mostrar.
  onRowClick: (contact: Contact) => void; // Funció a executar quan es clica una fila.
}

/**
 * Component presentacional que renderitza una llista de contactes en format de taula.
 * És una de les dues vistes disponibles a la pàgina de contactes.
 */
const ContactTable: React.FC<ContactTableProps> = ({ contacts, onRowClick }) => {
  return (
    <div className="glass-effect rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-b-white/10 hover:bg-white/5">
            <TableHead className="w-[250px]">Nom</TableHead>
            <TableHead>Estat</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Telèfon</TableHead>
            {/* Aquesta columna només serà visible en pantalles mitjanes o més grans (md:table-cell).
                És una tècnica de disseny responsiu per a taules. */}
            <TableHead className="hidden md:table-cell">Empresa</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Fem un 'map' sobre l'array de contactes per crear una fila ('TableRow') per a cada un. */}
          {contacts.map((contact) => (
            <TableRow 
              key={contact.id} // La 'key' única és essencial per a l'optimització de React.
              onClick={() => onRowClick(contact)} // L'acció de clic es propaga a tota la fila.
              className="border-b-white/10 hover:bg-white/5 cursor-pointer"
            >
              <TableCell className="font-medium flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-white" />
                </div>
                {contact.nom}
              </TableCell>
              <TableCell>
                {/* L'etiqueta d'estat obté el seu color de les classes CSS globals. */}
                <span className={`status-badge status-${contact.estat?.toLowerCase()}`}>{CONTACT_STATUS_DISPLAY[contact.estat as ContactStatusKey]}</span>
              </TableCell>
              <TableCell className="text-muted-foreground">{contact.email}</TableCell>
              <TableCell className="text-muted-foreground">{contact.telefon || '-'}</TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">{contact.empresa || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ContactTable;