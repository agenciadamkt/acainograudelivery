import { useState, useRef, useEffect } from 'react';
import { GrauOSLayout } from '@/components/admin/GrauOSLayout';
import {
    Bot,
    Send,
    Sparkles,
    TrendingUp,
    DollarSign,
    Megaphone,
    ChefHat,
    Lightbulb,
    User,
    Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Message {
    id: string;
    role: 'user' | 'bot';
    content: string;
    timestamp: Date;
}

const quickSuggestions = [
    { label: '📈 Como aumentar meu faturamento?', icon: TrendingUp },
    { label: '🍦 Dicas para reduzir o CMV', icon: DollarSign },
    { label: '📣 Ideias de marketing local', icon: Megaphone },
    { label: '👨‍🍳 Melhorar tempo de preparo', icon: ChefHat },
];

// Simulated AI responses based on keywords
function getAIResponse(userMessage: string): string {
    const msg = userMessage.toLowerCase();

    if (msg.includes('faturamento') || msg.includes('venda') || msg.includes('vender')) {
        return `📈 **Estratégias para aumentar o faturamento:**\n\n1. **Combos inteligentes** — Crie combos com itens de alta margem (ex.: Açaí 500ml + complemento premium). Isso pode aumentar o ticket médio em até 25%.\n\n2. **Horários de pico** — Analise seus dados de performance e reforce a equipe nos horários com mais demanda. Menos espera = mais vendas.\n\n3. **Cross-selling no PDV** — Treine sua equipe para sugerir complementos: "Aceita adicionar granola crocante por apenas R$ 3,00?"\n\n4. **Delivery ampliado** — Considere ampliar seu raio de entrega em horários de baixo movimento.\n\n5. **Programa de fidelidade** — Clientes que retornam representam 60% da receita média das unidades top da rede.\n\n💡 *Dica: Sua unidade está 13% abaixo da meta. Foque em aumentar o ticket médio, que hoje está em R$ 42,80 (meta: R$ 45,00).*`;
    }

    if (msg.includes('cmv') || msg.includes('custo') || msg.includes('margem')) {
        return `💰 **Dicas para otimizar seu CMV:**\n\n1. **Controle de porções** — Padronize utensílios de medida. Variações de 10g por açaí = R$ 2.000/mês de diferença.\n\n2. **Inventário semanal** — Faça contagens parciais toda semana, não apenas no final do mês. Identifique perdas rápido.\n\n3. **FIFO rigoroso** — Primeiro que entra, primeiro que sai. Perdas por vencimento são o vilão silencioso do CMV.\n\n4. **Negociação com fornecedores** — Compras em grupo com outras unidades da rede podem gerar até 12% de desconto.\n\n5. **Ficha técnica atualizada** — Revise receitas trimestralmente. Preços de insumos mudam!\n\n✅ *Seu CMV atual: 32% — dentro da meta (< 35%). Parabéns! Continue monitorando.*`;
    }

    if (msg.includes('marketing') || msg.includes('divulga') || msg.includes('cliente')) {
        return `📣 **Estratégias de Marketing Local:**\n\n1. **Instagram Reels** — Vídeos curtos mostrando a montagem do açaí performam 3x mais que fotos estáticas.\n\n2. **Parcerias locais** — Academias, escolas e escritórios próximos. Ofereça desconto corporativo para delivery.\n\n3. **Eventos sazonais** — Dia do Açaí, aniversário da loja, datas comemorativas. Crie promoções temáticas.\n\n4. **Google Meu Negócio** — Mantenha atualizado com fotos, horários e responda TODAS as avaliações.\n\n5. **Remarketing** — Use o módulo de Marketing do GrauOS para reengajar clientes inativos automaticamente.\n\n🎯 *Dica: Unidades que investem em marketing local têm em média 23% mais faturamento que as que não investem.*`;
    }

    if (msg.includes('preparo') || msg.includes('tempo') || msg.includes('velocidade')) {
        return `⚡ **Melhorar o tempo de preparo:**\n\n1. **Mise en place** — Todo topping já porcionado antes do rush. Economia média: 45 segundos por pedido.\n\n2. **Fluxo de montagem** — Organize a bancada em sequência lógica: base → recheio → cobertura → finalização.\n\n3. **KDS configurado** — Use o KDS do GrauOS para priorizar pedidos por tipo (balcão vs delivery).\n\n4. **Treinamento contínuo** — O módulo de Universidade tem a trilha "Montagem de Açaí" com 20 aulas práticas.\n\n5. **Indicadores** — Monitore o tempo médio por pedido no Dashboard. A meta da rede é 4 minutos.\n\n⏱️ *Seu tempo médio atual: dados disponíveis no Dashboard Operacional.*`;
    }

    return `Olá! 👋 Sou o **GrauBot**, seu assistente especializado em franquias Açaí no Grau.\n\nPosso te ajudar com:\n\n- 📈 **Vendas** — Estratégias para aumentar faturamento e ticket médio\n- ⚙️ **Operação** — Padronização, estoque, preparo\n- 📣 **Marketing** — Ideias para atrair e reter clientes\n- 💰 **Financeiro** — CMV, margens, fluxo de caixa\n\nMe faça uma pergunta sobre qualquer um desses temas! Estou online 24/7 para te auxiliar. 🚀`;
}

function ChatBubble({ message }: { message: Message }) {
    const isBot = message.role === 'bot';

    return (
        <div className={`flex gap-3 ${isBot ? '' : 'flex-row-reverse'}`}>
            {/* Avatar */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isBot
                ? 'bg-gradient-to-br from-purple-600 to-indigo-500'
                : 'bg-white/10'
                }`}>
                {isBot ? <Bot className="h-4 w-4 text-white" /> : <User className="h-4 w-4 text-white/60" />}
            </div>

            {/* Bubble */}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm dark:shadow-none ${isBot
                ? 'bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08]'
                : 'bg-purple-100 dark:bg-purple-600/20 border border-transparent dark:border-purple-500/20'
                }`}>
                <div className="text-sm text-gray-800 dark:text-white/80 leading-relaxed whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{
                        __html: message.content
                            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900 dark:text-white font-semibold">$1</strong>')
                            .replace(/\n/g, '<br/>')
                    }}
                />
                <p className="text-[10px] text-gray-400 dark:text-white/20 mt-2">
                    {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
    );
}

export default function AssistentePage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '0',
            role: 'bot',
            content: 'Olá! 👋 Sou o **GrauBot**, seu assistente especializado em franquias Açaí no Grau.\n\nPosso te ajudar com:\n\n- 📈 **Vendas** — Estratégias para aumentar faturamento e ticket médio\n- ⚙️ **Operação** — Padronização, estoque, preparo\n- 📣 **Marketing** — Ideias para atrair e reter clientes\n- 💰 **Financeiro** — CMV, margens, fluxo de caixa\n\nMe faça uma pergunta sobre qualquer um desses temas! 🚀',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (text?: string) => {
        const messageText = text || input.trim();
        if (!messageText) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: messageText,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);

        // Simulate AI thinking delay
        setTimeout(() => {
            const botResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'bot',
                content: getAIResponse(messageText),
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botResponse]);
            setIsTyping(false);
        }, 1200 + Math.random() * 800);
    };

    return (
        <GrauOSLayout>
            <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
                {/* Chat Header */}
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-white/5 bg-white/50 dark:bg-transparent backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-500 shadow-lg shadow-purple-500/20">
                                <Bot className="h-6 w-6 text-white" />
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-white dark:border-[#0F0F14]" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-900 dark:text-white">GrauBot</h3>
                            <p className="text-xs text-green-600 dark:text-green-400 font-medium">Online — Pronto para ajudar</p>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5 scrollbar-hide">
                    {messages.map(msg => (
                        <ChatBubble key={msg.id} message={msg} />
                    ))}

                    {isTyping && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-indigo-500">
                                <Bot className="h-4 w-4 text-white" />
                            </div>
                            <div className="bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] rounded-2xl px-4 py-3 shadow-sm dark:shadow-none">
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 text-purple-500 dark:text-purple-400 animate-spin" />
                                    <span className="text-sm text-gray-500 dark:text-white/40">Pensando...</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Quick Suggestions */}
                {messages.length <= 1 && (
                    <div className="px-4 sm:px-6 pb-3">
                        <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="h-3.5 w-3.5 text-gray-400 dark:text-white/30" />
                            <span className="text-xs text-gray-500 dark:text-white/30 font-medium">Sugestões rápidas</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {quickSuggestions.map(s => (
                                <button
                                    key={s.label}
                                    onClick={() => handleSend(s.label)}
                                    className="px-3 py-1.5 rounded-full text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white/80 transition-all hover:scale-[1.02] shadow-sm dark:shadow-none"
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input */}
                <div className="px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01]">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSend();
                        }}
                        className="flex items-center gap-2"
                    >
                        <Input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Pergunte ao GrauBot..."
                            disabled={isTyping}
                            className="flex-1 bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 h-11 rounded-xl focus:ring-purple-500/20 focus:border-purple-500/30 shadow-sm dark:shadow-none"
                        />
                        <Button
                            type="submit"
                            disabled={!input.trim() || isTyping}
                            size="icon"
                            className="h-11 w-11 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 shadow-lg shadow-purple-500/20 disabled:opacity-30"
                        >
                            <Send className="h-4 w-4 text-white" />
                        </Button>
                    </form>
                    <p className="text-[10px] text-gray-400 dark:text-white/20 text-center mt-2">
                        GrauBot pode cometer erros. Verifique informações importantes.
                    </p>
                </div>
            </div>
        </GrauOSLayout>
    );
}
