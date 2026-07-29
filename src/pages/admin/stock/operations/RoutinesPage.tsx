/**
 * Operações 2.0 — Rotinas (M1).
 * A recorrência que gera as tarefas: checklist + setor/turno + responsável +
 * recorrência + horário + SLA de tolerância + criticidade.
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, AlertTriangle, CalendarClock } from 'lucide-react';
import {
  useRoutines, useRoutineMutations, useChecklistsForRoutine,
  type Routine, type NewRoutine, type RecurrenceType,
} from '@/hooks/operations/useRoutines';
import { useSectors } from '@/hooks/operations/useSectors';
import { useShifts } from '@/hooks/operations/useShifts';
import { useCollaborators } from '@/hooks/checkgrau/useCollaborators';
import { useStore } from '@/contexts/StoreContext';

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const RECURRENCE_LABEL: Record<RecurrenceType, string> = {
  daily: 'Diária', weekly: 'Semanal', monthly: 'Mensal', once: 'Data única',
};
const NONE = '__none__';

function emptyForm(): NewRoutine {
  return {
    checklist_id: '', sector_id: null, shift_id: null, responsible_user_id: null, collaborator_id: null,
    recurrence_type: 'daily', weekdays: [], specific_date: null, day_of_month: null, last_day_of_month: false,
    scheduled_time: '08:00', sla_grace_minutes: 0, critical: false, is_active: true,
  };
}

function RoutineDialog({ editing, onClose }: { editing: Routine | null; onClose: () => void }) {
  const { data: checklists } = useChecklistsForRoutine();
  const { data: sectors } = useSectors();
  const { data: shifts } = useShifts();
  const { data: collaborators } = useCollaborators();
  const { currentStore } = useStore();
  const { create, update } = useRoutineMutations();

  // Só colaboradores ATIVOS e vinculados à loja atual — impede atribuir uma
  // rotina a alguém de outra unidade (a tarefa ficaria "presa" na loja errada e
  // o app do colaborador, que lista por loja, nunca mostraria a tarefa).
  const eligibleCollaborators = (collaborators ?? []).filter(
    (c) => c.status === 'ativo' && (!currentStore?.id || (c.store_ids ?? []).includes(currentStore.id)),
  );
  const [f, setF] = useState<NewRoutine>(
    editing
      ? {
          checklist_id: editing.checklist_id, sector_id: editing.sector_id, shift_id: editing.shift_id,
          responsible_user_id: editing.responsible_user_id, collaborator_id: editing.collaborator_id, recurrence_type: editing.recurrence_type,
          weekdays: editing.weekdays ?? [], specific_date: editing.specific_date ?? null,
          day_of_month: editing.day_of_month ?? null, last_day_of_month: editing.last_day_of_month ?? false,
          scheduled_time: (editing.scheduled_time ?? '08:00').slice(0, 5),
          sla_grace_minutes: editing.sla_grace_minutes, critical: editing.critical, is_active: editing.is_active,
        }
      : emptyForm(),
  );

  const toggleWeekday = (i: number) =>
    setF((p) => ({ ...p, weekdays: p.weekdays.includes(i) ? p.weekdays.filter((w) => w !== i) : [...p.weekdays, i].sort() }));

  const submit = () => {
    if (!f.checklist_id) return;
    if (f.recurrence_type === 'once' && !f.specific_date) { toast.error('Informe a data.'); return; }
    if (f.recurrence_type === 'monthly' && !f.last_day_of_month && !f.day_of_month) { toast.error('Informe o dia do mês.'); return; }
    const payload = { ...f, scheduled_time: f.scheduled_time.slice(0, 5) };
    if (editing) update.mutate({ id: editing.id, ...payload }, { onSuccess: onClose });
    else create.mutate(payload, { onSuccess: onClose });
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{editing ? 'Editar rotina' : 'Nova rotina'}</DialogTitle></DialogHeader>
      <div className="grid gap-3.5 py-1">
        <div className="grid gap-1.5">
          <Label>Checklist</Label>
          <Select value={f.checklist_id} onValueChange={(v) => setF({ ...f, checklist_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione o checklist" /></SelectTrigger>
            <SelectContent>
              {(checklists ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Setor</Label>
            <Select value={f.sector_id ?? NONE} onValueChange={(v) => setF({ ...f, sector_id: v === NONE ? null : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Sem setor —</SelectItem>
                {(sectors ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Turno</Label>
            <Select value={f.shift_id ?? NONE} onValueChange={(v) => setF({ ...f, shift_id: v === NONE ? null : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Sem turno —</SelectItem>
                {(shifts ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label>Responsável (colaborador)</Label>
          <Select value={f.collaborator_id ?? NONE} onValueChange={(v) => setF({ ...f, collaborator_id: v === NONE ? null : v })}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>— Sem responsável —</SelectItem>
              {eligibleCollaborators.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              {eligibleCollaborators.length === 0 && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum colaborador vinculado a esta loja.</div>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Recorrência</Label>
            <Select value={f.recurrence_type} onValueChange={(v) => setF({ ...f, recurrence_type: v as RecurrenceType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diária</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="once">Data única</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Horário</Label>
            <Input type="time" value={f.scheduled_time} onChange={(e) => setF({ ...f, scheduled_time: e.target.value })} />
          </div>
        </div>

        {f.recurrence_type === 'weekly' && (
          <div className="grid gap-1.5">
            <Label>Dias da semana</Label>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((d, i) => (
                <button
                  key={d} type="button" onClick={() => toggleWeekday(i)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                    f.weekdays.includes(i)
                      ? 'border-transparent bg-purple-600 text-white'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-white/10 dark:text-white/60'
                  }`}
                >{d}</button>
              ))}
            </div>
          </div>
        )}

        {f.recurrence_type === 'once' && (
          <div className="grid gap-1.5">
            <Label>Data</Label>
            <Input type="date" value={f.specific_date ?? ''} onChange={(e) => setF({ ...f, specific_date: e.target.value || null })} />
            <p className="text-[11px] text-gray-400">Acontece só nesta data, no horário acima — não se repete.</p>
          </div>
        )}

        {f.recurrence_type === 'monthly' && (
          <div className="grid gap-1.5">
            <Label>Dia do mês</Label>
            <div className="flex items-center gap-4">
              <Input type="number" min={1} max={31} className="w-24"
                value={f.last_day_of_month ? '' : (f.day_of_month ?? '')}
                disabled={f.last_day_of_month}
                onChange={(e) => setF({ ...f, day_of_month: e.target.value ? Math.min(31, Math.max(1, parseInt(e.target.value, 10))) : null })} />
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-white/60">
                <Switch checked={f.last_day_of_month} onCheckedChange={(v) => setF({ ...f, last_day_of_month: v })} /> Último dia do mês
              </label>
            </div>
            <p className="text-[11px] text-gray-400">Se o dia não existir no mês (ex.: 31 em fevereiro), cai no último dia.</p>
          </div>
        )}

        <div className="grid grid-cols-2 items-end gap-3">
          <div className="grid gap-1.5">
            <Label>Tolerância (min)</Label>
            <Input type="number" min={0} value={f.sla_grace_minutes}
              onChange={(e) => setF({ ...f, sla_grace_minutes: parseInt(e.target.value || '0', 10) })} />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <Switch checked={f.critical} onCheckedChange={(v) => setF({ ...f, critical: v })} />
            Tarefa crítica
          </label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button className="bg-purple-600 hover:bg-purple-700" onClick={submit} disabled={!f.checklist_id || create.isPending || update.isPending}>
          {editing ? 'Salvar' : 'Criar rotina'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export default function RoutinesPage() {
  const { data, isLoading } = useRoutines();
  const { remove } = useRoutineMutations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Routine | null>(null);

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (r: Routine) => { setEditing(r); setOpen(true); };

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Rotinas</h1>
          <p className="text-sm text-gray-500 dark:text-white/40">
            Cada rotina gera automaticamente as tarefas da agenda operacional.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5 bg-purple-600 hover:bg-purple-700" onClick={openNew}>
              <Plus className="h-4 w-4" /> Nova rotina
            </Button>
          </DialogTrigger>
          {open && <RoutineDialog editing={editing} onClose={() => setOpen(false)} />}
        </Dialog>
      </div>

      <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
        <CardContent className="p-4">
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (data?.length ?? 0) === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              <CalendarClock className="mx-auto mb-2 h-8 w-8 opacity-40" />
              Nenhuma rotina ainda. Crie a primeira para começar a agenda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Checklist</TableHead>
                    <TableHead>Setor / Turno</TableHead>
                    <TableHead>Recorrência</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data!.map((r) => (
                    <TableRow key={r.id} className={r.is_active ? '' : 'opacity-50'}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5">
                          {r.checklist?.name ?? '—'}
                          {r.critical && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" aria-label="Crítica" />}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 dark:text-white/50">
                        {r.sector?.name ?? '—'}{r.shift?.name ? ` · ${r.shift.name}` : ''}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[11px]">{RECURRENCE_LABEL[r.recurrence_type]}</Badge>
                        {r.recurrence_type === 'weekly' && (
                          <span className="ml-1.5 text-[11px] text-gray-400">
                            {(r.weekdays ?? []).map((w) => WEEKDAYS[w]).join(', ')}
                          </span>
                        )}
                        {r.recurrence_type === 'once' && r.specific_date && (
                          <span className="ml-1.5 text-[11px] text-gray-400">
                            {new Date(r.specific_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        {r.recurrence_type === 'monthly' && (
                          <span className="ml-1.5 text-[11px] text-gray-400">
                            {r.last_day_of_month ? 'último dia' : r.day_of_month ? `dia ${r.day_of_month}` : ''}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{(r.scheduled_time ?? '').slice(0, 5)}</TableCell>
                      <TableCell className="text-sm text-gray-500 dark:text-white/50">
                        {r.collaborator?.name ?? '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => openEdit(r)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-red-500 hover:text-red-600" onClick={() => remove.mutate(r.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
