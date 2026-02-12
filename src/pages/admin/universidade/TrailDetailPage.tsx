'use client';

import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
    ChevronLeft,
    ChevronRight,
    Play,
    Star,
    Clock,
    BookOpen,
    Send,
    MessageCircle,
    FileText,
    ExternalLink,
    Download,
    HelpCircle,
    CheckCircle2,
    Bell,
    Moon,
    Sun,
} from 'lucide-react';
import logoCircular from '@/assets/logo-circular.png';

/* Trail thumbnail images */
import imgAberturaLoja from '@/assets/trails/abertura-loja.png';
import imgFechamentoCaixa from '@/assets/trails/fechamento-caixa.png';
import imgAtendimento from '@/assets/trails/atendimento.png';
import imgUsoPdv from '@/assets/trails/uso-pdv.png';
import imgEstoque from '@/assets/trails/estoque.png';
import imgHigiene from '@/assets/trails/higiene.png';
import imgMontagemAcai from '@/assets/trails/montagem-acai.png';
import imgDelivery from '@/assets/trails/delivery.png';
import imgMarketing from '@/assets/trails/marketing.png';
import imgRedesSociais from '@/assets/trails/redes-sociais.png';
import imgUpselling from '@/assets/trails/upselling.png';
import imgCmv from '@/assets/trails/cmv.png';
import imgFluxoCaixa from '@/assets/trails/fluxo-caixa.png';
import imgLideranca from '@/assets/trails/lideranca.png';
import imgCardapioSazonal from '@/assets/trails/cardapio-sazonal.png';

/* ══════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════ */

interface Lesson {
    id: string;
    title: string;
    subtitle: string;
    duration: string;
    videoUrl: string; // YouTube embed URL
    completed: boolean;
    description: string;
    materials: Material[];
    links: LinkItem[];
    questions: Question[];
}

interface Material {
    id: string;
    name: string;
    type: 'pdf' | 'doc' | 'xls' | 'img';
    size: string;
}

interface LinkItem {
    id: string;
    title: string;
    url: string;
    description: string;
}

interface Question {
    id: string;
    author: string;
    avatar: string;
    date: string;
    text: string;
    replies: { author: string; text: string; date: string }[];
}

interface Trail {
    id: string;
    title: string;
    description: string;
    lessons: Lesson[];
    thumbnail: string;
    color: string;
    totalDuration: string;
    progress: number;
    category: string;
    level: string;
}

/* ══════════════════════════════════════════════════
   MOCK DATA — Trilhas com aulas detalhadas
   ══════════════════════════════════════════════════ */

const trailsData: Record<string, Trail> = {
    '1': {
        id: '1', title: 'Abertura da Loja', description: 'Procedimentos diários de abertura, checklist e rotinas matinais para garantir que a loja funcione perfeitamente desde o primeiro minuto.',
        thumbnail: imgAberturaLoja, color: '#e50914', totalDuration: '45min', progress: 100, category: 'onboarding', level: 'Básico',
        lessons: [
            {
                id: '1-1', title: 'Checklist de Abertura', subtitle: 'Lista completa de verificação matinal', duration: '6 min',
                videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', completed: true,
                description: 'Nesta aula, você aprenderá o checklist completo de abertura da loja. Desde ligar os equipamentos até conferir o estoque de insumos do dia. Cada etapa é fundamental para garantir uma operação suave durante todo o expediente.',
                materials: [
                    { id: 'm1', name: 'Checklist de Abertura.pdf', type: 'pdf', size: '340 KB' },
                    { id: 'm2', name: 'Planilha de Conferência.xls', type: 'xls', size: '120 KB' },
                ],
                links: [
                    { id: 'l1', title: 'Manual de Operações — Cap. 1', url: '#', description: 'Referência completa sobre abertura' },
                    { id: 'l2', title: 'Vídeo complementar no YouTube', url: '#', description: 'Tutorial adicional' },
                ],
                questions: [
                    {
                        id: 'q1', author: 'Maria Silva', avatar: 'MS', date: '3 dias atrás',
                        text: 'Quanto tempo antes do horário de abertura devo chegar?',
                        replies: [{ author: 'Suporte Grau', text: 'Recomendamos chegar pelo menos 30 minutos antes do horário oficial de abertura.', date: '2 dias atrás' }]
                    },
                ],
            },
            {
                id: '1-2', title: 'Ligando os Equipamentos', subtitle: 'Ordem correta de ativação dos equipamentos', duration: '5 min',
                videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', completed: true,
                description: 'Aprenda a ordem correta de ativação dos equipamentos: máquinas de açaí, freezers, caixa registradora, impressoras e telas de pedido. A sequência correta evita picos de energia e danos.',
                materials: [
                    { id: 'm3', name: 'Diagrama de Equipamentos.pdf', type: 'pdf', size: '560 KB' },
                ],
                links: [
                    { id: 'l3', title: 'Suporte técnico equipamentos', url: '#', description: 'Contato do fornecedor' },
                ],
                questions: [],
            },
            {
                id: '1-3', title: 'Conferência de Estoque', subtitle: 'Verificação rápida dos insumos do dia', duration: '7 min',
                videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', completed: true,
                description: 'Saiba como realizar a conferência rápida de estoque pela manhã: polpas de açaí, frutas, granola, leite condensado, complementos e embalagens. Registre no sistema para manter o controle atualizado.',
                materials: [
                    { id: 'm4', name: 'Lista de Insumos Padrão.pdf', type: 'pdf', size: '210 KB' },
                    { id: 'm5', name: 'Template de Conferência.doc', type: 'doc', size: '85 KB' },
                ],
                links: [],
                questions: [],
            },
            {
                id: '1-4', title: 'Higienização Inicial', subtitle: 'Limpeza padrão pré-operação', duration: '6 min',
                videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', completed: true,
                description: 'A higienização inicial é obrigatória antes de qualquer manipulação de alimentos. Aprenda o protocolo de limpeza de bancadas, utensílios e máquinas.',
                materials: [],
                links: [
                    { id: 'l4', title: 'Normas ANVISA — BPF', url: '#', description: 'Legislação vigente' },
                ],
                questions: [],
            },
            {
                id: '1-5', title: 'Preparação do Caixa', subtitle: 'Abertura do sistema de vendas', duration: '5 min',
                videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', completed: true,
                description: 'Configure o caixa para o dia: fundo de troco, login no sistema PDV, teste de impressora de recibos e conferência de maquininhas de cartão.',
                materials: [
                    { id: 'm6', name: 'Tutorial PDV - Abertura.pdf', type: 'pdf', size: '420 KB' },
                ],
                links: [],
                questions: [
                    {
                        id: 'q2', author: 'João Pedro', avatar: 'JP', date: '1 semana atrás',
                        text: 'Qual o valor padrão de fundo de troco?',
                        replies: [{ author: 'Suporte Grau', text: 'O valor padrão é R$ 200,00, mas pode variar conforme orientação do gerente da unidade.', date: '6 dias atrás' }]
                    }
                ],
            },
            {
                id: '1-6', title: 'Montagem do Balcão', subtitle: 'Disposição de toppings e complementos', duration: '5 min',
                videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', completed: true,
                description: 'Como montar o balcão de atendimento seguindo o padrão visual da franquia. Disposição de toppings, complementos e frutas de forma atrativa e higiênica.',
                materials: [],
                links: [],
                questions: [],
            },
            {
                id: '1-7', title: 'Configuração Delivery', subtitle: 'Ativando apps e conferindo cardápio', duration: '6 min',
                videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', completed: true,
                description: 'Ative os apps de delivery (iFood, PedeGrau), confira se o cardápio digital está atualizado e verifique os horários de funcionamento.',
                materials: [
                    { id: 'm7', name: 'Guia de Configuração iFood.pdf', type: 'pdf', size: '380 KB' },
                ],
                links: [
                    { id: 'l5', title: 'Portal PedeGrau', url: '#', description: 'Acesse o painel de delivery' },
                ],
                questions: [],
            },
            {
                id: '1-8', title: 'Briefing com a Equipe', subtitle: 'Alinhamento matinal com o time', duration: '5 min',
                videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', completed: true,
                description: 'O briefing matinal é essencial para alinhar metas do dia, promoções ativas, escalas e qualquer informação relevante com toda a equipe.',
                materials: [],
                links: [],
                questions: [],
            },
        ],
    },
    '2': {
        id: '2', title: 'Fechamento de Caixa', description: 'Rotina de encerramento do dia: conferência, sangria e relatório.',
        thumbnail: imgFechamentoCaixa, color: '#e87c03', totalDuration: '30min', progress: 60, category: 'onboarding', level: 'Básico',
        lessons: [
            { id: '2-1', title: 'Conferência do Caixa', subtitle: 'Contagem e verificação', duration: '5 min', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', completed: true, description: 'Aprenda o processo completo de conferência do caixa ao final do dia.', materials: [{ id: 'm8', name: 'Planilha de Fechamento.xls', type: 'xls', size: '90 KB' }], links: [], questions: [] },
            { id: '2-2', title: 'Sangria e Suprimento', subtitle: 'Movimentações de caixa', duration: '5 min', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', completed: true, description: 'Como registrar sangrias e suprimentos corretamente no sistema.', materials: [], links: [], questions: [] },
            { id: '2-3', title: 'Relatório Diário', subtitle: 'Gerando o relatório de fechamento', duration: '5 min', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', completed: true, description: 'Gere e confira o relatório diário de vendas, formas de pagamento e divergências.', materials: [{ id: 'm9', name: 'Modelo de Relatório.pdf', type: 'pdf', size: '150 KB' }], links: [], questions: [] },
            { id: '2-4', title: 'Depósito e Segurança', subtitle: 'Procedimentos de segurança financeira', duration: '5 min', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', completed: false, description: 'Regras de segurança para transporte e depósito de valores.', materials: [], links: [{ id: 'l6', title: 'Política de Segurança', url: '#', description: 'Documento interno' }], questions: [] },
            { id: '2-5', title: 'Limpeza e Fechamento', subtitle: 'Encerramento da operação', duration: '5 min', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', completed: false, description: 'Protocolo de limpeza e desligamento dos equipamentos ao final do dia.', materials: [], links: [], questions: [] },
            { id: '2-6', title: 'Revisão Final', subtitle: 'Checklist de saída', duration: '5 min', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', completed: false, description: 'Checklist final antes de fechar a loja: alarme, chaves, equipamentos desligados.', materials: [{ id: 'm10', name: 'Checklist de Saída.pdf', type: 'pdf', size: '180 KB' }], links: [], questions: [] },
        ],
    },
    '3': {
        id: '3', title: 'Padrão de Atendimento', description: 'Como encantar cada cliente com o padrão Açaí no Grau.',
        thumbnail: imgAtendimento, color: '#46d369', totalDuration: '1h', progress: 25, category: 'onboarding', level: 'Básico',
        lessons: [
            { id: '3-1', title: 'Boas-vindas ao Cliente', subtitle: 'Primeiro contato encantador', duration: '6 min', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', completed: true, description: 'Como receber o cliente com excelência desde o primeiro momento.', materials: [], links: [], questions: [] },
            { id: '3-2', title: 'Conhecendo o Cardápio', subtitle: 'Domine todas as opções', duration: '8 min', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', completed: true, description: 'Conheça cada produto, tamanho e combinação do cardápio para orientar o cliente.', materials: [{ id: 'm11', name: 'Cardápio Completo.pdf', type: 'pdf', size: '2.4 MB' }], links: [], questions: [] },
            { id: '3-3', title: 'Sugestão de Produtos', subtitle: 'Técnica de venda consultiva', duration: '6 min', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', completed: false, description: 'Técnicas sutis para sugerir adicionais e aumentar o ticket médio.', materials: [], links: [], questions: [] },
            { id: '3-4', title: 'Lidando com Reclamações', subtitle: 'Transformando problemas em oportunidades', duration: '8 min', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', completed: false, description: 'Como lidar com reclamações de forma profissional e empática.', materials: [], links: [], questions: [] },
        ],
    },
    '7': {
        id: '7', title: 'Montagem de Açaí', description: 'Padrão de montagem das receitas, proporções e apresentação perfeita.',
        thumbnail: imgMontagemAcai, color: '#8D42DD', totalDuration: '2h30', progress: 0, category: 'operacao', level: 'Básico',
        lessons: [
            { id: '7-1', title: 'Cadastros de Ingredientes', subtitle: 'Cadastros de Ingredientes', duration: '2 min', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', completed: false, description: 'Cadastre todos os ingredientes da sua receita no sistema. Aprenda a configurar categorias, quantidades e custos para manter o controle completo dos insumos.', materials: [{ id: 'm12', name: 'Lista Padrão Ingredientes.pdf', type: 'pdf', size: '280 KB' }, { id: 'm13', name: 'Tabela de Custo por Kg.xls', type: 'xls', size: '95 KB' }], links: [{ id: 'l7', title: 'Acesso ao Painel de Ingredientes', url: '/admin/menu/ingredients', description: 'Cadastre diretamente no sistema' }], questions: [] },
            { id: '7-2', title: 'Cadastro de Produtos', subtitle: 'Criando produtos no sistema', duration: '2 min', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', completed: false, description: 'Aprenda a criar e configurar produtos no cardápio digital: fotos, preços, tamanhos e opções de personalização.', materials: [{ id: 'm14', name: 'Guia de Fotos de Produto.pdf', type: 'pdf', size: '1.2 MB' }], links: [{ id: 'l8', title: 'Painel de Produtos', url: '/admin/menu/products', description: 'Gerencie seus produtos' }], questions: [] },
        ],
    },
};

/* Fallback para trilhas não definidas detalhadamente */
function getTrailData(id: string): Trail {
    if (trailsData[id]) return trailsData[id];

    const trailMap: Record<string, { title: string; thumbnail: string; color: string; desc: string }> = {
        '4': { title: 'Uso do PDV', thumbnail: imgUsoPdv, color: '#2196f3', desc: 'Domine o sistema de vendas.' },
        '5': { title: 'Gestão de Estoque', thumbnail: imgEstoque, color: '#9c27b0', desc: 'Controle de insumos.' },
        '6': { title: 'Higiene e BPF', thumbnail: imgHigiene, color: '#00bcd4', desc: 'Boas Práticas de Fabricação.' },
        '8': { title: 'Delivery Perfeito', thumbnail: imgDelivery, color: '#ff5722', desc: 'Delivery com qualidade.' },
        '9': { title: 'Marketing Local', thumbnail: imgMarketing, color: '#f44336', desc: 'Estratégias de marketing regional.' },
        '10': { title: 'Redes Sociais', thumbnail: imgRedesSociais, color: '#e91e63', desc: 'Conteúdo que engaja e vende.' },
        '11': { title: 'Upselling & Cross', thumbnail: imgUpselling, color: '#ff9800', desc: 'Aumente o ticket médio.' },
        '12': { title: 'CMV e Precificação', thumbnail: imgCmv, color: '#4caf50', desc: 'Custos e margens.' },
        '13': { title: 'Fluxo de Caixa', thumbnail: imgFluxoCaixa, color: '#03a9f4', desc: 'Controle financeiro.' },
        '14': { title: 'Liderança no Grau', thumbnail: imgLideranca, color: '#ffc107', desc: 'Gestão de equipe.' },
        '15': { title: 'Cardápio Sazonal', thumbnail: imgCardapioSazonal, color: '#e040fb', desc: 'Produtos temporários.' },
    };

    const fallback = trailMap[id] || { title: 'Trilha', thumbnail: imgAberturaLoja, color: '#e50914', desc: 'Conteúdo em breve.' };

    return {
        id,
        title: fallback.title,
        description: fallback.desc,
        thumbnail: fallback.thumbnail,
        color: fallback.color,
        totalDuration: '30min',
        progress: 0,
        category: 'geral',
        level: 'Básico',
        lessons: [
            {
                id: `${id}-1`, title: 'Introdução', subtitle: `Introdução ao módulo ${fallback.title}`, duration: '5 min',
                videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', completed: false,
                description: `Aula introdutória sobre ${fallback.title}. Conteúdo detalhado será adicionado em breve.`,
                materials: [], links: [], questions: [],
            },
            {
                id: `${id}-2`, title: 'Conceitos Fundamentais', subtitle: `Bases de ${fallback.title}`, duration: '8 min',
                videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', completed: false,
                description: `Conceitos fundamentais sobre ${fallback.title} aplicados à operação da franquia.`,
                materials: [], links: [], questions: [],
            },
        ],
    };
}

/* ══════════════════════════════════════════════════
   TAB TYPES
   ══════════════════════════════════════════════════ */

type TabId = 'descricao' | 'materiais' | 'links' | 'perguntas';

const tabLabels: Record<TabId, string> = {
    descricao: 'Descrição',
    materiais: 'Materiais',
    links: 'Links',
    perguntas: 'Perguntas',
};

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════ */

export default function TrailDetailPage() {
    const navigate = useNavigate();
    const { trailId } = useParams<{ trailId: string }>();
    const { user } = useAuth();

    const trail = getTrailData(trailId || '1');
    const [currentLessonIdx, setCurrentLessonIdx] = useState(0);
    const [activeTab, setActiveTab] = useState<TabId>('descricao');
    const [questionText, setQuestionText] = useState('');
    const [favorited, setFavorited] = useState<Record<string, boolean>>({});

    const currentLesson = trail.lessons[currentLessonIdx];
    const completedCount = trail.lessons.filter(l => l.completed).length;
    const progressPercent = Math.round((completedCount / trail.lessons.length) * 100);

    const goToLesson = (idx: number) => {
        if (idx >= 0 && idx < trail.lessons.length) {
            setCurrentLessonIdx(idx);
            setActiveTab('descricao');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const toggleFavorite = (lessonId: string) => {
        setFavorited(prev => ({ ...prev, [lessonId]: !prev[lessonId] }));
    };

    const fileIcon = (type: string) => {
        switch (type) {
            case 'pdf': return '📄';
            case 'doc': return '📝';
            case 'xls': return '📊';
            case 'img': return '🖼️';
            default: return '📎';
        }
    };

    return (
        <div className="min-h-screen bg-[#141414] text-white" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
            {/* Hide scrollbar */}
            <style>{`
                *::-webkit-scrollbar { display: none; }
                * { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {/* ═══════════════════════════════════════════
                TOP NAVBAR
               ═══════════════════════════════════════════ */}
            <nav className="sticky top-0 z-50 flex items-center justify-between h-14 px-4 md:px-8 bg-[#141414] border-b border-[#2a2a2a]">
                <div className="flex items-center gap-4">
                    <img src={logoCircular} alt="" className="h-7 w-7" />
                    <span className="text-sm font-semibold text-white/90 hidden sm:block">Dashboard</span>
                </div>
                <div className="flex items-center gap-4">
                    <button className="text-white/60 hover:text-white transition-colors">
                        <Bell className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-white/80 hidden sm:block">{user?.email?.split('@')[0] || 'Usuário'}</span>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold">
                            {user?.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                    </div>
                </div>
            </nav>

            {/* ═══════════════════════════════════════════
                BACK BUTTON
               ═══════════════════════════════════════════ */}
            <div className="px-4 md:px-8 pt-5 pb-2">
                <button
                    onClick={() => navigate('/admin/universidade')}
                    className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors group"
                >
                    <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                    Voltar para cursos
                </button>
            </div>

            {/* ═══════════════════════════════════════════
                TRAIL HEADER
               ═══════════════════════════════════════════ */}
            <div className="px-4 md:px-8 pb-4">
                <h1 className="text-xl md:text-2xl font-bold text-white mb-2">{trail.title}</h1>
                <div className="flex items-center gap-4 text-sm text-white/60">
                    <span className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        {trail.lessons.length} aulas
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {trail.totalDuration}
                    </span>
                    <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-[#333] rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${progressPercent}%`, backgroundColor: trail.color }}
                            />
                        </div>
                        <span>{progressPercent}% completo</span>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════
                MAIN LAYOUT — Video + Sidebar
               ═══════════════════════════════════════════ */}
            <div className="flex flex-col lg:flex-row gap-0 px-4 md:px-8">
                {/* ─── VIDEO PLAYER ─── */}
                <div className="flex-1 min-w-0">
                    <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                        <iframe
                            src={currentLesson.videoUrl}
                            title={currentLesson.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="absolute inset-0 w-full h-full"
                        />
                    </div>

                    {/* "Assistir no YouTube" label */}
                    <div className="flex items-center gap-2 mt-2 mb-4">
                        <span className="text-xs text-white/40">Assistir no</span>
                        <span className="text-xs font-semibold text-white/60 flex items-center gap-1">
                            <svg viewBox="0 0 90 20" className="h-4 fill-white/60">
                                <text x="0" y="15" fontSize="14" fontWeight="bold">▶ YouTube</text>
                            </svg>
                        </span>
                    </div>

                    {/* ─── LESSON TITLE ─── */}
                    <div className="mb-4">
                        <h2 className="text-lg font-bold text-white">{currentLesson.title}</h2>
                        <p className="text-sm text-white/50">{currentLesson.subtitle}</p>
                    </div>

                    {/* ─── NAVIGATION: Aula Anterior / Próxima Aula ─── */}
                    <div className="flex items-center justify-between mb-6">
                        <button
                            onClick={() => goToLesson(currentLessonIdx - 1)}
                            disabled={currentLessonIdx === 0}
                            className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Aula Anterior
                        </button>
                        <button
                            onClick={() => goToLesson(currentLessonIdx + 1)}
                            disabled={currentLessonIdx === trail.lessons.length - 1}
                            className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            Próxima Aula
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>

                    {/* ═══════════════════════════════════════════
                        TABS — Descrição | Materiais | Links | Perguntas
                       ═══════════════════════════════════════════ */}
                    <div className="flex rounded-xl overflow-hidden mb-6 border border-[#2a2a2a]">
                        {(['descricao', 'materiais', 'links', 'perguntas'] as TabId[]).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200
                                    ${activeTab === tab
                                        ? 'bg-[#2dd4bf] text-[#141414] font-bold'
                                        : 'bg-[#1e1e1e] text-white/60 hover:text-white hover:bg-[#252525]'
                                    }`}
                            >
                                {tabLabels[tab]}
                            </button>
                        ))}
                    </div>

                    {/* ═══════════════════════════════════════════
                        TAB CONTENT
                       ═══════════════════════════════════════════ */}
                    <div className="min-h-[200px] mb-12">
                        {/* ─── DESCRIÇÃO ─── */}
                        {activeTab === 'descricao' && (
                            <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                                <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">
                                    {currentLesson.description}
                                </p>
                            </div>
                        )}

                        {/* ─── MATERIAIS ─── */}
                        {activeTab === 'materiais' && (
                            <div className="space-y-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                                {currentLesson.materials.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-white/30">
                                        <FileText className="h-10 w-10 mb-3" />
                                        <p className="text-sm">Nenhum material disponível para esta aula.</p>
                                    </div>
                                ) : (
                                    currentLesson.materials.map(mat => (
                                        <button
                                            key={mat.id}
                                            className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-[#1e1e1e] border border-[#2a2a2a] hover:border-[#3a3a3a] hover:bg-[#252525] transition-all text-left group"
                                        >
                                            <span className="text-2xl">{fileIcon(mat.type)}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-white/90 truncate">{mat.name}</p>
                                                <p className="text-xs text-white/40">{mat.size}</p>
                                            </div>
                                            <Download className="h-4 w-4 text-white/30 group-hover:text-[#2dd4bf] transition-colors" />
                                        </button>
                                    ))
                                )}
                            </div>
                        )}

                        {/* ─── LINKS ─── */}
                        {activeTab === 'links' && (
                            <div className="space-y-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                                {currentLesson.links.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-white/30">
                                        <ExternalLink className="h-10 w-10 mb-3" />
                                        <p className="text-sm">Nenhum link disponível para esta aula.</p>
                                    </div>
                                ) : (
                                    currentLesson.links.map(link => (
                                        <a
                                            key={link.id}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 p-3.5 rounded-xl bg-[#1e1e1e] border border-[#2a2a2a] hover:border-[#2dd4bf]/40 hover:bg-[#252525] transition-all group"
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-[#2dd4bf]/10 flex items-center justify-center flex-shrink-0">
                                                <ExternalLink className="h-4 w-4 text-[#2dd4bf]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-white/90 truncate">{link.title}</p>
                                                <p className="text-xs text-white/40">{link.description}</p>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-[#2dd4bf] transition-colors" />
                                        </a>
                                    ))
                                )}
                            </div>
                        )}

                        {/* ─── PERGUNTAS ─── */}
                        {activeTab === 'perguntas' && (
                            <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                                {/* Input de pergunta */}
                                <div>
                                    <textarea
                                        value={questionText}
                                        onChange={e => setQuestionText(e.target.value)}
                                        placeholder="Tem alguma dúvida? Pergunte aqui..."
                                        className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-4 text-sm text-white/90 placeholder:text-white/30 resize-none focus:outline-none focus:border-[#2dd4bf]/50 transition-colors"
                                        rows={3}
                                    />
                                    <button
                                        onClick={() => {
                                            if (questionText.trim()) setQuestionText('');
                                        }}
                                        disabled={!questionText.trim()}
                                        className="mt-2 flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all
                                            bg-[#2dd4bf]/10 text-[#2dd4bf] border border-[#2dd4bf]/30
                                            hover:bg-[#2dd4bf]/20 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <Send className="h-4 w-4" />
                                        Enviar Pergunta
                                    </button>
                                </div>

                                {/* Lista de perguntas */}
                                {currentLesson.questions.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-white/30">
                                        <MessageCircle className="h-10 w-10 mb-3" />
                                        <p className="text-sm">Nenhuma pergunta ainda. Seja o primeiro a perguntar!</p>
                                    </div>
                                ) : (
                                    currentLesson.questions.map(q => (
                                        <div key={q.id} className="rounded-xl bg-[#1e1e1e] border border-[#2a2a2a] p-4">
                                            {/* Author */}
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white">
                                                    {q.avatar}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-white/90">{q.author}</p>
                                                    <p className="text-[11px] text-white/40">{q.date}</p>
                                                </div>
                                            </div>
                                            <p className="text-sm text-white/70 mb-3">{q.text}</p>

                                            {/* Replies */}
                                            {q.replies.map((r, idx) => (
                                                <div key={idx} className="ml-6 pl-4 border-l-2 border-[#2dd4bf]/30 mt-3">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="w-6 h-6 rounded-full bg-[#2dd4bf]/20 flex items-center justify-center">
                                                            <HelpCircle className="h-3 w-3 text-[#2dd4bf]" />
                                                        </div>
                                                        <span className="text-xs font-semibold text-[#2dd4bf]">{r.author}</span>
                                                        <span className="text-[11px] text-white/30">{r.date}</span>
                                                    </div>
                                                    <p className="text-sm text-white/60">{r.text}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══════════════════════════════════════════
                    SIDEBAR — Conteúdo do curso
                   ═══════════════════════════════════════════ */}
                <aside className="lg:w-[340px] lg:flex-shrink-0 lg:ml-6 mb-8 lg:mb-0">
                    <div className="bg-[#1e1e1e] rounded-xl border border-[#2a2a2a] overflow-hidden sticky top-16">
                        {/* Sidebar header */}
                        <div className="p-4 border-b border-[#2a2a2a]">
                            <h3 className="text-sm font-bold text-white">Conteúdo do curso</h3>
                            <p className="text-xs text-white/40 mt-0.5">{completedCount} de {trail.lessons.length} aulas concluídas</p>
                        </div>

                        {/* Lesson list */}
                        <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
                            {trail.lessons.map((lesson, idx) => {
                                const isActive = idx === currentLessonIdx;
                                return (
                                    <button
                                        key={lesson.id}
                                        onClick={() => goToLesson(idx)}
                                        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-200 border-l-4
                                            ${isActive
                                                ? 'bg-[#2dd4bf]/15 border-l-[#2dd4bf]'
                                                : 'border-l-transparent hover:bg-white/[0.04]'
                                            }`}
                                    >
                                        {/* Number */}
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold
                                            ${isActive
                                                ? 'bg-[#2dd4bf] text-[#141414]'
                                                : lesson.completed
                                                    ? 'bg-[#2dd4bf]/20 text-[#2dd4bf]'
                                                    : 'bg-[#333] text-white/50'
                                            }`}
                                        >
                                            {lesson.completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-white/70'}`}>
                                                {lesson.title}
                                            </p>
                                            <p className="text-[11px] text-white/40 flex items-center gap-1 mt-0.5">
                                                <Clock className="h-3 w-3" /> {lesson.duration}
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            {isActive && (
                                                <div className="w-7 h-7 rounded-full bg-[#2dd4bf] flex items-center justify-center">
                                                    <Play className="h-3 w-3 text-[#141414] fill-[#141414] ml-0.5" />
                                                </div>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleFavorite(lesson.id); }}
                                                className="text-white/30 hover:text-[#ffc107] transition-colors"
                                            >
                                                <Star className={`h-4 w-4 ${favorited[lesson.id] ? 'fill-[#ffc107] text-[#ffc107]' : ''}`} />
                                            </button>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </aside>
            </div>

            {/* Footer */}
            <footer className="border-t border-[#2a2a2a] px-8 py-6 mt-8">
                <p className="text-xs text-[#808080]/60 text-center">
                    © 2026 Universidade no Grau — Açaí no Grau Franchising
                </p>
            </footer>
        </div>
    );
}
