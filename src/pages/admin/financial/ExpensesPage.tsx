'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Loader2, ArrowDownLeft, Download, FileSpreadsheet, Banknote, Eye, Trash2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DistributionCenterSelect from './components/DistributionCenterSelect';
import ExpenseFormDialog from './components/ExpenseFormDialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addPdfBranding } from './utils/pdfBranding';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, PieChart, Pie,
} from 'recharts';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

// ... imports remain the same

const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const typeConfig: Record<string, { label: string; color: string }> = {
    fixed: { label: 'Fixa', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    variable: { label: 'Variável', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    investment: { label: 'Investimento', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
};

const CHART_COLORS = [
    '#7C3AED', '#3B82F6', '#F59E0B', '#EF4444', '#10B981',
    '#EC4899', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16',
];

export default function ExpensesPage() {
    const now = new Date();
    const [dateStart, setDateStart] = useState(format(startOfMonth(now), 'yyyy-MM-dd'));
    const [dateEnd, setDateEnd] = useState(format(endOfMonth(now), 'yyyy-MM-dd'));
    const [filterCD, setFilterCD] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editRecord, setEditRecord] = useState<any>(null);
    const [confirmDialog, setConfirmDialog] = useState<{ type: 'delete' | 'pay'; id: string | null; open: boolean }>({
        type: 'delete',
        id: null,
        open: false,
    });

    const { data: centers = [] } = useQuery({
        queryKey: ['distribution_centers'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('distribution_centers' as any)
                .select('*')
                .eq('active', true)
                .order('name');
            if (error) throw error;
            return data as any[];
        },
    });

    const { data: expenses = [], isLoading, refetch } = useQuery({
        queryKey: ['expenses', dateStart, dateEnd, filterCD, filterType, filterStatus],
        queryFn: async () => {
            let query = supabase
                .from('expenses' as any)
                .select(`
                    *,
                    distribution_center:distribution_centers!distribution_center_id(name),
                    cost_center:cost_centers!cost_center_id(name),
                    chart_account:chart_of_accounts!chart_of_accounts_id(name)
                `)
                .gte('expense_date', dateStart)
                .lte('expense_date', dateEnd)
                .order('expense_date', { ascending: false });

            if (filterCD) query = query.eq('distribution_center_id', filterCD);
            if (filterType) query = query.eq('expense_type', filterType);
            if (filterStatus !== 'all') {
                if (filterStatus === 'paid') query = query.eq('paid', true);
                if (filterStatus === 'pending') query = query.eq('paid', false);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as any[];
        },
    });

    const totalExpenses = useMemo(() =>
        expenses.reduce((sum, e: any) => sum + Number(e.amount), 0), [expenses]);

    /* ── Chart data: expenses by cost center × chart of accounts ── */
    const chartData = useMemo(() => {
        const grouped: Record<string, Record<string, number>> = {};

        expenses.forEach((e: any) => {
            const cc = e.cost_center?.name || 'Sem centro de custos';
            const ca = e.chart_account?.name || 'Sem plano de contas';
            if (!grouped[cc]) grouped[cc] = {};
            grouped[cc][ca] = (grouped[cc][ca] || 0) + Number(e.amount);
        });

        // Build data for bar chart: each cost center is a bar group, each chart of accounts is a segment
        const costCenters = Object.keys(grouped);
        const allAccounts = new Set<string>();
        costCenters.forEach((cc) => Object.keys(grouped[cc]).forEach((ca) => allAccounts.add(ca)));
        const accountList = Array.from(allAccounts);

        const barData = costCenters.map((cc) => {
            const entry: Record<string, any> = { name: cc };
            accountList.forEach((ca) => {
                entry[ca] = grouped[cc][ca] || 0;
            });
            return entry;
        });

        // Pie chart: total by cost center
        const pieData = costCenters.map((cc, i) => ({
            name: cc,
            value: Object.values(grouped[cc]).reduce((s, v) => s + v, 0),
            fill: CHART_COLORS[i % CHART_COLORS.length],
        }));

        return { barData, pieData, accountList, costCenters };
    }, [expenses]);

    const handleEdit = (record: any) => {
        setEditRecord(record);
        setDialogOpen(true);
    };

    const handleNew = () => {
        setEditRecord(null);
        setDialogOpen(true);
    };

    const handleSuccess = () => {
        setDialogOpen(false);
        setEditRecord(null);
        refetch();
    };

    const openConfirmDialog = (type: 'delete' | 'pay', id: string) => {
        setConfirmDialog({ type, id, open: true });
    };

    const handleConfirmAction = async () => {
        if (!confirmDialog.id) return;

        if (confirmDialog.type === 'delete') {
            const { error } = await supabase.from('expenses' as any).delete().eq('id', confirmDialog.id);
            if (error) {
                alert('Erro ao excluir: ' + error.message);
            } else {
                refetch();
            }
        } else if (confirmDialog.type === 'pay') {
            const { error } = await supabase
                .from('expenses' as any)
                .update({ paid: true, payment_date: new Date().toISOString().split('T')[0] })
                .eq('id', confirmDialog.id);

            if (error) {
                alert('Erro ao atualizar: ' + error.message);
            } else {
                refetch();
            }
        }
        setConfirmDialog({ ...confirmDialog, open: false });
    };

    /* ── Export PDF ── */
    const handleExportPDF = async () => {
        const doc = new jsPDF();
        const centerName = filterCD
            ? centers.find((c: any) => c.id === filterCD)?.name
            : 'Todos os CDs';

        const startY = await addPdfBranding(doc, centerName);

        doc.setFontSize(14);
        doc.text('Relatório de Despesas', 14, startY + 5);

        doc.setFontSize(10);
        doc.text(`Período: ${format(new Date(dateStart + 'T12:00:00'), 'dd/MM/yyyy')} a ${format(new Date(dateEnd + 'T12:00:00'), 'dd/MM/yyyy')}`, 14, startY + 12);

        // Increased spacing to avoid overlap (was startY + 14)
        doc.text(`Total: ${formatBRL(totalExpenses)}`, 14, startY + 17);

        const tableData = expenses.map((e: any) => [
            format(new Date(e.expense_date + 'T12:00:00'), 'dd/MM/yyyy'),
            typeConfig[e.expense_type]?.label || e.expense_type,
            e.paid ? 'Pago' : 'Pendente',
            e.distribution_center?.name || '-',
            e.purpose,
            e.cost_center?.name || '-',
            e.chart_account?.name || '-',
            formatBRL(Number(e.amount)),
        ]);

        autoTable(doc, {
            head: [['Data', 'Tipo', 'Status', 'CD', 'Finalidade', 'Centro Custos', 'Plano Contas', 'Valor']],
            body: tableData,
            startY: startY + 18,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [124, 58, 237] },
            columnStyles: { 7: { halign: 'right' } },
        });

        doc.save(`despesas_${dateStart}_${dateEnd}.pdf`);
    };

    /* ── Export Excel (CSV) ── */
    const handleExportExcel = () => {
        const headers = ['Data', 'Tipo', 'Status', 'CD', 'Finalidade', 'Centro Custos', 'Plano Contas', 'Valor'];
        const rows = expenses.map((e: any) => [
            format(new Date(e.expense_date + 'T12:00:00'), 'dd/MM/yyyy'),
            typeConfig[e.expense_type]?.label || e.expense_type,
            e.paid ? 'Pago' : 'Pendente',
            e.distribution_center?.name || '',
            e.purpose,
            e.cost_center?.name || '',
            e.chart_account?.name || '',
            Number(e.amount).toFixed(2),
        ]);

        let csvContent = 'data:text/csv;charset=utf-8,'
            + headers.join(';') + '\n'
            + rows.map((r) => r.join(';')).join('\n');

        const link = document.createElement('a');
        link.setAttribute('href', encodeURI(csvContent));
        link.setAttribute('download', `despesas_${dateStart}_${dateEnd}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-4 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Despesas</h2>
                    <p className="text-sm text-gray-500 dark:text-white/40">Gestão de despesas fixas, variáveis e investimentos</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2">
                        <Download className="h-4 w-4" /> PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2">
                        <FileSpreadsheet className="h-4 w-4" /> Excel
                    </Button>
                    <Button onClick={handleNew} className="bg-purple-600 hover:bg-purple-700 text-white">
                        <Plus className="mr-2 h-4 w-4" /> Nova Despesa
                    </Button>
                </div>
            </div>

            {/* Summary + Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                {/* Total card */}
                <Card className="bg-gradient-to-br from-red-500 to-rose-600 border-0 shadow-lg shadow-red-500/20 sm:col-span-2 lg:col-span-1">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <ArrowDownLeft className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className="text-xs text-white/70 font-medium">Total no período</p>
                            <p className="text-xl font-bold text-white tracking-tight">{formatBRL(totalExpenses)}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Filters */}
                <div className="w-full">
                    <label className="text-xs text-gray-500 dark:text-white/30 mb-1 block">CD</label>
                    <DistributionCenterSelect value={filterCD} onChange={setFilterCD} placeholder="Todos os CDs" />
                </div>
                <div>
                    <label className="text-xs text-gray-500 dark:text-white/30 mb-1 block">Tipo</label>
                    <select
                        className="w-full h-10 rounded-md border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 text-sm text-gray-900 dark:text-white outline-none"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="">Todos</option>
                        <option value="fixed">Fixa</option>
                        <option value="variable">Variável</option>
                        <option value="investment">Investimento</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs text-gray-500 dark:text-white/30 mb-1 block">Status</label>
                    <select
                        className="w-full h-10 rounded-md border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 text-sm text-gray-900 dark:text-white outline-none"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">Todos</option>
                        <option value="paid">Pagos</option>
                        <option value="pending">Pendentes</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs text-gray-500 dark:text-white/30 mb-1 block">De</label>
                    <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
                </div>
                <div>
                    <label className="text-xs text-gray-500 dark:text-white/30 mb-1 block">Até</label>
                    <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
                </div>
            </div>

            {/* ── Charts: Cost Center × Chart of Accounts ── */}
            {expenses.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Bar Chart: Cost Center breakdown by Chart of Accounts */}
                    <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
                                Despesas por Centro de Custos
                            </CardTitle>
                            <p className="text-xs text-gray-400 dark:text-white/30">Detalhado por plano de contas</p>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[280px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData.barData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fontSize: 11, fill: '#9CA3AF' }}
                                            interval={0}
                                            angle={-15}
                                            textAnchor="end"
                                            height={60}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: '#9CA3AF' }}
                                            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                                        />
                                        <Tooltip
                                            formatter={(value: number) => formatBRL(value)}
                                            contentStyle={{
                                                backgroundColor: '#1A1A24',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: 8,
                                                color: '#fff',
                                                fontSize: 12,
                                            }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: 11 }} />
                                        {chartData.accountList.map((account, i) => (
                                            <Bar
                                                key={account}
                                                dataKey={account}
                                                stackId="a"
                                                fill={CHART_COLORS[i % CHART_COLORS.length]}
                                                radius={i === chartData.accountList.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                            />
                                        ))}
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pie Chart: Total by Cost Center */}
                    <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
                                Distribuição por Centro de Custos
                            </CardTitle>
                            <p className="text-xs text-gray-400 dark:text-white/30">Participação percentual</p>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[280px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartData.pieData}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={90}
                                            innerRadius={50}
                                            dataKey="value"
                                            nameKey="name"
                                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                            labelLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                                        >
                                            {chartData.pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value: number) => formatBRL(value)}
                                            contentStyle={{
                                                backgroundColor: '#1A1A24',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: 8,
                                                color: '#fff',
                                                fontSize: 12,
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Table */}
            <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-white/[0.05]">
                                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider">Data</th>
                                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider">Tipo</th>
                                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider">Status</th>
                                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider">CD</th>
                                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider">Finalidade</th>
                                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider">Centro Custos</th>
                                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider">Plano Contas</th>
                                    <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider">Valor</th>
                                    <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-white/[0.03]">
                                {isLoading && (
                                    <tr>
                                        <td colSpan={9} className="px-5 py-12 text-center">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-purple-500" />
                                        </td>
                                    </tr>
                                )}
                                {!isLoading && expenses.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="px-5 py-12 text-center text-gray-400 dark:text-white/30">
                                            Nenhuma despesa encontrada no período
                                        </td>
                                    </tr>
                                )}
                                {expenses.map((exp: any) => {
                                    const config = typeConfig[exp.expense_type] || typeConfig.fixed;
                                    return (
                                        <tr key={exp.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                            <td className="px-5 py-3.5 whitespace-nowrap text-gray-900 dark:text-white">
                                                {format(new Date(exp.expense_date + 'T12:00:00'), 'dd/MM/yyyy')}
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <Badge className={`${config.color} border-0`}>
                                                    {config.label}
                                                </Badge>
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <Badge variant="outline" className={exp.paid ? 'text-green-600 border-green-200 bg-green-50' : 'text-amber-600 border-amber-200 bg-amber-50'}>
                                                    {exp.paid ? 'Pago' : 'Pendente'}
                                                </Badge>
                                            </td>
                                            <td className="px-5 py-3.5 text-gray-500 dark:text-white/60">
                                                {exp.distribution_center?.name || '-'}
                                            </td>
                                            <td className="px-5 py-3.5 text-gray-900 dark:text-white">{exp.purpose}</td>
                                            <td className="px-5 py-3.5 text-gray-500 dark:text-white/60">
                                                {exp.cost_center?.name || '-'}
                                            </td>
                                            <td className="px-5 py-3.5 text-gray-500 dark:text-white/60">
                                                {exp.chart_account?.name || '-'}
                                            </td>
                                            <td className="px-5 py-3.5 text-right font-medium text-gray-900 dark:text-white">
                                                {formatBRL(Number(exp.amount))}
                                            </td>
                                            <td className="px-5 py-3.5 text-right flex items-center justify-end gap-2">
                                                {!exp.paid && (
                                                    <Button size="sm" variant="ghost" title="Confirmar Pagamento" onClick={() => openConfirmDialog('pay', exp.id)} className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20">
                                                        <Banknote className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button size="sm" variant="ghost" onClick={() => handleEdit(exp)} title="Visualizar/Editar">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => openConfirmDialog('delete', exp.id)} title="Excluir" className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <ExpenseFormDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                record={editRecord}
                onSuccess={handleSuccess}
            />

            <Dialog open={confirmDialog.open} onOpenChange={(val) => setConfirmDialog({ ...confirmDialog, open: val })}>
                <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#1A1A24] border-gray-200 dark:border-white/10">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
                            {confirmDialog.type === 'pay' ? 'Confirmar Pagamento' : 'Excluir Despesa'}
                        </DialogTitle>
                        <DialogDescription className="text-gray-500 dark:text-white/60">
                            {confirmDialog.type === 'pay'
                                ? 'Deseja marcar esta despesa como paga? Esta ação atualizará o saldo em dinheiro.'
                                : 'Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmDialog({ ...confirmDialog, open: false })} className="border-gray-200 dark:border-white/10">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleConfirmAction}
                            className={`${confirmDialog.type === 'pay' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white`}
                        >
                            {confirmDialog.type === 'pay' ? 'Confirmar' : 'Excluir'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
