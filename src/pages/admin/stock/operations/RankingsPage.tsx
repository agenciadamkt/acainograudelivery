/**
 * Operações 2.0 — Rankings (M4).
 * Ranking de responsáveis e de setores por score (reaproveita o cálculo do M3),
 * com Score · Conformidade · Pontualidade · Execuções.
 */

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Trophy, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSectors } from '@/hooks/operations/useSectors';
import { useResponsibles } from '@/hooks/operations/useRoutines';
import { useOperationsDashboard, type GroupResult } from '@/hooks/operations/useOperationsDashboard';

function daysAgoISO(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function todayISO(): string { return new Date().toISOString().slice(0, 10); }

const scoreTone = (v: number) =>
  v >= 80 ? 'text-green-600 dark:text-green-400' : v >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';

const MEDAL = ['text-amber-400', 'text-gray-400', 'text-amber-700'];

function Podium({ rows, nameOf }: { rows: GroupResult[]; nameOf: (id: string) => string }) {
  const top = rows.slice(0, 3);
  if (top.length === 0) return null;
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      {top.map((r, i) => (
        <Card key={r.key} className={cn('border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]', i === 0 && 'ring-1 ring-amber-300')}>
          <CardContent className="flex items-center gap-3 p-4">
            {i === 0 ? <Trophy className={cn('h-6 w-6', MEDAL[0])} /> : <Medal className={cn('h-6 w-6', MEDAL[i])} />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{nameOf(r.key)}</p>
              <p className="text-[11px] text-gray-400">{r.metrics.executed} execuções</p>
            </div>
            <p className={cn('text-2xl font-black', scoreTone(r.score.score))}>{r.score.score}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RankTable({ rows, nameOf }: { rows: GroupResult[]; nameOf: (id: string) => string }) {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-gray-400">Sem dados no período.</p>;
  }
  return (
    <>
      <Podium rows={rows} nameOf={nameOf} />
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/[0.06]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="text-center">Conformidade</TableHead>
              <TableHead className="text-center">Pontualidade</TableHead>
              <TableHead className="text-center">Execuções</TableHead>
              <TableHead className="text-right">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.key}>
                <TableCell className="text-sm font-semibold text-gray-400">{i + 1}</TableCell>
                <TableCell className="font-medium">{nameOf(r.key)}</TableCell>
                <TableCell className="text-center text-sm text-gray-500">{r.score.conformidade}%</TableCell>
                <TableCell className="text-center text-sm text-gray-500">{r.score.pontualidade}%</TableCell>
                <TableCell className="text-center text-sm text-gray-500">{r.metrics.executed}</TableCell>
                <TableCell className={cn('text-right text-base font-bold', scoreTone(r.score.score))}>{r.score.score}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

export default function RankingsPage() {
  const [dateFrom, setDateFrom] = useState(daysAgoISO(30));
  const [dateTo, setDateTo] = useState(todayISO());

  const { data: sectors } = useSectors();
  const { data: responsibles } = useResponsibles();
  const filters = useMemo(() => ({ dateFrom, dateTo }), [dateFrom, dateTo]);
  const { data, isLoading } = useOperationsDashboard(filters);

  const sectorName = (id: string) => sectors?.find((s) => s.id === id)?.name ?? '—';
  const userName = (id: string) => responsibles?.find((u) => u.id === id)?.nome ?? '—';

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Rankings</h1>
          <p className="text-sm text-gray-500 dark:text-white/40">Quem e quais setores estão acima do padrão.</p>
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
      ) : (
        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">Responsáveis</TabsTrigger>
            <TabsTrigger value="sectors">Setores</TabsTrigger>
          </TabsList>
          <TabsContent value="users" className="mt-4">
            <RankTable rows={data?.byUser ?? []} nameOf={userName} />
          </TabsContent>
          <TabsContent value="sectors" className="mt-4">
            <RankTable rows={data?.bySector ?? []} nameOf={sectorName} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
