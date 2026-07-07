'use client';

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowLeft, Loader2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function RecurringCountExecutionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Record<string, string>>({});

  // ── Load execution ─────────────────────────────────────────────
  const { data: execution, isLoading: execLoading } = useQuery({
    queryKey: ['count_execution', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('inventory_recurring_count_executions')
        .select('*, inventory_recurring_counts(id, name, recurrence_type)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // ── Load groups linked to this recurring count ─────────────────
  const recurringCountId = execution?.recurring_count_id;

  const { data: groupLinks = [] } = useQuery({
    queryKey: ['recurring_count_group_links', recurringCountId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('inventory_recurring_count_groups')
        .select('group_id, inventory_count_groups(id, name, color)')
        .eq('recurring_count_id', recurringCountId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!recurringCountId,
  });

  const groupIds: string[] = groupLinks.map((l: any) => l.group_id);

  // ── Load items for each group ──────────────────────────────────
  const { data: groupItems = [] } = useQuery({
    queryKey: ['group_items_for_execution', groupIds],
    queryFn: async () => {
      if (groupIds.length === 0) return [];
      const { data, error } = await (supabase as any)
        .from('inventory_count_group_items')
        .select(`
          group_id,
          item_id,
          inventory_items(id, name, unit, current_qty)
        `)
        .in('group_id', groupIds);
      if (error) throw error;
      return data || [];
    },
    enabled: groupIds.length > 0,
  });

  // ── Derived ────────────────────────────────────────────────────
  const groups = groupLinks.map((link: any) => {
    const groupInfo = link.inventory_count_groups;
    const items = groupItems
      .filter((gi: any) => gi.group_id === link.group_id)
      .map((gi: any) => gi.inventory_items)
      .filter(Boolean);
    return { ...groupInfo, items };
  });

  const allItems = groups.flatMap((g: any) => g.items || []);
  const filled = allItems.filter(
    (item: any) => counts[item.id] !== undefined && counts[item.id] !== ''
  ).length;
  const progress = allItems.length > 0 ? Math.round((filled / allItems.length) * 100) : 0;

  // ── Complete mutation ──────────────────────────────────────────
  const completeMutation = useMutation({
    mutationFn: async () => {
      const itemsData = allItems.map((item: any) => ({
        item_id: item.id,
        item_name: item.name,
        unit: item.unit,
        system_qty: item.current_qty ?? 0,
        counted_qty: parseFloat(counts[item.id] || '0'),
        diff: parseFloat(counts[item.id] || '0') - (item.current_qty ?? 0),
      }));

      const { error } = await (supabase as any)
        .from('inventory_recurring_count_executions')
        .update({
          status: 'completed',
          executed_at: new Date().toISOString(),
          items: itemsData,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Contagem finalizada com sucesso!');
      navigate('/admin/stock/recurring-counts');
    },
    onError: () => toast.error('Erro ao finalizar. Tente novamente.'),
  });

  // ── Loading / not found ────────────────────────────────────────
  if (execLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground font-medium">Execução não encontrada.</p>
        <Button
          variant="outline"
          className="mt-4 rounded-2xl"
          onClick={() => navigate('/admin/stock/recurring-counts')}
        >
          Voltar
        </Button>
      </div>
    );
  }

  if (execution.status === 'completed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 animate-in fade-in">
        <div className="w-20 h-20 rounded-3xl bg-green-500/10 flex items-center justify-center text-green-500">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="text-2xl font-black">Contagem já finalizada!</h2>
        <p className="text-muted-foreground">Esta execução já foi concluída anteriormente.</p>
        <Button
          className="rounded-2xl bg-primary text-white"
          onClick={() => navigate('/admin/stock/recurring-counts')}
        >
          Ver Contagens Recorrentes
        </Button>
      </div>
    );
  }

  const rc = execution.inventory_recurring_counts;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-2xl mx-auto pb-24">
      <button
        onClick={() => navigate('/admin/stock/recurring-counts')}
        className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-primary/50 hover:text-primary hover:bg-primary/10 transition-all w-fit"
      >
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
        <span>Contagens Recorrentes</span>
      </button>

      {/* Title */}
      <div>
        <h1 className="text-3xl font-black">{rc?.name}</h1>
        <p className="text-muted-foreground mt-1">
          Insira as quantidades contadas para cada insumo
        </p>
      </div>

      {/* Progress */}
      <div className="glass-card p-6 space-y-3">
        <div className="flex justify-between text-sm font-bold">
          <span>{filled} de {allItems.length} itens preenchidos</span>
          <span className="text-primary">{progress}%</span>
        </div>
        <Progress value={progress} className="h-3 rounded-full" />
        {progress === 100 && (
          <p className="text-xs text-green-600 font-bold flex items-center gap-1">
            <CheckCircle2 size={12} /> Todos os itens preenchidos — pronto para finalizar!
          </p>
        )}
      </div>

      {/* Items by group */}
      {groups.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-3xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
            <Package size={28} className="text-muted-foreground" />
          </div>
          <p className="font-bold text-muted-foreground">
            Nenhum item encontrado nos grupos vinculados.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Vincule grupos de insumos à contagem recorrente para iniciar.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group: any) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              {/* Group header */}
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: group.color }}
                />
                <h3 className="font-black text-sm uppercase tracking-widest">{group.name}</h3>
                <Badge variant="outline" className="text-[10px]">
                  {group.items?.length || 0} itens
                </Badge>
              </div>

              {/* Items */}
              <div className="space-y-2">
                {(group.items || []).map((item: any) => {
                  const val = counts[item.id] ?? '';
                  const parsed = val !== '' ? parseFloat(val) : null;
                  const diff = parsed !== null ? parsed - (item.current_qty ?? 0) : null;

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-center gap-4 p-4 glass-card rounded-2xl transition-all',
                        val !== '' && 'ring-1 ring-primary/20'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">
                          {item.unit}
                          {item.current_qty != null && (
                            <> · Sistema: {Number(item.current_qty).toFixed(2)}</>
                          )}
                        </p>
                      </div>

                      {diff !== null && (
                        <span
                          className={cn(
                            'text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 tabular-nums',
                            diff === 0
                              ? 'bg-green-100 text-green-700'
                              : diff > 0
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-red-100 text-red-700'
                          )}
                        >
                          {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                        </span>
                      )}

                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-24 h-10 text-center font-black border-none bg-muted/40 rounded-xl"
                        placeholder="0"
                        value={val}
                        onChange={e =>
                          setCounts(prev => ({ ...prev, [item.id]: e.target.value }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Sticky finalize button */}
      {allItems.length > 0 && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center px-6 z-50 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-2xl">
            <Button
              className="w-full h-14 bg-primary font-black text-white rounded-2xl shadow-2xl shadow-primary/30 gap-2"
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <CheckCircle2 size={20} />
              )}
              Finalizar Contagem ({filled}/{allItems.length})
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
