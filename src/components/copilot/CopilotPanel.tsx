'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Maximize2, Minimize2, User, Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import logoCircular from '@/assets/logo-circular.png';
import { supabase } from '@/integrations/supabase/client';

type CopilotMessage = {
    id: string;
    role: 'system' | 'assistant' | 'user';
    content: string;
    timestamp: Date;
};

// ─── Mapeamento de rotas para contexto de tela ───
const ROUTE_CONTEXT: Record<string, string> = {
    '/admin/dashboard': 'Dashboard Geral — visão consolidada de pedidos, receita e atividade.',
    '/admin/financeiro': 'Dashboard Financeiro — saldos, KPIs, gráficos de fluxo de caixa, despesas e receitas.',
    '/admin/financeiro/lancamentos': 'Lançamentos Financeiros — registros de todas as entradas e saídas.',
    '/admin/financeiro/fluxo': 'Fechamento de Caixa — lista de todos os fechamentos de caixa realizados.',
    '/admin/financeiro/despesas': 'Despesas — cadastro e controle de despesas fixas, variáveis e investimentos.',
    '/admin/financeiro/dre': 'Relatório DRE — Demonstração do Resultado do Exercício com receitas e despesas.',
    '/admin/financeiro/receber': 'Contas a Receber — faturas e pagamentos pendentes de clientes.',
    '/admin/financeiro/caixa': 'Gestão de Caixa — controle do caixa físico com entradas e saídas.',
    '/admin/financeiro/cadastros': 'Cadastros Financeiros — contas, categorias e configurações financeiras.',
    '/admin/financeiro/relatorios': 'Relatórios Financeiros — área de relatórios analíticos disponíveis.',
    '/admin/inventory': 'Estoque — gestão de produtos em estoque, quantidades e alertas de reposição.',
    '/admin/orders': 'Pedidos — lista de pedidos recebidos, em andamento e finalizados.',
    '/admin/kds': 'KDS (Kitchen Display System) — tela de produção da cozinha.',
    '/admin/customers': 'Clientes — lista e gestão de clientes cadastrados.',
    '/admin/menu/products': 'Produtos — cardápio completo com preços e configurações.',
    '/admin/menu/categories': 'Categorias — organização das categorias de produtos.',
    '/admin/delivery': 'Delivery — gestão de entregas e motoristas.',
    '/admin/settings': 'Configurações — ajustes gerais do sistema.',
    '/admin/hub': 'GrauOS Hub — central de módulos do sistema.',
    '/admin/pdv/nova-venda': 'PDV — Ponto de Venda para registro de vendas presenciais.',
    '/admin/marketing': 'Marketing — campanhas e promoções.',
    '/admin/analytics': 'Analytics — análises avançadas de performance de produtos.',
};

function getScreenContext(pathname: string): string {
    // Procura a rota mais específica que corresponde
    const sortedRoutes = Object.keys(ROUTE_CONTEXT).sort((a, b) => b.length - a.length);
    for (const route of sortedRoutes) {
        if (pathname.startsWith(route)) {
            return ROUTE_CONTEXT[route];
        }
    }
    return 'Página do sistema GrauOS (rota: ' + pathname + ')';
}

/** Mini Markdown → JSX renderer (zero deps) */
function renderMarkdown(text: string) {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: React.ReactNode[] = [];
    let listType: 'ul' | 'ol' | null = null;

    const flushList = () => {
        if (listItems.length > 0 && listType) {
            const Tag = listType;
            elements.push(
                <Tag key={`list-${elements.length}`} className={`${listType === 'ul' ? 'list-disc' : 'list-decimal'} pl-4 space-y-0.5 my-1`}>
                    {listItems}
                </Tag>
            );
            listItems = [];
            listType = null;
        }
    };

    const inlineFormat = (str: string): React.ReactNode[] => {
        const parts: React.ReactNode[] = [];
        const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(str)) !== null) {
            if (match.index > lastIndex) {
                parts.push(str.slice(lastIndex, match.index));
            }
            if (match[2]) {
                parts.push(<strong key={`b-${match.index}`} className="font-bold">{match[2]}</strong>);
            } else if (match[3]) {
                parts.push(<em key={`i-${match.index}`}>{match[3]}</em>);
            }
            lastIndex = regex.lastIndex;
        }
        if (lastIndex < str.length) {
            parts.push(str.slice(lastIndex));
        }
        return parts.length > 0 ? parts : [str];
    };

    lines.forEach((line, i) => {
        const trimmed = line.trim();

        const bulletMatch = trimmed.match(/^[\*\-]\s+(.+)/);
        const numMatch = trimmed.match(/^\d+\.\s+(.+)/);

        if (bulletMatch) {
            if (listType !== 'ul') flushList();
            listType = 'ul';
            listItems.push(<li key={`li-${i}`}>{inlineFormat(bulletMatch[1])}</li>);
        } else if (numMatch) {
            if (listType !== 'ol') flushList();
            listType = 'ol';
            listItems.push(<li key={`li-${i}`}>{inlineFormat(numMatch[1])}</li>);
        } else {
            flushList();
            if (trimmed === '') {
                elements.push(<div key={`br-${i}`} className="h-2" />);
            } else {
                elements.push(<p key={`p-${i}`} className="my-0.5">{inlineFormat(trimmed)}</p>);
            }
        }
    });

    flushList();
    return <div className="space-y-0.5">{elements}</div>;
}

// ─── Web Speech API hooks ───
function useSpeechRecognition() {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef<any>(null);

    const startListening = useCallback(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.interimResults = true;
        recognition.continuous = false;

        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                finalTranscript += event.results[i][0].transcript;
            }
            setTranscript(finalTranscript);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.onerror = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
        setTranscript('');
    }, []);

    const stopListening = useCallback(() => {
        recognitionRef.current?.stop();
        setIsListening(false);
    }, []);

    return { isListening, transcript, startListening, stopListening };
}

function speakText(text: string, onEnd?: () => void) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); // para qualquer fala em andamento

    // Limpa markdown do texto para fala natural
    const cleanText = text
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/^[\*\-]\s+/gm, '')
        .replace(/^\d+\.\s+/gm, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.05;
    utterance.pitch = 1;
    if (onEnd) utterance.onend = onEnd;

    // Tenta pegar uma voz brasileira
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang.startsWith('pt'));
    if (ptVoice) utterance.voice = ptVoice;

    window.speechSynthesis.speak(utterance);
}

export default function CopilotPanel() {
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [ttsEnabled, setTtsEnabled] = useState(false);
    const [messages, setMessages] = useState<CopilotMessage[]>([
        {
            id: 'msg-1',
            role: 'assistant',
            content: 'Olá! Sou o Gerente Virtual do GrauOS. Posso ajudar com análises do caixa, estoque, vendas ou orientações sobre a tela atual. Fale ou digite sua pergunta!',
            timestamp: new Date()
        }
    ]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { isListening, transcript, startListening, stopListening } = useSpeechRecognition();

    // Sincroniza transcrição de voz com o input
    useEffect(() => {
        if (transcript) setInputValue(transcript);
    }, [transcript]);

    // Envia automaticamente quando parar de ouvir (se tiver texto)
    useEffect(() => {
        if (!isListening && transcript.trim()) {
            // Pequeno delay para o usuário ver o que falou
            const timer = setTimeout(() => handleSend(), 400);
            return () => clearTimeout(timer);
        }
    }, [isListening, transcript]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        const text = inputValue.trim();
        if (!text || isLoading) return;

        const userMessage: CopilotMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            timestamp: new Date()
        };

        const conversationHistory = [...messages, userMessage];
        setMessages(conversationHistory);
        setInputValue('');
        setIsLoading(true);

        try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

            const { data: sessionData } = await supabase.auth.getSession();
            const accessToken = sessionData?.session?.access_token;

            // Contexto de tela atual
            const screenContext = getScreenContext(location.pathname);

            const response = await fetch(`${supabaseUrl}/functions/v1/copilot-chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                    ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
                },
                body: JSON.stringify({
                    messages: conversationHistory.map(m => ({
                        role: m.role,
                        content: m.content
                    })),
                    context: {
                        current_screen: screenContext,
                        current_route: location.pathname,
                        timestamp: new Date().toISOString()
                    }
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || `Erro do servidor (${response.status})`);
            }

            if (data && data.content) {
                const assistantMessage: CopilotMessage = {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: data.content,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, assistantMessage]);

                // TTS: Lê a resposta em voz alta se habilitado
                if (ttsEnabled) {
                    speakText(data.content);
                }
            }
        } catch (err: any) {
            console.error("Erro ao falar com o Gerente Virtual:", err);
            const errorMessage: CopilotMessage = {
                id: Date.now().toString(),
                role: 'assistant',
                content: 'Houve um erro de conexão com o meu cérebro (Motor de IA). Detalhe: ' + (err?.message || 'Erro Desconhecido'),
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const toggleVoice = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    return (
        <>
            {/* Floating Action Button */}
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
                            <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 border-2 border-white dark:border-[#1A1A24] rounded-full animate-pulse shadow-sm shadow-red-500/50 z-10"></span>
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Panel */}
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
                        {/* Header */}
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
                                        <span className={`h-2 w-2 rounded-full ${isLoading ? 'bg-amber-500 animate-pulse' : 'bg-green-500'} shadow-[0_0_8px_rgb(34,197,94,0.5)]`}></span>
                                        <span className="text-[10px] uppercase font-medium tracking-wider text-gray-500 dark:text-white/50">
                                            {isLoading ? 'Analisando...' : isListening ? '🎤 Ouvindo...' : 'Online e Pronto'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {/* TTS Toggle */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-8 w-8 rounded-full ${ttsEnabled ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/20' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'}`}
                                    onClick={() => {
                                        setTtsEnabled(!ttsEnabled);
                                        if (ttsEnabled) window.speechSynthesis.cancel();
                                    }}
                                    title={ttsEnabled ? 'Desativar voz' : 'Ativar resposta por voz'}
                                >
                                    {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                                </Button>
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
                                    onClick={() => {
                                        setIsOpen(false);
                                        window.speechSynthesis.cancel();
                                    }}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Screen Context Pill */}
                        <div className="px-4 py-2 bg-indigo-50/50 dark:bg-indigo-500/5 border-b border-indigo-100/50 dark:border-indigo-500/10">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500/70 dark:text-indigo-400/50">
                                📍 Tela Atual: {getScreenContext(location.pathname).split('—')[0].trim()}
                            </p>
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
                                                    {isUser ? msg.content : renderMarkdown(msg.content)}
                                                </div>
                                                <span className="text-[10px] font-medium text-gray-400 dark:text-white/40 mt-1 px-1">
                                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </motion.div>
                                    );
                                })}

                                {/* Loading indicator */}
                                {isLoading && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                                        <div className="h-8 w-8 flex-shrink-0 rounded-full bg-white border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden flex items-center justify-center">
                                            <img src={logoCircular} alt="IA" className="h-[130%] w-[130%] object-cover p-0.5" />
                                        </div>
                                        <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white dark:bg-white/10 border border-gray-100 dark:border-white/5 shadow-sm">
                                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                                                <span className="animate-pulse">Consultando dados...</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>

                        {/* Suggestion Chips */}
                        <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide border-t border-gray-100 dark:border-white/5">
                            {[
                                "📈 Resumo do DRE",
                                "💰 Qual meu saldo?",
                                "🏪 O que devo fazer nessa tela?",
                                "👥 Quem está devendo?"
                            ].map((suggestion, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setInputValue(suggestion.replace(/^[\p{Emoji}\s]+/gu, ''));
                                        // Auto-send
                                        setTimeout(() => {
                                            const input = document.getElementById('copilot-input') as HTMLInputElement;
                                            if (input) {
                                                input.form?.requestSubmit();
                                            }
                                        }, 100);
                                    }}
                                    className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white dark:bg-white/5 border border-gray-200/50 dark:border-white/10 text-xs font-medium text-gray-600 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-sm"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white/50 dark:bg-black/40 border-t border-gray-100 dark:border-white/10 backdrop-blur-xl">
                            <div className="relative flex items-center gap-2">
                                {/* Mic Button */}
                                <Button
                                    onClick={toggleVoice}
                                    size="icon"
                                    className={`h-10 w-10 rounded-xl flex-shrink-0 transition-all ${isListening
                                        ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 animate-pulse'
                                        : 'bg-gray-100 dark:bg-white/10 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 text-gray-600 dark:text-gray-300 hover:text-indigo-600'
                                        }`}
                                    title={isListening ? 'Parar de ouvir' : 'Falar por voz'}
                                >
                                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                </Button>

                                <div className="relative flex-1">
                                    <input
                                        id="copilot-input"
                                        type="text"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder={isListening ? '🎤 Fale agora...' : 'Pergunte ao Gerente Virtual...'}
                                        disabled={isLoading}
                                        className="w-full h-12 rounded-xl border border-gray-200 dark:border-white/20 bg-white/80 dark:bg-white/5 pl-4 pr-12 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-shadow shadow-inner disabled:opacity-50"
                                    />
                                    <Button
                                        onClick={handleSend}
                                        size="icon"
                                        disabled={!inputValue.trim() || isLoading}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white shadow-md disabled:bg-gray-300 dark:disabled:bg-white/10 disabled:text-gray-500 transition-colors"
                                    >
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                            <div className="text-center mt-2">
                                <span className="text-[10px] text-gray-400 dark:text-white/30 font-medium tracking-wide">
                                    {isListening ? '🔴 Ouvindo... Fale sua pergunta' : 'O Copiloto pode cometer erros. Verifique informações vitais.'}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
