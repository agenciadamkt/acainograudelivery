/**
 * Operações 2.0 — Rede (M6). Compara todas as unidades por score/conformidade
 * /pontualidade/pendências/falhas. Responde "qual unidade está abaixo do padrão".
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Network, Gauge, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNetworkDashboard, type NetworkRow } from '@/hooks/operations/useNetworkDashboard';

function daysAgoISO(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function todayISO(): string { return new Date().toISOString().slice(0, 10); }

const scoreTone = (v: number) =>
  v >= 80 ? 'text-green-600 dark:text-green-400' : v >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';

function Stat({ icon: Icon, label, value, sub, tone }: { icon: any; label: string; value: string; sub?: string; tone?: string }) {
  return (
    <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', tone ?? 'bg-purple-100 text-purple-600 dark:bg-purple-600/15')}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-white/40">{label}</p>
            <p className="truncate text-xl font-bold text-gray-900 dark:text-white">{value}</p>
            {sub && <p className="truncate text-[11px] text-gray-400 dark:text-white/30">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function NetworkPage() {
  const [dateFrom, setDateFrom] = useState(daysAgoISO(30));
  const [dateTo, setDateTo] = useState(todayISO());
  const { data, isLoading } = useNetworkDashboard(dateFrom, dateTo);

  const units: NetworkRow[] = data?.units ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
            <Network className="h-5 w-5 text-purple-600" /> Rede
          </h1>
          <p className="text-sm text-gray-500 dark:text-white/40">Comparativo operacional entre as unidades.</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase text-gray-400">De</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase text-gray-400">Até</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : units.length === 0 ? (
        <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
          <CardContent className="py-12 text-center text-sm text-gray-400">Sem dados de operação no período.</CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat icon={Network} label="Unidades" value={String(units.length)} />
            <Stat icon={Gauge} label="Score médio" value={String(data!.avgScore)} tone="bg-purple-100 text-purple-600 dark:bg-purple-600/15" />
            <Stat icon={TrendingUp} label="Melhor" value={String(data!.best?.score.score ?? 0)} sub={data!.best?.store_name} tone="bg-green-100 text-green-600 dark:bg-green-500/15" />
            <Stat icon={TrendingDown} label="Abaixo do padrão" value={String(data!.worst?.score.score ?? 0)} sub={data!.worst?.store_name} tone="bg-red-100 text-red-600 dark:bg-red-500/15" />
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/[0.06]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="text-center">Conformidade</TableHead>
                  <TableHead className="text-center">Pontualidade</TableHead>
                  <TableHead className="text-center">Pendências</TableHead>
                  <TableHead className="text-center">Falhas</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((u, i) => (
                  <TableRow key={u.store_id}>
                    <TableCell className="text-sm font-semibold text-gray-400">{i + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium text-gray-900 dark:text-white">{u.store_name}</div>
                      {u.city && <div className="text-[11px] text-gray-400">{u.city}</div>}
                    </TableCell>
                    <TableCell className="text-center text-sm text-gray-500">{u.score.conformidade}%</TableCell>
                    <TableCell className="text-center text-sm text-gray-500">{u.score.pontualidade}%</TableCell>
                    <TableCell className="text-center text-sm text-gray-500">{u.pendencias}</TableCell>
                    <TableCell className="text-center">
                      {u.falhas > 0 ? (
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-red-600">
                          <AlertTriangle className="h-3.5 w-3.5" />{u.falhas}
                        </span>
                      ) : <span className="text-sm text-gray-400">0</span>}
                    </TableCell>
                    <TableCell className={cn('text-right text-base font-bold', scoreTone(u.score.score))}>{u.score.score}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
