/**
 * Operações 2.0 — Painel do gestor (M3).
 * KPIs, indicadores e score operacional (geral + por setor + por usuário),
 * filtráveis por período, setor, turno e usuário.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  CalendarCheck, CheckCircle2, Clock, AlertTriangle, ShieldCheck, ListChecks, Gauge, Sparkles, Loader2,
} from 'lucide-react';
import { useSectors } from '@/hooks/operations/useSectors';
import { useShifts } from '@/hooks/operations/useShifts';
import { useCollaborators } from '@/hooks/checkgrau/useCollaborators';
import { useOperationsDashboard, type GroupResult } from '@/hooks/operations/useOperationsDashboard';
import { useDailySummary } from '@/hooks/operations/useAiAnalysis';
import { useStore } from '@/contexts/StoreContext';
import { StoreMultiSelect } from './StoreMultiSelect';

const ALL = '__all__';

function daysAgoISO(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function todayISO(): string { return new Date().toISOString().slice(0, 10); }

function scoreTone(v: number): string {
  if (v >= 80) return 'text-green-600 dark:text-green-400';
  if (v >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}
function scoreBar(v: number): string {
  if (v >= 80) return 'bg-green-500';
  if (v >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

function Kpi({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone?: string }) {
  return (
    <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone ?? 'bg-purple-100 text-purple-600 dark:bg-purple-600/15'}`}>
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-white/40">{label}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreComponent({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-gray-500 dark:text-white/50">{label}</span>
        <span className="font-semibold text-gray-900 dark:text-white">{value}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
        <div className={`h-full rounded-full ${scoreBar(value)}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function OperationsDashboardPage() {
  const [dateFrom, setDateFrom] = useState(daysAgoISO(30));
  const [dateTo, setDateTo] = useState(todayISO());
  const [sectorId, setSectorId] = useState<string>(ALL);
  const [shiftId, setShiftId] = useState<string>(ALL);
  const [userId, setUserId] = useState<string>(ALL);

  // Multi-loja: começa com todas as lojas que o gerente acessa.
  const { stores } = useStore();
  const [storeIds, setStoreIds] = useState<string[]>([]);
  const storesInited = useRef(false);
  useEffect(() => {
    if (!storesInited.current && stores.length > 0) {
      setStoreIds(stores.map((s) => s.id));
      storesInited.current = true;
    }
  }, [stores]);

  const { data: sectors } = useSectors();
  const { data: shifts } = useShifts();
  // "Responsável" = colaboradores do CheckGrau (não usuários do sistema),
  // ativos e vinculados às lojas selecionadas no filtro.
  const { data: allCollaborators } = useCollaborators();
  const responsibles = useMemo(
    () =>
      (allCollaborators ?? [])
        .filter(
          (c) =>
            c.status === 'ativo' &&
            (storeIds.length === 0 || (c.store_ids ?? []).some((sid) => storeIds.includes(sid))),
        )
        .map((c) => ({ id: c.id, nome: c.name })),
    [allCollaborators, storeIds],
  );

  const filters = useMemo(() => ({
    dateFrom, dateTo,
    sectorId: sectorId === ALL ? null : sectorId,
    shiftId: shiftId === ALL ? null : shiftId,
    userId: userId === ALL ? null : userId,
    storeIds,
  }), [dateFrom, dateTo, sectorId, shiftId, userId, storeIds]);

  const { data, isLoading } = useOperationsDashboard(filters);
  const summary = useDailySummary();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const runSummary = () => { setSummaryOpen(true); summary.mutate({ date: dateTo, storeIds }); };

  const sectorName = (id: string) => sectors?.find((s) => s.id === id)?.name ?? '—';
  const userName = (id: string) => responsibles?.find((u) => u.id === id)?.nome ?? '—';

  const m = data?.metrics;
  const hasData = (m?.scheduled ?? 0) > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Painel operacional</h1>
          <p className="text-sm text-gray-500 dark:text-white/40">
            Conformidade, pontualidade e score da operação — por período, setor, turno e responsável.
          </p>
        </div>
        <Button variant="outline" className="gap-1.5" onClick={runSummary} disabled={summary.isPending || storeIds.length === 0}>
          {summary.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-purple-500" />}
          Resumo do dia (IA)
        </Button>
      </div>

      {/* Filtros */}
      <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          {stores.length > 1 && (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] uppercase text-gray-400">Lojas</label>
              <StoreMultiSelect stores={stores} selected={storeIds} onChange={setStoreIds} />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase text-gray-400">De</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase text-gray-400">Até</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase text-gray-400">Setor</label>
            <Select value={sectorId} onValueChange={setSectorId}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {(sectors ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase text-gray-400">Turno</label>
            <Select value={shiftId} onValueChange={setShiftId}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {(shifts ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase text-gray-400">Responsável</label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {(responsibles ?? []).map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : !hasData ? (
        <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
          <CardContent className="py-12 text-center text-sm text-gray-400">
            {storeIds.length === 0 ? 'Selecione ao menos uma loja no filtro.' : 'Sem tarefas no período/filtros selecionados.'}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Kpi icon={CalendarCheck} label="Agendados" value={String(m!.scheduled)} />
            <Kpi icon={CheckCircle2} label="Concluídos" value={String(m!.executed)} tone="bg-green-100 text-green-600 dark:bg-green-500/15" />
            <Kpi icon={Clock} label="Pendentes" value={String(m!.pending)} tone="bg-blue-100 text-blue-600 dark:bg-blue-500/15" />
            <Kpi icon={AlertTriangle} label="Atrasados" value={String(m!.late + m!.missed)} tone="bg-amber-100 text-amber-600 dark:bg-amber-500/15" />
            <Kpi icon={AlertTriangle} label="Falhas críticas" value={String(m!.criticalFailures)} tone="bg-red-100 text-red-600 dark:bg-red-500/15" />
            <Kpi icon={ShieldCheck} label="Conformidade" value={`${data!.indicators.conformidade}%`} tone="bg-purple-100 text-purple-600 dark:bg-purple-600/15" />
          </div>

          {/* Score + indicadores */}
          <div className="grid gap-3 lg:grid-cols-[300px_1fr]">
            <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
              <CardContent className="flex flex-col items-center p-5">
                <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  <Gauge className="h-3.5 w-3.5" /> Score operacional
                </p>
                <p className={`text-5xl font-black ${scoreTone(data!.score.score)}`}>{data!.score.score}</p>
                <p className="mb-4 text-xs text-gray-400">de 100</p>
                <div className="w-full space-y-2.5">
                  <ScoreComponent label="Pontualidade (40%)" value={data!.score.pontualidade} />
                  <ScoreComponent label="Conformidade (30%)" value={data!.score.conformidade} />
                  <ScoreComponent label="Conclusão (20%)" value={data!.score.conclusao} />
                  <ScoreComponent label="Qualidade (10%)" value={data!.score.qualidade} />
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <Kpi icon={ListChecks} label="Taxa de conclusão" value={`${data!.indicators.taxaConclusao}%`} />
              <Kpi icon={Clock} label="Pontualidade" value={`${data!.indicators.pontualidade}%`} />
              <Kpi icon={ShieldCheck} label="Conformidade dos itens" value={`${data!.indicators.conformidade}%`} />
            </div>
          </div>

          {/* Rankings preliminares */}
          <div className="grid gap-3 md:grid-cols-2">
            <BreakdownTable title="Score por setor" rows={data!.bySector} nameOf={sectorName} />
            <BreakdownTable title="Score por responsável" rows={data!.byUser} nameOf={userName} />
          </div>
        </>
      )}

      {/* Resumo do dia por IA */}
      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" /> Resumo operacional — {dateTo}
            </DialogTitle>
          </DialogHeader>
          {summary.isPending ? (
            <div className="flex items-center gap-2 py-8 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Gerando resumo com IA…
            </div>
          ) : summary.data ? (
            <FormattedSummary text={summary.data.summary} />
          ) : (
            <p className="py-6 text-sm text-gray-400">Não foi possível gerar o resumo.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Renderiza o resumo da IA com % e números em negrito e os rótulos destacados. */
function FormattedSummary({ text }: { text: string }) {
  // realça números, percentuais e valores em R$
  const emphasize = (s: string) =>
    s.split(/(R\$\s?[\d.,]+|\d+(?:[.,]\d+)?%?)/g).map((part, i) =>
      /\d/.test(part)
        ? <strong key={i} className="font-bold text-gray-900 dark:text-white">{part}</strong>
        : <span key={i}>{part}</span>,
    );

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  return (
    <div className="space-y-2.5 text-sm leading-relaxed text-gray-700 dark:text-white/70">
      {lines.map((line, i) => {
        const idx = line.indexOf(':');
        const hasLabel = idx > 0 && idx <= 22;
        if (hasLabel) {
          return (
            <p key={i}>
              <strong className="font-semibold text-purple-600 dark:text-purple-400">{line.slice(0, idx + 1)}</strong>
              {emphasize(line.slice(idx + 1))}
            </p>
          );
        }
        return <p key={i}>{emphasize(line)}</p>;
      })}
    </div>
  );
}

function BreakdownTable({ title, rows, nameOf }: { title: string; rows: GroupResult[]; nameOf: (id: string) => string }) {
  return (
    <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
      <CardContent className="p-4">
        <p className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-xs text-gray-400">Sem dados.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="text-center">Concl.</TableHead>
                <TableHead className="text-center">Pontual.</TableHead>
                <TableHead className="text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.key}>
                  <TableCell className="font-medium">{nameOf(r.key)}</TableCell>
                  <TableCell className="text-center text-sm text-gray-500">{r.score.conclusao}%</TableCell>
                  <TableCell className="text-center text-sm text-gray-500">{r.score.pontualidade}%</TableCell>
                  <TableCell className={`text-right font-bold ${scoreTone(r.score.score)}`}>{r.score.score}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
