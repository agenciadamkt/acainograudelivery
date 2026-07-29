'use client';

/**
 * CheckGrau — Relatórios Operacionais.
 * Consolida os indicadores operacionais da rede em relatórios gerenciais e
 * executivos, com exportação em PDF corporativo e análise gerencial por IA.
 */

import { useMemo, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import {
  Gauge, CheckCircle2, ShieldCheck, Clock, AlertTriangle, ListChecks,
  RefreshCw, FileDown, Sparkles, Loader2, TrendingUp, Users, Store, Activity, Bell,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useStore } from '@/contexts/StoreContext';
import { StoreMultiSelect } from '@/pages/admin/stock/operations/StoreMultiSelect';
import { useSectors } from '@/hooks/operations/useSectors';
import { useCollaborators } from '@/hooks/checkgrau/useCollaborators';
import { useEngajamento } from '@/hooks/checkgrau/useEngajamento';
import { useIntelligentReport } from '@/hooks/operations/useAiAnalysis';
import {
  useCheckgrauReports, useReportAlerts, type ReportFilters,
} from '@/hooks/checkgrau/useCheckgrauReports';
import { generateReportPdf, buildExecutiveSummary } from '@/lib/checkgrau/reportPdf';
import { STATUS_META, type TaskStatus } from '@/lib/operations/sla';

const ALL = '__all__';

function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const STATUS_OPTIONS: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'LATE', 'MISSED'];
const scoreTone = (n: number) => (n >= 80 ? 'text-green-600' : n >= 60 ? 'text-amber-600' : 'text-red-600');

export default function RelatoriosPage() {
  const { stores } = useStore();
  const [storeIds, setStoreIds] = useState<string[]>(stores.map((s) => s.id));
  const [dateFrom, setDateFrom] = useState(todayISO(-30));
  const [dateTo, setDateTo] = useState(todayISO());
  const [collaboratorId, setCollaboratorId] = useState<string>(ALL);
  const [sectorId, setSectorId] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [failFilter, setFailFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [histPage, setHistPage] = useState(0);

  const { data: sectors } = useSectors();
  const { data: allCollabs } = useCollaborators();
  const collaborators = useMemo(
    () => (allCollabs ?? []).filter(
      (c) => c.status === 'ativo' && (storeIds.length === 0 || (c.store_ids ?? []).some((id) => storeIds.includes(id))),
    ),
    [allCollabs, storeIds],
  );

  const filters: ReportFilters = useMemo(() => ({
    storeIds,
    dateFrom,
    dateTo,
    collaboratorId: collaboratorId === ALL ? null : collaboratorId,
    sectorId: sectorId === ALL ? null : sectorId,
    status: status === ALL ? 'ALL' : (status as TaskStatus),
  }), [storeIds, dateFrom, dateTo, collaboratorId, sectorId, status]);

  const days = useMemo(() => {
    const a = new Date(`${dateFrom}T00:00:00`).getTime();
    const b = new Date(`${dateTo}T00:00:00`).getTime();
    return Math.max(1, Math.round((b - a) / 86400000) + 1);
  }, [dateFrom, dateTo]);

  const reportsQ = useCheckgrauReports(filters);
  const alertsQ = useReportAlerts(storeIds, dateFrom, dateTo);
  const engQ = useEngajamento(storeIds, days);
  const intelligent = useIntelligentReport();

  const data = reportsQ.data;
  const executiveSummary = useMemo(
    () => (data ? buildExecutiveSummary(data, data.weekly) : ''),
    [data],
  );

  const unitLabel = storeIds.length === stores.length
    ? `Todas as unidades (${stores.length})`
    : storeIds.length === 1
      ? (stores.find((s) => s.id === storeIds[0])?.name ?? '1 unidade')
      : `${storeIds.length} unidades`;

  const criticalFiltered = useMemo(() => {
    const list = data?.criticalFailures ?? [];
    if (failFilter === 'open') return list.filter((f) => !f.resolved);
    if (failFilter === 'resolved') return list.filter((f) => f.resolved);
    return list;
  }, [data, failFilter]);

  const HIST_PAGE = 15;
  const history = data?.history ?? [];
  const histPageCount = Math.max(1, Math.ceil(history.length / HIST_PAGE));
  const histSlice = history.slice(histPage * HIST_PAGE, histPage * HIST_PAGE + HIST_PAGE);

  const refreshAll = () => {
    reportsQ.refetch(); alertsQ.refetch(); engQ.refetch();
    toast.success('Relatório atualizado.');
  };

  const exportPdf = async () => {
    if (!data) { toast.error('Sem dados para exportar.'); return; }
    try {
      await generateReportPdf({
        unitLabel, periodFrom: dateFrom, periodTo: dateTo,
        data, engajamento: engQ.data ?? null, alerts: alertsQ.data ?? null,
        intelligent: intelligent.data ?? null, executiveSummary,
      });
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao gerar o PDF.');
    }
  };

  const runIntelligent = () => {
    if (!data) { toast.error('Sem dados para analisar.'); return; }
    intelligent.mutate({
      storeIds,
      context: {
        period: { from: dateFrom, to: dateTo },
        indicadores: { score: data.score.score, ...data.score, ...data.metrics },
        semanal: data.weekly,
        top_colaboradores: data.byCollaborator.slice(0, 5),
        piores_colaboradores: data.byCollaborator.slice(-3).reverse(),
        lojas: data.byStore,
        engajamento: engQ.data?.kpis ?? null,
      },
    });
  };

  const loading = reportsQ.isLoading;
  const noStore = storeIds.length === 0;

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-8">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relatórios Operacionais</h1>
        <p className="text-sm text-gray-500 dark:text-white/40">
          Visualize, analise e exporte indicadores operacionais da rede.
        </p>
      </div>

      {/* Filtros globais */}
      <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <Field label="Loja">
            <StoreMultiSelect stores={stores} selected={storeIds} onChange={setStoreIds} />
          </Field>
          <Field label="Período inicial">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" />
          </Field>
          <Field label="Período final">
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" />
          </Field>
          <Field label="Colaborador">
            <Select value={collaboratorId} onValueChange={setCollaboratorId}>
              <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {collaborators.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Setor">
            <Select value={sectorId} onValueChange={setSectorId}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {(sectors ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <div className="ml-auto flex items-end gap-2">
            <Button variant="outline" className="gap-1.5" onClick={refreshAll} disabled={loading || noStore}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Atualizar
            </Button>
            <Button className="gap-1.5 bg-[#7C3AED] hover:bg-[#6D28D9]" onClick={exportPdf} disabled={loading || noStore || !data}>
              <FileDown className="h-4 w-4" /> Exportar PDF
            </Button>
            <Button variant="outline" className="gap-1.5 border-purple-300 text-purple-700 dark:text-purple-300" onClick={runIntelligent} disabled={loading || noStore || intelligent.isPending}>
              {intelligent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Relatório Inteligente
            </Button>
          </div>
        </CardContent>
      </Card>

      {noStore ? (
        <EmptyCard text="Selecione ao menos uma loja no filtro." />
      ) : loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : !data ? (
        <EmptyCard text="Sem dados no período/filtros selecionados." />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Kpi icon={Gauge} label="Score Operacional" value={String(data.score.score)} tone="bg-purple-100 text-purple-600 dark:bg-purple-600/15" valueClass={scoreTone(data.score.score)} />
            <Kpi icon={CheckCircle2} label="Taxa de Conclusão" value={`${data.score.conclusao}%`} tone="bg-green-100 text-green-600 dark:bg-green-500/15" />
            <Kpi icon={ShieldCheck} label="Conformidade" value={`${data.score.conformidade}%`} tone="bg-blue-100 text-blue-600 dark:bg-blue-500/15" />
            <Kpi icon={Clock} label="Pontualidade" value={`${data.score.pontualidade}%`} tone="bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15" />
            <Kpi icon={AlertTriangle} label="Falhas Críticas" value={String(data.metrics.criticalFailures)} tone="bg-red-100 text-red-600 dark:bg-red-500/15" />
            <Kpi icon={ListChecks} label="Pendências" value={String(data.metrics.pending)} tone="bg-amber-100 text-amber-600 dark:bg-amber-500/15" />
          </div>

          {/* Seção 1 — Resumo Executivo */}
          <Section title="Resumo Executivo" icon={TrendingUp}>
            <p className="text-sm leading-relaxed text-gray-700 dark:text-white/70">{executiveSummary}</p>
            <div className="mt-4">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={exportPdf}>
                <FileDown className="h-4 w-4" /> Exportar Resumo PDF
              </Button>
            </div>
          </Section>

          {/* Relatório Inteligente (resultado) */}
          {intelligent.data && (
            <Section title="Análise Inteligente (IA)" icon={Sparkles} accent>
              <div className="grid gap-4 md:grid-cols-2">
                <AiBlock title="Principais riscos" items={intelligent.data.riscos} tone="bad" />
                <AiBlock title="Destaques" items={intelligent.data.destaques} tone="good" />
                <AiBlock title="Em risco" items={intelligent.data.em_risco} tone="warn" />
                <AiBlock title="Recomendações" items={intelligent.data.recomendacoes} tone="info" />
              </div>
              {intelligent.data.tendencia && (
                <p className="mt-4 rounded-lg bg-purple-50 p-3 text-sm text-purple-800 dark:bg-purple-500/10 dark:text-purple-200">
                  <strong>Tendência operacional:</strong> {intelligent.data.tendencia}
                </p>
              )}
            </Section>
          )}

          {/* Seção 2 — Performance da Loja */}
          <Section title="Performance da Loja" icon={Activity}>
            {data.weekly.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">Sem dados no período.</p>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.weekly} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="week" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="score" name="Score" stroke="#7C3AED" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="conformidade" name="Conformidade" stroke="#2563eb" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="pontualidade" name="Pontualidade" stroke="#16a34a" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Section>

          {/* Seção 3 — Ranking de Colaboradores */}
          <Section title="Ranking de Colaboradores" icon={Users} onExport={exportPdf}>
            <SimpleTable
              head={['Colaborador', 'Execuções', 'Conformidade', 'Pontualidade', 'Score']}
              rows={data.byCollaborator.map((c) => [
                c.name, String(c.execucoes), `${c.conformidade}%`, `${c.pontualidade}%`,
                <span key={c.id} className={cn('font-bold', scoreTone(c.score))}>{c.score}</span>,
              ])}
              empty="Sem execuções atribuídas no período."
            />
          </Section>

          {/* Seção 4 — Ranking de Lojas */}
          <Section title="Ranking de Lojas" icon={Store} onExport={exportPdf}>
            <SimpleTable
              head={['Loja', 'Score', 'Conformidade', 'Pendências', 'Falhas']}
              rows={data.byStore.map((r) => [
                r.name, <span key={r.id} className={cn('font-bold', scoreTone(r.score))}>{r.score}</span>,
                `${r.conformidade}%`, String(r.pendencias), String(r.falhas),
              ])}
              empty="Sem dados de lojas no período."
            />
          </Section>

          {/* Seção 5 — Engajamento da Equipe */}
          <Section title="Engajamento da Equipe" icon={Activity}>
            {engQ.isLoading ? (
              <Skeleton className="h-40 w-full rounded-xl" />
            ) : !engQ.data ? (
              <p className="py-6 text-center text-sm text-gray-400">Sem dados de engajamento.</p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Cadastrados ativos" value={engQ.data.kpis.totalAtivos} />
                  <MiniStat label="Já acessaram" value={engQ.data.kpis.acessaram} />
                  <MiniStat label="Ativos (7 dias)" value={engQ.data.kpis.ativos7} />
                  <MiniStat label="Taxa de ativação" value={`${engQ.data.kpis.taxaAtivacao}%`} />
                  <MiniStat label="Execuções" value={engQ.data.kpis.execucoes} />
                  <MiniStat label="Média/colaborador" value={engQ.data.kpis.mediaPorColaborador} />
                </div>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { k: 'Ativos', v: engQ.data.kpis.totalAtivos },
                        { k: 'Acessaram', v: engQ.data.kpis.acessaram },
                        { k: 'Ativos 7d', v: engQ.data.kpis.ativos7 },
                      ]}
                      margin={{ top: 8, right: 16, left: -8, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis dataKey="k" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="v" name="Colaboradores" fill="#7C3AED" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </Section>

          {/* Seção 6 — Falhas Críticas */}
          <Section title="Falhas Críticas" icon={AlertTriangle}>
            <div className="mb-3 flex gap-1.5">
              {(['all', 'open', 'resolved'] as const).map((f) => (
                <button key={f} onClick={() => setFailFilter(f)}
                  className={cn('rounded-md px-3 py-1.5 text-xs font-medium',
                    failFilter === f ? 'bg-[#7C3AED] text-white' : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-white/50')}>
                  {f === 'all' ? 'Todos' : f === 'open' ? 'Aberto' : 'Resolvido'}
                </button>
              ))}
            </div>
            <SimpleTable
              head={['Data', 'Loja', 'Checklist', 'Item', 'Responsável', 'Status']}
              rows={criticalFiltered.slice(0, 50).map((f) => [
                fmtBR(f.date), f.storeName, f.checklistName, f.itemName, f.responsible,
                <span key={f.id} className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold',
                  f.resolved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                  {f.resolved ? 'Resolvido' : 'Aberto'}
                </span>,
              ])}
              empty="Nenhuma falha crítica no período. 🎉"
            />
          </Section>

          {/* Seção 7 — Alertas Disparados */}
          <Section title="Alertas Disparados" icon={Bell}>
            {alertsQ.isLoading ? (
              <Skeleton className="h-24 w-full rounded-xl" />
            ) : (alertsQ.data?.total ?? 0) === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">Nenhum alerta disparado no período.</p>
            ) : (
              <>
                <div className="mb-4 grid grid-cols-3 gap-3">
                  {alertsQ.data!.byType.map((a) => (
                    <div key={a.type} className="rounded-xl border border-gray-200 p-3 text-center dark:border-white/[0.06]">
                      <p className="text-2xl font-bold text-[#7C3AED]">{a.count}</p>
                      <p className="text-xs text-gray-500">{a.type}</p>
                    </div>
                  ))}
                </div>
                <SimpleTable
                  head={['Tipo', 'Data', 'Destinatário', 'Status']}
                  rows={alertsQ.data!.rows.slice(0, 30).map((a) => [
                    a.type, a.date ? fmtBR(a.date.slice(0, 10)) : '—', a.recipient ?? '—', a.status,
                  ])}
                  empty="—"
                />
              </>
            )}
          </Section>

          {/* Seção 8 — Histórico de Execuções */}
          <Section title="Histórico de Execuções" icon={ListChecks}>
            <SimpleTable
              head={['Data', 'Loja', 'Colaborador', 'Checklist', 'Score', 'Tempo (min)']}
              rows={histSlice.map((h) => [
                fmtBR(h.date), h.storeName, h.collaborator, h.checklistName,
                h.score != null ? String(h.score) : '—', h.durationMin != null ? String(h.durationMin) : '—',
              ])}
              empty="Sem execuções concluídas no período."
            />
            {history.length > HIST_PAGE && (
              <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
                <span>{history.length} execuções · página {histPage + 1} de {histPageCount}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={histPage === 0} onClick={() => setHistPage((p) => p - 1)}>Anterior</Button>
                  <Button variant="outline" size="sm" disabled={histPage >= histPageCount - 1} onClick={() => setHistPage((p) => p + 1)}>Próxima</Button>
                </div>
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

/* ───────────────── componentes de apoio ───────────────── */

function fmtBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] uppercase text-gray-400">{label}</label>
      {children}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone, valueClass }: {
  icon: any; label: string; value: string; tone: string; valueClass?: string;
}) {
  return (
    <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
      <CardContent className="p-4">
        <div className={cn('mb-2 flex h-9 w-9 items-center justify-center rounded-lg', tone)}>
          <Icon className="h-5 w-5" />
        </div>
        <p className={cn('text-2xl font-black text-gray-900 dark:text-white', valueClass)}>{value}</p>
        <p className="text-[11px] text-gray-400">{label}</p>
      </CardContent>
    </Card>
  );
}

function Section({ title, icon: Icon, children, onExport, accent }: {
  title: string; icon: any; children: React.ReactNode; onExport?: () => void; accent?: boolean;
}) {
  return (
    <Card className={cn('border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]', accent && 'border-purple-200 dark:border-purple-500/20')}>
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
            <Icon className="h-4.5 w-4.5 text-[#7C3AED]" /> {title}
          </h2>
          {onExport && (
            <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500" onClick={onExport}>
              <FileDown className="h-4 w-4" /> Exportar PDF
            </Button>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function SimpleTable({ head, rows, empty }: { head: string[]; rows: React.ReactNode[][]; empty: string }) {
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-gray-400">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {head.map((h, i) => <TableHead key={i} className={cn(i > 0 && i >= head.length - 4 && 'text-center')}>{h}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, ri) => (
            <TableRow key={ri}>
              {r.map((c, ci) => (
                <TableCell key={ci} className={cn(ci === 0 ? 'font-medium' : 'text-center text-sm text-gray-600 dark:text-white/70')}>{c}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-200 p-3 dark:border-white/[0.06]">
      <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-[11px] text-gray-400">{label}</p>
    </div>
  );
}

const AI_TONE: Record<string, string> = {
  bad: 'border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/5',
  good: 'border-green-200 bg-green-50 dark:border-green-500/20 dark:bg-green-500/5',
  warn: 'border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/5',
  info: 'border-blue-200 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/5',
};

function AiBlock({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div className={cn('rounded-xl border p-4', AI_TONE[tone])}>
      <p className="mb-2 text-sm font-bold text-gray-900 dark:text-white">{title}</p>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-white/70">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-40" /> {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
      <CardContent className="py-12 text-center text-sm text-gray-400">{text}</CardContent>
    </Card>
  );
}
