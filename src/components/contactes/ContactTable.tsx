"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User } from 'lucide-react';
import type { Contact } from '@/types/crm'; // ✅ CANVI: Corregim la ruta de la importació

// Define the component's props
interface ContactTableProps {
  contacts: Contact[];
  onRowClick: (contact: Contact) => void;
}

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
            <TableHead className="hidden md:table-cell">Empresa</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow 
              key={contact.id} 
              onClick={() => onRowClick(contact)}
              className="border-b-white/10 hover:bg-white/5 cursor-pointer"
            >
              <TableCell className="font-medium flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-white" />
                </div>
                {contact.nom}
              </TableCell>
              <TableCell>
                <span className={`status-badge status-${contact.estat?.toLowerCase()}`}>{contact.estat}</span>
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