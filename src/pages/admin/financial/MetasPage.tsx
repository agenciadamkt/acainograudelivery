'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Target,
    Plus,
    TrendingUp,
    TrendingDown,
    DollarSign,
    CheckCircle2,
    Clock,
    Trophy,
    Flame,
    Loader2,
    Trash2,
    Edit2,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DistributionCenterSelect from './components/DistributionCenterSelect';
import { motion, AnimatePresence } from 'framer-motion';

const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatCurrencyInput = (value: string) => {
    const onlyNums = value.replace(/\D/g, "");
    if (!onlyNums) return "";
    const numberValue = Number(onlyNums) / 100;
    return numberValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseCurrencyInput = (value: string) => {
    if (!value) return 0;
    return Number(value.replace(/\./g, '').replace(',', '.'));
};

const GOAL_TYPE_LABELS: Record<string, { label: string; color: string; icon: any }> = {
    revenue: { label: 'Receita', color: 'emerald', icon: TrendingUp },
    expense_reduction: { label: 'Redução de Despesas', color: 'amber', icon: TrendingDown },
    profit: { label: 'Lucro', color: 'violet', icon: DollarSign },
    custom: { label: 'Personalizada', color: 'blue', icon: Target },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    active: { label: 'Ativa', color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' },
    completed: { label: 'Concluída', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
    expired: { label: 'Expirada', color: 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-white/40' },
    cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' },
};

export default function MetasPage() {
    const queryClient = useQueryClient();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState<any>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [goalType, setGoalType] = useState('revenue');
    const [targetValue, setTargetValue] = useState('');
    const [currentValue, setCurrentValue] = useState('');
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [selectedCD, setSelectedCD] = useState('');

    /* ── Fetch goals ── */
    const { data: goals = [], isLoading } = useQuery({
        queryKey: ['financial_goals'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();

            const { data, error } = await supabase
                .from('financial_goals' as any)
                .select('*, distribution_center:distribution_centers!distribution_center_id(name, franchisee_user_id)')
                .or(`franchisee_user_id.eq.${user?.id},distribution_center.franchisee_user_id.eq.${user?.id}`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as any[];
        },
    });

    /* ── Create / Update mutation ── */
    const saveMutation = useMutation({
        mutationFn: async (goal: any) => {
            if (editingGoal) {
                const { error } = await supabase
                    .from('financial_goals' as any)
                    .update(goal)
                    .eq('id', editingGoal.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('financial_goals' as any)
                    .insert(goal);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['financial_goals'] });
            toast.success(editingGoal ? 'Meta atualizada!' : 'Meta criada com sucesso!');
            closeDialog();
        },
        onError: (error: any) => toast.error(error.message),
    });

    /* ── Delete mutation ── */
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('financial_goals' as any)
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['financial_goals'] });
            toast.success('Meta excluída');
        },
        onError: (error: any) => toast.error(error.message),
    });

    /* ── Status update mutation ── */
    const statusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const { error } = await supabase
                .from('financial_goals' as any)
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['financial_goals'] });
            toast.success('Status atualizado!');
        },
        onError: (error: any) => toast.error(error.message),
    });

    const closeDialog = () => {
        setIsCreateOpen(false);
        setEditingGoal(null);
        setTitle('');
        setDescription('');
        setGoalType('revenue');
        setTargetValue('');
        setCurrentValue('');
        setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
        setSelectedCD('');
    };

    const openEdit = (goal: any) => {
        setEditingGoal(goal);
        setTitle(goal.title);
        setDescription(goal.description || '');
        setGoalType(goal.goal_type);
        setTargetValue(goal.target_value ? goal.target_value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
        setCurrentValue(goal.current_value ? goal.current_value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
        setStartDate(goal.start_date);
        setEndDate(goal.end_date);
        setSelectedCD(goal.distribution_center_id || '');
        setIsCreateOpen(true);
    };

    const handleSave = async () => {
        if (!title || !targetValue) {
            toast.error('Preencha título e valor da meta');
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();

        saveMutation.mutate({
            title,
            description: description || null,
            goal_type: goalType,
            target_value: parseCurrencyInput(targetValue),
            current_value: parseCurrencyInput(currentValue),
            start_date: startDate,
            end_date: endDate,
            distribution_center_id: selectedCD || null,
            franchisee_user_id: user?.id,
            updated_at: new Date().toISOString(),
        });
    };

    /* ── KPIs ── */
    const kpis = useMemo(() => {
        const active = goals.filter((g: any) => g.status === 'active');
        const completed = goals.filter((g: any) => g.status === 'completed');

        const avgProgress = active.length > 0
            ? active.reduce((s: number, g: any) => {
                const pct = g.target_value > 0 ? (g.current_value / g.target_value) * 100 : 0;
                return s + Math.min(pct, 100);
            }, 0) / active.length
            : 0;

        const onFire = active.filter((g: any) => {
            const pct = g.target_value > 0 ? (g.current_value / g.target_value) * 100 : 0;
            return pct >= 80;
        }).length;

        return { active: active.length, completed: completed.length, avgProgress, onFire };
    }, [goals]);

    /* ── Filtered goals ── */
    const filteredGoals = useMemo(() => {
        if (statusFilter === 'all') return goals;
        return goals.filter((g: any) => g.status === statusFilter);
    }, [goals, statusFilter]);

    return (
        <div className="p-4 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Metas</h2>
                    <p className="text-sm text-gray-500 dark:text-white/40">Defina e acompanhe metas financeiras da operação</p>
                </div>
                <Button
                    onClick={() => setIsCreateOpen(true)}
                    className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-shadow"
                >
                    <Plus className="h-4 w-4" /> Nova Meta
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 border-0 shadow-lg shadow-blue-500/20">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <Target className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] text-white/70 font-medium uppercase tracking-wider">Metas Ativas</p>
                                <p className="text-lg font-bold text-white tracking-tight">{kpis.active}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-500 to-green-600 border-0 shadow-lg shadow-emerald-500/20">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <CheckCircle2 className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] text-white/70 font-medium uppercase tracking-wider">Concluídas</p>
                                <p className="text-lg font-bold text-white tracking-tight">{kpis.completed}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-violet-500 to-purple-600 border-0 shadow-lg shadow-violet-500/20">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <TrendingUp className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] text-white/70 font-medium uppercase tracking-wider">Progresso Médio</p>
                                <p className="text-lg font-bold text-white tracking-tight">{kpis.avgProgress.toFixed(0)}%</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500 to-amber-600 border-0 shadow-lg shadow-orange-500/20">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <Flame className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] text-white/70 font-medium uppercase tracking-wider">Quase lá!</p>
                                <p className="text-lg font-bold text-white tracking-tight">{kpis.onFire}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter */}
            <div className="flex gap-2 flex-wrap">
                {[{ key: 'all', label: 'Todas' }, ...Object.entries(STATUS_LABELS).map(([key, val]) => ({ key, label: val.label }))].map((f) => (
                    <Button
                        key={f.key}
                        variant={statusFilter === f.key ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStatusFilter(f.key)}
                        className={statusFilter === f.key ? 'bg-violet-600 hover:bg-violet-700 text-white' : ''}
                    >
                        {f.label}
                    </Button>
                ))}
            </div>

            {/* Goals Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
            ) : filteredGoals.length === 0 ? (
                <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06]">
                    <CardContent className="p-12 text-center">
                        <Target className="h-12 w-12 text-gray-300 dark:text-white/10 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-white/30">Nenhuma meta encontrada</p>
                        <p className="text-sm text-gray-400 dark:text-white/20 mt-1">Crie sua primeira meta financeira</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <AnimatePresence mode="popLayout">
                        {filteredGoals.map((goal: any) => {
                            const progress = goal.target_value > 0 ? Math.min((goal.current_value / goal.target_value) * 100, 100) : 0;
                            const typeInfo = GOAL_TYPE_LABELS[goal.goal_type] || GOAL_TYPE_LABELS.custom;
                            const statusInfo = STATUS_LABELS[goal.status] || STATUS_LABELS.active;
                            const GoalIcon = typeInfo.icon;

                            return (
                                <motion.div
                                    key={goal.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    layout
                                >
                                    <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm hover:shadow-md transition-shadow group">
                                        <CardContent className="p-5">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-8 h-8 rounded-lg bg-${typeInfo.color}-100 dark:bg-${typeInfo.color}-500/10 flex items-center justify-center`}>
                                                        <GoalIcon className={`h-4 w-4 text-${typeInfo.color}-600 dark:text-${typeInfo.color}-400`} />
                                                    </div>
                                                    <Badge variant="outline" className={`text-[10px] ${statusInfo.color}`}>
                                                        {statusInfo.label}
                                                    </Badge>
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(goal)}>
                                                        <Edit2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => deleteMutation.mutate(goal.id)}>
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{goal.title}</h3>
                                            {goal.description && (
                                                <p className="text-xs text-gray-500 dark:text-white/40 mb-3 line-clamp-2">{goal.description}</p>
                                            )}

                                            {/* Progress bar */}
                                            <div className="mb-3">
                                                <div className="flex items-center justify-between text-xs mb-1">
                                                    <span className="text-gray-500 dark:text-white/40">
                                                        {formatBRL(goal.current_value)} / {formatBRL(goal.target_value)}
                                                    </span>
                                                    <span className={`font-bold ${progress >= 100 ? 'text-emerald-500' : progress >= 80 ? 'text-amber-500' : 'text-gray-600 dark:text-white/60'}`}>
                                                        {progress.toFixed(0)}%
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                                    <motion.div
                                                        className={`h-full rounded-full ${progress >= 100
                                                            ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                                                            : progress >= 80
                                                                ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                                                                : 'bg-gradient-to-r from-violet-500 to-purple-400'
                                                            }`}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${progress}%` }}
                                                        transition={{ duration: 1, ease: 'easeOut' }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Meta info */}
                                            <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-white/30">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {format(new Date(goal.start_date + 'T12:00:00'), 'dd/MM')} - {format(new Date(goal.end_date + 'T12:00:00'), 'dd/MM/yy')}
                                                </div>
                                                {goal.distribution_center?.name && (
                                                    <span className="truncate max-w-[100px]">{goal.distribution_center.name}</span>
                                                )}
                                            </div>

                                            {/* Quick actions */}
                                            {goal.status === 'active' && (
                                                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-white/[0.05]">
                                                    {progress >= 100 && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="flex-1 gap-1 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-500/20 dark:hover:bg-emerald-500/10"
                                                            onClick={() => statusMutation.mutate({ id: goal.id, status: 'completed' })}
                                                        >
                                                            <Trophy className="h-3 w-3" /> Concluir!
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex-1 gap-1 text-xs"
                                                        onClick={() => openEdit(goal)}
                                                    >
                                                        <Edit2 className="h-3 w-3" /> Atualizar valor
                                                    </Button>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={(o) => { if (!o) closeDialog(); else setIsCreateOpen(true); }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-violet-600" />
                            {editingGoal ? 'Editar Meta' : 'Nova Meta'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-white/40 mb-1 block">Título *</label>
                            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Faturamento mensal de R$ 50.000" />
                        </div>

                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-white/40 mb-1 block">Descrição</label>
                            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhe a meta (opcional)" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-white/40 mb-1 block">Tipo de Meta</label>
                                <Select value={goalType} onValueChange={setGoalType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="revenue">Receita</SelectItem>
                                        <SelectItem value="expense_reduction">Redução de Despesas</SelectItem>
                                        <SelectItem value="profit">Lucro</SelectItem>
                                        <SelectItem value="custom">Personalizada</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-white/40 mb-1 block">Centro de Distribuição</label>
                                <DistributionCenterSelect value={selectedCD} onChange={setSelectedCD} placeholder="Todos os CDs" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-white/40 mb-1 block">Valor Meta (R$) *</label>
                                <Input
                                    value={targetValue}
                                    onChange={(e) => setTargetValue(formatCurrencyInput(e.target.value))}
                                    placeholder="0,00"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-white/40 mb-1 block">Valor Atual (R$)</label>
                                <Input
                                    value={currentValue}
                                    onChange={(e) => setCurrentValue(formatCurrencyInput(e.target.value))}
                                    placeholder="0,00"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-white/40 mb-1 block">Data Início</label>
                                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-white/40 mb-1 block">Data Fim</label>
                                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
                        <Button
                            onClick={handleSave}
                            disabled={saveMutation.isPending}
                            className="bg-gradient-to-r from-violet-600 to-purple-600 text-white"
                        >
                            {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {editingGoal ? 'Salvar' : 'Criar Meta'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
