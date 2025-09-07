import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, ShieldOff } from 'lucide-react';

const BlacklistSettings = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [rules, setRules] = useState([]);
    const [newRule, setNewRule] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchRules = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase.from('blacklist_rules').select('*').eq('user_id', user.id);
        if (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No s\'han pogut carregar les regles.' });
        } else {
            setRules(data);
        }
        setLoading(false);
    }, [user, toast]);

    useEffect(() => {
        fetchRules();
    }, [fetchRules]);

    const handleAddRule = async () => {
        if (!newRule.trim()) return;
        const value = newRule.trim().toLowerCase();
        const rule_type = value.includes('@') ? 'email' : 'domain';

        const { error } = await supabase.from('blacklist_rules').insert({ user_id: user.id, value, rule_type });
        if (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut afegir la regla. Potser ja existeix.' });
        } else {
            toast({ title: 'Èxit!', description: 'Regla afegida correctament.' });
            setNewRule('');
            fetchRules();
        }
    };

    const handleDeleteRule = async (id) => {
        const { error } = await supabase.from('blacklist_rules').delete().eq('id', id);
        if (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut eliminar la regla.' });
        } else {
            toast({ title: 'Èxit!', description: 'Regla eliminada.' });
            fetchRules();
        }
    };

    return (
        <div className="glass-card p-6">
            <h2 className="text-2xl font-bold mb-2">Filtre de l'Inbox (Blacklist)</h2>
            <p className="text-muted-foreground mb-6">Afegeix dominis (ex: `exemple.com`) o adreces de correu completes per evitar que apareguin a la teva bústia d'entrada.</p>
            
            <div className="flex gap-2 mb-6">
                <Input 
                    placeholder="exemple.com o spammer@exemple.com"
                    value={newRule}
                    onChange={(e) => setNewRule(e.target.value)}
                />
                <Button onClick={handleAddRule}>Afegir</Button>
            </div>

            {loading ? <Loader2 className="animate-spin" /> : (
                <div className="space-y-2">
                    {rules.length > 0 ? rules.map(rule => (
                        <div key={rule.id} className="flex justify-between items-center p-2 bg-muted rounded-lg">
                            <div className="flex items-center gap-2">
                                <Badge variant={rule.rule_type === 'domain' ? 'default' : 'secondary'}>{rule.rule_type}</Badge>
                                <span>{rule.value}</span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteRule(rule.id)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                        </div>
                    )) : <p className="text-sm text-muted-foreground text-center py-4">La teva blacklist està buida.</p>}
                </div>
            )}
        </div>
    );
};

export default BlacklistSettings;
