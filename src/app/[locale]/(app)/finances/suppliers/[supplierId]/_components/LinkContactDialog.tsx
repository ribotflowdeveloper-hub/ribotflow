"use client";

import { useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus, Search } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import { toast } from 'sonner';

import { 
  searchContactsForLinking, 
  linkContactToSupplier 
} from '@/app/[locale]/(app)/crm/contactes/actions';
import type { Contact } from "@/types/db"; 

type SearchResult = Pick<Contact, 'id' | 'nom' | 'email'>;

interface LinkContactDialogProps {
  supplierId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onLinkSuccess: (newlyLinkedContact: Contact) => void;
  t: (key: string) => string;
}

export function LinkContactDialog({
  supplierId,
  isOpen,
  onOpenChange,
  onLinkSuccess,
  t
}: LinkContactDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, startSearchTransition] = useTransition();
  const [isLinking, startLinkTransition] = useTransition();

  const handleSearch = useDebouncedCallback((term: string) => {
    if (term.length < 2) {
      setResults([]);
      return;
    }
    startSearchTransition(async () => {
      const data = await searchContactsForLinking(term);
      setResults(data);
    });
  }, 300);

  const handleLinkClick = (contactId: string) => {
    startLinkTransition(async () => {
      const result = await linkContactToSupplier(contactId, supplierId);
      if (result.success && result.data) {
        toast.success(t('contactsCard.linkDialog.toastSuccess'));
        onLinkSuccess(result.data); 
        onOpenChange(false); 
        setSearchTerm('');
        setResults([]);
      } else {
        toast.error(result.message || t('contactsCard.linkDialog.toastError'));
      }
    });
  };
  
  // Reseteja l'estat en tancar el diàleg
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSearchTerm('');
      setResults([]);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('contactsCard.linkDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('contactsCard.linkDialog.description')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('contactsCard.linkDialog.searchPlaceholder')}
            className="pl-9"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              handleSearch(e.target.value);
            }}
          />
        </div>

        <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
          {isSearching && (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {!isSearching && results.length === 0 && searchTerm.length > 1 && (
            <p className="text-sm text-center text-muted-foreground">
              {t('contactsCard.linkDialog.noResults')}
            </p>
          )}
          {results.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center justify-between p-2 border rounded-md"
            >
              <div>
                <p className="font-medium">{contact.nom}</p>
                <p className="text-sm text-muted-foreground">{contact.email}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleLinkClick(String(contact.id))}
                disabled={isLinking}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {t('contactsCard.linkDialog.linkButton')}
              </Button>
            </div>
          ))}
        </div>
        
        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            {t('contactsCard.linkDialog.cancelButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}