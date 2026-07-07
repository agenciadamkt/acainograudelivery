// ═══════════════════════════════════════════════════════════════
// RBAC — Constantes, tipos e helpers
// ═══════════════════════════════════════════════════════════════

export type NivelPermissao = 0 | 1 | 2 | 3 | 4
export type Perfil = 'MASTER' | 'FRANQUEADO' | 'COLABORADOR'

export const NIVEL_INFO: Record<number, {
  label: string; short: string;
  color: string; bg: string; border: string; dot: string
}> = {
  0: { label: 'Sem Acesso',           short: 'Bloq.',  color: 'text-gray-400',   bg: 'bg-gray-100 dark:bg-gray-800',     border: 'border-gray-200 dark:border-gray-700', dot: 'bg-gray-300' },
  1: { label: 'Visualizar',           short: 'Ver',    color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20',   border: 'border-blue-200 dark:border-blue-800', dot: 'bg-blue-500' },
  2: { label: 'Ver + Criar',          short: 'Criar',  color: 'text-cyan-600',   bg: 'bg-cyan-50 dark:bg-cyan-900/20',   border: 'border-cyan-200 dark:border-cyan-800', dot: 'bg-cyan-500' },
  3: { label: 'Ver + Criar + Editar', short: 'Editar', color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800',dot: 'bg-amber-500' },
  4: { label: 'Acesso Total',         short: 'Total',  color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800',dot: 'bg-green-500' },
}

export const PERFIL_INFO: Record<Perfil, { label: string; color: string; bg: string }> = {
  MASTER:       { label: 'Master',      color: 'text-violet-700', bg: 'bg-violet-100 dark:bg-violet-900/30' },
  FRANQUEADO:   { label: 'Franqueado',  color: 'text-blue-700',   bg: 'bg-blue-100 dark:bg-blue-900/30'     },
  COLABORADOR:  { label: 'Colaborador', color: 'text-gray-700',   bg: 'bg-gray-100 dark:bg-gray-800'        },
}

export const CATEGORIAS = [
  { id: 'PDV',        label: 'PDV — Frente de Caixa',       emoji: '🏪' },
  { id: 'OPERACAO',   label: 'Operação',                     emoji: '📊' },
  { id: 'CARDAPIO',   label: 'Cardápio',                     emoji: '🍦' },
  { id: 'FINANCEIRO', label: 'Financeiro',                   emoji: '💰' },
  { id: 'ESTOQUE',    label: 'Estoque & Operações',          emoji: '📦' },
  { id: 'CLIENTES',   label: 'Clientes & Marketing',         emoji: '👥' },
  { id: 'CAF',        label: 'CAF — Atendimento',            emoji: '🎯' },
  { id: 'FRANQUIA',   label: 'Franquia & Distribuição',      emoji: '🤝' },
  { id: 'SISTEMA',    label: 'Configurações & Sistema',      emoji: '⚙️' },
]

export const MODULOS = [
  // PDV
  { codigo: 'pdv.nova-venda',   nome: 'Nova Venda',            categoria: 'PDV',        descricao: 'Registro de vendas no balcão' },
  { codigo: 'pdv.mesas',        nome: 'Mesas',                 categoria: 'PDV',        descricao: 'Gestão de pedidos por mesa' },
  { codigo: 'pdv.caixa',        nome: 'Caixa',                 categoria: 'PDV',        descricao: 'Abertura, sangria e fechamento' },
  { codigo: 'pdv.historico',    nome: 'Histórico PDV',         categoria: 'PDV',        descricao: 'Consulta e cancelamento de vendas' },
  // Operação
  { codigo: 'op.dashboard',     nome: 'Dashboard Operacional', categoria: 'OPERACAO',   descricao: 'Visão em tempo real da operação' },
  { codigo: 'op.pedidos',       nome: 'Pedidos Online',        categoria: 'OPERACAO',   descricao: 'Gerenciamento de pedidos do app' },
  { codigo: 'op.kds',           nome: 'KDS Cozinha',           categoria: 'OPERACAO',   descricao: 'Tela de produção da cozinha' },
  { codigo: 'op.entregas',      nome: 'Entregas',              categoria: 'OPERACAO',   descricao: 'Controle de pedidos em rota' },
  { codigo: 'op.areas-entrega', nome: 'Áreas de Entrega',      categoria: 'OPERACAO',   descricao: 'Configuração de zonas e taxas' },
  { codigo: 'op.frota',         nome: 'Frota',                 categoria: 'OPERACAO',   descricao: 'Gestão de rotas e entregadores' },
  // Cardápio
  { codigo: 'cardapio.cats',     nome: 'Categorias',           categoria: 'CARDAPIO',   descricao: 'Grupos de produtos no cardápio' },
  { codigo: 'cardapio.produtos', nome: 'Produtos',             categoria: 'CARDAPIO',   descricao: 'Cadastro e disponibilidade' },
  { codigo: 'cardapio.toppings', nome: 'Complementos',         categoria: 'CARDAPIO',   descricao: 'Extras e personalizações' },
  { codigo: 'cardapio.ingreds',  nome: 'Ingredientes',         categoria: 'CARDAPIO',   descricao: 'Ingredientes e alérgenos' },
  { codigo: 'cardapio.promo',    nome: 'Promoções',            categoria: 'CARDAPIO',   descricao: 'Cupons, descontos e ofertas' },
  // Financeiro
  { codigo: 'fin.dashboard',    nome: 'Dashboard Financeiro',  categoria: 'FINANCEIRO', descricao: 'Visão consolidada das finanças' },
  { codigo: 'fin.lancamentos',  nome: 'Lançamentos',           categoria: 'FINANCEIRO', descricao: 'Registro de receitas e despesas' },
  { codigo: 'fin.fluxo-semanal',nome: 'Fluxo Semanal',        categoria: 'FINANCEIRO', descricao: 'Fluxo de caixa dia a dia' },
  { codigo: 'fin.despesas',     nome: 'Despesas',              categoria: 'FINANCEIRO', descricao: 'Gestão e baixa de despesas' },
  { codigo: 'fin.fechamentos',  nome: 'Fechamentos de Caixa',  categoria: 'FINANCEIRO', descricao: 'Histórico de fechamentos por turno' },
  { codigo: 'fin.dre',          nome: 'DRE',                   categoria: 'FINANCEIRO', descricao: 'Demonstrativo de resultado' },
  { codigo: 'fin.receber',      nome: 'Contas a Receber',      categoria: 'FINANCEIRO', descricao: 'Valores pendentes de recebimento' },
  { codigo: 'fin.cadastros',    nome: 'Cadastros Financeiros', categoria: 'FINANCEIRO', descricao: 'Plano de contas e centros de custo' },
  // Estoque
  { codigo: 'est.central',      nome: 'Estoque Central',       categoria: 'ESTOQUE',    descricao: 'Cadastro e gestão de insumos' },
  { codigo: 'est.movimentos',   nome: 'Movimentações',         categoria: 'ESTOQUE',    descricao: 'Entradas e saídas de estoque' },
  { codigo: 'est.contagem',     nome: 'Contagem Física',       categoria: 'ESTOQUE',    descricao: 'Inventário físico semanal' },
  { codigo: 'est.cmv',          nome: 'Gestão de CMV',         categoria: 'ESTOQUE',    descricao: 'Custo da mercadoria vendida' },
  { codigo: 'est.compras',      nome: 'Lista de Compras',      categoria: 'ESTOQUE',    descricao: 'Reposição por estoque mínimo' },
  { codigo: 'est.hist-compras', nome: 'Histórico de Compras',  categoria: 'ESTOQUE',    descricao: 'Análise de compras por período' },
  { codigo: 'est.rotinas',      nome: 'Rotinas Operacionais',  categoria: 'ESTOQUE',    descricao: 'Checklists de abertura e fechamento' },
  { codigo: 'est.bonificacoes', nome: 'Bonificações',          categoria: 'ESTOQUE',    descricao: 'Controle de bonificações de insumos' },
  // Clientes & Marketing
  { codigo: 'cli.crm',          nome: 'Clientes (CRM)',        categoria: 'CLIENTES',   descricao: 'Base de clientes e histórico' },
  { codigo: 'cli.nps',          nome: 'Avaliações NPS',        categoria: 'CLIENTES',   descricao: 'Satisfação e Net Promoter Score' },
  { codigo: 'mkt.campanhas',    nome: 'Campanhas',             categoria: 'CLIENTES',   descricao: 'Push notifications e promoções' },
  { codigo: 'mkt.analytics',    nome: 'Food Analytics',        categoria: 'CLIENTES',   descricao: 'Análise avançada de vendas' },
  { codigo: 'cli.comunidade',   nome: 'Comunidade',            categoria: 'CLIENTES',   descricao: 'Grupos e engajamento de franqueados' },
  // CAF — Central de Atendimento ao Franqueado
  { codigo: 'caf.dashboard',    nome: 'Dashboard CAF',         categoria: 'CAF',        descricao: 'Visão geral dos atendimentos' },
  { codigo: 'caf.atendimentos', nome: 'Atendimentos',          categoria: 'CAF',        descricao: 'Abertura e gestão de chamados' },
  { codigo: 'caf.base-conhecimento', nome: 'Base de Conhecimento', categoria: 'CAF',   descricao: 'Artigos e soluções documentadas' },
  { codigo: 'caf.relatorios',   nome: 'Relatórios CAF',        categoria: 'CAF',        descricao: 'Análise e exportação de dados CAF' },
  { codigo: 'caf.cadastros',    nome: 'Cadastros CAF',         categoria: 'CAF',        descricao: 'Cargo, Canal, Categoria e Subcategoria' },
  // Franquia & Distribuição
  { codigo: 'fra.pedidos',      nome: 'Pedido de Insumos',     categoria: 'FRANQUIA',   descricao: 'Catálogo da distribuidora' },
  { codigo: 'fra.meus-pedidos', nome: 'Meus Pedidos',          categoria: 'FRANQUIA',   descricao: 'Histórico de pedidos à distribuidora' },
  { codigo: 'mas.cargas',       nome: 'Gestão de Cargas',      categoria: 'FRANQUIA',   descricao: 'Pedidos das unidades (Master)' },
  { codigo: 'mas.relatorios',   nome: 'Relatórios de Franquia',categoria: 'FRANQUIA',   descricao: 'Análise detalhada de pedidos e faturamento (Master)' },
  { codigo: 'mas.catalogo',     nome: 'Catálogo de Insumos',   categoria: 'FRANQUIA',   descricao: 'Gestão do catálogo (Master)' },
  { codigo: 'mas.franqueados',  nome: 'Franqueados',           categoria: 'FRANQUIA',   descricao: 'Lista e gestão de unidades (Master)' },
  // Sistema
  { codigo: 'sis.config-geral', nome: 'Config. Gerais',        categoria: 'SISTEMA',    descricao: 'Dados da loja e integrações' },
  { codigo: 'sis.config-pdv',   nome: 'Config. PDV',           categoria: 'SISTEMA',    descricao: 'Layout e comportamento do PDV' },
  { codigo: 'sis.universidade', nome: 'Universidade Grau',     categoria: 'SISTEMA',    descricao: 'Trilhas de capacitação' },
  { codigo: 'sis.usuarios',     nome: 'Usuários',              categoria: 'SISTEMA',    descricao: 'Cadastro e permissões de usuários' },
  { codigo: 'sis.uazapi',       nome: 'UazAPI / WhatsApp',     categoria: 'SISTEMA',    descricao: 'Integração e assistente WhatsApp' },
  { codigo: 'sis.grauzinho',    nome: 'Grauzinho',             categoria: 'SISTEMA',    descricao: 'Gamificação e ranking de entregadores' },
] as const

export type ModuloCodigo = typeof MODULOS[number]['codigo']

export function modulosPorCategoria() {
  return CATEGORIAS.map(cat => ({
    ...cat,
    modulos: MODULOS.filter(m => m.categoria === cat.id),
  }))
}

/** Permissões implícitas: nível 4 inclui 1,2,3. Nível 3 inclui 1,2. Etc. */
export function pode(nivel: number, acaoMinima: number): boolean {
  return nivel >= acaoMinima
}
