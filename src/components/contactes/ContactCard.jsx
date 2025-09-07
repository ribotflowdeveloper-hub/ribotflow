import React from 'react';
import { motion } from 'framer-motion';
import { User, Building, Mail, Phone, Euro, Star } from 'lucide-react';

const ContactCard = ({ contact, onClick }) => (
  <motion.div
    layoutId={`contact-card-${contact.id}`}
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    onClick={onClick}
    className="glass-effect p-6 rounded-xl hover:border-primary/50 border border-transparent transition-all cursor-pointer flex flex-col justify-between h-full"
  >
    <div className="min-w-0">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-lg text-foreground truncate max-w-[200px]">
              {contact.nom}
            </h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 truncate max-w-[200px]">
              <Building className="w-4 h-4 shrink-0" />
              <span className="truncate">{contact.empresa || 'Sense empresa'}</span>
            </p>
          </div>
        </div>
        <span className={`status-badge status-${contact.estat?.toLowerCase()} shrink-0`}>
          {contact.estat}
        </span>
      </div>
      <div className="space-y-2 text-sm min-w-0">
        <p className="flex items-center gap-2 text-muted-foreground truncate max-w-[250px]">
          <Mail className="w-4 h-4 text-primary/70 shrink-0" />
          <span className="truncate">{contact.email}</span>
        </p>
        <p className="flex items-center gap-2 text-muted-foreground truncate max-w-[200px]">
          <Phone className="w-4 h-4 text-primary/70 shrink-0" />
          <span className="truncate">{contact.telefon || 'No especificat'}</span>
        </p>
      </div>
    </div>

    <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/10">
      <div className="text-lg font-semibold text-green-400 flex items-center">
        <Euro className="w-4 h-4 mr-1" />
        {contact.valor?.toLocaleString() || '0'}
      </div>
      <div className="flex items-center gap-1">
        <Star className="w-4 h-4 text-yellow-400 fill-current" />
        <span className="text-sm text-gray-400">4.5</span>
      </div>
    </div>
  </motion.div>
);

export default ContactCard;
