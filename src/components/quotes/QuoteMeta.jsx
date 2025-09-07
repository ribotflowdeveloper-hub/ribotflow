// ============================================================================
// Fitxer: src/components/quotes/QuoteMeta.jsx
// ============================================================================
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DatePicker } from "@/components/ui/date-picker";
import { Check, ChevronsUpDown } from 'lucide-react';

export const QuoteMeta = ({ quote, setQuote, contacts, opportunities = [] }) => {
    const selectedContact = contacts.find(c => c.id === quote.contact_id);
    const selectedOpportunity = opportunities.find(o => o.id === quote.opportunity_id);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client */}
            <div>
                <Label>Client</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full justify-between search-input text-left font-normal mt-1">
                            {selectedContact ? `${selectedContact.nom} (${selectedContact.empresa || ''})` : "Selecciona un client..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0 glass-effect">
                        <Command>
                            <CommandInput placeholder="Buscar client..." />
                            <CommandList>
                                <CommandEmpty>No s'ha trobat cap client.</CommandEmpty>
                                <CommandGroup>
                                    {contacts.map(c => (
                                        <CommandItem
                                            key={c.id}
                                            value={c.nom}
                                            onSelect={() => setQuote(q => ({ ...q, contact_id: c.id, opportunity_id: null }))} // reset oportunitat
                                        >
                                            <Check className={`mr-2 h-4 w-4 ${quote.contact_id === c.id ? "opacity-100" : "opacity-0"}`} />
                                            {c.nom} <span className="text-xs text-muted-foreground ml-2">{c.empresa}</span>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Número de pressupost */}
            <div>
                <Label>Número de Pressupost</Label>
                <Input
                    value={quote.quote_number || ''}
                    onChange={(e) => setQuote(q => ({ ...q, quote_number: e.target.value }))}
                    className="mt-1"
                />
            </div>

            {/* Data d'emissió */}
            <div>
                <Label>Data d'Emissió</Label>
                <DatePicker
                    date={quote.issue_date ? new Date(quote.issue_date) : null}
                    setDate={(date) => setQuote(q => ({ ...q, issue_date: date }))}
                />
            </div>

            {/* Data de venciment */}
            <div>
                <Label>Data de Venciment</Label>
                <DatePicker
                    date={quote.expiry_date ? new Date(quote.expiry_date) : null}
                    setDate={(date) => setQuote(q => ({ ...q, expiry_date: date }))}
                />
            </div>

            {/* Oportunitat (només si n’hi ha pel client) */}
            {opportunities.length > 0 && (
                <div className="md:col-span-2">
                    <Label>Oportunitat</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="w-full justify-between search-input text-left font-normal mt-1">
                                {selectedOpportunity ? `${selectedOpportunity.name} (${selectedOpportunity.status})` : "Selecciona una oportunitat..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 glass-effect">
                            <Command>
                                <CommandInput placeholder="Buscar oportunitat..." />
                                <CommandList>
                                    <CommandEmpty>No s'ha trobat cap oportunitat.</CommandEmpty>
                                    <CommandGroup>
                                        {opportunities.map(o => (
                                            <CommandItem
                                                key={o.id}
                                                value={o.name}
                                                onSelect={() => setQuote(q => ({ ...q, opportunity_id: o.id }))}
                                            >
                                                <Check className={`mr-2 h-4 w-4 ${quote.opportunity_id === o.id ? "opacity-100" : "opacity-0"}`} />
                                                {o.name} <span className="text-xs text-muted-foreground ml-2">({o.status})</span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
            )}
        </div>
    );
};
