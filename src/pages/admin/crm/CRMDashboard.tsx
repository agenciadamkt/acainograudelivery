'use client';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { motion } from 'framer-motion';
import {
  BarChart2, Users, TrendingUp, AlertCircle, DollarSign,
  ArrowLeft, Clock, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid
} from 'recharts';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { startOfWeek, startOfMonth, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ORIGEM_COLORS: Record<string, string> = {
  whatsapp:    '#25D366',
  instagram:   '#E1306C',
  facebook_ads:'#1877F2',
  site:        '#6366F1',
  indicacao:   '#F59E0B',
};

const FUNIL_STEPS = [
  { key: 'novo',           label: 'Novos',        color: '#6B7280' },
  { key: 'em_atendimento', label: 'Atendimento',  color: '#D97706' },
  { key: 'proposta',       label: 'Proposta',      color: '#2563EB' },
  { key: 'fechado',        label: 'Fechados',      color: '#16A34A' },
];

export default function CRMDashboard() {
  const navigate = useNavigate();
  const { currentStore } = useStore();
  const [periodo, setPeriodo] = useState('mes');

  const dateFrom = periodo === 'semana'
    ? startOfWeek(new Date(), { locale: ptBR }).toISOString()
    : periodo === 'mes'
    ? startOfMonth(new Date()).toISOString()
    : subMonths(new Date(), 3).toISOString();

  // ── Leads query ──────────────────────────────────────────────
  const { data: leads = [] } = useQuery({
    queryKey: ['crm_dash_leads', currentStore?.id, dateFrom],
    queryFn: async () => {
      if (!currentStore?.id) return [];
      const { data } = await (supabase as any)
        .from('crm_leads')
        .select('*')
        .eq('store_id', currentStore.id)
        .gte('created_at', dateFrom);
      return data || [];
    },
    enabled: !!currentStore?.id,
    refetchInterval: 60000,
  });

  const { data: pendingFu = 0 } = useQuery({
    queryKey: ['crm_dash_fu', currentStore?.id],
    queryFn: async () => {
      if (!currentStore?.id) return 0;
      const { count } = await (supabase as any)
        .from('crm_followups')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pendente')
        .lte('data_agendada', new Date().toISOString());
      return count || 0;
    },
    enabled: !!currentStore?.id,
    refetchInterval: 60000,
  });

  // ── Derived stats ────────────────────────────────────────────
  const total      = leads.length;
  const fechados   = leads.filter((l: any) => l.status === 'fechado').length;
  const conversao  = total > 0 ? ((fechados / total) * 100).toFixed(1) : '0';
  const ticketMed  = fechados > 0
    ? leads.filter((l: any) => l.status === 'fechado' && l.valor_estimado)
           .reduce((s: number, l: any) => s + Number(l.valor_estimado), 0) / fechados
    : 0;

  // Status counts for funnel
  const statusMap: Record<string, number> = {};
  leads.forEach((l: any) => { statusMap[l.status] = (statusMap[l.status] || 0) + 1; });

  const funilData = FUNIL_STEPS.map((s, i) => {
    const count = statusMap[s.key] || 0;
    const prev = i > 0 ? (statusMap[FUNIL_STEPS[i - 1].key] || 1) : total || 1;
    return { ...s, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 };
  });

  // Origem pie
  const origemMap: Record<string, number> = {};
  leads.forEach((l: any) => { origemMap[l.origem] = (origemMap[l.origem] || 0) + 1; });
  const origemData = Object.entries(origemMap).map(([name, value]) => ({ name, value }));

  // Tipo bar
  const tipoMap: Record<string, number> = {};
  leads.forEach((l: any) => { if (l.tipo_cliente) tipoMap[l.tipo_cliente] = (tipoMap[l.tipo_cliente] || 0) + 1; });
  const tipoData = Object.entries(tipoMap).map(([name, value]) => ({ name, value }));

  // Motivos perda
  const perdidoMap: Record<string, number> = {};
  leads.filter((l: any) => l.status === 'perdido' && l.motivo_perda).forEach((l: any) => {
    perdidoMap[l.motivo_perda] = (perdidoMap[l.motivo_perda] || 0) + 1;
  });
  const perdidoData = Object.entries(perdidoMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  // Leads por dia (últimos 14 dias)
  const diasMap: Record<string, number> = {};
  leads.forEach((l: any) => {
    const d = format(new Date(l.created_at), 'dd/MM');
    diasMap[d] = (diasMap[d] || 0) + 1;
  });
  const diasData = Object.entries(diasMap).slice(-14).map(([name, value]) => ({ name, value }));

  const KPI = ({ icon: Icon, label, value, sub, color }: any) => (
    <Card className="glass-card border-none">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0', color)}>
          <Icon size={22} className="text-white" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className="text-2xl font-black">{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <button
        onClick={() => navigate('/admin/crm/pipeline')}
        className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/10 transition-all w-fit"
      >
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
        Pipeline
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400 flex items-center gap-3">
            <BarChart2 className="text-rose-500 shrink-0" size={32} />
            Dashboard CRM
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Métricas de leads e conversão da AmazFrut
          </p>
        </div>
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-[160px] glass-card border-none font-bold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semana">Esta semana</SelectItem>
            <SelectItem value="mes">Este mês</SelectItem>
            <SelectItem value="trimestre">Último trimestre</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPI icon={Users}       label="Leads"          value={total}      color="bg-rose-500"   sub="no período" />
        <KPI icon={TrendingUp}  label="Conversão"      value={`${conversao}%`} color="bg-green-500" sub={`${fechados} fechados`} />
        <KPI icon={DollarSign}  label="Ticket Médio"   value={ticketMed > 0 ? `R$ ${ticketMed.toFixed(0)}` : '—'} color="bg-emerald-600" />
        <KPI icon={Clock}       label="Follow-ups"     value={pendingFu}  color={pendingFu > 0 ? "bg-amber-500" : "bg-gray-400"} sub="pendentes" />
        <KPI icon={BarChart2}   label="Em Atendimento" value={statusMap['em_atendimento'] || 0} color="bg-amber-500" />
        <KPI icon={AlertCircle} label="Propostas"      value={statusMap['proposta'] || 0} color="bg-blue-500" />
      </div>

      {/* Funil */}
      <Card className="glass-card border-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-black flex items-center gap-2">
            <div className="w-2 h-6 bg-rose-500 rounded-full" />
            Funil de Conversão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 overflow-x-auto pb-2">
            {funilData.map((step, i) => (
              <div key={step.key} className="flex flex-col items-center flex-1 min-w-[80px]">
                <div className="text-sm font-black mb-2">{step.count}</div>
                <div
                  className="w-full rounded-t-2xl transition-all"
                  style={{
                    backgroundColor: step.color,
                    height: `${Math.max(20, (step.count / Math.max(total, 1)) * 160)}px`,
                    opacity: 0.85 + (i * 0.04),
                  }}
                />
                <div className="text-[10px] font-black mt-2 text-center text-muted-foreground uppercase">
                  {step.label}
                </div>
                <div className="text-[10px] font-black text-muted-foreground">{step.pct}%</div>
                {i < funilData.length - 1 && (
                  <ArrowRight size={12} className="absolute" style={{ display: 'none' }} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Leads por Origem */}
        <Card className="glass-card border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-black flex items-center gap-2">
              <div className="w-2 h-5 bg-rose-500 rounded-full" />
              Leads por Origem
            </CardTitle>
          </CardHeader>
          <CardContent>
            {origemData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie data={origemData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                      {origemData.map((entry: any) => (
                        <Cell key={entry.name} fill={ORIGEM_COLORS[entry.name] || '#8b5cf6'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {origemData.map((d: any) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ORIGEM_COLORS[d.name] || '#8b5cf6' }} />
                      <span className="text-xs font-bold capitalize">{d.name.replace('_', ' ')}</span>
                      <span className="text-xs text-muted-foreground ml-auto font-black">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leads por Tipo */}
        <Card className="glass-card border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-black flex items-center gap-2">
              <div className="w-2 h-5 bg-violet-500 rounded-full" />
              Leads por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tipoData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={tipoData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Motivos de Perda */}
        <Card className="glass-card border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-black flex items-center gap-2">
              <div className="w-2 h-5 bg-slate-500 rounded-full" />
              Top Motivos de Perda
            </CardTitle>
          </CardHeader>
          <CardContent>
            {perdidoData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum lead perdido no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={perdidoData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fontWeight: 700 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#64748B" radius={[0, 8, 8, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Leads por Dia */}
        <Card className="glass-card border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-black flex items-center gap-2">
              <div className="w-2 h-5 bg-rose-500 rounded-full" />
              Leads por Dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            {diasData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={diasData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#E11D48" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
