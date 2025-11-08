// src/components/chatbot/Chatbot.tsx

'use client'

import { useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bot, Send, User, Loader2, X } from 'lucide-react'
import { useNavigationStore } from '@/stores/navigationStore'
// ✅ CORRECCIÓ 1: Importem 'useChat' i el tipus 'Message'
import { useChat, type Message } from '@/hooks/useChat'
export function Chatbot() {
    const { toggleChatbot } = useNavigationStore()
    const chatContainerRef = useRef<HTMLDivElement>(null)

    // Utilitzem el hook 'useChat'
    const {
        messages,
        input,
        handleInputChange,
        handleSubmit,
        isLoading,
        error,
    } = useChat()

    // Efecte per fer scroll automàtic al final
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
        }
    }, [messages])

    return (
        <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-card border rounded-lg shadow-lg flex flex-col z-50">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Bot className="w-6 h-6 text-primary" />
                    <h2 className="font-semibold">Assistent d'IA</h2>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleChatbot}
                    className="h-8 w-8"
                >
                    <X className="w-4 h-4" />
                </Button>
            </div>

            {/* Contingut del Xat */}
            <div
                ref={chatContainerRef}
                className="flex-1 p-4 overflow-y-auto space-y-4"
            >
                {messages.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                        <Bot className="w-12 h-12 mb-2" />
                        <p>Sóc en Ribot, el teu assistent.</p>
                        <p>En què et puc ajudar avui?</p>
                    </div>
                )}

                {/* ✅ CORRECCIÓ 2: Afegim el tipus 'Message' al map */}
                {messages.map((msg: Message) => (
                    <div
                        key={msg.id}
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'
                            }`}
                    >
                        {msg.role === 'assistant' && (
                            <Bot className="w-6 h-6 flex-shrink-0" />
                        )}
                        <div
                            className={`p-3 rounded-lg max-w-xs whitespace-pre-wrap ${msg.role === 'user'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                        >
                            {msg.content}
                        </div>
                        {msg.role === 'user' && <User className="w-6 h-6 flex-shrink-0" />}
                    </div>
                ))}

                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                    <div className="flex justify-start gap-3">
                        <Bot className="w-6 h-6 flex-shrink-0" />
                        <div className="p-3 rounded-lg bg-muted flex items-center justify-center">
                            <Loader2 className="w-5 h-5 animate-spin" />
                        </div>
                    </div>
                )}

                {error && (
                    <div className="flex justify-start gap-3">
                        <Bot className="w-6 h-6 flex-shrink-0 text-destructive" />
                        <div className="p-3 rounded-lg bg-destructive/20 text-destructive-foreground max-w-xs whitespace-pre-wrap">
                            Hi ha hagut un error. Si us plau, torna-ho a provar.
                        </div>
                    </div>
                )}
            </div>

            {/* Input del Xat */}
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
    )
}