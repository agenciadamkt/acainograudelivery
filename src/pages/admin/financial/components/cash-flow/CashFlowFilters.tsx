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
    dateStart: string;
    setDateStart: (d: string) => void;
    dateEnd: string;
    setDateEnd: (d: string) => void;
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
    dateStart,
    setDateStart,
    dateEnd,
    setDateEnd,
    filterCD,
    setFilterCD,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    onGenerate,
    isGenerating
}: CashFlowFiltersProps) {

    return (
        <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
            <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    {/* Distribution Center */}
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-500 dark:text-white/40">CD (Centro de Distribuição)</Label>
                        <DistributionCenterSelect value={filterCD} onChange={setFilterCD} placeholder="Todos os CDs" />
                    </div>

                    {/* Period Selection */}
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-500 dark:text-white/40">Início</Label>
                        <Input
                            type="date"
                            value={dateStart}
                            onChange={(e) => setDateStart(e.target.value)}
                            className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs text-gray-500 dark:text-white/40">Fim</Label>
                        <Input
                            type="date"
                            value={dateEnd}
                            onChange={(e) => setDateEnd(e.target.value)}
                            className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10"
                        />
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
