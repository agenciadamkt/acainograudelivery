/**
 * CheckGrau — Visão por Colaborador (Bloco D). Ranking dos operadores pelo que
 * executaram: execuções · atrasos · conformidade · pontualidade · score.
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Trophy, Medal, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCollaboratorRanking, type CollaboratorRankRow } from '@/hooks/checkgrau/useCollaboratorRanking';
import { CARGO_LABEL, type Cargo } from '@/hooks/checkgrau/useCollaborators';

function daysAgoISO(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function todayISO(): string { return new Date().toISOString().slice(0, 10); }
const scoreTone = (v: number) =>
  v >= 80 ? 'text-green-600 dark:text-green-400' : v >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';
const MEDAL = ['text-amber-400', 'text-gray-400', 'text-amber-700'];

function Podium({ rows }: { rows: CollaboratorRankRow[] }) {
  const top = rows.slice(0, 3);
  if (top.length === 0) return null;
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      {top.map((r, i) => (
        <Card key={r.auth_user_id} className={cn('border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]', i === 0 && 'ring-1 ring-amber-300')}>
          <CardContent className="flex items-center gap-3 p-4">
            {i === 0 ? <Trophy className={cn('h-6 w-6', MEDAL[0])} /> : <Medal className={cn('h-6 w-6', MEDAL[i])} />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{r.name}</p>
              <p className="text-[11px] text-gray-400">{r.execucoes} execuções</p>
            </div>
            <p className={cn('text-2xl font-black', scoreTone(r.score.score))}>{r.score.score}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function CollaboratorsRankingPage() {
  const [dateFrom, setDateFrom] = useState(daysAgoISO(30));
  const [dateTo, setDateTo] = useState(todayISO());
  const { data, isLoading } = useCollaboratorRanking(dateFrom, dateTo);
  const rows = data ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
            <Users className="h-5 w-5 text-purple-600" /> Colaboradores
          </h1>
          <p className="text-sm text-gray-500 dark:text-white/40">Desempenho pelo que cada operador executou.</p>
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
      ) : rows.length === 0 ? (
        <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
          <CardContent className="py-12 text-center text-sm text-gray-400">
            Sem execuções de colaboradores no período. (As execuções feitas pelo app do operador aparecem aqui.)
          </CardContent>
        </Card>
      ) : (
        <>
          <Podium rows={rows} />
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/[0.06]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Colaborador</TableHead>
                  <TableHead className="text-center">Execuções</TableHead>
                  <TableHead className="text-center">Atrasos</TableHead>
                  <TableHead className="text-center">Conformidade</TableHead>
                  <TableHead className="text-center">Pontualidade</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={r.auth_user_id}>
                    <TableCell className="text-sm font-semibold text-gray-400">{i + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium text-gray-900 dark:text-white">{r.name}</div>
                      {r.cargo && <Badge variant="secondary" className="mt-0.5 text-[10px]">{CARGO_LABEL[r.cargo as Cargo] ?? r.cargo}</Badge>}
                    </TableCell>
                    <TableCell className="text-center text-sm text-gray-500">{r.execucoes}</TableCell>
                    <TableCell className="text-center text-sm text-gray-500">{r.atrasos}</TableCell>
                    <TableCell className="text-center text-sm text-gray-500">{r.score.conformidade}%</TableCell>
                    <TableCell className="text-center text-sm text-gray-500">{r.score.pontualidade}%</TableCell>
                    <TableCell className={cn('text-right text-base font-bold', scoreTone(r.score.score))}>{r.score.score}</TableCell>
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
