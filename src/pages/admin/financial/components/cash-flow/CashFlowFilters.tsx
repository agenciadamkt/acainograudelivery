import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import DistributionCenterSelect from '../DistributionCenterSelect';
import { Calendar as CalendarIcon, Filter } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CashFlowFiltersProps {
    date: Date;
    setDate: (date: Date) => void;
    filterCD: string;
    setFilterCD: (cd: string) => void;
    filterType: 'all' | 'inflow' | 'outflow';
    setFilterType: (type: 'all' | 'inflow' | 'outflow') => void;
    filterStatus: 'all' | 'realized' | 'projected';
    setFilterStatus: (status: 'all' | 'realized' | 'projected') => void;
    onGenerate: () => void;
    isGenerating: boolean;
}

export default function CashFlowFilters({
    date,
    setDate,
    filterCD,
    setFilterCD,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    onGenerate,
    isGenerating
}: CashFlowFiltersProps) {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    const end = endOfWeek(date, { weekStartsOn: 1 });

    const handlePreviousWeek = () => setDate(subWeeks(date, 1));
    const handleNextWeek = () => setDate(addWeeks(date, 1));

    return (
        <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
            <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    {/* Distribution Center */}
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-500 dark:text-white/40">CD (Centro de Distribuição)</Label>
                        <DistributionCenterSelect value={filterCD} onChange={setFilterCD} placeholder="Todos os CDs" />
                    </div>

                    {/* Week Selection */}
                    <div className="space-y-2 lg:col-span-2">
                        <Label className="text-xs text-gray-500 dark:text-white/40">Período (Semana)</Label>
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-md p-1">
                            <Button variant="ghost" size="sm" onClick={handlePreviousWeek} className="h-7 w-7 p-0">
                                {'<'}
                            </Button>
                            <div className="flex-1 text-center text-sm font-medium flex items-center justify-center gap-2">
                                <CalendarIcon className="h-4 w-4 text-gray-400" />
                                <span>{format(start, 'dd/MM')} - {format(end, 'dd/MM/yyyy')}</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={handleNextWeek} className="h-7 w-7 p-0">
                                {'>'}
                            </Button>
                        </div>
                    </div>

                    {/* Type & Status Filters Row */}
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-500 dark:text-white/40">Tipo de Fluxo</Label>
                        <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                            <SelectTrigger className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10">
                                <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Entradas e Saídas</SelectItem>
                                <SelectItem value="inflow">Apenas Entradas</SelectItem>
                                <SelectItem value="outflow">Apenas Saídas</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs text-gray-500 dark:text-white/40">Situação</Label>
                        <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
                            <SelectTrigger className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10">
                                <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Realizado e Previsto</SelectItem>
                                <SelectItem value="realized">Apenas Realizado</SelectItem>
                                <SelectItem value="projected">Apenas Previsto</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="mt-4 flex justify-end">
                    <Button onClick={onGenerate} disabled={isGenerating} className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto">
                        {isGenerating ? 'Gerando...' : 'Gerar Relatório'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
