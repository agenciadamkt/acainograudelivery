'use client';

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Search, ArrowLeft, ChevronDown, ChevronUp,
  Lightbulb, TriangleAlert, Info, CheckCircle2,
  ShoppingCart, Wallet, Grid, History, Monitor,
  LayoutDashboard, ShoppingBag, Truck, Package, MapPin,
  FolderTree, PackageOpen, Plus, Megaphone, Leaf,
  DollarSign, BarChart2, FileText, TrendingUp, Calculator,
  Users, MessageSquare, BarChart3,
  Store, ClipboardList,
  ArrowLeftRight, ClipboardCheck, PieChart,
  Settings, GraduationCap, Layers, Barcode,
  HelpCircle, Zap, Globe,
  Headphones, Gift, Bot, Gamepad2, UserCog, MessageCircle, Navigation,
  ShieldCheck, Gauge, LayoutGrid, CalendarClock, CalendarCheck, Smartphone,
  Bell, Trophy, Activity, Network, RotateCcw,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import jsPDF from 'jspdf';
import { Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Step {
  text: string;
  tip?: string;
  warn?: string;
}

export interface Module {
  id: string;
  icon: React.ElementType;
  title: string;
  route?: string;
  summary: string;
  steps: Step[];
  tips?: string[];
}

export interface Category {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  description: string;
  modules: Module[];
}

// ── Content ────────────────────────────────────────────────────────────────────
// Exportado (além de usado nesta página) para permitir extração mecânica do
// conteúdo para a base de conhecimento do Copiloto (ver
// scripts/generate-copilot-knowledge-seed.ts) — evita reescrever/duplicar
// manualmente o mesmo conteúdo já mantido aqui.

export const categories: Category[] = [
  {
    id: 'pdv',
    label: 'PDV — Frente de Caixa',
    icon: ShoppingCart,
    color: 'text-violet-600',
    bgColor: 'bg-violet-500/10',
    description: 'Registro de vendas, mesas, caixa e histórico de transações.',
    modules: [
      {
        id: 'nova-venda',
        icon: ShoppingCart,
        title: 'Nova Venda',
        route: '/admin/pdv/nova-venda',
        summary: 'Registro de vendas no balcão com ou sem mesa.',
        steps: [
          { text: 'Acesse PDV → Nova Venda no menu lateral.' },
          { text: 'Selecione os produtos clicando nos cards do cardápio. Use as categorias no topo para filtrar.' },
          { text: 'Ajuste a quantidade de cada item usando os botões + e − no carrinho à direita.' },
          { text: 'Adicione complementos (toppings) quando solicitado pelo cliente — clique no produto e selecione os extras.' },
          { text: 'Aplique desconto ou cupom se necessário no campo de desconto do carrinho.' },
          { text: 'Selecione a forma de pagamento: Dinheiro, Cartão de Débito, Cartão de Crédito ou PIX.' },
          { text: 'Clique em "Finalizar Venda". O sistema registra a venda, baixa o estoque (via CMV) e imprime o comprovante.', tip: 'O comprovante é enviado para a impressora configurada nas Configurações PDV.' },
          { text: 'Para cancelar um item do carrinho, clique no ícone de lixeira ao lado do item.', warn: 'Após finalizar a venda, o cancelamento deve ser feito pelo histórico do caixa.' },
        ],
        tips: [
          'Configure os atalhos de teclado nas Configurações PDV para agilizar o atendimento.',
          'Produtos com estoque zerado aparecem com indicação visual — cadastre o estoque mínimo para receber alertas antes da ruptura.',
        ]
      },
      {
        id: 'mesas',
        icon: Grid,
        title: 'Mesas',
        route: '/admin/pdv/mesas',
        summary: 'Gestão de pedidos por mesa com controle de tempo e status.',
        steps: [
          { text: 'Acesse PDV → Mesas no menu lateral.' },
          { text: 'Visualize todas as mesas: verde = livre, amarelo = ocupada, vermelho = aguardando pagamento.' },
          { text: 'Clique em uma mesa livre para abrir um novo pedido vinculado a ela.' },
          { text: 'Adicione produtos normalmente como em Nova Venda. O pedido fica associado à mesa até o pagamento.' },
          { text: 'Para dividir a conta, use a opção "Dividir" antes de finalizar.' },
          { text: 'Ao fechar a mesa, selecione a forma de pagamento e confirme. A mesa volta ao status livre automaticamente.' },
        ],
        tips: ['O tempo de permanência de cada mesa é exibido para ajudar na gestão do giro de clientes.']
      },
      {
        id: 'caixa',
        icon: Wallet,
        title: 'Caixa',
        route: '/admin/pdv/caixa',
        summary: 'Abertura, sangria, suprimento e fechamento do caixa do dia.',
        steps: [
          { text: 'Acesse PDV → Caixa no menu lateral.' },
          { text: 'Informe o valor de abertura (troco inicial) e clique em "Abrir Caixa" no início do turno.', warn: 'O caixa precisa estar aberto para registrar vendas.' },
          { text: 'Durante o turno, registre sangrias (retiradas) e suprimentos (depósitos) conforme necessário.' },
          { text: 'No fechamento, confira o saldo: o sistema mostra o esperado vs. o contado.' },
          { text: 'Informe o valor físico contado para cada forma de pagamento e confirme o fechamento.' },
          { text: 'O relatório de fechamento é gerado automaticamente e salvo no histórico financeiro.' },
        ],
        tips: ['Realize o fechamento de caixa diariamente para manter o fluxo financeiro preciso.']
      },
      {
        id: 'historico-pdv',
        icon: History,
        title: 'Histórico PDV',
        route: '/admin/pdv/historico',
        summary: 'Consulta e cancelamento de vendas realizadas.',
        steps: [
          { text: 'Acesse PDV → Histórico no menu lateral.' },
          { text: 'Filtre por data, forma de pagamento ou operador para localizar vendas específicas.' },
          { text: 'Clique em uma venda para ver os detalhes: itens, valor, hora, operador e forma de pagamento.' },
          { text: 'Para cancelar uma venda, clique em "Cancelar" dentro dos detalhes — informe o motivo.', warn: 'Cancelamentos ficam registrados com o nome do operador para auditoria.' },
        ],
      },
    ]
  },
  {
    id: 'operacao',
    label: 'Operação',
    icon: LayoutDashboard,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    description: 'Painel operacional, pedidos online, KDS de cozinha e controle de entregas.',
    modules: [
      {
        id: 'dashboard-op',
        icon: LayoutDashboard,
        title: 'Dashboard Operacional',
        route: '/admin/dashboard',
        summary: 'Visão geral em tempo real da operação: pedidos, vendas e desempenho do dia.',
        steps: [
          { text: 'Acesse Operação → Dashboard no menu lateral.' },
          { text: 'Acompanhe os pedidos em tempo real: novos, em preparo, prontos e entregues.' },
          { text: 'Monitore o faturamento do dia, ticket médio e número de pedidos.' },
          { text: 'Clique em qualquer card de pedido para ver os detalhes e atualizar o status.' },
        ],
        tips: ['Deixe o dashboard aberto em um monitor dedicado durante a operação para visibilidade em tempo real.']
      },
      {
        id: 'pedidos',
        icon: ShoppingBag,
        title: 'Pedidos Online',
        route: '/admin/orders',
        summary: 'Gerenciamento dos pedidos recebidos pelo app e delivery.',
        steps: [
          { text: 'Acesse Operação → Pedidos no menu lateral.' },
          { text: 'Os pedidos chegam automaticamente. Aceite clicando em "Confirmar" ou recuse com motivo.' },
          { text: 'Avance o status conforme a etapa: Recebido → Em Preparo → Pronto → Entregue.' },
          { text: 'Para pedidos de entrega, acione o entregador na etapa "Pronto para Retirada".' },
          { text: 'O cliente recebe notificações automáticas a cada mudança de status.', tip: 'Configure o tempo estimado de entrega nas Configurações Gerais.' },
        ],
      },
      {
        id: 'kds',
        icon: Monitor,
        title: 'KDS — Cozinha',
        route: '/admin/kds',
        summary: 'Tela de produção da cozinha com fila de pedidos em tempo real.',
        steps: [
          { text: 'Acesse Operação → KDS Cozinha no menu lateral (ou abra em um monitor da cozinha).' },
          { text: 'Cada card representa um pedido com os itens a preparar e o tempo decorrido.' },
          { text: 'Clique em "Pronto" para marcar o pedido como concluído — ele sai da fila do KDS.' },
          { text: 'Pedidos com mais de X minutos ficam destacados em vermelho (tempo configurável).', tip: 'O KDS funciona melhor em tablet ou monitor dedicado na cozinha, sem o menu lateral.' },
        ],
      },
      {
        id: 'entregas',
        icon: Truck,
        title: 'Entregas',
        route: '/admin/delivery',
        summary: 'Controle de pedidos em rota, rastreamento e gestão de entregadores.',
        steps: [
          { text: 'Acesse Operação → Entregas no menu lateral.' },
          { text: 'Visualize todos os pedidos em rota com endereço e tempo estimado.' },
          { text: 'Atribua pedidos a entregadores disponíveis clicando em "Despachar".' },
          { text: 'Confirme a entrega quando o entregador retornar ou via confirmação do cliente.' },
        ],
      },
      {
        id: 'areas-entrega',
        icon: MapPin,
        title: 'Áreas de Entrega',
        route: '/admin/delivery/areas',
        summary: 'Configuração de raio, bairros atendidos e taxas de entrega por zona.',
        steps: [
          { text: 'Acesse Operação → Áreas de Entrega no menu lateral (requer perfil Gerente).' },
          { text: 'Desenhe no mapa as zonas de entrega ou adicione bairros manualmente.' },
          { text: 'Defina a taxa de entrega para cada zona e o tempo estimado.' },
          { text: 'Ative ou desative zonas conforme a disponibilidade de entregadores.', warn: 'Desativar uma zona afeta imediatamente os pedidos futuros daquela região.' },
        ],
      },
      {
        id: 'frota',
        icon: Navigation,
        title: 'Frota & Rotas',
        route: '/admin/frota',
        summary: 'Gestão de entregadores, criação de rotas diárias e relatório de rotas realizadas.',
        steps: [
          { text: 'Acesse Operação → Frota no menu lateral.' },
          { text: 'Na aba "Rota do Dia": clique em "Nova Rota" para criar uma rota e adicione os pedidos que serão entregues nessa saída.' },
          { text: 'Atribua um motorista à rota e inicie o trajeto. O sistema exibe o mapa com os pontos de entrega.' },
          { text: 'Confirme cada entrega na sequência para registrar a conclusão do ponto.' },
          { text: 'Na aba "Relatório de Rotas": filtre por período, motorista ou status para analisar o histórico de entregas.', tip: 'Agrupe pedidos por proximidade geográfica para reduzir o tempo de rota e o custo de combustível.' },
        ],
        tips: ['Crie a rota do dia antes do horário de pico para que o entregador já saia organizado.']
      },
    ]
  },
  {
    id: 'cardapio',
    label: 'Cardápio',
    icon: PackageOpen,
    color: 'text-pink-600',
    bgColor: 'bg-pink-500/10',
    description: 'Gestão completa do cardápio: categorias, produtos, complementos e promoções.',
    modules: [
      {
        id: 'categorias',
        icon: FolderTree,
        title: 'Categorias',
        route: '/admin/menu/categories',
        summary: 'Organização dos produtos em grupos visíveis no app e PDV.',
        steps: [
          { text: 'Acesse Cardápio → Categorias no menu lateral.' },
          { text: 'Clique em "Nova Categoria" e informe o nome, ícone/imagem e ordem de exibição.' },
          { text: 'Ative ou desative categorias — categorias inativas não aparecem para o cliente.' },
          { text: 'Arraste as categorias para reordenar a exibição no app.', tip: 'Coloque as categorias mais vendidas no topo para facilitar a navegação do cliente.' },
        ],
      },
      {
        id: 'produtos',
        icon: PackageOpen,
        title: 'Produtos',
        route: '/admin/menu/products',
        summary: 'Cadastro, edição e gestão de disponibilidade de todos os produtos.',
        steps: [
          { text: 'Acesse Cardápio → Produtos no menu lateral.' },
          { text: 'Clique em "Novo Produto" e preencha: nome, descrição, categoria, preço e foto.' },
          { text: 'Vincule os complementos disponíveis para este produto (toppings).' },
          { text: 'Defina se o produto aceita personalização e quais complementos são obrigatórios.' },
          { text: 'Ative ou desative a disponibilidade do produto com o toggle — útil para itens sazonais ou em falta.', tip: 'Adicione fotos de alta qualidade — produtos com foto vendem até 3x mais.' },
          { text: 'Use o campo "Destaque" para marcar produtos que aparecem em banners ou seções especiais.' },
        ],
        tips: ['Mantenha as descrições claras e com os ingredientes principais para ajudar na decisão de compra.']
      },
      {
        id: 'complementos',
        icon: Plus,
        title: 'Complementos (Toppings)',
        route: '/admin/menu/toppings',
        summary: 'Configuração dos extras e personalizações oferecidas com os produtos.',
        steps: [
          { text: 'Acesse Cardápio → Complementos no menu lateral.' },
          { text: 'Crie grupos de complementos: ex: "Frutas", "Caldas", "Acompanhamentos".' },
          { text: 'Para cada grupo, defina se é obrigatório, o mínimo e máximo de seleções.' },
          { text: 'Adicione os itens de cada grupo com nome, preço adicional e disponibilidade.' },
          { text: 'Vincule os grupos aos produtos no cadastro do produto.', tip: 'Grupos sem preço adicional (R$ 0,00) incentivam o cliente a personalizar sem resistência.' },
        ],
      },
      {
        id: 'ingredientes',
        icon: Leaf,
        title: 'Ingredientes',
        route: '/admin/menu/ingredients',
        summary: 'Cadastro de ingredientes para composição de receitas e controle alérgenos.',
        steps: [
          { text: 'Acesse Cardápio → Ingredientes no menu lateral.' },
          { text: 'Cadastre cada ingrediente com nome, unidade e informações nutricionais/alérgenos.' },
          { text: 'Vincule ingredientes aos produtos para exibir no app e controlar receitas.' },
        ],
      },
      {
        id: 'promocoes',
        icon: Megaphone,
        title: 'Promoções',
        route: '/admin/promotions',
        summary: 'Criação de cupons, descontos e ofertas por tempo limitado.',
        steps: [
          { text: 'Acesse Cardápio → Promoções no menu lateral.' },
          { text: 'Clique em "Nova Promoção" e escolha o tipo: Desconto %, Valor fixo ou Frete grátis.' },
          { text: 'Defina a validade (data início e fim), o limite de usos e os produtos elegíveis.' },
          { text: 'Para cupons, gere um código único para divulgar nas redes sociais.' },
          { text: 'Ative ou desative promoções manualmente a qualquer momento.', warn: 'Promoções ativas afetam diretamente a margem — verifique o impacto no CMV antes de ativar.' },
        ],
      },
    ]
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    icon: DollarSign,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500/10',
    description: 'Fluxo de caixa, DRE, despesas, contas a receber e fechamentos.',
    modules: [
      {
        id: 'fin-dashboard',
        icon: BarChart2,
        title: 'Dashboard Financeiro',
        route: '/admin/financeiro',
        summary: 'Visão consolidada das finanças: receitas, despesas, saldo e metas.',
        steps: [
          { text: 'Acesse Financeiro → Dashboard no menu lateral.' },
          { text: 'Visualize o saldo atual, receitas e despesas do mês por categoria.' },
          { text: 'Acompanhe os gráficos de evolução e compare períodos anteriores.' },
          { text: 'Use os filtros de período e centro de custo para análises específicas.' },
        ],
        tips: ['Acesse o Dashboard Financeiro semanalmente para monitorar a saúde financeira do negócio.']
      },
      {
        id: 'lancamentos',
        icon: ArrowLeftRight,
        title: 'Lançamentos (Fluxo de Caixa)',
        route: '/admin/financeiro/lancamentos',
        summary: 'Registro manual de receitas e despesas avulsas.',
        steps: [
          { text: 'Acesse Financeiro → Lançamentos no menu lateral.' },
          { text: 'Clique em "Novo Lançamento" e selecione o tipo: Receita ou Despesa.' },
          { text: 'Informe: valor, data, categoria, conta bancária/caixa, descrição e anexo (nota fiscal).' },
          { text: 'Para lançamentos recorrentes (aluguel, mensalidades), marque "Recorrente" e defina a periodicidade.' },
          { text: 'Confirme o pagamento/recebimento clicando em "Pago" quando o valor transitar.', tip: 'Registre todas as despesas na data de vencimento — não só quando pagar — para ter DRE por competência.' },
        ],
        tips: ['Use o campo de Observações para registrar o número da nota fiscal para facilitar auditorias.']
      },
      {
        id: 'fluxo-semanal',
        icon: TrendingUp,
        title: 'Fluxo Semanal',
        route: '/admin/financeiro/fluxo-semanal',
        summary: 'Visualização do fluxo de caixa dia a dia da semana atual.',
        steps: [
          { text: 'Acesse Financeiro → Fluxo Semanal no menu lateral.' },
          { text: 'Visualize receitas e despesas agrupadas por dia da semana.' },
          { text: 'Identifique os dias de maior e menor movimentação para planejar compras e pagamentos.' },
        ],
      },
      {
        id: 'despesas',
        icon: FileText,
        title: 'Despesas',
        route: '/admin/financeiro/despesas',
        summary: 'Listagem e gestão de todas as despesas com filtros e exportação.',
        steps: [
          { text: 'Acesse Financeiro → Despesas no menu lateral.' },
          { text: 'Filtre por período, categoria, centro de custo ou fornecedor.' },
          { text: 'Marque despesas como pagas clicando no ícone de check — o saldo é atualizado automaticamente.' },
          { text: 'Exporte as despesas em PDF para reuniões de análise ou envio ao contador.' },
        ],
      },
      {
        id: 'fechamento-caixa',
        icon: Wallet,
        title: 'Fechamentos de Caixa',
        route: '/admin/financeiro/fluxo',
        summary: 'Histórico dos fechamentos de caixa com conferência de valores por turno.',
        steps: [
          { text: 'Acesse Financeiro → Fechamentos no menu lateral.' },
          { text: 'Visualize todos os fechamentos realizados com data, operador e diferença de caixa.' },
          { text: 'Clique em um fechamento para ver os detalhes por forma de pagamento.' },
          { text: 'Diferenças positivas (sobra) ou negativas (falta) são destacadas para ação corretiva.', warn: 'Diferenças recorrentes indicam necessidade de treinamento do operador ou revisão do processo.' },
        ],
      },
      {
        id: 'dre',
        icon: BarChart3,
        title: 'DRE — Demonstrativo de Resultado',
        route: '/admin/financeiro/dre',
        summary: 'Relatório gerencial de resultado por período: receita, custos, despesas e lucro.',
        steps: [
          { text: 'Acesse Financeiro → DRE no menu lateral.' },
          { text: 'Selecione o período (mês/trimestre) para gerar o demonstrativo.' },
          { text: 'O DRE mostra: Receita Bruta → Deduções → Receita Líquida → CMV → Lucro Bruto → Despesas → EBITDA.' },
          { text: 'Use para identificar onde estão os maiores custos e oportunidades de melhoria.', tip: 'Compare o DRE mês a mês para identificar tendências de crescimento ou deterioração.' },
          { text: 'Exporte em PDF para apresentar ao contador ou sócios.' },
        ],
        tips: ['O DRE é a principal ferramenta de saúde financeira — analise mensalmente com toda a equipe de gestão.']
      },
      {
        id: 'receber',
        icon: DollarSign,
        title: 'Contas a Receber',
        route: '/admin/financeiro/receber',
        summary: 'Gestão de valores a receber: parcelamentos, pendências e baixas.',
        steps: [
          { text: 'Acesse Financeiro → Contas a Receber no menu lateral.' },
          { text: 'Visualize todos os recebimentos pendentes com data de vencimento.' },
          { text: 'Dê baixa manual ao receber o valor clicando em "Recebido".' },
          { text: 'Valores vencidos ficam destacados em vermelho para ação imediata.' },
        ],
      },
      {
        id: 'cadastros-fin',
        icon: Settings,
        title: 'Cadastros Financeiros',
        route: '/admin/financeiro/cadastros',
        summary: 'Cadastro de contas bancárias, plano de contas, centros de custo, fornecedores e clientes.',
        steps: [
          { text: 'Acesse Financeiro → Cadastros no menu lateral.' },
          { text: 'Cadastre suas contas bancárias (conta corrente, poupança, caixa físico).' },
          { text: 'Configure o Plano de Contas com as categorias de receita e despesa da sua operação.' },
          { text: 'Crie Centros de Custo para segregar despesas por área (ex: Cozinha, Delivery, Administrativo).' },
          { text: 'Cadastre fornecedores e clientes para vincular nos lançamentos.', tip: 'Um bom plano de contas é a base de uma análise financeira precisa — configure antes de começar a lançar.' },
        ],
      },
      {
        id: 'recibos',
        icon: FileText,
        title: 'Recibos de Baixas',
        route: '/admin/financeiro/recibos',
        summary: 'Importa o PDF de baixas do Cefas e gera recibos de quitação, um por título.',
        steps: [
          { text: 'Acesse Financeiro → Recibos no menu lateral.' },
          { text: 'Clique em importar e selecione o PDF de baixas exportado do Cefas.' },
          { text: 'O sistema lê os títulos automaticamente (cliente, valor, documento) e lista para conferência.' },
          { text: 'Confirme a forma de pagamento usada na quitação.' },
          { text: 'Gere e baixe os recibos — um por título — já com a logomarca e o nome do responsável.', tip: 'Cada recibo sai individual, pronto para enviar ao cliente.' },
        ],
        tips: ['No Histórico de recibos você pode reimprimir (clique no registro para abrir no grid) ou excluir registros antigos.']
      },
      {
        id: 'fiscal',
        icon: FileText,
        title: 'Fiscal (NFC-e / NF-e)',
        route: '/admin/fiscal',
        summary: 'Emissão e gestão de notas fiscais (NFC-e e NF-e) via PlugNotas.',
        steps: [
          { text: 'Acesse Fiscal no menu (ou /admin/fiscal).' },
          { text: 'Confira o painel fiscal com o resumo das emissões.' },
          { text: 'Para emitir, preencha os dados da nota (destinatário, itens e valores) e envie.' },
          { text: 'Acompanhe o status (autorizada/rejeitada) e baixe o DANFE/PDF.' },
          { text: 'Consulte o Histórico Fiscal para reimprimir, cancelar ou revisar notas emitidas.', tip: 'Mantenha os dados fiscais da loja (CNPJ, regime tributário e inscrições) atualizados em Configurações para a emissão funcionar.' },
        ],
      },
    ]
  },
  {
    id: 'estoque',
    label: 'Estoque & Operações',
    icon: Package,
    color: 'text-orange-600',
    bgColor: 'bg-orange-500/10',
    description: 'Gestão completa de insumos, movimentações, CMV, contagem física e rotinas.',
    modules: [
      {
        id: 'est-inventory',
        icon: Package,
        title: 'Estoque Central',
        route: '/admin/stock/inventory',
        summary: 'Cadastro e gestão de todos os insumos e matérias-primas.',
        steps: [
          { text: 'Acesse Estoque → Estoque Central no menu lateral.' },
          { text: 'Clique em "Novo Insumo" para cadastrar: nome, unidade, estoque mínimo, custo, categoria e fornecedor.' },
          { text: 'Filtre por Categoria ou Fornecedor para localizar itens rapidamente.' },
          { text: 'Itens abaixo do mínimo aparecem com alerta laranja — ação imediata necessária.' },
          { text: 'Use "Importar do Catálogo" para trazer insumos cadastrados pela distribuidora.', tip: 'A importação não duplica itens já existentes.' },
        ],
        tips: ['Padronize as unidades de medida (sempre "cx", sempre "kg") para que os cálculos de CMV fiquem corretos.']
      },
      {
        id: 'est-movements',
        icon: ArrowLeftRight,
        title: 'Movimentações',
        route: '/admin/stock/movements',
        summary: 'Registro de entradas e saídas com suporte a múltiplos itens por nota.',
        steps: [
          { text: 'Clique em "Novo Registro" e selecione Entrada ou Saída.' },
          { text: 'Informe a data, classificação (Compra/NF, Consumo, Desperdício…) e observações/nº da NF.' },
          { text: 'Busque os insumos pelo nome no campo de busca de cada linha.' },
          { text: 'Adicione quantos itens precisar com "+ Adicionar Item" — toda a nota em um único registro.' },
          { text: 'Confirme para atualizar saldos e preço médio automaticamente.', warn: 'Movimentações confirmadas não podem ser desfeitas.' },
        ],
      },
      {
        id: 'est-counts',
        icon: ClipboardCheck,
        title: 'Contagem Física',
        route: '/admin/stock/counts',
        summary: 'Inventário físico com lançamento automático de saída por diferença.',
        steps: [
          { text: 'Imprima a Lista de Contagem e entregue para a funcionária preencher.' },
          { text: 'A funcionária informa o que há fisicamente em cada item no campo "Contagem Real".' },
          { text: 'O sistema calcula a diferença: Sistema (15 cx) − Contagem (5 cx) = SAÍDA de 10 cx.' },
          { text: 'Clique em "Finalizar Auditoria", revise as divergências e confirme.' },
          { text: 'O sistema lança automaticamente os movimentos de Saída (Venda - Baixa Técnica) e atualiza os saldos.' },
        ],
        tips: ['Realize a contagem semanalmente no mesmo horário para manter consistência.']
      },
      {
        id: 'est-cmv',
        icon: Calculator,
        title: 'Gestão de CMV',
        route: '/admin/stock/cmv',
        summary: 'Custo da Mercadoria Vendida — percentual de custo sobre a receita.',
        steps: [
          { text: 'Acesse Estoque → Gestão de CMV no menu lateral.' },
          { text: 'Acompanhe o CMV % total e por categoria de insumo.' },
          { text: 'Verde = eficiente / Amarelo = atenção / Vermelho = acima do esperado.' },
          { text: 'Analise quais produtos ou categorias têm maior impacto no CMV para tomar ações.' },
        ],
        tips: ['CMV ideal para açaí e complementos: entre 25% e 35% da receita. Acima de 40% exige revisão de preços ou fornecedores.']
      },
      {
        id: 'est-purchases',
        icon: ShoppingCart,
        title: 'Lista de Compras',
        route: '/admin/stock/purchases',
        summary: 'Lista automática de reposição baseada no estoque mínimo.',
        steps: [
          { text: 'Acesse Estoque → Lista de Compras no menu lateral.' },
          { text: 'O sistema lista os insumos abaixo do mínimo com a quantidade sugerida de reposição.' },
          { text: 'Ajuste as quantidades e exporte em PDF para enviar ao fornecedor.' },
        ],
      },
      {
        id: 'est-purchase-history',
        icon: History,
        title: 'Histórico de Compras',
        route: '/admin/stock/purchase-history',
        summary: 'Análise de todas as entradas do tipo Compra/NF com filtros e totais.',
        steps: [
          { text: 'Selecione o período e filtre por Fornecedor e/ou Categoria.' },
          { text: 'Veja os cards de Total Gasto, Qtd Total e Ticket Médio por entrada.' },
          { text: 'Exporte o relatório em PDF com todos os filtros aplicados.' },
        ],
      },
      {
        id: 'est-checklists',
        icon: ClipboardList,
        title: 'Rotinas Operacionais',
        route: '/admin/stock/checklists/execution',
        summary: 'Checklists de abertura, operação e fechamento da loja.',
        steps: [
          { text: 'Acesse Estoque → Rotinas Operacionais no menu lateral.' },
          { text: 'Selecione o checklist do período (Abertura / Operação / Fechamento).' },
          { text: 'Marque cada item conforme executado. Itens pendentes geram alertas no painel.' },
          { text: 'Gerentes gerenciam os checklists em Estoque → Gestão de Rotinas.' },
        ],
        tips: ['Execute na sequência: Abertura → Operação → Fechamento. Nunca pule etapas.']
      },
      {
        id: 'bonificacoes',
        icon: Gift,
        title: 'Bonificações',
        route: '/admin/stock/bonificacoes',
        summary: 'Registro de produtos bonificados (amostras, brindes e trocas) recebidos de fornecedores.',
        steps: [
          { text: 'Acesse Estoque → Bonificações no menu lateral.' },
          { text: 'Clique em "Nova Bonificação" e selecione o fornecedor e o período de referência.' },
          { text: 'Adicione os itens bonificados com quantidade e valor unitário correspondente.' },
          { text: 'Informe a justificativa (ex.: atingimento de meta de compra, promoção de lançamento).' },
          { text: 'Confirme o registro — o sistema dá entrada no estoque e registra a bonificação para controle financeiro.', tip: 'Registre bonificações sempre que receber amostras para manter o estoque e o CMV precisos.' },
        ],
        tips: ['Bonificações recorrentes de fornecedores são um indicativo de bom volume de compra — use esse dado nas negociações.']
      },
    ]
  },
  {
    id: 'checkgrau',
    label: 'CheckGrau — Gestão Operacional',
    icon: ShieldCheck,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
    description: 'Checklists operacionais, agenda de tarefas por unidade, score da equipe e o app do colaborador.',
    modules: [
      {
        id: 'cg-painel',
        icon: Gauge,
        title: 'Painel Operacional',
        route: '/admin/checkgrau',
        summary: 'Visão consolidada da operação: conformidade, pontualidade e score por período, setor, turno e responsável.',
        steps: [
          { text: 'Acesse CheckGrau → Painel no menu lateral.' },
          { text: 'Use o filtro "Lojas" para acompanhar uma ou várias unidades ao mesmo tempo (gerentes multi-loja).' },
          { text: 'Ajuste o período (De/Até) e os filtros de setor, turno e responsável.' },
          { text: 'Acompanhe os KPIs, o score operacional e os rankings por setor e por responsável.' },
          { text: 'Clique em "Resumo do dia (IA)" para gerar um resumo automático da operação (consolidado das lojas do filtro).', tip: 'Com várias lojas selecionadas, o resumo destaca a unidade com melhor e pior desempenho.' },
        ],
      },
      {
        id: 'cg-lojas',
        icon: Store,
        title: 'Lojas',
        route: '/admin/checkgrau/stores',
        summary: 'Cadastro das unidades atendidas pelo CheckGrau.',
        steps: [
          { text: 'Acesse CheckGrau → Lojas.' },
          { text: 'Clique em "Nova loja" e informe nome, código, endereço e telefone.' },
          { text: 'Defina o status da loja (ativa/inativa).' },
          { text: 'As lojas cadastradas ficam disponíveis para vincular colaboradores, rotinas e agenda.' },
        ],
      },
      {
        id: 'cg-setores-turnos',
        icon: LayoutGrid,
        title: 'Setores & Turnos',
        route: '/admin/checkgrau/setores-turnos',
        summary: 'Organiza a operação por área (setor) e horário (turno).',
        steps: [
          { text: 'Acesse CheckGrau → Setores & Turnos.' },
          { text: 'Cadastre os setores da operação (ex.: Cozinha, Salão, Estoque).' },
          { text: 'Cadastre os turnos (ex.: Manhã, Tarde, Noite).' },
          { text: 'Setores e turnos são usados nas rotinas e nos relatórios para segmentar as tarefas.', tip: 'Configure setores e turnos antes de criar as rotinas.' },
        ],
      },
      {
        id: 'cg-colaboradores',
        icon: Users,
        title: 'Colaboradores',
        route: '/admin/checkgrau/collaborators',
        summary: 'Cadastro da equipe, score, engajamento e detalhe individual. O acesso ao app é pelo WhatsApp.',
        steps: [
          { text: 'Acesse CheckGrau → Colaboradores.' },
          { text: 'Clique em "Novo colaborador" e informe nome, WhatsApp, cargo e as lojas que ele atende.' },
          { text: 'Na lista, veja o Score (pontos), o Engajamento (pontualidade) e o último acesso de cada um.' },
          { text: 'Clique num colaborador para abrir o detalhe: visão geral, histórico de pontualidade, checklists executados e notas.' },
          { text: 'Use a aba "Notas" para registrar acompanhamentos privados do gestor.', tip: 'O botão de WhatsApp abre a conversa direto com o colaborador.' },
        ],
        tips: ['O colaborador acessa o app pelo WhatsApp (código no 1º acesso) e, depois, por um PIN de 6 dígitos.']
      },
      {
        id: 'cg-checklists',
        icon: ClipboardCheck,
        title: 'Checklists',
        route: '/admin/checkgrau/checklists',
        summary: 'Modelos de checklist e suas perguntas (itens).',
        steps: [
          { text: 'Acesse CheckGrau → Checklists.' },
          { text: 'Clique em "Novo Checklist", dê um nome e defina a frequência.' },
          { text: 'Abra "Configurar" e adicione as perguntas, escolhendo o tipo de cada uma (Sim/Não, número, texto, data, foto, avaliação, etc.).' },
          { text: 'Marque as exigências por item: foto, GPS, comentário ou assinatura obrigatórios.' },
          { text: 'Para temperatura/faixa, defina os limites — o sistema aprova ou reprova automaticamente.', tip: 'Use o lápis no card para editar o nome, a frequência e a descrição do checklist.' },
        ],
      },
      {
        id: 'cg-rotinas',
        icon: CalendarClock,
        title: 'Rotinas',
        route: '/admin/checkgrau/rotinas',
        summary: 'Define quando cada checklist deve ser feito, por quem e com qual prazo — alimenta a agenda.',
        steps: [
          { text: 'Acesse CheckGrau → Rotinas.' },
          { text: 'Crie uma rotina escolhendo o checklist, a loja, o setor e o turno.' },
          { text: 'Defina a recorrência (diária, semanal nos dias marcados ou mensal) e o horário.' },
          { text: 'Informe a tolerância de atraso (SLA) e o responsável (colaborador).' },
          { text: 'Marque como crítica quando a tarefa for essencial.', tip: 'As rotinas ativas geram a Agenda automaticamente.' },
        ],
      },
      {
        id: 'cg-agenda',
        icon: CalendarCheck,
        title: 'Agenda',
        route: '/admin/checkgrau/agenda',
        summary: 'As tarefas do dia geradas pelas rotinas, agrupadas por status.',
        steps: [
          { text: 'Acesse CheckGrau → Agenda e escolha a data.' },
          { text: 'Clique em "Gerar dia" para materializar as tarefas daquela data, ou "Gerar mês" para o mês inteiro.' },
          { text: 'Acompanhe as tarefas em A fazer, Atrasadas, Concluídas e Canceladas.' },
          { text: 'Clique numa tarefa concluída para ver as respostas e as fotos enviadas pelo colaborador.', tip: '"Gerar mês" é idempotente — pode clicar quantas vezes quiser sem duplicar.' },
        ],
      },
      {
        id: 'cg-app-colaborador',
        icon: Smartphone,
        title: 'App do Colaborador',
        route: '/colaborador',
        summary: 'O aplicativo mobile onde a equipe executa os checklists.',
        steps: [
          { text: 'O colaborador acessa /colaborador no celular e entra com o WhatsApp (código no 1º acesso) e cria um PIN.' },
          { text: 'Na Home, ele vê as tarefas do dia e o card "Fazer agora" com a mais urgente.' },
          { text: 'Toca na tarefa, lê os detalhes e inicia o checklist — responde pergunta por pergunta.' },
          { text: 'Anexa foto, captura GPS e assina quando exigido; ao final, vê a tela de conclusão com o score e os pontos.' },
          { text: 'Funciona offline: as respostas são enviadas automaticamente quando a conexão volta.', tip: 'No próprio app o colaborador vê Histórico, Ranking, Mensagens e Notificações.' },
        ],
      },
      {
        id: 'cg-mensagens',
        icon: MessageSquare,
        title: 'Mensagens',
        route: '/admin/checkgrau/mensagens',
        summary: 'Envia avisos do gestor para um colaborador ou para a loja toda.',
        steps: [
          { text: 'Acesse CheckGrau → Mensagens.' },
          { text: 'Escolha a loja e o destinatário (um colaborador ou "Toda a loja").' },
          { text: 'Escreva o título (opcional) e a mensagem, e clique em Enviar.' },
          { text: 'O colaborador recebe um alerta no app (som + aviso) e lê em Mensagens.', tip: 'O histórico mostra tudo o que já foi enviado por loja.' },
        ],
      },
      {
        id: 'cg-alertas',
        icon: Bell,
        title: 'Alertas',
        route: '/admin/checkgrau/alertas',
        summary: 'Configura alertas operacionais e por WhatsApp para desvios.',
        steps: [
          { text: 'Acesse CheckGrau → Alertas.' },
          { text: 'Defina o número de WhatsApp que recebe os alertas da unidade.' },
          { text: 'Configure os gatilhos (ex.: tarefa crítica não executada, item fora do padrão).' },
          { text: 'Os alertas ajudam a agir rápido quando algo sai do combinado.' },
        ],
      },
      {
        id: 'cg-rankings',
        icon: Trophy,
        title: 'Rankings',
        route: '/admin/checkgrau/rankings',
        summary: 'Classificação das unidades por desempenho operacional.',
        steps: [
          { text: 'Acesse CheckGrau → Rankings.' },
          { text: 'Veja as lojas ordenadas por score (conformidade + pontualidade).' },
          { text: 'Use para reconhecer as melhores unidades e identificar quem precisa de apoio.' },
        ],
      },
      {
        id: 'cg-desempenho',
        icon: Users,
        title: 'Desempenho',
        route: '/admin/checkgrau/desempenho',
        summary: 'Desempenho e pontuação por colaborador.',
        steps: [
          { text: 'Acesse CheckGrau → Desempenho.' },
          { text: 'Acompanhe o ranking de colaboradores por pontos e conformidade.' },
          { text: 'Use para reconhecer os destaques e acompanhar a evolução da equipe.' },
        ],
      },
      {
        id: 'cg-engajamento',
        icon: Activity,
        title: 'Engajamento',
        route: '/admin/checkgrau/engajamento',
        summary: 'Mede a adesão da equipe ao app: funil da jornada, heatmap e colaboradores em risco.',
        steps: [
          { text: 'Acesse CheckGrau → Engajamento.' },
          { text: 'Filtre por lojas e período (30/90 dias).' },
          { text: 'Veja os KPIs de adoção (taxa de ativação e ativos nos últimos 7 dias).' },
          { text: 'Acompanhe o funil (cadastrados → acessaram → executaram → ativos) e o heatmap de execuções por dia da semana.' },
          { text: 'Confira os "Colaboradores em risco" — quem acessou mas parou de executar.', tip: 'Ótimo para saber o quanto a equipe realmente está usando o app.' },
        ],
      },
      {
        id: 'cg-rede',
        icon: Network,
        title: 'Rede',
        route: '/admin/checkgrau/rede',
        summary: 'Visão consolidada de todas as unidades da rede.',
        steps: [
          { text: 'Acesse CheckGrau → Rede.' },
          { text: 'Compare o desempenho das unidades num único lugar.' },
          { text: 'Use para acompanhar a operação da rede de forma macro.' },
        ],
      },
      {
        id: 'cg-grupos-contagem',
        icon: Layers,
        title: 'Grupos de Contagem',
        route: '/admin/checkgrau/grupos-contagem',
        summary: 'Agrupa insumos para as contagens de inventário.',
        steps: [
          { text: 'Acesse CheckGrau → Grupos de Contagem.' },
          { text: 'Crie grupos e adicione os insumos que serão contados juntos.' },
          { text: 'Os grupos são usados nas contagens recorrentes.' },
        ],
      },
      {
        id: 'cg-contagens-recorrentes',
        icon: RotateCcw,
        title: 'Contagens Recorrentes',
        route: '/admin/checkgrau/contagens-recorrentes',
        summary: 'Agenda inventários que se repetem automaticamente.',
        steps: [
          { text: 'Acesse CheckGrau → Contagens Recorrentes.' },
          { text: 'Crie uma contagem escolhendo o grupo de insumos e a frequência.' },
          { text: 'A cada ciclo, a contagem aparece para ser executada e registrada.' },
        ],
      },
    ]
  },
  {
    id: 'clientes',
    label: 'Clientes & Marketing',
    icon: Users,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-500/10',
    description: 'CRM de clientes, pipeline de leads, avaliações NPS, campanhas, comunidade e analytics.',
    modules: [
      {
        id: 'clientes-crm',
        icon: Users,
        title: 'Clientes (CRM)',
        route: '/admin/customers',
        summary: 'Base de clientes com histórico de pedidos, frequência e valor gasto.',
        steps: [
          { text: 'Acesse Gestão → Clientes no menu lateral.' },
          { text: 'Visualize a lista de clientes com total gasto, número de pedidos e última compra.' },
          { text: 'Clique em um cliente para ver o histórico completo de pedidos.' },
          { text: 'Use os filtros para segmentar por frequência, valor ou período de cadastro.' },
        ],
        tips: ['Clientes com alta frequência são candidatos a programas de fidelidade — use os dados do CRM para personalizar ofertas.']
      },
      {
        id: 'nps',
        icon: MessageSquare,
        title: 'Avaliações NPS',
        route: '/admin/feedback',
        summary: 'Net Promoter Score — satisfação dos clientes por pedido.',
        steps: [
          { text: 'Acesse Gestão → Avaliações NPS no menu lateral.' },
          { text: 'Visualize a nota média, distribuição de promotores/neutros/detratores.' },
          { text: 'Leia os comentários dos clientes e responda quando necessário.' },
          { text: 'Filtre por período para acompanhar a evolução da satisfação ao longo do tempo.' },
        ],
        tips: ['NPS acima de 50 é considerado bom. Acima de 75 é excelente para o setor de food service.']
      },
      {
        id: 'marketing',
        icon: Megaphone,
        title: 'Campanhas de Marketing',
        route: '/admin/marketing',
        summary: 'Criação e gestão de campanhas promocionais e push notifications.',
        steps: [
          { text: 'Acesse Marketing → Campanhas no menu lateral.' },
          { text: 'Clique em "Nova Campanha" e defina o público-alvo (todos, inativos, VIPs…).' },
          { text: 'Crie a mensagem e defina o canal: push notification, banner no app ou e-mail.' },
          { text: 'Agende a campanha ou publique imediatamente.' },
          { text: 'Acompanhe os resultados: taxa de abertura, cliques e conversão em pedidos.', tip: 'Campanhas para clientes inativos (+30 dias sem pedido) têm alto retorno com desconto de reativação.' },
        ],
      },
      {
        id: 'analytics',
        icon: BarChart3,
        title: 'Food Analytics',
        route: '/admin/analytics',
        summary: 'Análise avançada de vendas por produto, horário, categoria e período.',
        steps: [
          { text: 'Acesse Gestão → Food Analytics no menu lateral.' },
          { text: 'Analise os produtos mais vendidos e os de menor saída.' },
          { text: 'Identifique os horários de pico para otimizar a escala da equipe.' },
          { text: 'Compare períodos para detectar crescimento ou queda em categorias específicas.' },
        ],
        tips: ['Use o Food Analytics mensalmente para decisões de cardápio — retire produtos com baixa saída e invista nos campeões.']
      },
      {
        id: 'crm-dashboard',
        icon: TrendingUp,
        title: 'CRM — Dashboard de Leads',
        route: '/admin/crm',
        summary: 'Visão geral de leads: volume por origem, funil de conversão e evolução no período.',
        steps: [
          { text: 'Acesse Clientes → CRM no menu lateral.' },
          { text: 'Selecione o período (semana, mês ou trimestre) para atualizar os indicadores.' },
          { text: 'Analise o funil: Novos → Atendimento → Proposta → Fechados.' },
          { text: 'Veja os gráficos de leads por origem (WhatsApp, Instagram, Site, Indicação) para saber de onde vêm os melhores clientes.' },
          { text: 'Use o botão Pipeline para gerenciar os leads ativos no kanban.' },
        ],
      },
      {
        id: 'crm-pipeline',
        icon: Layers,
        title: 'CRM — Pipeline',
        route: '/admin/crm/pipeline',
        summary: 'Kanban de leads com arraste entre estágios, notas e histórico de interações.',
        steps: [
          { text: 'Acesse Clientes → CRM → Pipeline no menu lateral.' },
          { text: 'Visualize os leads em colunas por estágio: Novo, Em Atendimento, Proposta, Fechado.' },
          { text: 'Clique em um card de lead para ver o histórico de interações e adicionar notas.' },
          { text: 'Arraste o card para a próxima coluna ao avançar o estágio do lead.' },
          { text: 'Use o botão "Novo Lead" para cadastrar um lead manualmente com nome, origem e contato.', tip: 'Registre o máximo de informações no primeiro contato — quanto mais contexto, maior a taxa de conversão.' },
        ],
        tips: ['Leads sem movimentação por mais de 7 dias ficam destacados — faça follow-up imediato.']
      },
      {
        id: 'crm-scripts',
        icon: MessageSquare,
        title: 'CRM — Scripts de Vendas',
        route: '/admin/crm/scripts',
        summary: 'Biblioteca de scripts de atendimento por categoria: abertura, objeção, fechamento.',
        steps: [
          { text: 'Acesse Clientes → CRM → Scripts no menu lateral.' },
          { text: 'Filtre por categoria (Abertura, Objeção, Proposta, Follow-up, Fechamento) para localizar o script ideal.' },
          { text: 'Clique em "Copiar" para copiar o texto do script para a área de transferência e colar no WhatsApp.' },
          { text: 'Para criar um novo script: clique em "Novo Script", selecione a categoria, dê um título e escreva o texto.' },
          { text: 'Ative ou desative scripts com o toggle — scripts inativos não aparecem na lista principal.', tip: 'Personalize os scripts com o nome do lead usando o marcador {nome} — a equipe substitui na hora do envio.' },
        ],
      },
      {
        id: 'comunidade',
        icon: MessageCircle,
        title: 'Comunidade',
        route: '/admin/comunidade',
        summary: 'Feed de posts entre unidades, ranking de performance e conquistas da rede.',
        steps: [
          { text: 'Acesse Clientes → Comunidade no menu lateral.' },
          { text: 'No feed, veja os posts de outras unidades: cases de sucesso, dicas operacionais e comunicados.' },
          { text: 'Clique em "Novo Post" para compartilhar uma conquista ou dica com a rede.' },
          { text: 'Curta e comente posts de outras unidades para engajar com a comunidade.' },
          { text: 'Acesse o Ranking para ver a posição da sua unidade com base em faturamento e aulas concluídas.', tip: 'Unidades no topo do ranking recebem destaque e podem ganhar bonificações da franqueadora.' },
        ],
        tips: ['Compartilhe resultados reais e boas práticas — a troca de experiências entre unidades acelera o crescimento de toda a rede.']
      },
    ]
  },
  {
    id: 'caf',
    label: 'CAF — Central de Atendimento',
    icon: Headphones,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
    description: 'Central de Atendimento ao Franqueado: tickets, base de conhecimento, relatórios e portal público.',
    modules: [
      {
        id: 'caf-dashboard',
        icon: BarChart2,
        title: 'Dashboard CAF',
        route: '/admin/caf/dashboard',
        summary: 'KPIs da central de atendimento: total de tickets, tempo médio de resolução e taxa de resolução.',
        steps: [
          { text: 'Acesse CAF → Dashboard no menu lateral.' },
          { text: 'Visualize os indicadores do período: total de atendimentos, resolvidos, pendentes e tempo médio.' },
          { text: 'Analise o gráfico de atendimentos por categoria para identificar as áreas com mais demanda.' },
          { text: 'Use o filtro de período para comparar meses e acompanhar a evolução da eficiência.' },
        ],
        tips: ['Tempo médio de resolução acima de 48h indica necessidade de reforço na equipe ou na base de conhecimento.']
      },
      {
        id: 'caf-atendimentos',
        icon: Headphones,
        title: 'Atendimentos',
        route: '/admin/caf/atendimentos',
        summary: 'Gestão de tickets abertos pelos franqueados com status, categoria, histórico e transferência.',
        steps: [
          { text: 'Acesse CAF → Atendimentos no menu lateral.' },
          { text: 'Visualize todos os tickets atribuídos à sua categoria de atendimento. MASTER vê todos.' },
          { text: 'Clique em um ticket para abrir o painel de detalhes com 4 abas: Informações, Status & Ações, Pesquisa NPS e Histórico.' },
          { text: 'Na aba "Status & Ações": atualize o status (Aberto → Em Andamento → Aguardando Franqueado → Resolvido/Encerrado).' },
          { text: 'Use "Transferir Categoria" para mover o ticket para outra área responsável — informe o motivo da transferência.', tip: 'Toda transferência e mudança de status fica registrada no Histórico do ticket para rastreabilidade.' },
          { text: 'Na aba "Pesquisa": avalie a qualidade do atendimento com o score de satisfação ao encerrar.' },
        ],
        tips: [
          'Atendentes veem apenas tickets da(s) categoria(s) autorizada(s) no cadastro de usuário.',
          'Para abrir um novo ticket manualmente, clique em "Novo Atendimento" no topo da página.',
        ]
      },
      {
        id: 'caf-base-conhecimento',
        icon: BookOpen,
        title: 'Base de Conhecimento',
        route: '/admin/caf/base-conhecimento',
        summary: 'Biblioteca de artigos e tutoriais para resolução de dúvidas frequentes dos franqueados.',
        steps: [
          { text: 'Acesse CAF → Base de Conhecimento no menu lateral.' },
          { text: 'Pesquise pelo título do artigo na barra de busca ou navegue pelas categorias.' },
          { text: 'Clique em um artigo para ler o conteúdo completo com passos e dicas.' },
          { text: 'Para criar um artigo (equipe CAF): clique em "Novo Artigo", preencha título, categoria e conteúdo em Markdown.' },
          { text: 'Publique ou salve como rascunho — apenas artigos publicados são visíveis para os franqueados.', tip: 'Crie artigos para as dúvidas mais frequentes recebidas nos atendimentos — isso reduz o volume de tickets.' },
        ],
      },
      {
        id: 'caf-relatorios',
        icon: FileText,
        title: 'Relatórios CAF',
        route: '/admin/caf/relatorios',
        summary: 'Análise de atendimentos por período, categoria, atendente e status.',
        steps: [
          { text: 'Acesse CAF → Relatórios no menu lateral.' },
          { text: 'Selecione o período de análise (mês, trimestre ou personalizado).' },
          { text: 'Filtre por categoria, status ou atendente para análises segmentadas.' },
          { text: 'Visualize os gráficos de volume por dia, distribuição por categoria e tempo médio de resolução.' },
          { text: 'Exporte o relatório em PDF para apresentar em reuniões de gestão.', tip: 'Analise mensalmente quais categorias têm mais tickets — esse é o insumo para criar artigos na Base de Conhecimento.' },
        ],
      },
      {
        id: 'portal-franqueado',
        icon: Globe,
        title: 'Portal do Franqueado',
        route: '/suporte',
        summary: 'Página pública para abertura de chamados sem necessidade de login no sistema.',
        steps: [
          { text: 'Acesse o link app.acainograu.com.br/suporte em qualquer navegador (sem login).' },
          { text: 'Digite a senha de acesso fornecida pela franqueadora: nograu' },
          { text: 'Selecione a sua unidade na lista de lojas.' },
          { text: 'Preencha seu nome, cargo, categoria do problema e descrição detalhada.' },
          { text: 'Clique em "Abrir Chamado" — um número de protocolo será gerado e o ticket aparecerá automaticamente no painel da equipe CAF.', tip: 'Guarde o número de protocolo para acompanhar o andamento do seu chamado com a equipe CAF.' },
        ],
        tips: ['O Portal do Franqueado é o canal oficial para abertura de tickets quando o acesso ao sistema não está disponível.']
      },
    ]
  },
  {
    id: 'franquia',
    label: 'Franquia & Distribuição',
    icon: Store,
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10',
    description: 'Sistema de pedidos entre franqueados e a distribuidora central.',
    modules: [
      {
        id: 'pedido-insumos',
        icon: ShoppingCart,
        title: 'Pedido de Insumos (Franqueado)',
        route: '/admin/orders/catalog',
        summary: 'Catálogo de insumos da distribuidora para pedidos de reposição.',
        steps: [
          { text: 'Acesse Franquia → Pedido de Insumos no menu lateral.' },
          { text: 'Navegue pelo catálogo de insumos disponibilizados pela distribuidora.' },
          { text: 'Adicione os itens desejados ao carrinho com as quantidades necessárias.' },
          { text: 'Revise o pedido e confirme. A distribuidora recebe o pedido automaticamente.' },
          { text: 'Acompanhe o status do pedido em Franquia → Meus Pedidos.', tip: 'Faça os pedidos com antecedência mínima de 48h para garantir entrega no prazo.' },
        ],
      },
      {
        id: 'meus-pedidos',
        icon: History,
        title: 'Meus Pedidos (Franqueado)',
        route: '/admin/orders/history',
        summary: 'Histórico e status dos pedidos de insumos feitos à distribuidora.',
        steps: [
          { text: 'Acesse Franquia → Meus Pedidos no menu lateral.' },
          { text: 'Visualize todos os pedidos com status: Pendente, Confirmado, Em Rota, Entregue.' },
          { text: 'Clique em um pedido para ver os detalhes dos itens e valores.' },
          { text: 'Confirme o recebimento quando a carga chegar para dar baixa no pedido.' },
        ],
      },
      {
        id: 'gestao-cargas',
        icon: Package,
        title: 'Gestão de Cargas (Master)',
        route: '/admin/orders/management',
        summary: 'Visão e gestão de todos os pedidos recebidos das unidades franqueadas.',
        steps: [
          { text: 'Acesse Distribuição → Gestão de Cargas no menu lateral (apenas Master).' },
          { text: 'Visualize todos os pedidos das unidades com status e itens.' },
          { text: 'Confirme, separe e expeda os pedidos atualizando o status para "Em Rota".' },
          { text: 'Gere o romaneio de entrega para o motorista.' },
        ],
      },
      {
        id: 'catalogo-insumos',
        icon: Grid,
        title: 'Catálogo de Insumos (Master)',
        route: '/admin/orders/products',
        summary: 'Gestão dos produtos disponíveis para pedido pelas unidades.',
        steps: [
          { text: 'Acesse Distribuição → Catálogo de Insumos no menu lateral (apenas Master).' },
          { text: 'Cadastre os insumos que serão disponibilizados às unidades franqueadas.' },
          { text: 'Defina preço, unidade e disponibilidade de cada item.' },
          { text: 'Itens desativados não aparecem no catálogo das unidades.' },
        ],
      },
      {
        id: 'franqueados',
        icon: Store,
        title: 'Lista de Franqueados (Master)',
        route: '/admin/franchisees',
        summary: 'Cadastro e gestão de todas as unidades franqueadas.',
        steps: [
          { text: 'Acesse Distribuição → Lista de Franqueados no menu lateral (apenas Master).' },
          { text: 'Visualize todas as unidades com status, responsável e data de cadastro.' },
          { text: 'Clique em uma unidade para editar dados, ativar/desativar e gerenciar acesso.' },
          { text: 'Cadastre novas unidades com os dados do responsável e configurações iniciais.' },
        ],
      },
    ]
  },
  {
    id: 'sistema',
    label: 'Configurações & Sistema',
    icon: Settings,
    color: 'text-slate-600',
    bgColor: 'bg-slate-500/10',
    description: 'Configurações gerais, PDV, universidade corporativa e ferramentas do sistema.',
    modules: [
      {
        id: 'config-geral',
        icon: Settings,
        title: 'Configurações Gerais',
        route: '/admin/settings',
        summary: 'Dados da loja, integrações, formas de pagamento e configurações da conta.',
        steps: [
          { text: 'Acesse Sistema → Configurações Gerais no menu lateral.' },
          { text: 'Na aba Loja: atualize nome, endereço, horários de funcionamento e logo.' },
          { text: 'Na aba Pagamentos: ative as formas de pagamento aceitas e configure taxas.' },
          { text: 'Na aba Entrega: defina o raio de entrega, tempo estimado e taxa mínima.' },
          { text: 'Na aba Impressora: configure a impressora térmica para comprovantes.', tip: 'Teste a impressora sempre que trocar de equipamento ou instalar em novo dispositivo.' },
        ],
      },
      {
        id: 'config-pdv',
        icon: ShoppingCart,
        title: 'Configurações PDV',
        route: '/admin/pdv/configuracoes',
        summary: 'Personalização do ponto de venda: layout, atalhos e comportamento.',
        steps: [
          { text: 'Acesse Sistema → Configurações PDV no menu lateral.' },
          { text: 'Configure os atalhos de teclado para as ações mais frequentes.' },
          { text: 'Defina o comportamento padrão: abrir gaveta automaticamente, perguntar cpf, etc.' },
          { text: 'Ajuste o layout do PDV: tamanho dos cards, colunas e tema.' },
        ],
      },
      {
        id: 'universidade',
        icon: GraduationCap,
        title: 'Universidade Grau',
        route: '/admin/universidade',
        summary: 'Trilhas de aprendizado para capacitação da equipe.',
        steps: [
          { text: 'Acesse Sistema → Universidade no menu lateral.' },
          { text: 'Explore as trilhas de aprendizado disponíveis por área (Operação, Atendimento, Gestão).' },
          { text: 'Clique em uma trilha para ver os módulos e iniciar o treinamento.' },
          { text: 'Acompanhe seu progresso na barra de conclusão de cada trilha.' },
          { text: 'Gerentes podem criar novas trilhas em Gestão → Universidade (Admin).', tip: 'Compartilhe as trilhas com novos funcionários no primeiro dia de trabalho.' },
        ],
      },
      {
        id: 'performance',
        icon: Zap,
        title: 'Performance',
        route: '/admin/performance',
        summary: 'Indicadores de desempenho da equipe e da operação.',
        steps: [
          { text: 'Acesse Sistema → Performance no menu lateral.' },
          { text: 'Acompanhe os KPIs individuais e coletivos da equipe.' },
          { text: 'Identifique oportunidades de melhoria por operador ou turno.' },
        ],
      },
      {
        id: 'usuarios-permissoes',
        icon: UserCog,
        title: 'Usuários & Permissões',
        route: '/admin/settings/usuarios',
        summary: 'Cadastro de usuários, controle de perfis, permissões de módulos e auditoria de acessos.',
        steps: [
          { text: 'Acesse Sistema → Usuários no menu lateral (requer perfil MASTER ou FRANQUEADO).' },
          { text: 'Clique em "Novo Usuário" para cadastrar: nome, e-mail, perfil (MASTER / FRANQUEADO / COLABORADOR) e loja.' },
          { text: 'Na aba "Permissões" do cadastro: ative os módulos a que o usuário terá acesso.' },
          { text: 'Na seção "Permissões de Atendimento": ative "Participa da CAF" e selecione as categorias de tickets que o usuário pode atender.' },
          { text: 'Use o botão de chave (🔑) na lista de usuários para enviar o e-mail de redefinição de senha.', tip: 'O e-mail de redefinição de senha sempre aponta para o ambiente de produção (app.acainograu.com.br).' },
          { text: 'Na aba "Auditoria" (MASTER): veja o histórico completo de criações, edições e desativações de usuários.' },
        ],
        tips: [
          'Perfil COLABORADOR: acesso restrito ao PDV e módulos específicos permitidos.',
          'Perfil FRANQUEADO: acesso à sua unidade e todos os módulos exceto configurações MASTER.',
          'Perfil MASTER: acesso total ao sistema, todas as unidades e dados consolidados.',
        ]
      },
      {
        id: 'uazapi-whatsapp',
        icon: MessageCircle,
        title: 'Integração WhatsApp (UazAPI)',
        route: '/admin/settings',
        summary: 'Configuração da integração com WhatsApp via UazAPI para notificações automáticas de pedidos.',
        steps: [
          { text: 'Acesse Configurações → aba "WhatsApp" (UazAPI) nas Configurações Gerais.' },
          { text: 'Informe a URL base da sua instância UazAPI e o token de autenticação.' },
          { text: 'Clique em "Testar Conexão" para verificar se as credenciais estão corretas.' },
          { text: 'Selecione os eventos que disparam notificações: pedido recebido, confirmado, em preparo, pronto, saiu para entrega, entregue, cancelado.' },
          { text: 'Clique em "Aplicar Webhook" para registrar o endpoint do GrauOS na sua instância UazAPI.', warn: 'O número de WhatsApp conectado à instância receberá as mensagens — certifique-se de que é o número correto da loja.' },
          { text: 'Ative a integração com o toggle principal e salve.' },
        ],
        tips: ['Notificações automáticas de status de pedido reduzem chamadas de suporte do cliente em até 60%.']
      },
      {
        id: 'assistente-ia',
        icon: Bot,
        title: 'Assistente IA',
        route: '/admin/assistente',
        summary: 'Assistente virtual com respostas inteligentes sobre gestão, marketing e operação.',
        steps: [
          { text: 'Acesse o ícone de chat do Assistente no menu lateral.' },
          { text: 'Use os atalhos de sugestão para perguntas rápidas: Como aumentar o faturamento? Dicas para reduzir CMV? Ideias de marketing local?' },
          { text: 'Digite sua pergunta no campo de chat e pressione Enter ou clique em Enviar.' },
          { text: 'O Assistente responde com estratégias práticas baseadas nos dados da sua unidade e benchmarks da rede.', tip: 'Quanto mais específica a pergunta, mais útil a resposta — inclua contexto como "meu CMV está em 38%" para respostas personalizadas.' },
        ],
      },
      {
        id: 'grauzinho',
        icon: Gamepad2,
        title: 'Grauzinho — Jogo da Rede',
        route: '/admin/game/grauzinho',
        summary: 'Jogo runner em perspectiva para os colaboradores — colete açaís, desvie de obstáculos e dispute o ranking.',
        steps: [
          { text: 'Acesse o ícone do Grauzinho no menu lateral.' },
          { text: 'Clique em "Jogar" na tela inicial. Na tela de corrida: use as setas ou A/D para trocar de faixa.' },
          { text: 'Colete açaís para ganhar pontos e AçaíCoins. Desvie de cones e obstáculos para não perder a corrida.' },
          { text: 'Pegue power-ups: Ímã (atrai itens), Escudo (proteção) e Turbo (velocidade).' },
          { text: 'Ao terminar, veja sua pontuação e confira o Ranking global da rede.', tip: 'Use as AçaíCoins conquistadas para desbloquear itens na Loja do jogo.' },
        ],
        tips: ['O Grauzinho é uma forma de integração da equipe — realize campeonatos internos para motivar os colaboradores.']
      },
    ]
  },
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function GlobalHelpPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());

  const toggleModule = (id: string) => {
    setOpenModules(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const [isExporting, setIsExporting] = useState(false);

  const exportPDF = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const marginL = 20;
      const marginR = 20;
      const marginTop = 25;
      const marginBottom = 20;
      const contentW = pageW - marginL - marginR;
      let y = marginTop;
      let pageNum = 1;

      const addFooter = () => {
        pdf.setFontSize(8);
        pdf.setTextColor(160, 160, 160);
        pdf.text(sanitize(`Pagina ${pageNum}`), pageW / 2, pageH - 10, { align: 'center' });
        pdf.text('Manual Operacional - GrauOS', marginL, pageH - 10);
        const now = new Date();
        pdf.text(now.toLocaleDateString('pt-BR'), pageW - marginR, pageH - 10, { align: 'right' });
      };

      const checkPage = (needed: number) => {
        if (y + needed > pageH - marginBottom) {
          addFooter();
          pdf.addPage();
          pageNum++;
          y = marginTop;
        }
      };

      // Strip emojis & map accented chars to ASCII for Helvetica compatibility
      const sanitize = (s: string): string =>
        s
          // remove emoji sequences (surrogate pairs, variation selectors, ZWJ)
          .replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{200D}]/gu, '')
          // common Portuguese accented chars -> ASCII
          .replace(/[àáâã]/g, 'a').replace(/[ÀÁÂÃ]/g, 'A')
          .replace(/[éêè]/g, 'e').replace(/[ÉÊÈ]/g, 'E')
          .replace(/[íìî]/g, 'i').replace(/[ÍÌÎ]/g, 'I')
          .replace(/[óòôõ]/g, 'o').replace(/[ÓÒÔÕ]/g, 'O')
          .replace(/[úùû]/g, 'u').replace(/[ÚÙÛ]/g, 'U')
          .replace(/ç/g, 'c').replace(/Ç/g, 'C')
          .replace(/ñ/g, 'n').replace(/Ñ/g, 'N')
          .replace(/[—–]/g, '-')
          .replace(/[""]/g, '"').replace(/['']/g, "'")
          .replace(/•/g, '-')
          .replace(/…/g, '...')
          .trim();

      const writeLine = (text: string, opts: { size?: number; bold?: boolean; color?: [number, number, number]; indent?: number; maxWidth?: number } = {}) => {
        const { size = 10, bold = false, color = [40, 40, 40], indent = 0, maxWidth } = opts;
        pdf.setFontSize(size);
        pdf.setFont('helvetica', bold ? 'bold' : 'normal');
        pdf.setTextColor(...color);
        const w = maxWidth || (contentW - indent);
        const clean = sanitize(text);
        const lines = pdf.splitTextToSize(clean, w);
        const lineH = size * 0.45;
        checkPage(lines.length * lineH + 2);
        pdf.text(lines, marginL + indent, y);
        y += lines.length * lineH + 1;
      };

      // ─── COVER PAGE ────────────────────────────────
      pdf.setFillColor(88, 28, 135); // violet-900
      pdf.rect(0, 0, pageW, pageH, 'F');

      pdf.setFontSize(42);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('Manual', pageW / 2, pageH / 2 - 20, { align: 'center' });
      pdf.text('Operacional', pageW / 2, pageH / 2 + 2, { align: 'center' });

      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(220, 200, 255);
      pdf.text('Sistema GrauOS', pageW / 2, pageH / 2 + 22, { align: 'center' });

      pdf.setFontSize(11);
      pdf.setTextColor(180, 160, 220);
      pdf.text(`${categories.length} categorias  |  ${totalModules} modulos`, pageW / 2, pageH / 2 + 36, { align: 'center' });

      const now = new Date();
      pdf.setFontSize(10);
      pdf.setTextColor(160, 140, 200);
      pdf.text(`Gerado em ${now.toLocaleDateString('pt-BR')} as ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, pageW / 2, pageH - 30, { align: 'center' });

      // ─── TABLE OF CONTENTS ─────────────────────────
      pdf.addPage();
      pageNum++;
      y = marginTop;
      writeLine('SUMARIO', { size: 22, bold: true, color: [88, 28, 135] });
      y += 6;

      pdf.setDrawColor(88, 28, 135);
      pdf.setLineWidth(0.5);
      pdf.line(marginL, y, pageW - marginR, y);
      y += 8;

      categories.forEach((cat, ci) => {
        writeLine(`${ci + 1}. ${cat.label}`, { size: 13, bold: true, color: [50, 50, 50] });
        y += 1;
        cat.modules.forEach((mod, mi) => {
          writeLine(`${ci + 1}.${mi + 1}  ${mod.title}`, { size: 10, color: [100, 100, 100], indent: 8 });
        });
        y += 3;
      });

      // ─── CONTENT ───────────────────────────────────
      categories.forEach((cat, ci) => {
        pdf.addPage();
        pageNum++;
        y = marginTop;

        // Category header bar
        pdf.setFillColor(88, 28, 135);
        pdf.roundedRect(marginL, y - 5, contentW, 14, 2, 2, 'F');
        pdf.setFontSize(15);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.text(sanitize(`${ci + 1}. ${cat.label}`), marginL + 5, y + 4);
        y += 16;

        // Category description
        writeLine(cat.description, { size: 10, color: [100, 100, 100] });
        y += 6;

        cat.modules.forEach((mod, mi) => {
          checkPage(30);

          // Module divider line
          pdf.setDrawColor(200, 200, 200);
          pdf.setLineWidth(0.3);
          pdf.line(marginL, y, pageW - marginR, y);
          y += 6;

          // Module title
          writeLine(`${ci + 1}.${mi + 1}  ${mod.title}`, { size: 13, bold: true, color: [30, 30, 30] });
          y += 1;

          // Module summary
          writeLine(mod.summary, { size: 10, color: [90, 90, 90] });
          y += 4;

          // Steps
          writeLine('Passo a Passo:', { size: 10, bold: true, color: [60, 60, 60] });
          y += 1;

          mod.steps.forEach((step, si) => {
            checkPage(12);
            writeLine(`${si + 1}.  ${step.text}`, { size: 9.5, color: [50, 50, 50], indent: 4 });
            y += 0.5;

            if (step.tip) {
              checkPage(10);
              writeLine(`[DICA] ${step.tip}`, { size: 8.5, color: [22, 163, 74], indent: 10 });
              y += 0.5;
            }
            if (step.warn) {
              checkPage(10);
              writeLine(`[ATENCAO] ${step.warn}`, { size: 8.5, color: [202, 138, 4], indent: 10 });
              y += 0.5;
            }
          });

          // Tips section
          if (mod.tips && mod.tips.length > 0) {
            y += 3;
            checkPage(12);

            pdf.setFillColor(240, 253, 244); // green-50
            const tipsText = mod.tips.map(t => `- ${t}`);
            const allTipsLines = tipsText.flatMap(t => pdf.splitTextToSize(t, contentW - 16));
            const boxH = allTipsLines.length * 4.5 + 8;
            checkPage(boxH + 4);
            pdf.roundedRect(marginL, y - 2, contentW, boxH, 2, 2, 'F');
            pdf.setDrawColor(22, 163, 74);
            pdf.setLineWidth(0.4);
            pdf.line(marginL, y - 2, marginL, y - 2 + boxH);

            writeLine('Dicas Importantes:', { size: 9, bold: true, color: [22, 130, 60], indent: 4 });
            mod.tips.forEach(tip => {
              writeLine(`-  ${tip}`, { size: 9, color: [30, 100, 50], indent: 6 });
            });
            y += 2;
          }

          y += 6;
        });
      });

      // Footer on last page
      addFooter();

      pdf.save('Manual_Operacional_GrauOS.pdf');
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const filteredCategories = useMemo(() => {
    if (!searchTerm) {
      return activeCategory
        ? categories.filter(c => c.id === activeCategory)
        : categories;
    }
    const term = searchTerm.toLowerCase();
    return categories
      .map(cat => ({
        ...cat,
        modules: cat.modules.filter(m =>
          m.title.toLowerCase().includes(term) ||
          m.summary.toLowerCase().includes(term) ||
          m.steps.some(s => s.text.toLowerCase().includes(term)) ||
          (m.tips || []).some(t => t.toLowerCase().includes(term))
        )
      }))
      .filter(cat => cat.modules.length > 0);
  }, [searchTerm, activeCategory]);

  const totalModules = categories.reduce((acc, c) => acc + c.modules.length, 0);

  return (
    <div id="manual-content" className="space-y-8 animate-in fade-in duration-700 pb-16">
      <button
        onClick={() => navigate(-1)}
        className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-primary/50 hover:text-primary hover:bg-primary/10 transition-all w-fit"
      >
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
        <span>Voltar</span>
      </button>


      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400 flex items-center gap-3">
            <HelpCircle className="text-primary shrink-0" size={36} />
            Manual Operacional
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            Guia completo de todos os módulos do sistema GrauOS
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Badge variant="outline" className="text-xs font-bold px-3 py-1.5">
            {categories.length} categorias
          </Badge>
          <Badge variant="outline" className="text-xs font-bold px-3 py-1.5">
            {totalModules} módulos documentados
          </Badge>
          <button
            onClick={exportPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Gerando...' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="glass-card p-4 flex items-center gap-3">
        <Search className="text-muted-foreground shrink-0" size={18} />
        <Input
          placeholder="Buscar em todo o manual... (ex: caixa, CMV, entrega, NF)"
          className="border-none bg-transparent focus-visible:ring-0 text-base"
          value={searchTerm}
          onChange={e => {
            setSearchTerm(e.target.value);
            if (e.target.value) {
              setOpenModules(new Set(categories.flatMap(c => c.modules.map(m => m.id))));
            }
          }}
        />
        {searchTerm && (
          <Badge variant="secondary" className="shrink-0 text-[10px] font-bold">
            {filteredCategories.reduce((acc, c) => acc + c.modules.length, 0)} resultado(s)
          </Badge>
        )}
      </div>

      {/* Category pills */}
      {!searchTerm && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-bold transition-all',
              !activeCategory
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary'
            )}
          >
            Todos os módulos
          </button>
          {categories.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all',
                  activeCategory === cat.id
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary'
                )}
              >
                <Icon size={12} />
                {cat.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Categories */}
      <div className="space-y-8">
        {filteredCategories.map(cat => {
          const CatIcon = cat.icon;
          return (
            <div key={cat.id} className="space-y-3">
              {/* Category header */}
              <div className="flex items-center gap-3">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', cat.bgColor, cat.color)}>
                  <CatIcon size={18} />
                </div>
                <div>
                  <h2 className="font-black text-xl">{cat.label}</h2>
                  <p className="text-sm text-muted-foreground">{cat.description}</p>
                </div>
                <Badge variant="outline" className="ml-auto text-[10px] font-bold shrink-0">
                  {cat.modules.length} módulos
                </Badge>
              </div>

              {/* Modules */}
              <div className="space-y-2 ml-3 pl-9 border-l-2 border-muted">
                {cat.modules.map(mod => {
                  const ModIcon = mod.icon;
                  const isOpen = openModules.has(mod.id);
                  return (
                    <div key={mod.id} className="glass-card overflow-hidden border-none shadow-md">
                      <button
                        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/20 transition-colors"
                        onClick={() => toggleModule(mod.id)}
                      >
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', cat.bgColor, cat.color)}>
                          <ModIcon size={15} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{mod.title}</span>
                            {mod.route && (
                              <Badge variant="outline" className="text-[9px] opacity-40 hidden md:inline-flex font-mono">
                                {mod.route}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{mod.summary}</p>
                        </div>
                        <div className="shrink-0 text-muted-foreground">
                          {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="px-5 pb-5 border-t space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">
                          {/* Steps */}
                          <div className="pt-4 space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                              <CheckCircle2 size={11} /> Passo a passo
                            </p>
                            <ol className="space-y-2.5">
                              {mod.steps.map((step, i) => (
                                <li key={i} className="flex gap-3">
                                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                                    {i + 1}
                                  </span>
                                  <div className="space-y-1.5 flex-1">
                                    <p className="text-sm leading-relaxed whitespace-pre-line">{step.text}</p>
                                    {step.tip && (
                                      <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded-lg px-3 py-2">
                                        <Lightbulb size={12} className="shrink-0 mt-0.5" />
                                        <p className="text-xs">{step.tip}</p>
                                      </div>
                                    )}
                                    {step.warn && (
                                      <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-lg px-3 py-2">
                                        <TriangleAlert size={12} className="shrink-0 mt-0.5" />
                                        <p className="text-xs">{step.warn}</p>
                                      </div>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ol>
                          </div>

                          {/* Tips */}
                          {mod.tips && mod.tips.length > 0 && (
                            <div className="bg-primary/5 rounded-xl p-4 space-y-2">
                              <p className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <Info size={11} /> Dicas
                              </p>
                              <ul className="space-y-1">
                                {mod.tips.map((tip, i) => (
                                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                                    <span className="text-primary mt-0.5">•</span>
                                    {tip}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Navigate */}
                          {mod.route && (
                            <button
                              onClick={() => navigate(mod.route!)}
                              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                            >
                              Ir para {mod.title} →
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredCategories.length === 0 && (
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
