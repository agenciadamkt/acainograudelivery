import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CashFlowTableProps {
    days: Date[];
    data: any; // Using any for flexibility during implementation, should be typed properly later
    loading: boolean;
    onExportPDF: () => void;
    onExportExcel: () => void;
}

const formatCurrency = (val: number) =>
    val ? val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-';

const CurrencyCell = ({ value, type = 'neutral', bold = false }: { value: number; type?: 'inflow' | 'outflow' | 'neutral' | 'result'; bold?: boolean }) => {
    let color = 'text-gray-900 dark:text-white';
    if (type === 'inflow') color = 'text-green-600';
    if (type === 'outflow') color = 'text-gray-600 dark:text-white/70';
    if (type === 'result') color = value >= 0 ? 'text-blue-600' : 'text-red-500';

    return (
        <div className={`text-right ${color} ${bold ? 'font-bold' : ''}`}>
            {formatCurrency(value)}
        </div>
    );
};

export default function CashFlowTable({ days, data, loading, onExportPDF, onExportExcel }: CashFlowTableProps) {
    if (loading) {
        return (
            <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm min-h-[400px] flex items-center justify-center">
                <div className="text-gray-500">Carregando dados...</div>
            </Card>
        );
    }

    /* Data structure expectations:
       data = {
         inflows: { date: value, ... },
         outflows: { category: { date: value, ... } },
         dailyResult: { date: value, ... },
         accumulated: { date: value, ... },
         totals: {
            inflows: { total: X, ...days },
            outflows: { total: X, ...days },
            result: { total: X, ...days }
         }
       }
    */

    return (
        <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Detalhamento Diário</CardTitle>
                    <CardDescription>Movimentações por categoria</CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={onExportPDF} className="gap-2">
                        <Download className="h-4 w-4" /> PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={onExportExcel} className="gap-2">
                        <FileSpreadsheet className="h-4 w-4" /> Excel
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-white/10">
                                <th className="text-left py-3 px-4 min-w-[200px] font-semibold text-gray-900 dark:text-white bg-gray-50/50 dark:bg-white/[0.02]">Categoria</th>
                                {days.map((day) => (
                                    <th key={day.toISOString()} className="text-right py-3 px-4 min-w-[120px] bg-gray-50/50 dark:bg-white/[0.02]">
                                        <div className="font-semibold text-gray-900 dark:text-white capitalize">{format(day, 'EEE', { locale: ptBR })}</div>
                                        <div className="text-xs font-normal text-gray-500">{format(day, 'dd/MM')}</div>
                                    </th>
                                ))}
                                <th className="text-right py-3 px-4 min-w-[120px] font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-white/10">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                            {/* ENTRADAS */}
                            <tr className="bg-green-50/30 dark:bg-green-900/10">
                                <td className="py-3 px-4 font-semibold text-green-700 dark:text-green-400">ENTRADAS</td>
                                {days.map(d => <td key={d.toISOString()} className="py-3 px-4 text-right"></td>)}
                                <td></td>
                            </tr>
                            <tr>
                                <td className="py-2 px-4 text-gray-700 dark:text-white/80 pl-8">Saldo em Dinheiro</td>
                                {days.map((day) => {
                                    const dateKey = format(day, 'yyyy-MM-dd');
                                    return (
                                        <td key={dateKey} className="py-2 px-4">
                                            <CurrencyCell value={data?.inflows?.[dateKey] || 0} type="inflow" />
                                        </td>
                                    );
                                })}
                                <td className="py-2 px-4 font-bold bg-gray-50 dark:bg-white/[0.02]">
                                    <CurrencyCell value={data?.totals?.inflows || 0} type="inflow" bold />
                                </td>
                            </tr>

                            {/* Total Entradas Row */}
                            <tr className="bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/10 font-bold">
                                <td className="py-2 px-4 text-green-700 dark:text-green-400">TOTAL ENTRADAS</td>
                                {days.map((day) => {
                                    const dateKey = format(day, 'yyyy-MM-dd');
                                    return (
                                        <td key={dateKey} className="py-2 px-4">
                                            <CurrencyCell value={data?.inflows?.[dateKey] || 0} type="inflow" bold />
                                        </td>
                                    );
                                })}
                                <td className="py-2 px-4 bg-gray-100 dark:bg-white/10">
                                    <CurrencyCell value={data?.totals?.inflows || 0} type="inflow" bold />
                                </td>
                            </tr>


                            {/* SAÍDAS */}
                            <tr className="bg-red-50/30 dark:bg-red-900/10 border-t-2 border-transparent">
                                <td className="py-3 px-4 font-semibold text-red-700 dark:text-red-400">SAÍDAS</td>
                                {days.map(d => <td key={d.toISOString()} className="py-3 px-4 text-right"></td>)}
                                <td></td>
                            </tr>

                            {data?.outflows && Object.entries(data.outflows).map(([category, values]: [string, any]) => (
                                <tr key={category}>
                                    <td className="py-2 px-4 text-gray-700 dark:text-white/80 pl-8">{category}</td>
                                    {days.map((day) => {
                                        const dateKey = format(day, 'yyyy-MM-dd');
                                        return (
                                            <td key={dateKey} className="py-2 px-4">
                                                <CurrencyCell value={values[dateKey] || 0} type="outflow" />
                                            </td>
                                        );
                                    })}
                                    <td className="py-2 px-4 bg-gray-50 dark:bg-white/[0.02] text-right font-medium text-gray-700 dark:text-white/80">
                                        {formatCurrency(values.total)}
                                    </td>
                                </tr>
                            ))}

                            {/* Total Saídas Row */}
                            <tr className="bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/10 font-bold">
                                <td className="py-2 px-4 text-red-700 dark:text-red-400">TOTAL SAÍDAS</td>
                                {days.map((day) => {
                                    const dateKey = format(day, 'yyyy-MM-dd');
                                    return (
                                        <td key={dateKey} className="py-2 px-4">
                                            <CurrencyCell value={data?.totals?.dailyOutflows?.[dateKey] || 0} type="outflow" bold />
                                        </td>
                                    );
                                })}
                                <td className="py-2 px-4 bg-gray-100 dark:bg-white/10">
                                    <CurrencyCell value={data?.totals?.outflows || 0} type="outflow" bold />
                                </td>
                            </tr>


                            {/* RESULTADOS */}
                            <tr className="border-t-4 border-gray-100 dark:border-white/5">
                                <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">RESULTADO DIÁRIO</td>
                                {days.map((day) => {
                                    const dateKey = format(day, 'yyyy-MM-dd');
                                    return (
                                        <td key={dateKey} className="py-3 px-4">
                                            <CurrencyCell value={data?.dailyResult?.[dateKey] || 0} type="result" bold />
                                        </td>
                                    );
                                })}
                                <td className="py-3 px-4 bg-gray-100 dark:bg-white/10">
                                    <CurrencyCell value={data?.totals?.result || 0} type="result" bold />
                                </td>
                            </tr>

                            <tr className="bg-purple-50 dark:bg-purple-900/10">
                                <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">SALDO ACUMULADO</td>
                                {days.map((day) => {
                                    const dateKey = format(day, 'yyyy-MM-dd');
                                    return (
                                        <td key={dateKey} className="py-3 px-4 text-right font-bold text-purple-700 dark:text-purple-400">
                                            {formatCurrency(data?.accumulated?.[dateKey] || 0)}
                                        </td>
                                    );
                                })}
                                <td className="py-3 px-4 bg-purple-100 dark:bg-purple-900/20 text-right font-bold text-purple-800 dark:text-purple-300">
                                    {/* Final balance of the week */}
                                    {formatCurrency(data?.accumulated?.[format(days[6], 'yyyy-MM-dd')] || 0)}
                                </td>
                            </tr>

                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
