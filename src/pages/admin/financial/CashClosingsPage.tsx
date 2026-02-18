'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Plus,
    Calendar as CalendarIcon,
    Building2,
    Eye,
    Edit2,
    FileText,
    ImageIcon,
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import CashClosingFormDialog from './components/CashClosingFormDialog';
import DistributionCenterSelect from './components/DistributionCenterSelect';

const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function CashClosingsPage() {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editData, setEditData] = useState<any>(null);
    const [filterCD, setFilterCD] = useState('');
    const [dateStart, setDateStart] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [dateEnd, setDateEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [calStartOpen, setCalStartOpen] = useState(false);
    const [calEndOpen, setCalEndOpen] = useState(false);

    const { data: closings = [], isLoading } = useQuery({
        queryKey: ['cash_closings', dateStart, dateEnd, filterCD],
        queryFn: async () => {
            let query = supabase
                .from('cash_closings' as any)
                .select(`
                    *,
                    distribution_center:distribution_centers!distribution_center_id(name),
                    operator:cash_operators!operator_id(name),
                    checked_by:cash_operators!checked_by_id(name)
                `)
                .gte('closing_date', dateStart)
                .lte('closing_date', dateEnd)
                .order('closing_date', { ascending: false });

            if (filterCD) {
                query = query.eq('distribution_center_id', filterCD);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as any[];
        },
    });

    const handleEdit = (record: any) => {
        setEditData(record);
        setIsFormOpen(true);
    };

    const handleNew = () => {
        setEditData(null);
        setIsFormOpen(true);
    };

    return (
        <div className="p-4 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fluxo de Caixa</h1>
                    <p className="text-sm text-gray-500 dark:text-white/40">Fechamentos de caixa consolidados</p>
                </div>
                <Button
                    onClick={handleNew}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Fechamento
                </Button>
            </div>

            {/* Filters */}
            <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* CD Filter */}
                        <div>
                            <label className="text-xs font-medium text-gray-500 dark:text-white/40 mb-1.5 block">Centro de Distribuição</label>
                            <DistributionCenterSelect
                                value={filterCD}
                                onChange={setFilterCD}
                                placeholder="Todos os CDs"
                            />
                        </div>
                        {/* Date Start */}
                        <div>
                            <label className="text-xs font-medium text-gray-500 dark:text-white/40 mb-1.5 block">Data início</label>
                            <Popover open={calStartOpen} onOpenChange={setCalStartOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 h-9">
                                        <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                                        {format(new Date(dateStart + 'T12:00:00'), 'dd/MM/yyyy')}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={new Date(dateStart + 'T12:00:00')}
                                        onSelect={(d) => { if (d) { setDateStart(format(d, 'yyyy-MM-dd')); setCalStartOpen(false); } }}
                                        locale={ptBR}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        {/* Date End */}
                        <div>
                            <label className="text-xs font-medium text-gray-500 dark:text-white/40 mb-1.5 block">Data fim</label>
                            <Popover open={calEndOpen} onOpenChange={setCalEndOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 h-9">
                                        <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                                        {format(new Date(dateEnd + 'T12:00:00'), 'dd/MM/yyyy')}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={new Date(dateEnd + 'T12:00:00')}
                                        onSelect={(d) => { if (d) { setDateEnd(format(d, 'yyyy-MM-dd')); setCalEndOpen(false); } }}
                                        locale={ptBR}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.02]">
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase">Data</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase">CD</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase">Vendas</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase">Dinheiro</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase">Saídas</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase">Saldo</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase">Operador</th>
                                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-white/[0.03]">
                                {isLoading && (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-8 text-center text-gray-400">Carregando...</td>
                                    </tr>
                                )}
                                {!isLoading && closings.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-8 text-center text-gray-400 dark:text-white/30">
                                            Nenhum fechamento encontrado
                                        </td>
                                    </tr>
                                )}
                                {closings.map((c: any) => (
                                    <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                            {format(new Date(c.closing_date + 'T12:00:00'), 'dd/MM/yyyy')}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant="outline" className="border-purple-200 dark:border-purple-800/30 text-purple-700 dark:text-purple-400 font-normal">
                                                <Building2 className="h-3 w-3 mr-1" />
                                                {c.distribution_center?.name || '—'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-semibold">
                                            {formatBRL(Number(c.total_sales))}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700 dark:text-white/70">
                                            {formatBRL(Number(c.total_cash))}
                                        </td>
                                        <td className="px-4 py-3 text-red-500">
                                            {formatBRL(Number(c.total_expenses))}
                                        </td>
                                        <td className={`px-4 py-3 font-semibold ${Number(c.balance) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                            {formatBRL(Number(c.balance))}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-white/50">
                                            {c.operator?.name || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={() => handleEdit(c)}
                                            >
                                                <Edit2 className="h-4 w-4 text-gray-400" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Form Dialog */}
            <CashClosingFormDialog
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                editData={editData}
            />
        </div>
    );
}
