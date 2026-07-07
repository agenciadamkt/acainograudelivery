'use client';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, Plus, Trash2, Edit2, Play, Pause, ArrowLeft,
  Clock, Users, Layers, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEKDAYS = [
  { label: 'SEG', value: 0 },
  { label: 'TER', value: 1 },
  { label: 'QUA', value: 2 },
  { label: 'QUI', value: 3 },
  { label: 'SEX', value: 4 },
  { label: 'SÁB', value: 5 },
  { label: 'DOM', value: 6 },
];

const RECURRENCE_LABELS: Record<string, string> = {
  daily: 'Diária',
  weekly: 'Semanal',
  monthly: 'Mensal',
};

const NOTIFICATION_TIMES: string[] = [];
for (let h = 5; h <= 22; h++) {
  NOTIFICATION_TIMES.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 22) NOTIFICATION_TIMES.push(`${String(h).padStart(2, '0')}:30`);
}

const EMPTY_FORM = {
  name: '',
  recurrence_type: 'weekly',
  weekdays: [] as number[],
  notification_time: '07:00',
  responsible_id: '',
  responsible_name: '',
  is_active: true,
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function getNextExecutionLabel(rc: any): string {
  if (!rc.is_active) return 'Pausada';
  const time = rc.notification_time || '07:00';
  if (rc.recurrence_type === 'daily') return `Amanhã às ${time}`;
  if (rc.recurrence_type === 'monthly') return `Próximo mês às ${time}`;
  if (rc.recurrence_type === 'weekly' && rc.weekdays?.length > 0) {
    const sorted = [...rc.weekdays].sort((a: number, b: number) => a - b);
    const jsDay = new Date().getDay();
    const todayOur = (jsDay + 6) % 7; // JS Sun=0 → our Mon=0
    let minDiff = 8;
    for (const d of sorted) {
      const diff = (d - todayOur + 7) % 7 || 7;
      if (diff < minDiff) minDiff = diff;
    }
    const next = addDays(new Date(), minDiff);
    return `${format(next, "EEE dd/MM", { locale: ptBR })} às ${time}`;
  }
  return '—';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RecurringCountsPage() {
  const navigate = useNavigate();
  const { currentStore } = useStore();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  // ── Queries ───────────────────────────────────────────────────

  const { data: counts = [], isLoading } = useQuery({
    queryKey: ['recurring_counts', currentStore?.id],
    queryFn: async () => {
      if (!currentStore?.id) return [];
      const { data, error } = await (supabase as any)
        .from('inventory_recurring_counts')
        .select(`
          *,
          groups:inventory_recurring_count_groups(
            group_id,
            inventory_count_groups(id, name, color)
          )
        `)
        .eq('store_id', currentStore.id)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentStore?.id,
  });

  const { data: countGroups = [] } = useQuery({
    queryKey: ['count_groups', currentStore?.id],
    queryFn: async () => {
      if (!currentStore?.id) return [];
      const { data, error } = await (supabase as any)
        .from('inventory_count_groups')
        .select('id, name, color')
        .eq('store_id', currentStore.id)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentStore?.id,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['user_profiles_simple'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('user_profiles')
        .select('id, nome, email')
        .eq('ativo', true)
        .order('nome');
      return data || [];
    },
  });

  // ── Mutations ─────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const base = {
        store_id: currentStore?.id,
        name: payload.name,
        recurrence_type: payload.recurrence_type,
        weekdays: payload.weekdays,
        notification_time: payload.notification_time,
        responsible_id: payload.responsible_id || null,
        responsible_name: payload.responsible_name || null,
        is_active: payload.is_active,
      };

      let rcId: string;

      if (editTarget) {
        const { data, error } = await (supabase as any)
          .from('inventory_recurring_counts')
          .update(base)
          .eq('id', editTarget.id)
          .select()
          .single();
        if (error) throw error;
        rcId = data.id;
        await (supabase as any)
          .from('inventory_recurring_count_groups')
          .delete()
          .eq('recurring_count_id', rcId);
      } else {
        const { data, error } = await (supabase as any)
          .from('inventory_recurring_counts')
          .insert([base])
          .select()
          .single();
        if (error) throw error;
        rcId = data.id;
      }

      if (payload.selectedGroups.length > 0) {
        await (supabase as any)
          .from('inventory_recurring_count_groups')
          .insert(
            payload.selectedGroups.map((gid: string) => ({
              recurring_count_id: rcId,
              group_id: gid,
            }))
          );
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring_counts'] });
      closeDialog();
      toast.success(editTarget ? 'Contagem atualizada!' : 'Contagem recorrente criada!');
    },
    onError: () => toast.error('Erro ao salvar. Verifique se as tabelas foram criadas (ADD_RECURRING_COUNTS.sql).'),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from('inventory_recurring_counts')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring_counts'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('inventory_recurring_counts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring_counts'] });
      toast.success('Contagem removida!');
    },
  });

  const startExecutionMutation = useMutation({
    mutationFn: async (rcId: string) => {
      const { data, error } = await (supabase as any)
        .from('inventory_recurring_count_executions')
        .insert([{
          recurring_count_id: rcId,
          store_id: currentStore?.id,
          status: 'in_progress',
          executed_by: user?.id,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => navigate(`/admin/stock/count-executions/${data.id}`),
    onError: () => toast.error('Erro ao iniciar contagem.'),
  });

  // ── Helpers ───────────────────────────────────────────────────

  function closeDialog() {
    setDialogOpen(false);
    setEditTarget(null);
    setForm({ ...EMPTY_FORM });
    setSelectedGroups([]);
  }

  function openCreate() {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM });
    setSelectedGroups([]);
    setDialogOpen(true);
  }

  function openEdit(rc: any) {
    setEditTarget(rc);
    setForm({
      name: rc.name,
      recurrence_type: rc.recurrence_type,
      weekdays: rc.weekdays || [],
      notification_time: rc.notification_time || '07:00',
      responsible_id: rc.responsible_id || '',
      responsible_name: rc.responsible_name || '',
      is_active: rc.is_active,
    });
    setSelectedGroups(rc.groups?.map((g: any) => g.group_id) || []);
    setDialogOpen(true);
  }

  function toggleWeekday(val: number) {
    setForm(f => ({
      ...f,
      weekdays: f.weekdays.includes(val)
        ? f.weekdays.filter(d => d !== val)
        : [...f.weekdays, val],
    }));
  }

  function toggleGroup(id: string) {
    setSelectedGroups(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <button
        onClick={() => navigate('/admin/stock/dashboard')}
        className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-primary/50 hover:text-primary hover:bg-primary/10 transition-all w-fit"
      >
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
        <span>Estoque & Operações</span>
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400">
            Contagem Recorrente
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            Agende inventários automáticos com responsável definido
          </p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 gap-2 px-6 h-12 rounded-2xl"
          onClick={openCreate}
        >
          <Plus size={20} /> Nova Contagem
        </Button>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-56 rounded-3xl bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : counts.length === 0 ? (
        <div className="glass-card p-20 text-center flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center text-primary/30">
            <RefreshCw size={40} />
          </div>
          <div>
            <h3 className="text-xl font-bold">Nenhuma contagem recorrente</h3>
            <p className="text-muted-foreground">
              Crie rotinas de inventário automáticas para sua equipe.
            </p>
          </div>
          <Button
            variant="outline"
            className="mt-2 rounded-2xl gap-2 font-bold"
            onClick={openCreate}
          >
            <Plus size={16} /> Criar primeira contagem
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {counts.map((rc: any) => (
              <motion.div
                key={rc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="glass-card border-none overflow-hidden group hover:shadow-2xl transition-all duration-500">
                  <div className={cn('h-2 w-full', rc.is_active ? 'bg-primary' : 'bg-gray-300')} />
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xl font-black truncate">{rc.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-[10px] font-black uppercase shrink-0">
                            {RECURRENCE_LABELS[rc.recurrence_type] || rc.recurrence_type}
                          </Badge>
                          {rc.recurrence_type === 'weekly' && rc.weekdays?.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {WEEKDAYS.filter(d => rc.weekdays.includes(d.value)).map(d => (
                                <span
                                  key={d.value}
                                  className="text-[9px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded-full"
                                >
                                  {d.label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[9px] font-black shrink-0',
                          rc.is_active
                            ? 'border-green-200 bg-green-50 text-green-700'
                            : 'border-gray-200 bg-gray-50 text-gray-500'
                        )}
                      >
                        {rc.is_active ? 'Ativa' : 'Pausada'}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-2.5 pb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock size={13} className="shrink-0" />
                      <span className="font-medium truncate">{getNextExecutionLabel(rc)}</span>
                    </div>
                    {rc.responsible_name && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users size={13} className="shrink-0" />
                        <span className="font-medium truncate">{rc.responsible_name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Layers size={13} className="shrink-0" />
                      <span className="font-medium">{rc.groups?.length || 0} grupo(s) vinculado(s)</span>
                    </div>

                    {/* Groups preview */}
                    {rc.groups?.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap pt-1">
                        {rc.groups.slice(0, 4).map((g: any) => (
                          <span
                            key={g.group_id}
                            className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted/60"
                          >
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: g.inventory_count_groups?.color }}
                            />
                            {g.inventory_count_groups?.name}
                          </span>
                        ))}
                        {rc.groups.length > 4 && (
                          <span className="text-[10px] text-muted-foreground font-bold">
                            +{rc.groups.length - 4}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-white/20">
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5 font-bold bg-primary text-white rounded-xl h-9 text-xs"
                        onClick={() => startExecutionMutation.mutate(rc.id)}
                        disabled={!rc.is_active || startExecutionMutation.isPending}
                      >
                        <Play size={12} /> Iniciar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl shrink-0"
                        title="Editar"
                        onClick={() => openEdit(rc)}
                      >
                        <Edit2 size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          'h-9 w-9 rounded-xl shrink-0',
                          rc.is_active
                            ? 'text-amber-500 hover:bg-amber-50'
                            : 'text-green-500 hover:bg-green-50'
                        )}
                        title={rc.is_active ? 'Pausar' : 'Ativar'}
                        onClick={() =>
                          toggleMutation.mutate({ id: rc.id, is_active: !rc.is_active })
                        }
                      >
                        {rc.is_active ? <Pause size={14} /> : <Play size={14} />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl text-red-500 hover:bg-red-50 shrink-0"
                        title="Excluir"
                        onClick={() => {
                          if (confirm('Excluir esta contagem recorrente?'))
                            deleteMutation.mutate(rc.id);
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="glass-card border-none shadow-2xl sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              {editTarget ? 'Editar Contagem Recorrente' : 'Nova Contagem Recorrente'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-2">
            {/* Name */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Nome da Contagem
              </Label>
              <Input
                placeholder="Ex: Todo Domingo — Açaí e Frutas"
                className="h-12 bg-muted/40 border-none"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* Recurrence Type */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Tipo de Recorrência
              </Label>
              <Select
                value={form.recurrence_type}
                onValueChange={v => setForm(f => ({ ...f, recurrence_type: v }))}
              >
                <SelectTrigger className="h-12 bg-muted/40 border-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diária</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Weekday Toggles */}
            {form.recurrence_type === 'weekly' && (
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Dias da Semana
                </Label>
                <div className="flex gap-2 flex-wrap">
                  {WEEKDAYS.map(d => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleWeekday(d.value)}
                      className={cn(
                        'px-3.5 py-2 rounded-xl text-[11px] font-black uppercase transition-all',
                        form.weekdays.includes(d.value)
                          ? 'bg-primary text-white shadow-lg shadow-primary/20'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notification Time */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Horário da Notificação
              </Label>
              <Select
                value={form.notification_time}
                onValueChange={v => setForm(f => ({ ...f, notification_time: v }))}
              >
                <SelectTrigger className="h-12 bg-muted/40 border-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {NOTIFICATION_TIMES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Responsible */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Responsável
              </Label>
              <Select
                value={form.responsible_id}
                onValueChange={v => {
                  const found = users.find((u: any) => u.id === v);
                  setForm(f => ({
                    ...f,
                    responsible_id: v,
                    responsible_name: found?.nome || found?.email || '',
                  }));
                }}
              >
                <SelectTrigger className="h-12 bg-muted/40 border-none">
                  <SelectValue placeholder="Selecionar responsável..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Count Groups */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Grupos de Insumos
                </Label>
                <button
                  type="button"
                  onClick={() => navigate('/admin/stock/count-groups')}
                  className="text-[11px] text-primary font-bold hover:underline flex items-center gap-1"
                >
                  <Plus size={11} /> Criar Grupo
                </button>
              </div>
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
                {countGroups.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nenhum grupo criado ainda.
                  </p>
                ) : (
                  countGroups.map((g: any) => (
                    <label
                      key={g.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/60 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedGroups.includes(g.id)}
                        onCheckedChange={() => toggleGroup(g.id)}
                      />
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: g.color }}
                      />
                      <span className="text-sm font-bold">{g.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-6">
            <Button
              className="w-full h-12 bg-primary font-black text-white rounded-2xl"
              disabled={!form.name || saveMutation.isPending}
              onClick={() => saveMutation.mutate({ ...form, selectedGroups })}
            >
              {editTarget ? 'Salvar Alterações' : 'Criar Contagem Recorrente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
