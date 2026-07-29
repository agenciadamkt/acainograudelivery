/**
 * CheckGrau — Engajamento. Mede a adesão da equipe ao app/checklists:
 * funil da jornada, KPIs de adoção, heatmap por dia da semana e colaboradores
 * em risco. Inspirado no dashboard de RH (adaptado à operação, identidade roxa).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Rocket, Activity, CheckCircle2, TrendingDown, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/contexts/StoreContext';
import { StoreMultiSelect } from '@/pages/admin/stock/operations/StoreMultiSelect';
import { useEngajamento } from '@/hooks/checkgrau/useEngajamento';

const PURPLE = '#7C3AED';
const DAYS_LABEL = 'Seg Ter Qua Qui Sex Sáb Dom'.split(' ');

function Kpi({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
      <CardContent className="p-4">
        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-[#7C3AED] dark:bg-purple-500/15">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
        {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function EngajamentoPage() {
  const { stores } = useStore();
  const [storeIds, setStoreIds] = useState<string[]>([]);
  const inited = useRef(false);
  useEffect(() => {
    if (!inited.current && stores.length > 0) { setStoreIds(stores.map((s) => s.id)); inited.current = true; }
  }, [stores]);
  const [days, setDays] = useState(30);

  const { data, isLoading } = useEngajamento(storeIds, days);
  const k = data?.kpis;

  const heatColor = (v: number) => {
    const ratio = data ? v / data.heatMax : 0;
    const alpha = v === 0 ? 0.04 : 0.15 + 0.75 * ratio;
    return { backgroundColor: `rgba(124,58,237,${alpha})`, color: ratio > 0.6 ? '#fff' : undefined };
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Engajamento</h1>
          <p className="text-sm text-gray-500 dark:text-white/40">Adesão da equipe ao app e aos checklists.</p>
        </div>
        <div className="flex items-end gap-3">
          {stores.length > 1 && <StoreMultiSelect stores={stores} selected={storeIds} onChange={setStoreIds} />}
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 dark:border-white/10 dark:bg-[#16161D]">
            {[30, 90].map((d) => (
              <button key={d} onClick={() => setDays(d)}
                className={cn('rounded-md px-3 py-1.5 text-sm font-medium', days === d ? 'bg-[#7C3AED] text-white' : 'text-gray-500')}>
                {d} dias
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : storeIds.length === 0 ? (
        <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]"><CardContent className="py-12 text-center text-sm text-gray-400">Selecione ao menos uma loja.</CardContent></Card>
      ) : (
        <>
          {/* KPIs de adoção */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi icon={Users} label="Colaboradores ativos" value={String(k!.totalAtivos)} sub={`${k!.acessaram} já acessaram`} />
            <Kpi icon={Rocket} label="Taxa de ativação" value={`${k!.taxaAtivacao}%`} sub="acessaram o app ao menos 1x" />
            <Kpi icon={Activity} label="Ativos (7 dias)" value={`${k!.taxaAtivos7}%`} sub={`${k!.ativos7} colaborador(es)`} />
            <Kpi icon={CheckCircle2} label={`Execuções (${days}d)`} value={String(k!.execucoes)} sub={`${k!.mediaPorColaborador} por colaborador`} />
          </div>

          {/* Funil da jornada */}
          <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
            <CardContent className="space-y-4 p-5">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Jornada do colaborador</p>
                <p className="text-xs text-gray-400">Do cadastro até o engajamento ativo</p>
              </div>
              <div className="space-y-4">
                {data.funnel.map((step, i) => {
                  const prev = i > 0 ? data.funnel[i - 1].count : step.count;
                  const perda = prev - step.count;
                  return (
                    <div key={step.label}>
                      <div className="mb-1 flex items-baseline justify-between">
                        <span className="text-sm text-gray-700 dark:text-white/70">{step.label}</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{step.count} <span className="text-xs font-normal text-gray-400">({step.pct}%)</span></span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                        <div className="h-full rounded-full bg-[#7C3AED]" style={{ width: `${step.pct}%` }} />
                      </div>
                      {i > 0 && perda > 0 && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-gray-400"><TrendingDown className="h-3 w-3" /> Perda de {perda} colaborador(es)</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Heatmap por dia da semana */}
          <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
            <CardContent className="space-y-3 p-5">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Execuções por dia da semana</p>
                <p className="text-xs text-gray-400">Quando a equipe mais executa (por turno)</p>
              </div>
              {data.heat.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">Sem execuções no período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[520px]">
                    <div className="mb-1 grid grid-cols-[120px_repeat(7,1fr)] gap-1.5 text-center text-[11px] font-medium text-gray-400">
                      <span />
                      {DAYS_LABEL.map((d) => <span key={d}>{d}</span>)}
                    </div>
                    {data.heat.map((row) => (
                      <div key={row.label} className="mb-1.5 grid grid-cols-[120px_repeat(7,1fr)] items-center gap-1.5">
                        <span className="truncate text-sm text-gray-600 dark:text-white/60">{row.label}</span>
                        {row.values.map((v, i) => (
                          <div key={i} style={heatColor(v)} className="flex h-9 items-center justify-center rounded-md text-xs font-semibold text-gray-700 dark:text-white/70">
                            {v > 0 ? v : ''}
                          </div>
                        ))}
                      </div>
                    ))}
                    <div className="mt-2 flex items-center justify-end gap-2 text-[11px] text-gray-400">
                      Menos
                      {[0.15, 0.4, 0.7, 1].map((a) => <span key={a} className="h-3 w-5 rounded" style={{ backgroundColor: `rgba(124,58,237,${a})` }} />)}
                      Mais
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Colaboradores em risco */}
          <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
            <CardContent className="space-y-3 p-5">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Colaboradores em risco</p>
                <p className="text-xs text-gray-400">Já acessaram, mas estão sem executar há mais de 7 dias</p>
              </div>
              {data.atRisk.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">Ninguém em risco no momento 🎉</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {data.atRisk.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 dark:border-white/[0.06]">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{c.name}</p>
                        <p className="text-xs capitalize text-gray-400">{c.cargo}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-300">
                        {c.lastDays == null ? 'Nunca executou' : `${c.lastDays}d sem atividade`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
