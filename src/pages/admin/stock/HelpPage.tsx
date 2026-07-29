'use client';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, BookOpen, Package, ArrowLeftRight, ClipboardCheck,
  ShoppingCart, History, BarChart2, Calculator, Layers, ClipboardList,
  FileBarChart2, ChevronDown, ChevronUp, TriangleAlert, Lightbulb,
  CheckCircle2, Info
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Step {
  text: string;
  tip?: string;
  warn?: string;
}

interface Section {
  id: string;
  icon: React.ElementType;
  color: string;
  title: string;
  route: string;
  summary: string;
  steps: Step[];
  tips?: string[];
}

// ── Manual Content ─────────────────────────────────────────────────────────────

const sections: Section[] = [
  {
    id: 'inventory',
    icon: Package,
    color: 'text-violet-500',
    title: 'Estoque Central',
    route: '/admin/stock/inventory',
    summary: 'Cadastro e gestão de todos os insumos e matérias-primas da loja.',
    steps: [
      { text: 'Acesse Estoque Central no menu lateral.' },
      { text: 'Clique em "Novo Insumo" para cadastrar um item. Informe nome, unidade (kg, cx, un…), quantidade mínima, custo unitário e vincule uma categoria e fornecedor.' },
      { text: 'Use o filtro por "Categoria" ou "Fornecedor" para localizar itens rapidamente.' },
      { text: 'Alterne entre a visão em grade (cards) e lista usando os botões no canto superior direito dos filtros.' },
      { text: 'Itens com estoque abaixo do mínimo aparecem com o ícone laranja de alerta.', warn: 'Monitore diariamente os itens em estoque crítico para evitar ruptura operacional.' },
      { text: 'Para editar ou excluir, passe o mouse sobre o card e clique nos três pontos (⋮).' },
      { text: 'Use "Importar do Catálogo" para trazer automaticamente os insumos cadastrados pela distribuidora.', tip: 'A importação não duplica itens já existentes.' },
      { text: 'Clique em "Categorias" para criar e organizar categorias de insumos por tipo (ex: Açaí, Complementos, Embalagens).' },
      { text: 'Clique em "Fornecedores" para cadastrar seus fornecedores e vinculá-los aos insumos.' },
    ],
    tips: [
      'Mantenha a unidade de medida padronizada (sempre "cx", sempre "kg") para que os cálculos de CMV fiquem corretos.',
      'Preencha o estoque mínimo para receber alertas automáticos de ruptura.',
    ]
  },
  {
    id: 'movements',
    icon: ArrowLeftRight,
    color: 'text-blue-500',
    title: 'Movimentações',
    route: '/admin/stock/movements',
    summary: 'Registro manual de entradas e saídas de estoque, incluindo notas fiscais com múltiplos itens.',
    steps: [
      { text: 'Acesse Movimentações no menu lateral.' },
      { text: 'Clique em "Novo Registro" para abrir o formulário.' },
      { text: 'Selecione o Tipo de Ação: Entrada (chegada de mercadoria) ou Saída (perda, ajuste, consumo).' },
      { text: 'Escolha a Classificação conforme o motivo:\n• Entrada: Compra/NF, Ajuste (+), Saldo Inicial\n• Saída: Venda (Baixa Técnica), Desperdício, Consumo Interno, Ajuste (-)' },
      { text: 'Informe a Data da Movimentação — por padrão é hoje, mas pode ser retroativa.' },
      { text: 'Em "Itens da Nota" use o campo de busca para localizar o insumo pelo nome.', tip: 'Digite parte do nome para filtrar rapidamente.' },
      { text: 'Informe a quantidade e o custo unitário de cada item.' },
      { text: 'Para adicionar mais itens da mesma nota clique em "+ Adicionar Item". Você pode incluir quantos precisar.', tip: 'O Total da Nota é calculado automaticamente conforme você preenche.' },
      { text: 'No campo Observações informe o número da Nota Fiscal para rastreabilidade.' },
      { text: 'Clique em "Confirmar" para registrar todos os itens de uma vez. O sistema atualiza o saldo e o preço médio automaticamente.', warn: 'Uma vez confirmada, a movimentação não pode ser desfeita. Verifique os dados antes de confirmar.' },
    ],
    tips: [
      'O preço médio ponderado (custo médio) é recalculado a cada nova entrada.',
      'Saídas não alteram o preço médio — apenas reduzem o saldo.',
      'Use os filtros de Categoria e Fornecedor para analisar o histórico por segmento.',
      'Os cards de Total Entradas, Total Saídas e Saldo Líquido refletem sempre o filtro aplicado.',
    ]
  },
  {
    id: 'counts',
    icon: ClipboardCheck,
    color: 'text-pink-500',
    title: 'Contagem Física (Inventário)',
    route: '/admin/stock/counts',
    summary: 'Realização do inventário físico com geração automática de movimentos de saída (Venda - Baixa Técnica).',
    steps: [
      { text: 'Acesse Contagem (Inventário) no menu lateral.' },
      { text: 'Clique em "Imprimir Lista" para gerar um PDF em branco com todos os insumos — entregue para a funcionária preencher fisicamente.' },
      { text: 'A funcionária conta o que há fisicamente em estoque e informa a quantidade real de cada item no campo "Contagem Real".' },
      { text: 'O sistema exibe automaticamente o que está no sistema e a diferença. Exemplo: sistema tem 15 cx → funcionária conta 5 cx → diferença = SAÍDA de 10 cx.' },
      { text: 'A coluna Diferença mostra SAÍDA (vermelho) quando o físico é menor que o sistema, e ENTRADA (verde) quando é maior.' },
      { text: 'Após preencher todos os itens clique em "Finalizar Auditoria".' },
      { text: 'O sistema gera automaticamente um PDF de auditoria com as divergências e pergunta se deseja aplicar os ajustes.', tip: 'O PDF é salvo no histórico de auditorias e pode ser baixado a qualquer momento.' },
      { text: 'Ao confirmar, o sistema lança automaticamente movimentos de Saída (Venda - Baixa Técnica) para cada item com diferença negativa, e Entrada (Ajuste) para diferença positiva.' },
      { text: 'O saldo do estoque é atualizado para refletir a contagem real.', warn: 'A contagem corrige o estoque definitivamente. Certifique-se de que os valores estão corretos antes de confirmar.' },
    ],
    tips: [
      'Realize a contagem no mesmo horário toda semana para manter consistência (ex: toda segunda de manhã, antes de abrir).',
      'O histórico completo de auditorias fica disponível na seção "Histórico" dentro da própria página.',
    ]
  },
  {
    id: 'count-groups',
    icon: Layers,
    color: 'text-emerald-500',
    title: 'Grupos de Contagem',
    route: '/admin/checkgrau/grupos-contagem',
    summary: 'Organização de insumos em grupos para inventários cíclicos — conte só o necessário em cada dia.',
    steps: [
      { text: 'Acesse Grupos de Contagem no menu lateral (visível apenas para gerentes).' },
      { text: 'Clique em "Novo Grupo" e defina o nome, descrição, cor de identificação e frequência em dias (ex: 7 = semanal).' },
      { text: 'Após criar o grupo, clique em "Itens" para vincular os insumos que pertencem a ele.' },
      { text: 'No painel de itens, use a busca à direita para localizar e adicionar insumos ao grupo. Clique no "+" para adicionar e no "×" para remover.' },
      { text: 'Crie grupos por categoria: ex: "Grupo Açaí" (conta toda segunda), "Grupo Embalagens" (conta quinzenal).' },
    ],
    tips: [
      'Grupos bem organizados reduzem o tempo de contagem — em vez de contar 80 itens, conta-se 15 por dia.',
    ]
  },
  {
    id: 'purchase-history',
    icon: History,
    color: 'text-cyan-500',
    title: 'Histórico de Compras',
    route: '/admin/stock/purchase-history',
    summary: 'Visão completa de todas as entradas do tipo Compra/NF com filtros e relatórios.',
    steps: [
      { text: 'Acesse Histórico de Compras no menu lateral.' },
      { text: 'Selecione o período desejado (data inicial e data final).' },
      { text: 'Filtre por Fornecedor para ver o quanto foi gasto com cada um.' },
      { text: 'Filtre por Categoria para analisar o custo por grupo de insumo.' },
      { text: 'Use a busca por nome para localizar compras de um insumo específico.' },
      { text: 'Os cards de resumo mostram: Total Gasto, Qtd Total Comprada, Entradas registradas e Ticket Médio por entrada.' },
      { text: 'O bloco "Gastos por Fornecedor" aparece automaticamente quando há mais de um fornecedor no período.' },
      { text: 'Clique em "Exportar PDF" para gerar um relatório completo do período com todos os filtros aplicados.' },
    ],
    tips: [
      'Compare meses diferentes para identificar variações de preço por fornecedor.',
    ]
  },
  {
    id: 'purchases',
    icon: ShoppingCart,
    color: 'text-green-500',
    title: 'Lista de Compras',
    route: '/admin/stock/purchases',
    summary: 'Geração automática de lista de compras baseada no estoque mínimo e consumo.',
    steps: [
      { text: 'Acesse Lista de Compras no menu lateral.' },
      { text: 'O sistema lista automaticamente os insumos que estão abaixo do estoque mínimo cadastrado.' },
      { text: 'Ajuste as quantidades sugeridas conforme necessidade antes de enviar ao fornecedor.' },
      { text: 'Use o botão de exportação para gerar a lista em PDF e enviar por WhatsApp ou e-mail.' },
    ],
    tips: [
      'Mantenha o estoque mínimo atualizado em cada insumo para que a lista seja gerada corretamente.',
    ]
  },
  {
    id: 'cmv',
    icon: Calculator,
    color: 'text-orange-500',
    title: 'Gestão de CMV',
    route: '/admin/stock/cmv',
    summary: 'Custo da Mercadoria Vendida — controle do percentual de custo sobre a receita.',
    steps: [
      { text: 'Acesse Gestão de CMV no menu lateral.' },
      { text: 'O CMV é calculado com base nas saídas registradas (movimentações do tipo Saída) em relação à receita do período.' },
      { text: 'Acompanhe o CMV % por categoria para identificar onde estão os maiores custos.' },
      { text: 'O semáforo indica: verde (eficiente), amarelo (atenção), vermelho (acima do esperado).' },
    ],
    tips: [
      'O CMV ideal para açaí e complementos costuma ficar entre 25% e 35% da receita.',
      'Registre todas as saídas (inclusive perdas e desperdícios) para que o CMV seja preciso.',
    ]
  },
  {
    id: 'checklists',
    icon: ClipboardList,
    color: 'text-amber-500',
    title: 'Rotinas Operacionais',
    route: '/admin/stock/checklists/execution',
    summary: 'Checklists diários de abertura, operação e fechamento da loja.',
    steps: [
      { text: 'Acesse Rotinas Operacionais no menu lateral.' },
      { text: 'Selecione o checklist do dia (abertura, operação ou fechamento) e marque cada item conforme executado.' },
      { text: 'Itens não marcados geram alertas no painel principal.' },
      { text: 'Gerentes podem criar e editar checklists em "Gestão de Rotinas".' },
    ],
    tips: [
      'Execute os checklists sempre na sequência correta: Abertura → Operação → Fechamento.',
    ]
  },
  {
    id: 'reports',
    icon: FileBarChart2,
    color: 'text-indigo-500',
    title: 'Relatórios de Rotinas',
    route: '/admin/stock/checklists/reports',
    summary: 'Histórico de conformidade das rotinas operacionais por período.',
    steps: [
      { text: 'Acesse Relatórios de Rotinas no menu lateral.' },
      { text: 'Selecione o período e visualize o percentual de conformidade por dia e por rotina.' },
      { text: 'Identifique padrões de não conformidade para corrigir processos.' },
      { text: 'Exporte o relatório em PDF para reuniões de equipe.' },
    ],
    tips: [
      'Uma conformidade abaixo de 80% indica necessidade de treinamento ou revisão do processo.',
    ]
  },
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function StockHelpPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['inventory']));

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = sections.filter(s =>
    !searchTerm ||
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.steps.some(st => st.text.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-16">
      <button
        onClick={() => navigate('/admin/stock/dashboard')}
        className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-primary/50 hover:text-primary hover:bg-primary/10 transition-all w-fit"
      >
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
        <span>Estoque & Operações</span>
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400 flex items-center gap-3">
            <BookOpen className="text-primary shrink-0" size={36} />
            Manual Operacional
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            Guia completo do módulo Estoque & Operações — Açaí no Grau
          </p>
        </div>
        <Badge variant="outline" className="text-xs font-bold px-3 py-1.5 shrink-0">
          {sections.length} módulos documentados
        </Badge>
      </div>

      {/* Search */}
      <div className="glass-card p-4 flex items-center gap-3">
        <Search className="text-muted-foreground shrink-0" size={18} />
        <Input
          placeholder="Buscar no manual... (ex: contagem, nota fiscal, CMV)"
          className="border-none bg-transparent focus-visible:ring-0 text-base"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <Badge variant="secondary" className="shrink-0 text-[10px] font-bold">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Index */}
      {!searchTerm && (
        <div className="glass-card p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Ir para módulo</p>
          <div className="flex flex-wrap gap-2">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => {
                  setOpenSections(prev => new Set(prev).add(s.id));
                  setTimeout(() => document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all"
              >
                <s.icon size={12} className={s.color} />
                {s.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-4">
        {filtered.map(section => {
          const isOpen = openSections.has(section.id);
          const Icon = section.icon;
          return (
            <div
              key={section.id}
              id={`section-${section.id}`}
              className="glass-card overflow-hidden border-none shadow-xl"
            >
              {/* Section header */}
              <button
                className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-muted/20 transition-colors"
                onClick={() => toggleSection(section.id)}
              >
                <div className={cn('w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0', section.color)}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-black text-lg">{section.title}</h2>
                    <Badge variant="outline" className="text-[9px] font-bold opacity-60 hidden md:flex">
                      {section.route}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{section.summary}</p>
                </div>
                <div className="shrink-0 text-muted-foreground">
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>

              {/* Section content */}
              {isOpen && (
                <div className="px-6 pb-6 border-t space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Steps */}
                  <div className="pt-5 space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 size={12} /> Passo a passo
                    </p>
                    <ol className="space-y-3">
                      {section.steps.map((step, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <div className="space-y-1.5 flex-1">
                            <p className="text-sm leading-relaxed whitespace-pre-line">{step.text}</p>
                            {step.tip && (
                              <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded-lg px-3 py-2">
                                <Lightbulb size={13} className="shrink-0 mt-0.5" />
                                <p className="text-xs">{step.tip}</p>
                              </div>
                            )}
                            {step.warn && (
                              <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-lg px-3 py-2">
                                <TriangleAlert size={13} className="shrink-0 mt-0.5" />
                                <p className="text-xs">{step.warn}</p>
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Tips */}
                  {section.tips && section.tips.length > 0 && (
                    <div className="bg-primary/5 rounded-2xl p-4 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <Info size={12} /> Dicas importantes
                      </p>
                      <ul className="space-y-1.5">
                        {section.tips.map((tip, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Go to page */}
                  <button
                    onClick={() => navigate(section.route)}
                    className="flex items-center gap-2 text-xs font-bold text-primary hover:underline"
                  >
                    Ir para {section.title} →
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="glass-card py-20 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="text-xl font-bold">Nenhum resultado encontrado</h3>
            <p className="text-sm text-muted-foreground mt-2">Tente buscar por outro termo.</p>
          </div>
        )}
      </div>
    </div>
  );
}
