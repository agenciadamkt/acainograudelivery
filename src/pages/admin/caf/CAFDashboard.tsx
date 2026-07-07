'use client';

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Headphones, Plus, BarChart3, Clock, CheckCircle2, Star,
  TrendingUp, Users, BookOpen, MessageSquare, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626'];
const CAT_COLORS: Record<string, string> = {
  'Suporte ao Sistema': '#7C3AED',
  'Marketing':          '#2563EB',
  'Financeiro':         '#059669',
  'Pedidos':            '#D97706',
  'Processos':          '#DC2626',
};

export default function CAFDashboard() {
  const navigate = useNavigate();

  const { data: atendimentos = [], isLoading } = useQuery({
    queryKey: ['caf_dashboard'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('caf_atendimentos')
        .select('*, caf_satisfacao(nota, nps)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: artigos = [] } = useQuery({
    queryKey: ['caf_artigos_count'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('caf_artigos').select('id, publicado');
      return data || [];
    },
  });

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total      = atendimentos.length;
    const resolvidos = atendimentos.filter((a: any) => ['Resolvido', 'Encerrado'].includes(a.status)).length;
    const pendentes  = total - resolvidos;
    const comTempo   = atendimentos.filter((a: any) => a.tempo_resolucao_min != null);
    const tempoMedio = comTempo.length
      ? Math.round(comTempo.reduce((s: number, a: any) => s + a.tempo_resolucao_min, 0) / comTempo.length)
      : 0;
    const allSat   = atendimentos.flatMap((a: any) => a.caf_satisfacao || []);
    const comNota  = allSat.filter((s: any) => s.nota != null);
    const notaMedia = comNota.length
      ? (comNota.reduce((s: number, r: any) => s + r.nota, 0) / comNota.length).toFixed(1)
      : '—';
    const comNps   = allSat.filter((s: any) => s.nps != null);
    const npsMedia = comNps.length
      ? Math.round(comNps.reduce((s: number, r: any) => s + r.nps, 0) / comNps.length)
      : null;

    return { total, resolvidos, pendentes, tempoMedio, notaMedia, npsMedia };
  }, [atendimentos]);

  // ── Por Categoria ────────────────────────────────────────────────────────────
  const porCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    atendimentos.forEach((a: any) => {
      map[a.categoria] = (map[a.categoria] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [atendimentos]);

  // ── Por Mês (últimos 6 meses) ─────────────────────────────────────────────
  const porMes = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const m = subMonths(now, 5 - i);
      const start = startOfMonth(m);
      const end   = endOfMonth(m);
      const count = atendimentos.filter((a: any) => {
        const d = parseISO(a.created_at);
        return d >= start && d <= end;
      }).length;
      return { name: format(m, 'MMM', { locale: ptBR }), total: count };
    });
  }, [atendimentos]);

  // ── Ranking de Franquias ─────────────────────────────────────────────────
  const rankingFranquias = useMemo(() => {
    const map: Record<string, number> = {};
    atendimentos.forEach((a: any) => {
      if (a.loja_franqueada) map[a.loja_franqueada] = (map[a.loja_franqueada] || 0) + 1;
    });
    return Object.entries(map)
      .map(([loja, total]) => ({ loja, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [atendimentos]);

  // ── Ranking de Problemas ─────────────────────────────────────────────────
  const rankingProblemas = useMemo(() => {
    const map: Record<string, number> = {};
    atendimentos.forEach((a: any) => {
      const key = a.subcategoria || a.categoria;
      if (key) map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .map(([problema, total]) => ({ problema, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [atendimentos]);

  // ── Últimos atendimentos ─────────────────────────────────────────────────
  const ultimos = useMemo(() => atendimentos.slice(0, 8), [atendimentos]);

  const STATUS_DOT: Record<string, string> = {
    'Aberto':                'bg-blue-500',
    'Em Atendimento':        'bg-amber-500',
    'Aguardando Franqueado': 'bg-orange-500',
    'Resolvido':             'bg-green-500',
    'Encerrado':             'bg-gray-400',
  };

  const tempoStr = (min: number) => min < 60 ? `${min}m` : min < 1440 ? `${Math.floor(min / 60)}h` : `${Math.floor(min / 1440)}d`;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400 flex items-center gap-3">
            <Headphones className="text-primary shrink-0" size={34} />
            CAF — Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Central de Atendimento ao Franqueado</p>
        </div>
        <Button onClick={() => navigate('/admin/caf/atendimentos')} className="bg-primary hover:bg-primary/90 text-white font-bold gap-2">
          <Plus size={16} /> Novo Atendimento
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: MessageSquare, color: 'text-violet-600', bg: 'bg-violet-500/10' },
          { label: 'Resolvidos', value: stats.resolvidos, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-500/10' },
          { label: 'Pendentes', value: stats.pendentes, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-500/10' },
          { label: 'Tempo médio', value: stats.tempoMedio ? tempoStr(stats.tempoMedio) : '—', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-500/10' },
          { label: 'Nota média', value: stats.notaMedia, icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-500/10' },
          { label: 'NPS médio', value: stats.npsMedia ?? '—', icon: BarChart3, color: 'text-indigo-600', bg: 'bg-indigo-500/10' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 flex flex-col gap-2">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', s.bg)}>
              <s.icon size={16} className={s.color} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-tight">{s.label}</p>
            <p className="text-2xl font-black">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Atendimentos por Categoria */}
        <div className="glass-card p-5">
          <h3 className="font-black text-sm uppercase tracking-wide mb-4">Atendimentos por Setor</h3>
          {porCategoria.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={porCategoria} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  dataKey="value" nameKey="name" paddingAngle={2}>
                  {porCategoria.map((entry: any, i: number) => (
                    <Cell key={i} fill={CAT_COLORS[entry.name] || COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any, n: any) => [v, n]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Por Mês */}
        <div className="glass-card p-5">
          <h3 className="font-black text-sm uppercase tracking-wide mb-4">Atendimentos por Mês</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={porMes} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: 'rgba(124,58,237,0.05)' }} />
              <Bar dataKey="total" fill="#7C3AED" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rankings row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ranking Franquias */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-sm uppercase tracking-wide">Ranking de Franquias</h3>
            <Badge variant="outline" className="text-[10px]">Top {rankingFranquias.length}</Badge>
          </div>
          {rankingFranquias.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sem dados</p>
          ) : (
            <div className="space-y-2">
              {rankingFranquias.map((f, i) => {
                const max = rankingFranquias[0].total;
                return (
                  <div key={f.loja} className="flex items-center gap-3">
                    <span className="text-[11px] font-black text-muted-foreground w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-semibold truncate">{f.loja}</span>
                        <span className="text-xs font-black text-primary ml-2 shrink-0">{f.total}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(f.total / max) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ranking Problemas */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-sm uppercase tracking-wide">Top Dúvidas / Problemas</h3>
            <Badge variant="outline" className="text-[10px]">Top {rankingProblemas.length}</Badge>
          </div>
          {rankingProblemas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sem dados</p>
          ) : (
            <div className="space-y-2">
              {rankingProblemas.map((p, i) => {
                const max = rankingProblemas[0].total;
                return (
                  <div key={p.problema} className="flex items-center gap-3">
                    <span className="text-[11px] font-black text-muted-foreground w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-semibold truncate">{p.problema}</span>
                        <span className="text-xs font-black text-primary ml-2 shrink-0">{p.total}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(p.total / max) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Tickets */}
      <div className="glass-card overflow-hidden p-0">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-black text-sm uppercase tracking-wide">Atendimentos Recentes</h3>
          <Button variant="ghost" size="sm" className="text-xs text-primary"
            onClick={() => navigate('/admin/caf/atendimentos')}>
            Ver todos →
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <tbody>
              {ultimos.map((a: any) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-muted/5 transition-colors cursor-pointer"
                  onClick={() => navigate('/admin/caf/atendimentos')}>
                  <td className="p-3 w-32">
                    <span className="font-mono text-xs font-black text-primary">{a.protocolo}</span>
                  </td>
                  <td className="p-3">
                    <p className="text-xs font-semibold truncate max-w-[140px]">{a.loja_franqueada || '—'}</p>
                    <p className="text-[10px] text-muted-foreground">{a.categoria}</p>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[a.status])} />
                      <span className="text-[11px] font-medium">{a.status}</span>
                    </div>
                  </td>
                  <td className="p-3 text-[11px] text-muted-foreground whitespace-nowrap">
                    {format(parseISO(a.created_at), "dd/MM HH:mm")}
                  </td>
                </tr>
              ))}
              {ultimos.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-sm text-muted-foreground">Nenhum atendimento ainda</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Atendimentos', icon: Headphones, path: '/admin/caf/atendimentos', color: 'text-violet-600' },
          { label: 'Base de Conhecimento', icon: BookOpen, path: '/admin/caf/base-conhecimento', color: 'text-blue-600' },
          { label: 'Relatórios', icon: BarChart3, path: '/admin/caf/relatorios', color: 'text-green-600' },
          { label: `${artigos.length} Artigos`, icon: BookOpen, path: '/admin/caf/base-conhecimento', color: 'text-amber-600' },
        ].map(item => (
          <button key={item.label}
            onClick={() => navigate(item.path)}
            className="glass-card p-4 flex flex-col gap-2 text-left hover:border-primary/20 transition-colors group">
            <item.icon size={20} className={cn(item.color, 'group-hover:scale-110 transition-transform')} />
            <span className="text-xs font-bold">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
