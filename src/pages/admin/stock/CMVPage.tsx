'use client';

import { useNavigate } from 'react-router-dom';
import { useStockDashboard } from '@/hooks/stock/useStockDashboard';
import { 
  PieChart as PieIcon, 
  TrendingDown, 
  DollarSign, 
  Calculator,
  ArrowRight,
  Target,
  CircleAlert,
  ShoppingCart,
  ArrowLeft
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function StockCMVPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useStockDashboard();

  if (isLoading) {
    return <div className="p-20 text-center animate-pulse">Calculando indicadores de custo...</div>;
  }

  const stats = data?.stats || { cmvTotal: 0, totalValue: 0, totalPurchaseValue: 0, efficiency: 0 };
  const categoriesData = data?.charts?.categories || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <button onClick={() => navigate('/admin/stock/dashboard')} className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-primary/50 hover:text-primary hover:bg-primary/10 transition-all w-fit">
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /><span>Estoque & Operações</span>
      </button>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400">
            Análise de Custo (CMV)
          </h1>
          <p className="text-muted-foreground mt-1">
            Entenda o impacto do estoque no seu resultado financeiro
          </p>
        </div>
        
        <Select defaultValue="current_month">
          <SelectTrigger className="w-[180px] glass-card font-bold">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current_month">Mês Atual</SelectItem>
            <SelectItem value="last_month">Mês Anterior</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-card border-none">
          <CardContent className="p-6 text-center md:text-left">
            <div className="flex items-center gap-4 mb-4 justify-center md:justify-start">
              <div className="p-2 bg-violet-100 rounded-lg text-violet-600">
                <Calculator size={20} />
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">CMV Real (Consumo)</p>
            </div>
            <h3 className="text-4xl font-black">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.cmvTotal)}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">Soma de todas as saídas de estoque do mês.</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-none">
          <CardContent className="p-6 text-center md:text-left">
            <div className="flex items-center gap-4 mb-4 justify-center md:justify-start">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                <ShoppingCart size={20} />
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Compras (Entradas)</p>
            </div>
            <h3 className="text-4xl font-black">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalPurchaseValue || 0)}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">Valor total investido em reposição no período.</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-none overflow-hidden relative">
          <CardContent className="p-6 text-center md:text-left">
            <div className="flex items-center gap-4 mb-4 justify-center md:justify-start">
              <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                <Target size={20} />
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Eficiência de Consumo</p>
            </div>
            <h3 className="text-4xl font-black">
              {stats.efficiency > 0 ? `${(stats.efficiency * 100).toFixed(1)}%` : '—'}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">Razão entre o que foi comprado e o que foi consumido.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cost Breakdown by Category */}
        <Card className="glass-card border-none p-6">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <div className="w-2 h-6 bg-secondary rounded-full" />
              Impacto por Categoria (CMV)
            </CardTitle>
          </CardHeader>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoriesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoriesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="glass-card p-3 shadow-2xl border-none">
                          <p className="font-bold text-sm">{payload[0].payload.name}</p>
                          <p className="text-primary font-black">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payload[0].value as number)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {categoriesData.map((cat, i) => (
              <div key={i} className="flex items-center gap-2 text-xs font-bold">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="truncate">{cat.name}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Tips & Recommendations */}
        <Card className="border-none p-8 flex flex-col justify-center bg-[#8D42DD] text-white overflow-hidden relative shadow-2xl shadow-primary/20">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingDown size={140} />
          </div>
          <h4 className="text-3xl font-black mb-4">Reduza seu CMV</h4>
          <p className="text-sm text-white/80 leading-relaxed mb-8">
            O acompanhamento diário das saídas permite identificar desvios e desperdícios antes que eles impactem seu caixa no final do mês.
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[13px] font-bold">
              <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center font-bold text-xs shrink-0">1</div>
              Mantenha as fichas técnicas atualizadas
            </div>
            <div className="flex items-center gap-3 text-[13px] font-bold">
              <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center font-bold text-xs shrink-0">2</div>
              Registre cada saída por perda/desperdício
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
