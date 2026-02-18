import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDownLeft, ArrowUpRight, DollarSign, Wallet } from 'lucide-react';

interface CashFlowStatsProps {
    inflows: number;
    outflows: number;
    result: number;
    projectedBalance: number;
}

const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function CashFlowStats({ inflows, outflows, result, projectedBalance }: CashFlowStatsProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Inflows */}
            <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
                <CardContent className="p-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider">Entradas</p>
                        <div className="text-2xl font-bold text-green-600 mt-1">{formatBRL(inflows)}</div>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center text-green-600">
                        <ArrowUpRight className="h-5 w-5" />
                    </div>
                </CardContent>
            </Card>

            {/* Total Outflows */}
            <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
                <CardContent className="p-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider">Saídas</p>
                        <div className="text-2xl font-bold text-red-600 mt-1">{formatBRL(outflows)}</div>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-600">
                        <ArrowDownLeft className="h-5 w-5" />
                    </div>
                </CardContent>
            </Card>

            {/* Result */}
            <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
                <CardContent className="p-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider">Resultado</p>
                        <div className={`text-2xl font-bold mt-1 ${result >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {formatBRL(result)}
                        </div>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                        <DollarSign className="h-5 w-5" />
                    </div>
                </CardContent>
            </Card>

            {/* Projected Balance */}
            <Card className={`border-0 shadow-lg ${projectedBalance < 0 ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/20' : 'bg-gradient-to-br from-purple-600 to-indigo-600 shadow-purple-500/20'}`}>
                <CardContent className="p-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-white/70 uppercase tracking-wider">Saldo Projetado</p>
                        <div className="text-2xl font-bold text-white mt-1">{formatBRL(projectedBalance)}</div>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
                        <Wallet className="h-5 w-5" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
