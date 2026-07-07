'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useStockDashboard } from '@/hooks/stock/useStockDashboard';
import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  TriangleAlert,
  Package,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingDown,
  ShoppingCart,
  Barcode,
  ClipboardCheck,
  Calculator,
  Target,
  Warehouse,
  ArrowLeftRight,
  History,
  ClipboardList,
  Layers,
  FileBarChart2,
  Settings2,
  Gift,
  RotateCcw,
  Scale,
  Info,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { QuoteWidget } from '@/components/admin/quotes/QuoteWidget';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ── Componente: Badge de Críticos com Tooltip ─────────────────────────────────
function CriticalBadge({ count, onNavigate }: { count: number; onNavigate: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-1.5 text-sm font-bold bg-orange-500/10 text-orange-600 px-3 py-1 rounded-full animate-bounce hover:bg-orange-500/20 transition-colors"
        >
          <TriangleAlert size={14} />
          {count} Crítico{count > 1 ? 's' : ''}
          <Info size={12} className="opacity-60" />
        </button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-72 rounded-2xl border-orange-200 dark:border-orange-800 shadow-2xl shadow-orange-500/10 p-4" 
        align="start" 
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
              <TriangleAlert size={16} className="text-orange-500" />
            </div>
            <p className="font-black text-sm text-orange-600">
              {count} Insumo{count > 1 ? 's' : ''} em Estoque Crítico
            </p>
          </div>
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Explicação */}
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
          Esses são insumos cuja <strong className="text-foreground">quantidade atual está abaixo do mínimo configurado</strong>. 
          Isso pode causar ruptura de estoque e impactar a produção.
        </p>

        {/* O que fazer */}
        <div className="bg-orange-50 dark:bg-orange-950/30 rounded-xl p-3 mb-4 space-y-1.5">
          <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-2">O que fazer agora</p>
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <span className="w-4 h-4 rounded-full bg-orange-500/20 text-orange-600 flex items-center justify-center font-black text-[9px] shrink-0 mt-0.5">1</span>
            Acesse o Estoque Central e veja quais insumos estão críticos (marcados em laranja).
          </div>
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <span className="w-4 h-4 rounded-full bg-orange-500/20 text-orange-600 flex items-center justify-center font-black text-[9px] shrink-0 mt-0.5">2</span>
            Use a <strong className="text-foreground">Lista de Compras</strong> para gerar o pedido de reposição automaticamente.
          </div>
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <span className="w-4 h-4 rounded-full bg-orange-500/20 text-orange-600 flex items-center justify-center font-black text-[9px] shrink-0 mt-0.5">3</span>
            Após repor, registre a <strong className="text-foreground">entrada</strong> em Movimentações para zerar o alerta.
          </div>
        </div>

        {/* Botão de ação */}
        <button
          onClick={() => { setOpen(false); onNavigate(); }}
          className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-colors"
        >
          <Package size={13} />
          Ver Itens Críticos no Estoque
          <ArrowRight size={13} />
        </button>
      </PopoverContent>
    </Popover>
  );
}

export default function StockDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currentStore } = useStore();
  const { data, isLoading } = useStockDashboard();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Gestor';

  // Fetch pending checklists for today
  const { data: pendingChecklists = 0 } = useQuery({
    queryKey: ['pending_checklists', currentStore?.id],
    queryFn: async () => {
      if (!currentStore?.id) return 0;
      
      const { data: templates } = await supabase
        .from('inventory_checklists')
        .select('id')
        .eq('store_id', currentStore.id)
        .eq('is_active', true);
      
      const today = new Date().toISOString().split('T')[0];
      const { data: responses } = await supabase
        .from('inventory_checklist_responses')
        .select('checklist_id')
        .eq('store_id', currentStore.id)
        .eq('date_reference', today);
      
      const completedIds = new Set(responses?.map(r => r.checklist_id));
      return (templates?.length || 0) - completedIds.size;
    },
    enabled: !!currentStore?.id
  });

  // Fetch count groups status
  const { data: countGroupsStatus = { total: 0, withItems: 0 } } = useQuery({
    queryKey: ['count_groups_status', currentStore?.id],
    queryFn: async () => {
      if (!currentStore?.id) return { total: 0, withItems: 0 };
      const { data: groups } = await supabase
        .from('inventory_count_groups')
        .select('id, inventory_count_group_items(count)')
        .eq('store_id', currentStore.id);
      
      return {
        total: groups?.length || 0,
        withItems: groups?.filter(g => (g as any).inventory_count_group_items?.[0]?.count > 0).length || 0
      };
    },
    enabled: !!currentStore?.id
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const stats = data?.stats || { cmvTotal: 0, totalValue: 0, totalPurchaseValue: 0, efficiency: 0 };
  const categoriesData = data?.charts?.categories || [];

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400">
              {greeting()}, {userName}!
            </span>
            <motion.span 
              animate={{ rotate: [0, 20, 0] }} 
              transition={{ repeat: Infinity, duration: 2 }}
            >
              👋
            </motion.span>
          </h1>
          <p className="text-muted-foreground mt-1 font-medium flex items-center gap-2">
            <Calendar size={14} />
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/40 dark:bg-black/20 p-1.5 rounded-2xl border border-white/20 backdrop-blur-xl">
          <div className="px-4 py-2 text-sm font-bold flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Operação Online
          </div>
        </div>
      </div>

      <QuoteWidget />

      {/* Quick Access Shortcuts */}
      <div className="flex flex-wrap gap-2">
        {[
          { title: 'Estoque Central',       icon: Warehouse,      path: '/admin/stock/inventory',            iconCls: 'text-violet-500', activeCls: 'hover:bg-violet-50 hover:border-violet-200 dark:hover:bg-violet-500/10' },
          { title: 'Movimentações',         icon: ArrowLeftRight, path: '/admin/stock/movements',            iconCls: 'text-blue-500',   activeCls: 'hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-500/10'     },
          { title: 'Gestão de CMV',         icon: Calculator,     path: '/admin/stock/cmv',                  iconCls: 'text-orange-500', activeCls: 'hover:bg-orange-50 hover:border-orange-200 dark:hover:bg-orange-500/10'},
          { title: 'Lista de Compras',      icon: ShoppingCart,   path: '/admin/stock/purchases',            iconCls: 'text-green-500',  activeCls: 'hover:bg-green-50 hover:border-green-200 dark:hover:bg-green-500/10'  },
          { title: 'Histórico de Compras',  icon: History,        path: '/admin/stock/purchase-history',     iconCls: 'text-cyan-500',   activeCls: 'hover:bg-cyan-50 hover:border-cyan-200 dark:hover:bg-cyan-500/10'     },
          { title: 'Contagem (Inventário)', icon: ClipboardList,  path: '/admin/stock/counts',               iconCls: 'text-pink-500',   activeCls: 'hover:bg-pink-50 hover:border-pink-200 dark:hover:bg-pink-500/10'     },
          { title: 'Grupos de Contagem',    icon: Layers,         path: '/admin/stock/count-groups',         iconCls: 'text-emerald-500',activeCls: 'hover:bg-emerald-50 hover:border-emerald-200 dark:hover:bg-emerald-500/10'},
          { title: 'Rotinas Operacionais',  icon: ClipboardCheck, path: '/admin/stock/checklists/execution', iconCls: 'text-amber-500',  activeCls: 'hover:bg-amber-50 hover:border-amber-200 dark:hover:bg-amber-500/10'  },
          { title: 'Relatórios de Rotinas', icon: FileBarChart2,  path: '/admin/stock/checklists/reports',   iconCls: 'text-indigo-500', activeCls: 'hover:bg-indigo-50 hover:border-indigo-200 dark:hover:bg-indigo-500/10'},
          { title: 'Gestão de Rotinas',     icon: Settings2,      path: '/admin/stock/checklists/admin',     iconCls: 'text-rose-500',   activeCls: 'hover:bg-rose-50 hover:border-rose-200 dark:hover:bg-rose-500/10'     },
          { title: 'Contagem Recorrente',    icon: RotateCcw,      path: '/admin/stock/recurring-counts',     iconCls: 'text-teal-500',   activeCls: 'hover:bg-teal-50 hover:border-teal-200 dark:hover:bg-teal-500/10'   },
          { title: 'Bonificações',          icon: Gift,           path: '/admin/stock/bonificacoes',         iconCls: 'text-yellow-500', activeCls: 'hover:bg-yellow-50 hover:border-yellow-200 dark:hover:bg-yellow-500/10'},
          { title: 'Balanço de Estoque',     icon: Scale,          path: '/admin/stock/balance',              iconCls: 'text-sky-500',    activeCls: 'hover:bg-sky-50 hover:border-sky-200 dark:hover:bg-sky-500/10'       },
        ].map((item) => (
          <motion.button
            key={item.path}
            whileHover={{ y: -1.5 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate(item.path)}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md transition-all duration-200',
              item.activeCls
            )}
          >
            <item.icon size={13} className={cn(item.iconCls, 'shrink-0')} />
            <span className="text-[12px] font-semibold text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white whitespace-nowrap">
              {item.title}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Top Indicators - Bento Style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Stats Card */}
        <Card className="glass-card md:col-span-2 border-none overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Package size={140} />
          </div>
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-2">
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Patrimônio em Estoque</p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-5xl font-black tracking-tighter">
                    {formatCurrency(stats.totalValue)}
                  </h2>
                </div>
                <div className="flex items-center gap-4 pt-2">
                  <div className="flex items-center gap-1.5 text-sm font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">
                    <Package size={14} />
                    {stats.productCount} Itens
                  </div>
                  {stats.criticalCount > 0 && (
                    <CriticalBadge count={stats.criticalCount} onNavigate={() => navigate('/admin/stock/inventory?filter=critical')} />
                  )}
                </div>
              </div>
              <Button 
                onClick={() => navigate('/admin/stock/inventory')}
                className="bg-gray-900 dark:bg-white dark:text-gray-900 hover:scale-105 transition-transform rounded-2xl h-12 px-6"
              >
                Gerenciar Estoque <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Global Action Card */}
        <Card className="glass-card border-none bg-gradient-to-br from-indigo-500/5 to-primary/5 group cursor-pointer overflow-hidden" onClick={() => navigate('/admin/stock/movements')}>
          <CardContent className="p-8 flex flex-col justify-between h-full relative">
            <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:scale-110 transition-transform">
              <TrendingUp size={120} />
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <LayoutDashboard size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Nova Movimentação</p>
                <h3 className="text-xl font-black mt-1">Registrar Entrada / Saída</h3>
              </div>
            </div>
            <div className="mt-8">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                <ArrowRight size={18} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operational Tasks - Horizontal Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card 
          className="glass-card border-none p-6 flex items-center justify-between group cursor-pointer hover:bg-white/40 dark:hover:bg-black/30 transition-all"
          onClick={() => navigate('/admin/stock/checklists/execution')}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.15)]">
              <ClipboardCheck size={24} />
            </div>
            <div>
              <h4 className="font-bold">Checklists Diários</h4>
              <p className="text-xs text-muted-foreground">
                {pendingChecklists === 0 ? 'Toda a rotina concluída!' : `${pendingChecklists} pendentes agora`}
              </p>
            </div>
          </div>
          <div className={cn(
            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter",
            pendingChecklists > 0 ? "bg-violet-500/10 text-violet-600 animate-pulse" : "bg-green-500/10 text-green-600"
          )}>
            {pendingChecklists > 0 ? 'Pendente' : 'Concluído'}
          </div>
        </Card>

        <Card 
          className="glass-card border-none p-6 flex items-center justify-between group cursor-pointer hover:bg-white/40 dark:hover:bg-black/30 transition-all" 
          onClick={() => navigate('/admin/stock/count-groups')}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Barcode size={24} />
            </div>
            <div>
              <h4 className="font-bold">Contagem Programada</h4>
              <p className="text-xs text-muted-foreground">
                {countGroupsStatus.total === 0 ? 'Nenhum grupo criado' : `${countGroupsStatus.withItems} grupos ativos`}
              </p>
            </div>
          </div>
          <div className="px-3 py-1 bg-muted rounded-full text-[10px] font-black uppercase text-muted-foreground">
            Acessar
          </div>
        </Card>

        <Card className="glass-card border-none p-6 flex items-center justify-between group cursor-pointer hover:bg-white/40 dark:hover:bg-black/30 transition-all" onClick={() => navigate('/admin/stock/purchases')}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(141,66,221,0.15)]">
              <ShoppingCart size={24} />
            </div>
            <div>
              <h4 className="font-bold">Lista de Compras Automática</h4>
              <p className="text-xs text-muted-foreground">Baseado no estoque mínimo configurado</p>
            </div>
          </div>
          <ArrowRight size={20} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </Card>
      </div>

      {/* CMV Analysis Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black flex items-center gap-3">
              Análise de Custo (CMV)
            </h2>
            <p className="text-muted-foreground font-medium">Entenda o impacto do estoque no seu resultado financeiro</p>
          </div>
          <Select defaultValue="this-month">
            <SelectTrigger className="w-[180px] glass-card border-none font-bold">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">Mês Atual</SelectItem>
              <SelectItem value="last-month">Mês Anterior</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card border-none p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600">
                <Calculator size={20} />
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">CMV REAL (CONSUMO)</p>
            </div>
            <h3 className="text-4xl font-black mb-2">{formatCurrency(stats.cmvTotal)}</h3>
            <p className="text-[10px] text-muted-foreground leading-relaxed">Soma de todas as saídas de insumos do mês.</p>
          </Card>

          <Card className="glass-card border-none p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                <ShoppingCart size={20} />
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">TOTAL COMPRAS (ENTRADAS)</p>
            </div>
            <h3 className="text-4xl font-black mb-2">{formatCurrency(stats.totalPurchaseValue)}</h3>
            <p className="text-[10px] text-muted-foreground leading-relaxed">Valor total investido em reposição de estoque.</p>
          </Card>

          <Card className="glass-card border-none p-8 overflow-hidden relative">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                <Target size={20} />
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">EFICIÊNCIA DE CONSUMO</p>
            </div>
            <h3 className="text-4xl font-black mb-2">
              {stats.efficiency > 0 ? `${(stats.efficiency * 100).toFixed(1)}%` : '—'}
            </h3>
            <p className="text-[10px] text-muted-foreground leading-relaxed">Razão entre o que foi comprado e o que foi consumido.</p>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Category Breakdown Chart */}
        <Card className="glass-card border-none p-6 md:col-span-2">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <div className="w-2 h-6 bg-primary rounded-full" />
              Estoque por Categoria (R$)
            </CardTitle>
          </CardHeader>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoriesData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700 }} width={100} />
                <Tooltip cursor={{ fill: 'transparent' }} content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="glass-card p-3 shadow-2xl border-none">
                        <p className="font-bold text-sm">{payload[0].payload.name}</p>
                        <p className="text-primary font-black">{formatCurrency(payload[0].value as number)}</p>
                      </div>
                    );
                  }
                  return null;
                }} />
                <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={20}>
                  {categoriesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Info Card - Reduza seu CMV */}
        <Card className="border-none bg-[#8D42DD] text-white overflow-hidden relative shadow-2xl shadow-primary/20">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <TrendingDown size={140} />
          </div>
          <CardContent className="p-8 relative h-full flex flex-col">
            <h3 className="text-3xl font-black tracking-tight mb-4">Reduza seu CMV</h3>
            <p className="text-white/80 text-sm leading-relaxed mb-8">
              O acompanhamento diário das saídas permite identificar desvios e desperdícios antes que eles impactem seu caixa no final do mês.
            </p>
            
            <div className="space-y-4 mt-auto">
              <div className="flex items-start gap-3 group cursor-pointer" onClick={() => navigate('/admin/stock/recipes')}>
                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-white group-hover:text-primary transition-all">1</div>
                <p className="text-[13px] font-bold group-hover:underline underline-offset-4">Mantenha as fichas técnicas atualizadas</p>
              </div>
              <div className="flex items-start gap-3 group cursor-pointer" onClick={() => navigate('/admin/stock/movements')}>
                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-white group-hover:text-primary transition-all">2</div>
                <p className="text-[13px] font-bold group-hover:underline underline-offset-4">Registre cada saída por perda / desperdício</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
