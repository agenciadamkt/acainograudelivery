'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Maximize2, Minimize2, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import logoCircular from '@/assets/logo-circular.png';
import { supabase } from '@/integrations/supabase/client';

// Tipagem básica para as mensagens do Copiloto
type CopilotMessage = {
    id: string;
    role: 'system' | 'assistant' | 'user';
    content: string;
    timestamp: Date;
};

export default function CopilotPanel() {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState<CopilotMessage[]>([
        {
            id: 'msg-1',
            role: 'assistant',
            content: 'Olá! Sou o Gerente Virtual do GrauOS. Posso ajudar com análises do caixa, estoque ou insights sobre as vendas de hoje.',
            timestamp: new Date()
        }
    ]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        // Adiciona a mensagem do usuário imediatamente (Optimistic UI)
        const userMessage: CopilotMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue.trim(),
            timestamp: new Date()
        };

        // Realiza cache do estado das mensagens para enviar o histórico + a nova mensagem
        const conversationHistory = [...messages, userMessage];
        setMessages(conversationHistory);
        setInputValue('');

        try {
            // Chama a Edge Function 'copilot-chat' passando o histórico
            const { data, error } = await supabase.functions.invoke('copilot-chat', {
                body: {
                    messages: conversationHistory
                }
            });

            if (error) throw error; // Captura erro da edge function caso a API Key do Gemini não responda, entre outros

            if (data && data.content) {
                const assistantMessage: CopilotMessage = {
                    id: Date.now().toString(),
                    role: 'assistant', // ou a role que vier do backend
                    content: data.content,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, assistantMessage]);
            }
        } catch (err: any) {
            console.error("Erro ao falar com o Gerente Virtual:", err);
            const errorMessage: CopilotMessage = {
                id: Date.now().toString(),
                role: 'assistant',
                content: 'Houve um erro de conexão com o meu cérebro (Motor de IA). Verifique as chaves e os logs do Supabase. Erro: ' + (err?.message || 'Erro Desconhecido'),
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* Floating Action Button - Aura Style (Glass + Glow) */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="fixed bottom-6 right-6 z-50"
                    >
                        <Button
                            onClick={() => setIsOpen(true)}
                            className="h-16 w-16 rounded-full bg-white dark:bg-[#1A1A24] border-2 border-[#6b4c9a]/30 shadow-[0_8px_30px_rgb(107,76,154,0.3)] hover:shadow-[0_8px_40px_rgb(107,76,154,0.4)] transition-all p-0 flex items-center justify-center relative overflow-hidden group"
                        >
                            <div className="absolute inset-0 bg-[#6b4c9a]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <img src={logoCircular} alt="IA Açaí no Grau" className="h-[75%] w-[75%] object-contain drop-shadow-md group-hover:scale-110 transition-transform duration-300" />

                            {/* Badge indicativo de Anomalia/Alerta Proativo (Mock) */}
                            <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 border-2 border-white dark:border-[#1A1A24] rounded-full animate-pulse shadow-sm shadow-red-500/50 z-10"></span>
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Panel - Glassmorphism Bento Grid Layout */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                        className={`fixed bottom-6 right-6 z-50 flex flex-col bg-white/80 dark:bg-black/60 backdrop-blur-3xl border border-gray-200/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden transition-all duration-300 ease-in-out ${isExpanded
                            ? 'w-[800px] h-[80vh] rounded-3xl'
                            : 'w-[400px] h-[600px] rounded-2xl'
                            } max-w-[calc(100vw-3rem)] max-h-[calc(100vh-3rem)]`}
                    >
                        {/* Header com Gradiente Misto Aura */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-white/10 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-md">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 flex-shrink-0 rounded-full bg-white dark:bg-white/10 flex items-center justify-center shadow-md border border-gray-100 dark:border-white/10 overflow-hidden relative">
                                    <img src={logoCircular} alt="IA" className="h-[120%] w-[120%] object-cover p-1 opacity-90" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-pink-600 dark:from-indigo-400 dark:to-pink-400">
                                        Gerente Virtual IA
                                    </h3>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgb(34,197,94,0.5)]"></span>
                                        <span className="text-[10px] uppercase font-medium tracking-wider text-gray-500 dark:text-white/50">
                                            Online e Analisando
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-full"
                                    onClick={() => setIsExpanded(!isExpanded)}
                                >
                                    {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-full"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Chat Area */}
                        <ScrollArea className="flex-1 p-4 bg-gray-50/50 dark:bg-transparent">
                            <div className="flex flex-col gap-6">
                                {messages.map((msg, index) => {
                                    const isUser = msg.role === 'user';

                                    return (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            key={msg.id || index}
                                            className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                                        >
                                            <div className={`h-8 w-8 flex-shrink-0 rounded-full flex items-center justify-center shadow-sm ${isUser
                                                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                                                : 'bg-white border border-gray-100 dark:border-white/10 shadow-[0_2px_10px_rgb(0,0,0,0.05)] overflow-hidden'
                                                }`}>
                                                {isUser ? <User className="h-4 w-4" /> : <img src={logoCircular} alt="IA" className="h-[130%] w-[130%] object-cover p-0.5" />}
                                            </div>

                                            <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%]`}>
                                                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${isUser
                                                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-tr-sm'
                                                    : 'bg-white dark:bg-white/10 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-white/5 rounded-tl-sm'
                                                    }`}>
                                                    {msg.content}
                                                </div>
                                                <span className="text-[10px] font-medium text-gray-400 dark:text-white/40 mt-1 px-1">
                                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>

                        {/* Sugestões Instantâneas (Chips) */}
                        <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide border-t border-gray-100 dark:border-white/5">
                            {[
                                "📈 Resumo do DRE",
                                "⚠️ Alertas do Estoque",
                                "💰 Fechamento de Hoje"
                            ].map((suggestion, i) => (
                                <button
                                    key={i}
                                    onClick={() => setInputValue(suggestion.replace(/^[\p{Emoji}\s]+/gu, ''))}
                                    className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white dark:bg-white/5 border border-gray-200/50 dark:border-white/10 text-xs font-medium text-gray-600 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-sm"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white/50 dark:bg-black/40 border-t border-gray-100 dark:border-white/10 backdrop-blur-xl">
                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Pergunte ao Gerente Virtual..."
                                    className="flex-1 h-12 rounded-xl border border-gray-200 dark:border-white/20 bg-white/80 dark:bg-white/5 pl-4 pr-12 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-shadow shadow-inner"
                                />
                                <Button
                                    onClick={handleSend}
                                    size="icon"
                                    disabled={!inputValue.trim()}
                                    className="absolute right-2 h-8 w-8 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white shadow-md disabled:bg-gray-300 dark:disabled:bg-white/10 disabled:text-gray-500 transition-colors"
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="text-center mt-2">
                                <span className="text-[10px] text-gray-400 dark:text-white/30 font-medium tracking-wide">
                                    O Copiloto pode cometer erros. Verifique informações vitais.
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
