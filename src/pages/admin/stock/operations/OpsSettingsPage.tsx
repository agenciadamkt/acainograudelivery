/**
 * Operações 2.0 — Setores & Turnos (M1).
 * Cadastro básico de `sectors` e `shifts` da unidade atual.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, LayoutGrid, Clock } from 'lucide-react';
import { useSectors, useSectorMutations } from '@/hooks/operations/useSectors';
import { useShifts, useShiftMutations } from '@/hooks/operations/useShifts';

function SectorsCard() {
  const { data, isLoading } = useSectors(true);
  const { create, update, remove } = useSectorMutations();
  const [name, setName] = useState('');

  return (
    <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <LayoutGrid className="h-4 w-4 text-purple-600" /> Setores
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            create.mutate(name, { onSuccess: () => setName('') });
          }}
        >
          <Input placeholder="Novo setor (ex: Cozinha)" value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" size="sm" className="gap-1.5 bg-purple-600 hover:bg-purple-700" disabled={create.isPending}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </form>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (data?.length ?? 0) === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">Nenhum setor cadastrado.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-white/[0.06]">
            {data!.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className={s.is_active ? 'text-sm' : 'text-sm text-gray-400 line-through'}>{s.name}</span>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={s.is_active}
                    onCheckedChange={(v) => update.mutate({ id: s.id, is_active: v })}
                    aria-label="Ativo"
                  />
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-red-500 hover:text-red-600" onClick={() => remove.mutate(s.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ShiftsCard() {
  const { data, isLoading } = useShifts(true);
  const { create, update, remove } = useShiftMutations();
  const [form, setForm] = useState({ name: '', start_time: '', end_time: '' });

  return (
    <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Clock className="h-4 w-4 text-purple-600" /> Turnos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form
          className="grid grid-cols-[1fr_auto_auto_auto] items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name.trim()) return;
            create.mutate(form, { onSuccess: () => setForm({ name: '', start_time: '', end_time: '' }) });
          }}
        >
          <Input placeholder="Turno (ex: Manhã)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="w-[110px]" />
          <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className="w-[110px]" />
          <Button type="submit" size="sm" className="gap-1.5 bg-purple-600 hover:bg-purple-700" disabled={create.isPending}>
            <Plus className="h-4 w-4" />
          </Button>
        </form>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (data?.length ?? 0) === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">Nenhum turno cadastrado.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-white/[0.06]">
            {data!.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className={s.is_active ? 'text-sm' : 'text-sm text-gray-400 line-through'}>
                  {s.name}
                  {(s.start_time || s.end_time) && (
                    <span className="ml-2 text-xs text-gray-400">
                      {(s.start_time ?? '').slice(0, 5)}–{(s.end_time ?? '').slice(0, 5)}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-3">
                  <Switch checked={s.is_active} onCheckedChange={(v) => update.mutate({ id: s.id, is_active: v })} aria-label="Ativo" />
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-red-500 hover:text-red-600" onClick={() => remove.mutate(s.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function OpsSettingsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Setores &amp; Turnos</h1>
        <p className="text-sm text-gray-500 dark:text-white/40">
          Base organizacional das rotinas — usada para agendar, filtrar e pontuar as tarefas.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <SectorsCard />
        <ShiftsCard />
      </div>
    </div>
  );
}
