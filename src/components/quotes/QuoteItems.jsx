// ============================================================================
// Fitxer: src/components/quotes/QuoteItems.jsx (Versió millorada)
// ============================================================================
import React, { useState } from 'react';
// V-- 1. IMPORTEM LA NOVA LLIBRERIA --V
import TextareaAutosize from 'react-textarea-autosize';
// A-- FI DE L'IMPORT --A
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// Hem eliminat l'import de 'Textarea' perquè ja no el fem servir
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Trash2, BookPlus, Save } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

export const QuoteItems = ({ items, setItems, products, onProductCreated }) => {
    // ... (tota la teva lògica de 'handlers' es manté exactament igual) ...
    const { user } = useAuth();
    const { toast } = useToast();
    const [isCreating, setIsCreating] = useState(false);
    const [newProduct, setNewProduct] = useState({ name: '', price: '' });
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const handleAddItem = (itemData = { description: '', quantity: 1, unit_price: 0 }) => {
        setItems([...items, itemData]);
        setIsPopoverOpen(false);
    };

    const handleAddProduct = (product) => {
        handleAddItem({ description: product.name, quantity: 1, unit_price: product.price, product_id: product.id });
    };

    const handleRemoveItem = (index) => setItems(items.filter((_, i) => i !== index));

    const handleSaveNewProduct = async () => {
        if (!newProduct.name || !newProduct.price) {
            toast({ variant: 'destructive', title: 'Camps requerits', description: 'El nom i el preu són obligatoris.' });
            return;
        }
        const { data, error } = await supabase.from('products').insert({
            user_id: user.id,
            name: newProduct.name,
            price: parseFloat(newProduct.price)
        }).select().single();

        if (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut desar el nou concepte.' });
        } else {
            toast({ title: 'Èxit!', description: 'Nou concepte desat i afegit.' });
            onProductCreated();
            handleAddProduct(data);
            setNewProduct({ name: '', price: '' });
            setIsCreating(false);
        }
    };


    return (
        <div className="space-y-4">
            <h3 className="font-semibold">Conceptes</h3>
            {items.map((item, index) => (
                <div key={index} className="flex items-start gap-2">
                    {/* V-- 2. SUBSTITUÏM I AJUSTEM EL TEXTAREA --V */}
                    <TextareaAutosize
                        placeholder="Descripció del servei o producte"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        minRows={1} // Comença amb una sola línia d'alçada
                        // Classes per imitar l'estil de Shadcn i controlar l'amplada
                        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-w-[300px]"
                    />
                    {/* A-- FI DEL TEXTAREA --A */}

                    <Input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 1)} className="w-20" placeholder="Quant." />
                    <Input type="number" value={item.unit_price} onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)} className="w-24" placeholder="Preu" />
                    <div className="w-24 text-right font-mono pt-2">€{((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}</div>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
            ))}
            
            {/* ... (la resta del teu component Popover es manté igual) ... */}
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm"><BookPlus className="w-4 h-4 mr-2" />Afegir Concepte</Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0 glass-effect">
                    {isCreating ? (
                        <div className="p-4 space-y-2">
                            <p className="font-medium text-sm">Crear i desar nou concepte</p>
                            <Input placeholder="Nom del concepte" value={newProduct.name} onChange={(e) => setNewProduct(p => ({...p, name: e.target.value}))} />
                            <Input type="number" placeholder="Preu (€)" value={newProduct.price} onChange={(e) => setNewProduct(p => ({...p, price: e.target.value}))} />
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}>Cancel·lar</Button>
                                <Button size="sm" onClick={handleSaveNewProduct}>Desar i Afegir</Button>
                            </div>
                        </div>
                    ) : (
                        <Command>
                            <CommandInput placeholder="Buscar concepte..." />
                            <CommandList>
                                <CommandEmpty>No s'ha trobat cap concepte.</CommandEmpty>
                                <CommandGroup>
                                    <CommandItem onSelect={() => handleAddItem()}>
                                        <Plus className="mr-2 h-4 w-4" /><span>Afegir concepte manual</span>
                                    </CommandItem>
                                    <CommandItem onSelect={() => setIsCreating(true)}>
                                        <Save className="mr-2 h-4 w-4" /><span>Crear i desar nou concepte</span>
                                    </CommandItem>
                                    {products.map((product) => (
                                        <CommandItem key={product.id} value={product.name} onSelect={() => handleAddProduct(product)}>
                                            <div className="flex justify-between w-full">
                                                <span>{product.name}</span>
                                                <span className="text-muted-foreground">€{product.price}</span>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    )}
                </PopoverContent>
            </Popover>
        </div>
    );
};