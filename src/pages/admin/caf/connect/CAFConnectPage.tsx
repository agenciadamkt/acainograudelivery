import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/contexts/PermissionContext';
import { useSessoesDashboard } from '@/hooks/useCafConnect';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Video, Clock, CheckCircle2, Star, TrendingUp, Calendar,
  Loader2, Download, FileSpreadsheet, Lock,
} from 'lucide-react';

const STATUS_LABEL: Record<string, string> = {
  agendada: 'Agendada',
  aguardando_participantes: 'Aguardando Participantes',
  em_andamento: 'Em Andamento',
  encerrada: 'Encerrada',
  cancelada: 'Cancelada',
};

function fmtDuration(min: number | null): string {
  if (min == null) return '—';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}min` : `${m}min`;
}

function KPICard({ title, value, icon: Icon, accent }: { title: string; value: string; icon: any; accent?: boolean }) {
  return (
    <Card className="bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/10">
      <CardContent className="p-4">
        <Icon className={`h-4 w-4 mb-2 ${accent ? 'text-primary' : 'text-gray-400'}`} />
        <p className={`text-2xl font-black leading-tight ${accent ? 'text-primary' : 'text-gray-900 dark:text-white'}`}>{value}</p>
        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mt-1">{title}</p>
      </CardContent>
    </Card>
  );
}

export default function CAFConnectPage() {
  const { profile: myProfile } = usePermissions();
  const isMaster = myProfile?.perfil === 'MASTER';
  const cafAtivo = (myProfile as any)?.caf_ativo === true;
  const canUseConnect = isMaster || cafAtivo;

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('todas');
  const [filterLoja, setFilterLoja] = useState('todas');
  const [filterAtendente, setFilterAtendente] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');

  const { data: sessoes = [], isLoading } = useSessoesDashboard({
    from: dateFrom ? new Date(dateFrom + 'T00:00:00').toISOString() : undefined,
    to: dateTo ? new Date(dateTo + 'T23:59:59').toISOString() : undefined,
  });

  // Total de tickets no mesmo período — só pra calcular a taxa de conversão
  // Ticket → Sessão. Leitura simples em caf_atendimentos, sem alterar nada lá.
  const { data: totalTicketsPeriodo = 0 } = useQuery({
    queryKey: ['caf_atendimentos_count', dateFrom, dateTo],
    queryFn: async () => {
      let q = (supabase as any).from('caf_atendimentos').select('id', { count: 'exact', head: true });
      if (dateFrom) q = q.gte('created_at', new Date(dateFrom + 'T00:00:00').toISOString());
      if (dateTo) q = q.lte('created_at', new Date(dateTo + 'T23:59:59').toISOString());
      const { count } = await q;
      return count ?? 0;
    },
  });

  const categorias = useMemo(() => [...new Set(sessoes.map((s: any) => s.ticket?.categoria).filter(Boolean))], [sessoes]);
  const lojas = useMemo(() => [...new Set(sessoes.map((s: any) => s.ticket?.loja_franqueada).filter(Boolean))], [sessoes]);
  const atendentes = useMemo(() => [...new Set(sessoes.map((s: any) => s.created_by_nome).filter(Boolean))], [sessoes]);

  const filtradas = useMemo(() => sessoes.filter((s: any) => {
    if (filterCategoria !== 'todas' && s.ticket?.categoria !== filterCategoria) return false;
    if (filterLoja !== 'todas' && s.ticket?.loja_franqueada !== filterLoja) return false;
    if (filterAtendente !== 'todos' && s.created_by_nome !== filterAtendente) return false;
    if (filterStatus !== 'todos' && s.status !== filterStatus) return false;
    return true;
  }), [sessoes, filterCategoria, filterLoja, filterAtendente, filterStatus]);

  const stats = useMemo(() => {
    const ativas = filtradas.filter((s: any) => s.status === 'em_andamento').length;
    const agendadas = filtradas.filter((s: any) => ['agendada', 'aguardando_participantes'].includes(s.status)).length;
    const encerradas = filtradas.filter((s: any) => s.status === 'encerrada');
    const comDuracao = encerradas.filter((s: any) => s.duration_min != null);
    const tempoMedio = comDuracao.length
      ? comDuracao.reduce((acc: number, s: any) => acc + s.duration_min, 0) / comDuracao.length
      : null;
    const comNps = filtradas.filter((s: any) => s.nps_nota != null);
    const npsMedia = comNps.length
      ? Math.round(comNps.reduce((acc: number, s: any) => acc + s.nps_nota, 0) / comNps.length)
      : null;
    const comResolucao = filtradas.filter((s: any) => s.nps_problema_resolvido != null);
    const taxaResolucao = comResolucao.length
      ? Math.round((comResolucao.filter((s: any) => s.nps_problema_resolvido).length / comResolucao.length) * 100)
      : null;
    const ticketsComSessao = new Set(filtradas.map((s: any) => s.ticket_id)).size;
    const taxaConversao = totalTicketsPeriodo > 0 ? Math.round((ticketsComSessao / totalTicketsPeriodo) * 100) : 0;

    return { ativas, agendadas, encerradasCount: encerradas.length, tempoMedio, npsMedia, taxaResolucao, taxaConversao };
  }, [filtradas, totalTicketsPeriodo]);

  const topPor = (campo: 'categoria' | 'loja_franqueada' | 'created_by_nome') => {
    const counts = new Map<string, number>();
    filtradas.forEach((s: any) => {
      const key = campo === 'created_by_nome' ? s.created_by_nome : s.ticket?.[campo];
      if (!key) return;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  };

  const handleExportCSV = () => {
    const header = ['Título', 'Tipo', 'Status', 'Categoria', 'Loja', 'Atendente', 'Criada em', 'Duração (min)', 'NPS'];
    const rows = filtradas.map((s: any) => [
      s.title, s.session_type, STATUS_LABEL[s.status] ?? s.status, s.ticket?.categoria ?? '',
      s.ticket?.loja_franqueada ?? '', s.created_by_nome ?? '', format(new Date(s.created_at), 'dd/MM/yyyy HH:mm'),
      s.duration_min ?? '', s.nps_nota ?? '',
    ]);
    const csv = [header, ...rows].map(r => r.map((v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `caf-connect-sessoes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('CAF Connect — Relatório de Sessões', 14, 15);
    doc.setFontSize(9);
    doc.text(`Emitido em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 21);

    autoTable(doc, {
      startY: 26,
      head: [['Título', 'Tipo', 'Status', 'Categoria', 'Loja', 'Atendente', 'Criada em', 'Duração', 'NPS']],
      body: filtradas.map((s: any) => [
        s.title, s.session_type, STATUS_LABEL[s.status] ?? s.status, s.ticket?.categoria ?? '—',
        s.ticket?.loja_franqueada ?? '—', s.created_by_nome ?? '—', format(new Date(s.created_at), 'dd/MM/yyyy HH:mm'),
        fmtDuration(s.duration_min), s.nps_nota != null ? `${s.nps_nota}/10` : '—',
      ]),
      styles: { fontSize: 7.5 },
      headStyles: { fillColor: [124, 58, 237] },
    });
    doc.save(`caf-connect-sessoes_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  if (!canUseConnect) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
        <Lock className="h-10 w-10 opacity-30" />
        <p className="text-sm font-medium">Sem permissão para acessar o CAF Connect.</p>
        <p className="text-xs">Fale com um administrador para ativar seu acesso ao CAF.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-black flex items-center gap-2.5">
          <Video className="text-primary" size={26} /> CAF Connect
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportCSV} disabled={filtradas.length === 0}>
            <FileSpreadsheet className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportPDF} disabled={filtradas.length === 0}>
            <Download className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs font-medium whitespace-nowrap">De:</Label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 w-36 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs font-medium whitespace-nowrap">Até:</Label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 w-36 text-sm" />
        </div>
        <Select value={filterCategoria} onValueChange={setFilterCategoria}>
          <SelectTrigger className="h-9 w-44 text-xs"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            {categorias.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterLoja} onValueChange={setFilterLoja}>
          <SelectTrigger className="h-9 w-44 text-xs"><SelectValue placeholder="Loja" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as lojas</SelectItem>
            {lojas.map((l: string) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterAtendente} onValueChange={setFilterAtendente}>
          <SelectTrigger className="h-9 w-44 text-xs"><SelectValue placeholder="Atendente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os atendentes</SelectItem>
            {atendentes.map((a: string) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-40 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {Object.entries(STATUS_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            <KPICard title="Sessões Ativas" value={String(stats.ativas)} icon={Video} />
            <KPICard title="Sessões Agendadas" value={String(stats.agendadas)} icon={Calendar} />
            <KPICard title="Sessões Encerradas" value={String(stats.encerradasCount)} icon={CheckCircle2} />
            <KPICard title="Tempo Médio" value={fmtDuration(stats.tempoMedio)} icon={Clock} />
            <KPICard title="Taxa de Resolução" value={stats.taxaResolucao != null ? `${stats.taxaResolucao}%` : '—'} icon={CheckCircle2} accent />
            <KPICard title="NPS Médio" value={stats.npsMedia != null ? String(stats.npsMedia) : '—'} icon={Star} />
            <KPICard title="Conversão Ticket → Sessão" value={`${stats.taxaConversao}%`} icon={TrendingUp} accent />
          </div>

          {/* Top categorias / lojas / atendentes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { titulo: 'Categorias com Mais Sessões', dados: topPor('categoria') },
              { titulo: 'Lojas com Mais Sessões', dados: topPor('loja_franqueada') },
              { titulo: 'Atendentes com Mais Sessões', dados: topPor('created_by_nome') },
            ].map(({ titulo, dados }) => (
              <Card key={titulo}>
                <CardContent className="p-4 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{titulo}</h3>
                  {dados.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sem dados no período.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {dados.map(([nome, qtd]) => (
                        <div key={nome} className="flex items-center justify-between text-sm">
                          <span className="truncate">{nome}</span>
                          <Badge variant="outline" className="text-xs shrink-0">{qtd}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabela de sessões */}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2.5 font-bold">Título</th>
                    <th className="px-3 py-2.5 font-bold">Status</th>
                    <th className="px-3 py-2.5 font-bold">Categoria</th>
                    <th className="px-3 py-2.5 font-bold">Loja</th>
                    <th className="px-3 py-2.5 font-bold">Atendente</th>
                    <th className="px-3 py-2.5 font-bold">Criada em</th>
                    <th className="px-3 py-2.5 font-bold text-center">Duração</th>
                    <th className="px-3 py-2.5 font-bold text-center">NPS</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtradas.length === 0 ? (
                    <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">Nenhuma sessão encontrada para os filtros selecionados.</td></tr>
                  ) : filtradas.map((s: any) => (
                    <tr key={s.id}>
                      <td className="px-3 py-2.5 font-semibold max-w-[220px] truncate">{s.title}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className="text-[10px]">{STATUS_LABEL[s.status] ?? s.status}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{s.ticket?.categoria ?? '—'}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{s.ticket?.loja_franqueada ?? '—'}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{s.created_by_nome ?? '—'}</td>
                      <td className="px-3 py-2.5 text-muted-foreground font-mono">{format(new Date(s.created_at), 'dd/MM HH:mm')}</td>
                      <td className="px-3 py-2.5 text-center text-muted-foreground">{fmtDuration(s.duration_min)}</td>
                      <td className="px-3 py-2.5 text-center text-muted-foreground">{s.nps_nota != null ? `${s.nps_nota}/10` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
