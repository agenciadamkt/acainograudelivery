import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid,
} from 'recharts';
import {
  BarChart3, Search, Download, FileText, FileSpreadsheet, Eye,
  DollarSign, ShoppingBag, Users, TrendingUp, XCircle, Truck, Store, Utensils,
  Percent, Undo2, Wallet, Clock,
} from 'lucide-react';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePdvHistory, labelPayment, type UnifiedSaleRecord } from '@/hooks/pdv/usePdvHistory';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
// xlsx é importado dinamicamente dentro de exportExcel para não inflar o bundle
// principal (excede o limite de precache do PWA). Mesmo padrão dos demais imports.

const BRL = (v: number) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const PIE_COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#6366f1'];

type PeriodKey = 'hoje' | 'ontem' | '7d' | '30d' | 'custom';

function periodRange(key: Exclude<PeriodKey, 'custom'>): { from: Date; to: Date } {
  const now = new Date();
  switch (key) {
    case 'hoje':  return { from: startOfDay(now), to: endOfDay(now) };
    case 'ontem': { const y = subDays(now, 1); return { from: startOfDay(y), to: endOfDay(y) }; }
    case '7d':    return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case '30d':   return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
  }
}

// Normaliza a forma de pagamento para os grupos do filtro
function normalizedPayment(r: UnifiedSaleRecord): string {
  const label = labelPayment(r.payment_method, r.canal);
  if (label.startsWith('PIX')) return 'PIX';
  if (label.startsWith('Crédito')) return 'Crédito';
  if (label.startsWith('Débito')) return 'Débito';
  if (label === 'Dinheiro') return 'Dinheiro';
  return label;
}

// Canal considerando Mesa (dine_in) como categoria própria
function channelOf(r: UnifiedSaleRecord): 'PDV' | 'Delivery' | 'Mesa' {
  if (r.order_type === 'dine_in') return 'Mesa';
  return r.canal;
}

const isCancelled = (s: string) => s === 'cancelled' || s === 'canceled';

export default function Relatorios() {
  const [period, setPeriod] = useState<PeriodKey>('hoje');
  const [customFrom, setCustomFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [canal, setCanal] = useState<'all' | 'PDV' | 'Delivery' | 'Mesa'>('all');
  const [payment, setPayment] = useState<'all' | 'PIX' | 'Crédito' | 'Débito' | 'Dinheiro'>('all');
  const [status, setStatus] = useState<'all' | 'active' | 'cancelled'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<UnifiedSaleRecord | null>(null);
  const [sortKey, setSortKey] = useState<string>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const range = period === 'custom'
    ? { from: startOfDay(new Date(`${customFrom}T12:00:00`)), to: endOfDay(new Date(`${customTo}T12:00:00`)) }
    : periodRange(period);
  const dateFrom = format(range.from, 'yyyy-MM-dd');
  const dateTo = format(range.to, 'yyyy-MM-dd');

  // Fonte única — só a data alimenta a query; canal/pagamento/status/busca são
  // aplicados client-side para manter UM filtro global consistente.
  const { historyData, isLoading } = usePdvHistory({ dateFrom, dateTo });

  // Período anterior (mesma duração, deslocado para trás) para o comparativo.
  const lengthMs = range.to.getTime() - range.from.getTime();
  const prevTo = new Date(range.from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - lengthMs);
  const { historyData: prevData } = usePdvHistory({
    dateFrom: format(prevFrom, 'yyyy-MM-dd'),
    dateTo: format(prevTo, 'yyyy-MM-dd'),
  });

  const rows = useMemo(() => {
    return historyData.filter((r) => {
      if (canal !== 'all' && channelOf(r) !== canal) return false;
      if (payment !== 'all' && normalizedPayment(r) !== payment) return false;
      if (status === 'active' && isCancelled(r.status)) return false;
      if (status === 'cancelled' && !isCancelled(r.status)) return false;
      if (search.trim()) {
        const t = search.trim().toLowerCase();
        if (!r.customer_name?.toLowerCase().includes(t) && !String(r.order_number).toLowerCase().includes(t)) return false;
      }
      return true;
    });
  }, [historyData, canal, payment, status, search]);

  const lucroOf = (r: UnifiedSaleRecord) => r.total - (r.cmv || 0);

  // Ordenação
  const sortVal = (r: UnifiedSaleRecord, key: string): string | number => {
    switch (key) {
      case 'order_number': return String(r.order_number);
      case 'customer': return r.customer_name || '';
      case 'canal': return channelOf(r);
      case 'payment': return labelPayment(r.payment_method, r.canal);
      case 'status': return r.status;
      case 'total': return r.total;
      case 'lucro': return lucroOf(r);
      default: return new Date(r.created_at).getTime();
    }
  };
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const va = sortVal(a, sortKey), vb = sortVal(b, sortKey);
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [rows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pagedRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);

  // Volta pra 1ª página quando os filtros mudam
  useEffect(() => { setPage(1); }, [canal, payment, status, search, period, dateFrom, dateTo]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const valid = rows.filter((r) => !isCancelled(r.status));
    const faturamento = valid.reduce((s, r) => s + r.total, 0);
    const pedidos = valid.length;
    const ticket = pedidos ? faturamento / pedidos : 0;
    const clientes = new Set(valid.map((r) => r.customer_name)).size;
    const cancelamentos = rows.filter((r) => isCancelled(r.status)).length;
    const totPdv = valid.filter((r) => channelOf(r) === 'PDV').reduce((s, r) => s + r.total, 0);
    const totDelivery = valid.filter((r) => channelOf(r) === 'Delivery').reduce((s, r) => s + r.total, 0);
    const totMesas = valid.filter((r) => channelOf(r) === 'Mesa').reduce((s, r) => s + r.total, 0);
    const descontos = valid.reduce((s, r) => s + (r.discount || 0), 0);
    const cmv = valid.reduce((s, r) => s + (r.cmv || 0), 0);
    const lucro = faturamento - cmv;
    const margem = faturamento ? (lucro / faturamento) * 100 : 0;
    return { faturamento, pedidos, ticket, clientes, cancelamentos, totPdv, totDelivery, totMesas, descontos, cmv, lucro, margem };
  }, [rows]);

  // KPIs do período anterior (mesmos filtros) para o comparativo.
  const prevKpis = useMemo(() => {
    const valid = prevData.filter((r) => {
      if (canal !== 'all' && channelOf(r) !== canal) return false;
      if (payment !== 'all' && normalizedPayment(r) !== payment) return false;
      if (isCancelled(r.status)) return false;
      return true;
    });
    const faturamento = valid.reduce((s, r) => s + r.total, 0);
    const pedidos = valid.length;
    return { faturamento, pedidos, ticket: pedidos ? faturamento / pedidos : 0 };
  }, [prevData, canal, payment]);

  const delta = (cur: number, prev: number): { pct: number; up: boolean } | null => {
    if (!prev) return null;
    const pct = ((cur - prev) / prev) * 100;
    return { pct, up: pct >= 0 };
  };

  // ── Dados dos gráficos ──────────────────────────────────────────────────────
  const salesByDay = useMemo(() => {
    const map = new Map<string, number>();
    rows.filter((r) => !isCancelled(r.status)).forEach((r) => {
      const d = format(new Date(r.created_at), 'dd/MM');
      map.set(d, (map.get(d) || 0) + r.total);
    });
    return Array.from(map, ([name, total]) => ({ name, total })).reverse();
  }, [rows]);

  const salesByHour = useMemo(() => {
    const arr = Array.from({ length: 24 }, (_, h) => ({ name: `${String(h).padStart(2, '0')}h`, total: 0 }));
    rows.filter((r) => !isCancelled(r.status)).forEach((r) => {
      const h = new Date(r.created_at).getHours();
      arr[h].total += r.total;
    });
    return arr;
  }, [rows]);

  const paymentData = useMemo(() => {
    const map = new Map<string, number>();
    rows.filter((r) => !isCancelled(r.status)).forEach((r) => {
      const p = normalizedPayment(r);
      map.set(p, (map.get(p) || 0) + r.total);
    });
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [rows]);

  const channelData = useMemo(() => ([
    { name: 'PDV', value: kpis.totPdv },
    { name: 'Delivery', value: kpis.totDelivery },
    { name: 'Mesa', value: kpis.totMesas },
  ].filter((c) => c.value > 0)), [kpis]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { qty: number; revenue: number }>();
    rows.filter((r) => !isCancelled(r.status)).forEach((r) => {
      (r.items || []).forEach((it: any) => {
        const cur = map.get(it.name) || { qty: 0, revenue: 0 };
        cur.qty += it.quantity; cur.revenue += it.revenue;
        map.set(it.name, cur);
      });
    });
    return Array.from(map, ([name, v]) => ({ name, qty: v.qty, revenue: v.revenue }))
      .sort((a, b) => b.qty - a.qty).slice(0, 8);
  }, [rows]);

  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    rows.filter((r) => !isCancelled(r.status)).forEach((r) => {
      (r.items || []).forEach((it: any) => {
        map.set(it.category, (map.get(it.category) || 0) + it.revenue);
      });
    });
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [rows]);

  // ── Exportações ─────────────────────────────────────────────────────────────
  const tableRows = () => sortedRows.map((r) => ([
    String(r.order_number),
    r.customer_name,
    channelOf(r),
    labelPayment(r.payment_method, r.canal),
    format(new Date(r.created_at), 'dd/MM/yyyy HH:mm'),
    isCancelled(r.status) ? 'Cancelado' : r.status,
    BRL(r.total),
    BRL(lucroOf(r)),
  ]));

  const exportPdf = () => {
    if (!rows.length) return toast.error('Nada para exportar.');
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Central de Relatórios — Extrato', 14, 16);
    doc.setFontSize(9);
    doc.text(`Período: ${format(range.from, 'dd/MM/yyyy')} a ${format(range.to, 'dd/MM/yyyy')}`, 14, 22);
    doc.text(`Faturamento: ${BRL(kpis.faturamento)}  ·  Pedidos: ${kpis.pedidos}  ·  Ticket: ${BRL(kpis.ticket)}`, 14, 27);
    autoTable(doc, {
      startY: 32,
      head: [['Pedido', 'Cliente', 'Canal', 'Pagamento', 'Data/Hora', 'Status', 'Valor', 'Lucro']],
      body: tableRows(),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [139, 92, 246] },
    });
    doc.save(`central-relatorios-${dateFrom}-a-${dateTo}.pdf`);
    toast.success('PDF exportado!');
  };

  const exportExcel = async () => {
    if (!rows.length) return toast.error('Nada para exportar.');
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet([
      ['Pedido', 'Cliente', 'Canal', 'Pagamento', 'Data/Hora', 'Status', 'Valor', 'Lucro'],
      ...tableRows(),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Extrato');
    XLSX.writeFile(wb, `central-relatorios-${dateFrom}-a-${dateTo}.xlsx`);
    toast.success('Excel exportado!');
  };

  // ── Definição dos cards (agrupados) ─────────────────────────────────────────
  type Kpi = { label: string; value: string; icon: any; soon?: boolean; delta?: { pct: number; up: boolean } | null };
  const kpiGroups: { title: string; cards: Kpi[] }[] = [
    {
      title: 'Receita',
      cards: [
        { label: 'Faturamento', value: BRL(kpis.faturamento), icon: DollarSign, delta: delta(kpis.faturamento, prevKpis.faturamento) },
        { label: 'PDV', value: BRL(kpis.totPdv), icon: Store },
        { label: 'Delivery', value: BRL(kpis.totDelivery), icon: Truck },
        { label: 'Mesas', value: BRL(kpis.totMesas), icon: Utensils },
      ],
    },
    {
      title: 'Operação',
      cards: [
        { label: 'Pedidos', value: String(kpis.pedidos), icon: ShoppingBag, delta: delta(kpis.pedidos, prevKpis.pedidos) },
        { label: 'Clientes', value: String(kpis.clientes), icon: Users },
        { label: 'Ticket Médio', value: BRL(kpis.ticket), icon: TrendingUp, delta: delta(kpis.ticket, prevKpis.ticket) },
        { label: 'Cancelamentos', value: String(kpis.cancelamentos), icon: XCircle },
      ],
    },
    {
      title: 'Financeiro',
      cards: [
        { label: 'Descontos', value: BRL(kpis.descontos), icon: Percent },
        { label: 'CMV', value: BRL(kpis.cmv), icon: Undo2 },
        { label: 'Lucro estimado', value: BRL(kpis.lucro), icon: Wallet },
        { label: 'Margem', value: `${kpis.margem.toFixed(1)}%`, icon: TrendingUp },
      ],
    },
  ];

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Central de Relatórios</h1>
            <p className="text-sm text-muted-foreground">Inteligência do PDV — indicadores, análises e extrato numa única tela.</p>
          </div>
        </div>

        {/* ── 1. Filtros globais ── */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {([['hoje', 'Hoje'], ['ontem', 'Ontem'], ['7d', '7 dias'], ['30d', '30 dias'], ['custom', 'Personalizado']] as [PeriodKey, string][]).map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setPeriod(k)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${period === k ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted/50 border-border'}`}
                >
                  {l}
                </button>
              ))}
              {period === 'custom' && (
                <div className="flex items-center gap-2 ml-1">
                  <label className="text-xs text-muted-foreground">De:</label>
                  <Input type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} className="h-8 w-auto text-sm" />
                  <label className="text-xs text-muted-foreground">Até:</label>
                  <Input type="date" value={customTo} min={customFrom} onChange={(e) => setCustomTo(e.target.value)} className="h-8 w-auto text-sm" />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              <Select value={canal} onValueChange={(v) => setCanal(v as any)}>
                <SelectTrigger><SelectValue placeholder="Canal" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Canal: Todos</SelectItem>
                  <SelectItem value="PDV">PDV</SelectItem>
                  <SelectItem value="Delivery">Delivery</SelectItem>
                  <SelectItem value="Mesa">Mesa</SelectItem>
                </SelectContent>
              </Select>
              <Select value={payment} onValueChange={(v) => setPayment(v as any)}>
                <SelectTrigger><SelectValue placeholder="Pagamento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Pagamento: Todos</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="Crédito">Crédito</SelectItem>
                  <SelectItem value="Débito">Débito</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Status: Todos</SelectItem>
                  <SelectItem value="active">Válidos</SelectItem>
                  <SelectItem value="cancelled">Cancelados</SelectItem>
                </SelectContent>
              </Select>
              {/* Operador e Categoria: preparados para a Fase 2 (dados ainda não disponíveis) */}
              <Select value="all" disabled>
                <SelectTrigger><SelectValue placeholder="Operador" /></SelectTrigger>
                <SelectContent><SelectItem value="all">Operador: Todos</SelectItem></SelectContent>
              </Select>
              <Select value="all" disabled>
                <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent><SelectItem value="all">Categoria: Todos</SelectItem></SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cliente ou pedido..." className="pl-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── 2. Dashboard executivo ── */}
        <div className="space-y-4">
          {kpiGroups.map((g) => (
            <div key={g.title}>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{g.title}</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {g.cards.map((c) => (
                  <Card key={c.label}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <c.icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-lg font-bold leading-tight truncate">{c.value}</div>
                          {c.delta && (
                            <span className={`text-[10px] font-semibold shrink-0 ${c.delta.up ? 'text-emerald-600' : 'text-red-600'}`}>
                              {c.delta.up ? '▲' : '▼'} {Math.abs(c.delta.pct).toFixed(0)}%
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          {c.label}{c.soon && <Badge variant="outline" className="text-[9px] px-1 py-0">em breve</Badge>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── 3. Analytics ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Vendas por dia</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={salesByDay}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip formatter={(v: number) => BRL(v)} />
                  <Bar dataKey="total" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Formas de pagamento</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" nameKey="name">
                    {paymentData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => BRL(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {paymentData.map((p, i) => (
                  <span key={p.name} className="text-xs flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />{p.name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Vendas por hora</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={salesByHour}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="name" fontSize={9} tickLine={false} axisLine={false} interval={2} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip formatter={(v: number) => BRL(v)} />
                  <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Delivery × PDV × Mesa</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={channelData} cx="50%" cy="50%" outerRadius={85} dataKey="value" nameKey="name" label={(e: any) => e.name}>
                    {channelData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => BRL(v)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Produtos mais vendidos</CardTitle></CardHeader>
            <CardContent>
              {topProducts.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-16">Sem itens no período.</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={topProducts} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" width={130} fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(v: number, n: string) => n === 'qty' ? `${v} un` : BRL(v)} />
                    <Bar dataKey="qty" name="qty" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Categorias</CardTitle></CardHeader>
            <CardContent>
              {categoryData.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-16">Sem itens no período.</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" nameKey="name">
                        {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => BRL(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-3 justify-center mt-2">
                    {categoryData.slice(0, 6).map((c, i) => (
                      <span key={c.name} className="text-xs flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />{c.name}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── 4. Extrato inteligente ── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Extrato Inteligente <span className="text-muted-foreground font-normal">({rows.length})</span></CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2"><Download className="h-4 w-4" /> Exportar</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={exportPdf}><FileText className="mr-2 h-4 w-4" /> Exportar PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={exportExcel}><FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Excel</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    {([
                      ['order_number', 'Pedido', 'left'], ['customer', 'Cliente', 'left'],
                      ['canal', 'Canal', 'left'], ['payment', 'Pagamento', 'left'],
                      ['created_at', 'Data/Hora', 'left'], ['status', 'Status', 'left'],
                      ['total', 'Valor', 'right'], ['lucro', 'Lucro', 'right'],
                    ] as [string, string, string][]).map(([key, label, align]) => (
                      <th
                        key={key}
                        onClick={() => toggleSort(key)}
                        className={`px-4 py-2 cursor-pointer select-none hover:text-foreground ${align === 'right' ? 'text-right' : ''}`}
                      >
                        {label}{sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                      </th>
                    ))}
                    <th className="px-4 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">Carregando...</td></tr>
                  ) : pagedRows.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">Nenhuma venda encontrada para os filtros selecionados.</td></tr>
                  ) : pagedRows.map((r) => (
                    <tr key={`${r.canal}-${r.id}`} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-2 font-medium">#{r.order_number}</td>
                      <td className="px-4 py-2">{r.customer_name}</td>
                      <td className="px-4 py-2"><Badge variant="outline" className="text-xs">{channelOf(r)}</Badge></td>
                      <td className="px-4 py-2">{labelPayment(r.payment_method, r.canal)}</td>
                      <td className="px-4 py-2 text-muted-foreground">{format(new Date(r.created_at), 'dd/MM HH:mm', { locale: ptBR })}</td>
                      <td className="px-4 py-2">
                        <Badge className={isCancelled(r.status) ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}>
                          {isCancelled(r.status) ? 'Cancelado' : (r.status === 'paid' ? 'Pago' : r.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-right font-bold">{BRL(r.total)}</td>
                      <td className="px-4 py-2 text-right text-emerald-700">{BRL(lucroOf(r))}</td>
                      <td className="px-4 py-2 text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelected(r)}><Eye className="h-4 w-4" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
                <span className="text-muted-foreground">
                  {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sortedRows.length)} de {sortedRows.length}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
                  <span className="text-muted-foreground">Página {page} de {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detalhes do pedido */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Pedido #{selected?.order_number}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Cliente</span><span className="font-medium">{selected.customer_name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Canal</span><span>{channelOf(selected)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Pagamento</span><span>{labelPayment(selected.payment_method, selected.canal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Data</span><span>{format(new Date(selected.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span>{isCancelled(selected.status) ? 'Cancelado' : selected.status}</span></div>
              <div className="flex justify-between border-t pt-2"><span className="text-muted-foreground">Total</span><span className="font-bold">{BRL(selected.total)}</span></div>
              {Array.isArray(selected.items) && selected.items.length > 0 && (
                <div className="border-t pt-2">
                  <div className="text-muted-foreground mb-1">Itens</div>
                  {selected.items.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span>{it.quantity || 1}× {it.name || 'Item'}</span>
                      <span>{BRL(Number(it.revenue || 0))}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
