"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Send, User, Loader2, X } from 'lucide-react';
import { useNavigationStore } from '@/stores/navigationStore';

export function Chatbot() {
    const [messages, setMessages] = useState<{ id: string; role: 'user' | 'assistant'; content: string }[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const { toggleChatbot } = useNavigationStore();

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = { id: crypto.randomUUID(), role: 'user' as const, content: input };
        setMessages(prev => [
            ...prev,
            userMessage,
            { id: crypto.randomUUID(), role: 'assistant', content: '' }
        ]);
        setIsLoading(true);
        const question = input;
        setInput('');

        try {
            const response = await fetch('/api/chatbot', {
                method: 'POST',
                body: JSON.stringify({ question }),
            });

            if (!response.ok || !response.body) throw new Error("Error en la resposta del servidor.");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].content += chunk;
                    return newMessages;
                });
            }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].content = "Hi ha hagut un error. Si us plau, intenta-ho de nou.";
                return newMessages;
            });
        } finally {
            setIsLoading(false);
        }
    };

    function handleInputChange(event: React.ChangeEvent<HTMLInputElement>): void {
        setInput(event.target.value);
    }

    return (
        <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-card border rounded-lg shadow-lg flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Bot className="w-6 h-6 text-primary" />
                    <h2 className="font-semibold">Assistent d'IA</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={toggleChatbot} className="h-8 w-8">
                    <X className="w-4 h-4" />
                </Button>
            </div>
            <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && <Bot className="w-6 h-6 flex-shrink-0" />}
                        <div className={`p-3 rounded-lg max-w-xs whitespace-pre-wrap ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            {msg.content}
                        </div>
                        {msg.role === 'user' && <User className="w-6 h-6 flex-shrink-0" />}
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start gap-3">
                        <Bot className="w-6 h-6 flex-shrink-0" />
                        <div className="p-3 rounded-lg bg-muted flex items-center justify-center">
                            <Loader2 className="w-5 h-5 animate-spin" />
                        </div>
                    </div>
                )}
            </div>
            <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
                <Input
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Fes una pregunta..."
                    disabled={isLoading}
                />
                <Button type="submit" disabled={isLoading || !input.trim()}>
                    <Send className="w-4 h-4" />
                </Button>
            </form>
        </div>
    );
}