import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Clock,
  ChefHat,
  Users,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Timer,
  RefreshCw,
  Calendar as CalendarIcon,
  Volume2,
  Wifi,
  Utensils,
  Truck
} from 'lucide-react';
import { useDashboardStats, DashboardData } from '@/hooks/useDashboardStats';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Progress } from '@/components/ui/progress';


const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

type Period = 'today' | 'week' | 'month' | 'yesterday';

export default function Dashboard() {
  const { user } = useAuth();
  const { currentStore } = useStore();
  const [realTime, setRealTime] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [period, setPeriod] = useState<Period>('today');
  const [dateRange, setDateRange] = useState({
    from: startOfDay(new Date()).toISOString(),
    to: endOfDay(new Date()).toISOString()
  });

  const updateDateRange = (value: string) => {
    const now = new Date();
    let from = startOfDay(now);
    let to = endOfDay(now);

    switch (value) {
      case 'today':
        from = startOfDay(now);
        to = endOfDay(now);
        break;
      case 'yesterday':
        const yesterday = subDays(now, 1);
        from = startOfDay(yesterday);
        to = endOfDay(yesterday);
        break;
      case 'week':
        from = startOfWeek(now, { locale: ptBR });
        to = endOfWeek(now, { locale: ptBR });
        break;
      case 'month':
        from = startOfMonth(now);
        to = endOfMonth(now);
        break;
    }

    setPeriod(value as Period);
    setDateRange({ from: from.toISOString(), to: to.toISOString() });
  };

  const { data: stats, isLoading, refetch } = useDashboardStats(dateRange.from, dateRange.to);

  useEffect(() => {
    if (realTime) {
      const interval = setInterval(() => {
        setLastUpdate(new Date());
        // Refetch silently
        refetch();
      }, 20000);
      return () => clearInterval(interval);
    }
  }, [realTime, refetch]);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-orange-500" />
            <h1 className="text-2xl font-bold">Visão Geral</h1>
          </div>
          <p className="text-sm text-muted-foreground capitalize">
            {format(new Date(), "eeee, dd 'de' MMMM", { locale: ptBR })}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${realTime ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-xs text-muted-foreground">
              Modo tempo real {realTime ? 'ativo' : 'inativo'} • Última atualização: {format(lastUpdate, 'HH:mm:ss')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-background border rounded-full px-3 py-1 gap-2">
            <Volume2 className="h-4 w-4 text-orange-500" />
            <Switch checked={true} />
          </div>

          <div className="flex items-center bg-background border rounded-full px-3 py-1 gap-2">
            <div className="flex items-center gap-1">
              <Wifi className="h-4 w-4 text-green-500" />
              <span className="text-xs font-medium">20s</span>
            </div>
            <Switch checked={realTime} onCheckedChange={setRealTime} />
          </div>

          <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-full gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>

          <Select value={period} onValueChange={updateDateRange}>
            <SelectTrigger className="w-[120px] rounded-full">
              <CalendarIcon className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="yesterday">Ontem</SelectItem>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mês</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 1: Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Aguardando"
          value={stats.cards.aguardando}
          icon={<Clock className="h-5 w-5" />}
          color="bg-orange-50 border-orange-100"
          iconColor="bg-orange-100 text-orange-500"
        />
        <StatCard
          label="Na Cozinha"
          value={stats.cards.naCozinha}
          icon={<ChefHat className="h-5 w-5" />}
          color="bg-blue-50 border-blue-100"
          iconColor="bg-blue-100 text-blue-500"
        />
        <StatCard
          label="Mesas Abertas"
          value={stats.cards.mesasAbertas}
          icon={<Utensils className="h-5 w-5" />}
          color="bg-green-50 border-green-100"
          iconColor="bg-green-100 text-green-500"
        />
        <StatCard
          label="Clientes Hoje"
          value={stats.cards.clientesHoje}
          icon={<Users className="h-5 w-5" />}
          color="bg-purple-50 border-purple-100"
          iconColor="bg-purple-100 text-purple-500"
        />
      </div>

      {/* Row 2: Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Faturamento Total"
          value={`R$ ${stats.cards.faturamentoTotal.toFixed(2)}`}
          subValue={`${stats.cards.comparacaoFaturamento > 0 ? '+' : ''}${stats.cards.comparacaoFaturamento.toFixed(1)}% vs anterior`}
          icon={<DollarSign className="h-6 w-6" />}
          iconColor="bg-orange-100 text-orange-500"
          type="financial"
        />
        <MetricCard
          label="Pedidos"
          value={stats.cards.totalOrders}
          subValue={`${stats.cards.comparacaoPedidos > 0 ? '+' : ''}${stats.cards.comparacaoPedidos.toFixed(1)}%`}
          icon={<ShoppingBag className="h-6 w-6 text-blue-500" />}
          iconColor="bg-blue-100"
        />
        <MetricCard
          label="Ticket Médio"
          value={`R$ ${stats.cards.ticketMedio.toFixed(2)}`}
          subValue={`${stats.cards.comparacaoTicket > 0 ? '+' : ''}${stats.cards.comparacaoTicket.toFixed(1)}%`}
          icon={<div className="h-6 w-6 rounded-full border-2 border-green-500 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-green-500" /></div>}
          iconColor="bg-green-100"
        />
        <MetricCard
          label="Tempo Médio Mesa"
          value={stats.cards.tempoMedioMesa}
          subValue={`${stats.footer.mesasFechadas} mesas fechadas`}
          icon={<Timer className="h-6 w-6 text-purple-500" />}
          iconColor="bg-purple-100"
        />
      </div>

      {/* Row 3: Participation Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ParticipationCard
          title="Delivery"
          value={`R$ ${stats.participation.delivery.faturamento.toFixed(2)}`}
          count={`${stats.participation.delivery.pedidos} pedidos`}
          percent={stats.participation.delivery.percent}
          icon={<Truck className="h-5 w-5 text-blue-500" />}
          iconBg="bg-blue-100"
          progressColor="bg-green-500"
        />
        <ParticipationCard
          title="Salão (PDV)"
          value={`R$ ${stats.participation.salao.faturamento.toFixed(2)}`}
          count={`${stats.participation.salao.pedidos} mesas`}
          percent={stats.participation.salao.percent}
          icon={<ChefHat className="h-5 w-5 text-orange-500" />}
          iconBg="bg-orange-100"
          progressColor="bg-green-500"
        />
      </div>

      {/* Row 4: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <CardTitle className="text-sm font-semibold">Faturamento por Hora</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">Distribuição de vendas ao longo do dia</p>
          </CardHeader>
          <CardContent className="h-64">
            {stats.charts.hourly.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.charts.hourly}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="hour" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="faturamento" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <NoData message="Nenhum dado disponível no período" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <CardTitle className="text-sm font-semibold">Formas de Pagamento</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="h-64">
            {stats.charts.paymentMethods.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.charts.paymentMethods}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.charts.paymentMethods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <NoData message="Nenhum dado" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 5: Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="text-orange-500">🔥</span>
              <CardTitle className="text-sm font-semibold">Produtos Mais Vendidos</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="h-64">
            {stats.charts.topProducts.length > 0 ? (
              <div className="space-y-4">
                {stats.charts.topProducts.map((p, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span>{p.name}</span>
                    <span className="font-bold">{p.quantity}</span>
                  </div>
                ))}
              </div>
            ) : (
              <NoData message="Nenhum produto vendido no período" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="text-orange-500">✨</span>
              <CardTitle className="text-sm font-semibold">Horários de Pico</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="h-64">
            {stats.charts.peakHours.filter(h => h.pedidos > 0).length > 0 ? (
              <div className="space-y-4">
                {stats.charts.peakHours.filter(h => h.pedidos > 0).map((h, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span>{h.hour}</span>
                    <span className="font-bold">{h.pedidos} pedidos</span>
                  </div>
                ))}
              </div>
            ) : (
              <NoData message="Nenhum dado disponível no período" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <FooterStat label="Entregas Concluídas" value={stats.footer.entregasConcluidas} />
        <FooterStat label="Mesas Fechadas" value={stats.footer.mesasFechadas} />
        <FooterStat label="Taxa Cancelamento" value={`${stats.footer.taxaCancelamento.toFixed(1)}%`} />
        <FooterStat label="Itens Vendidos" value={stats.footer.itensVendidos} />
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, iconColor }: any) {
  return (
    <Card className={`border-none shadow-sm ${color}`}>
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <span className="text-2xl font-bold block">{value}</span>
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
        </div>
        <div className={`p-2 rounded-xl ${iconColor}`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value, subValue, icon, iconColor, type }: any) {
  return (
    <Card className="border-none shadow-sm relative overflow-hidden">
      {type === 'financial' && (
        <div className="absolute top-0 left-0 w-1 h-full bg-orange-100" />
      )}
      <CardContent className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs text-muted-foreground block mb-1">{label}</span>
            <span className="text-2xl font-bold block">{value}</span>
            <span className={`text-[10px] block mt-1 ${subValue.includes('-') ? 'text-red-500' : 'text-green-500'}`}>
              {subValue}
            </span>
          </div>
          <div className={`p-3 rounded-2xl ${iconColor}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ParticipationCard({ title, value, count, percent, icon, iconBg, progressColor }: any) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${iconBg}`}>
              {icon}
            </div>
            <div>
              <span className="text-xs text-muted-foreground block leading-tight">{title}</span>
              <span className="text-lg font-bold block leading-tight">{value}</span>
            </div>
          </div>
          <div className="text-right">
            <span className={`px-3 py-1 rounded-full text-xs font-bold text-white bg-green-500`}>
              {count}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-1">Participação: {percent.toFixed(1)}%</span>
          </div>
        </div>
        <Progress value={percent} className="h-2" indicatorClassName={progressColor} />
      </CardContent>
    </Card>
  );
}

function FooterStat({ label, value }: any) {
  return (
    <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
      <CardContent className="p-4 text-center">
        <span className="text-xl font-bold block">{value}</span>
        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{label}</span>
      </CardContent>
    </Card>
  );
}

function NoData({ message }: { message: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
      <Clock className="h-10 w-10 opacity-20" />
      <span className="text-xs font-medium">{message}</span>
    </div>
  );
}
