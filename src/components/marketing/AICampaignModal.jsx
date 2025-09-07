import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles } from 'lucide-react';

const AICampaignModal = ({ isOpen, onClose }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const handleAIGenerate = () => {
        // En una app real, aquí hi hauria una trucada a una API d'IA
        setName("Idea d'IA: Campanya de Reels 'Un dia com a autònom'");
        setDescription("Contingut suggerit per l'IA:\n1. Clip matinal preparant el cafè i l'espai de treball.\n2. Timelapse d'una sessió de feina concentrada.\n3. Clip d'una videotrucada amb un client (simulada).\n4. Posta de sol per indicar la fi de la jornada.\nMúsica de fons: Lofi chill beats.");
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="glass-effect p-8 rounded-xl w-full max-w-lg space-y-4">
                <h2 className="text-2xl font-bold">Nova Campanya Intel·ligent</h2>
                <Button onClick={handleAIGenerate} className="w-full bg-purple-600 hover:bg-purple-700">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Genera idees amb IA
                </Button>
                <Input placeholder="Nom de la campanya" value={name} onChange={e => setName(e.target.value)} />
                <Textarea placeholder="Descripció o contingut..." value={description} onChange={e => setDescription(e.target.value)} rows={6}/>
                <div className="flex justify-end gap-4">
                    <Button variant="ghost" onClick={onClose}>Cancel·lar</Button>
                    <Button>Guardar Campanya</Button>
                </div>
            </div>
        </div>
    );
};

export default AICampaignModal;