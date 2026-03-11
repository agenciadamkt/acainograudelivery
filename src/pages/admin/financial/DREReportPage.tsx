'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    ChevronDown,
    ChevronRight,
    TrendingUp,
    TrendingDown,
    Minus,
    Download,
    Building2,
    FileSpreadsheet,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DistributionCenterSelect from './components/DistributionCenterSelect';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addPdfBranding } from './utils/pdfBranding';

const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface DRELineItem {
    label: string;
    value: number;
    type: 'revenue' | 'expense' | 'deduction' | 'result';
    bold?: boolean;
    indent?: boolean;
    expandable?: boolean;
    children?: { label: string; value: number }[];
}

export default function DREReportPage() {
    const now = new Date();
    const [dateStart, setDateStart] = useState(format(startOfMonth(now), 'yyyy-MM-dd'));
    const [dateEnd, setDateEnd] = useState(format(endOfMonth(now), 'yyyy-MM-dd'));
    const [selectedCD, setSelectedCD] = useState('');
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const { data: centers = [] } = useQuery({
        queryKey: ['distribution_centers'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error } = await supabase
                .from('distribution_centers' as any)
                .select('*')
                .eq('active', true)
                .in('franchisee_user_id', [user?.id, '97cc4f78-31e6-4113-a8a6-6d14d4166c38'])
                .order('name');
            if (error) throw error;
            return data as any[];
        },
    });

    /* ── Fetch revenue (cash_closings) ── */
    const { data: closings = [] } = useQuery({
        queryKey: ['dre_closings', dateStart, dateEnd, selectedCD],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            let query = supabase
                .from('cash_closings' as any)
                .select('total_sales, total_expenses, total_cash, title_settlement, cash_settlement, distribution_center:distribution_centers!inner(franchisee_user_id)')
                .gte('closing_date', dateStart)
                .lte('closing_date', dateEnd);

            if (selectedCD) {
                query = query.eq('distribution_center_id', selectedCD);
            } else {
                query = query.in('distribution_center.franchisee_user_id', [user?.id, '97cc4f78-31e6-4113-a8a6-6d14d4166c38']);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as any[];
        },
    });

    /* ── Fetch expenses ── */
    const { data: expenses = [] } = useQuery({
        queryKey: ['dre_expenses', dateStart, dateEnd, selectedCD],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            let query = supabase
                .from('expenses' as any)
                .select(`
                    amount, expense_type, purpose,
                    cost_center:cost_centers!cost_center_id(name),
                    chart_account:chart_of_accounts!chart_of_accounts_id(name),
                    distribution_center:distribution_centers!inner(franchisee_user_id)
                `)
                .gte('expense_date', dateStart)
                .lte('expense_date', dateEnd);

            if (selectedCD) {
                query = query.eq('distribution_center_id', selectedCD);
            } else {
                query = query.in('distribution_center.franchisee_user_id', [user?.id, '97cc4f78-31e6-4113-a8a6-6d14d4166c38']);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as any[];
        },
    });

    /* ── Fetch accounts receivable ── */
    const { data: receivables = [] } = useQuery({
        queryKey: ['dre_receivables', dateStart, dateEnd, selectedCD],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            let query = supabase
                .from('accounts_receivable' as any)
                .select('amount, due_date')
                .gte('due_date', dateStart)
                .lte('due_date', dateEnd);

            if (selectedCD) {
                query = query.eq('distribution_center_id', selectedCD);
            } else {
                query = query.in('franchisee_user_id', [user?.id, '97cc4f78-31e6-4113-a8a6-6d14d4166c38']);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as any[];
        },
    });

    /* ── DRE Calculations ── */
    const dre = useMemo(() => {
        // Revenue
        const receitaVendas = closings.reduce((s: number, c: any) => s + Number(c.total_sales), 0);
        const receitaFaturada = receivables.reduce((s: number, r: any) => s + Number(r.amount), 0);
        const receitaBruta = receitaVendas + receitaFaturada;
        const deducoes = 0; // placeholder for future tax deductions
        const receitaLiquida = receitaBruta - deducoes;

        // Expenses by type
        const despesasFixas = expenses
            .filter((e: any) => e.expense_type === 'fixed')
            .reduce((s: number, e: any) => s + Number(e.amount), 0);

        const despesasVariaveis = expenses
            .filter((e: any) => e.expense_type === 'variable')
            .reduce((s: number, e: any) => s + Number(e.amount), 0);

        const investimentos = expenses
            .filter((e: any) => e.expense_type === 'investment')
            .reduce((s: number, e: any) => s + Number(e.amount), 0);

        const resultadoOperacional = receitaLiquida - despesasFixas - despesasVariaveis;
        const resultadoLiquido = resultadoOperacional - investimentos;

        // Break down by chart of accounts for expandable rows
        const getChildren = (type: string) => {
            const grouped: Record<string, number> = {};
            expenses
                .filter((e: any) => e.expense_type === type)
                .forEach((e: any) => {
                    const name = e.chart_account?.name || 'Sem plano de contas';
                    grouped[name] = (grouped[name] || 0) + Number(e.amount);
                });
            return Object.entries(grouped).map(([label, value]) => ({ label, value }));
        };

        const lines: DRELineItem[] = [
            {
                label: 'RECEITA BRUTA',
                value: receitaBruta,
                type: 'revenue',
                bold: true,
                expandable: true,
                children: [
                    { label: 'Vendas (Caixa/Aplicativo)', value: receitaVendas },
                    { label: 'Outras Receitas (Contas a Receber)', value: receitaFaturada }
                ]
            },
            { label: '(-) Deduções', value: deducoes, type: 'deduction', indent: true },
            { label: 'RECEITA LÍQUIDA', value: receitaLiquida, type: 'result', bold: true },
            { label: '(-) Despesas Fixas', value: despesasFixas, type: 'expense', expandable: true, children: getChildren('fixed') },
            { label: '(-) Despesas Variáveis', value: despesasVariaveis, type: 'expense', expandable: true, children: getChildren('variable') },
            { label: 'RESULTADO OPERACIONAL', value: resultadoOperacional, type: 'result', bold: true },
            { label: '(-) Investimentos', value: investimentos, type: 'expense', expandable: true, children: getChildren('investment') },
            { label: 'RESULTADO LÍQUIDO', value: resultadoLiquido, type: 'result', bold: true },
        ];

        return { lines, resultadoLiquido };
    }, [closings, expenses, receivables]);

    const toggleRow = (label: string) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(label)) next.delete(label);
            else next.add(label);
            return next;
        });
    };

    const getValueColor = (item: DRELineItem) => {
        if (item.type === 'result') {
            return item.value >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-500 dark:text-red-400';
        }
        if (item.type === 'revenue') return 'text-emerald-600 dark:text-emerald-400';
        if (item.type === 'expense' || item.type === 'deduction') return 'text-red-500 dark:text-red-400';
        return 'text-gray-900 dark:text-white';
    };

    const periodLabel = useMemo(() => {
        const start = new Date(dateStart + 'T12:00:00');
        const end = new Date(dateEnd + 'T12:00:00');
        return `${format(start, 'dd MMM', { locale: ptBR })} a ${format(end, 'dd MMM yyyy', { locale: ptBR })}`;
    }, [dateStart, dateEnd]);

    /* ── Export Functions ── */
    const handleExportPDF = async () => {
        const doc = new jsPDF();
        const centerName = selectedCD
            ? centers.find((c: any) => c.id === selectedCD)?.name
            : 'Todos os CDs';

        const startY = await addPdfBranding(doc, centerName);
        doc.setFontSize(14);
        doc.text('DRE - Demonstração do Resultado do Exercício', 14, startY + 5);
        doc.setFontSize(10);
        doc.text(`Período: ${periodLabel}`, 14, startY + 12);

        const tableData = dre.lines.flatMap((item) => {
            const rows: string[][] = [[item.label, formatBRL(item.value)]];
            if (item.children && item.children.length > 0) {
                item.children.forEach((child) => {
                    rows.push([`    ${child.label}`, formatBRL(child.value)]);
                });
            }
            return rows;
        });

        autoTable(doc, {
            head: [['Descrição', 'Valor']],
            body: tableData,
            startY: startY + 14,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [124, 58, 237] },
            columnStyles: { 1: { halign: 'right' } },
        });

        doc.save(`dre_${dateStart}_${dateEnd}.pdf`);
    };

    const handleExportExcel = () => {
        const headers = ['Descrição', 'Valor'];
        const rows = dre.lines.flatMap((item) => {
            const result: string[][] = [[item.label, Number(item.value).toFixed(2)]];
            if (item.children && item.children.length > 0) {
                item.children.forEach((child) => {
                    result.push([`  ${child.label}`, Number(child.value).toFixed(2)]);
                });
            }
            return result;
        });

        let csvContent = 'data:text/csv;charset=utf-8,'
            + headers.join(';') + '\n'
            + rows.map((r) => r.join(';')).join('\n');

        const link = document.createElement('a');
        link.setAttribute('href', encodeURI(csvContent));
        link.setAttribute('download', `dre_${dateStart}_${dateEnd}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-4 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">DRE</h2>
                    <p className="text-sm text-gray-500 dark:text-white/40">Demonstração do Resultado do Exercício</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2">
                        <Download className="h-4 w-4" /> PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2">
                        <FileSpreadsheet className="h-4 w-4" /> Excel
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                    <label className="text-xs text-gray-500 dark:text-white/30 mb-1 block">Centro de Distribuição</label>
                    <DistributionCenterSelect
                        value={selectedCD}
                        onChange={setSelectedCD}
                        placeholder="Todos os CDs"
                    />
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

            {/* Result Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className={`border-0 shadow-lg ${dre.resultadoLiquido >= 0 ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/20' : 'bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/20'}`}>
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            {dre.resultadoLiquido >= 0
                                ? <TrendingUp className="h-6 w-6 text-white" />
                                : <TrendingDown className="h-6 w-6 text-white" />
                            }
                        </div>
                        <div>
                            <p className="text-xs text-white/70 font-medium">
                                {dre.resultadoLiquido >= 0 ? 'Lucro Líquido' : 'Prejuízo Líquido'}
                            </p>
                            <p className="text-2xl font-bold text-white tracking-tight">
                                {formatBRL(Math.abs(dre.resultadoLiquido))}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-gray-500 dark:text-white/40" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-white/40 font-medium">Período</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{periodLabel}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* DRE Table */}
            <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm overflow-hidden">
                <CardHeader className="pb-2 border-b border-gray-100 dark:border-white/[0.05]">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                            Demonstração do Resultado
                        </CardTitle>
                        <p className="text-xs text-gray-400 dark:text-white/30">{periodLabel}</p>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                        {dre.lines.map((item) => {
                            const isExpanded = expandedRows.has(item.label);
                            const hasChildren = item.expandable && item.children && item.children.length > 0;

                            return (
                                <div key={item.label}>
                                    {/* Main row */}
                                    <div
                                        className={`flex items-center justify-between px-6 py-3.5 transition-colors ${item.bold
                                            ? 'bg-gray-50/50 dark:bg-white/[0.02]'
                                            : 'hover:bg-gray-50/30 dark:hover:bg-white/[0.01]'
                                            } ${hasChildren ? 'cursor-pointer' : ''}`}
                                        onClick={() => hasChildren && toggleRow(item.label)}
                                    >
                                        <div className="flex items-center gap-2">
                                            {hasChildren && (
                                                isExpanded
                                                    ? <ChevronDown className="h-4 w-4 text-gray-400" />
                                                    : <ChevronRight className="h-4 w-4 text-gray-400" />
                                            )}
                                            {!hasChildren && item.indent && (
                                                <span className="w-4" />
                                            )}
                                            <span className={`text-sm ${item.bold
                                                ? 'font-bold text-gray-900 dark:text-white'
                                                : 'text-gray-700 dark:text-white/60'
                                                } ${item.indent ? 'ml-4' : ''}`}>
                                                {item.label}
                                            </span>
                                        </div>
                                        <span className={`text-sm font-semibold tabular-nums ${getValueColor(item)}`}>
                                            {formatBRL(item.value)}
                                        </span>
                                    </div>

                                    {/* Expandable children */}
                                    {hasChildren && isExpanded && (
                                        <div className="bg-gray-50/70 dark:bg-white/[0.01]">
                                            {item.children!.map((child, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center justify-between px-6 py-2 ml-10"
                                                >
                                                    <span className="text-xs text-gray-500 dark:text-white/40">
                                                        {child.label}
                                                    </span>
                                                    <span className="text-xs font-medium text-red-400 tabular-nums">
                                                        {formatBRL(child.value)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Margin indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(() => {
                    const receitaBruta = dre.lines[0]?.value || 1;
                    const receitaLiquida = dre.lines[2]?.value || 0;
                    const resultOp = dre.lines[5]?.value || 0;
                    const resultLiq = dre.lines[7]?.value || 0;

                    const margins = [
                        { label: 'Margem Bruta', value: receitaBruta > 0 ? (receitaLiquida / receitaBruta) * 100 : 0 },
                        { label: 'Margem Operacional', value: receitaBruta > 0 ? (resultOp / receitaBruta) * 100 : 0 },
                        { label: 'Margem Líquida', value: receitaBruta > 0 ? (resultLiq / receitaBruta) * 100 : 0 },
                    ];

                    return margins.map((m) => (
                        <Card key={m.label} className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
                            <CardContent className="p-5">
                                <p className="text-xs text-gray-500 dark:text-white/40 mb-1">{m.label}</p>
                                <p className={`text-2xl font-bold tabular-nums ${m.value >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {m.value.toFixed(1)}%
                                </p>
                            </CardContent>
                        </Card>
                    ));
                })()}
            </div>
        </div>
    );
}
