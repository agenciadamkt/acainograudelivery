import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { FinancialTransaction } from '@/hooks/useFinancialTransactions';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FinancialChartsProps {
    transactions: FinancialTransaction[];
}

export function FinancialCharts({ transactions }: FinancialChartsProps) {
    // Processar dados para o gráfico mensal (últimos 30 dias)
    const now = new Date();
    const start = new Date();
    start.setDate(now.getDate() - 30);

    const days = eachDayOfInterval({ start, end: now });

    const data = days.map(day => {
        const dayTransactions = transactions.filter(t => isSameDay(new Date(t.created_at), day));
        const receita = dayTransactions
            .filter(t => t.type === 'receita')
            .reduce((sum, t) => sum + Number(t.amount), 0);
        const despesa = dayTransactions
            .filter(t => t.type === 'despesa')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        return {
            name: format(day, 'dd/MM'),
            receita,
            despesa,
        };
    });

    return (
        <div className="space-y-8">
            <div className="h-80 w-full">
                <h3 className="text-lg font-semibold mb-4 text-center">Fluxo Diário (Últimos 30 dias)</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip
                            formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                            labelStyle={{ color: 'black' }}
                        />
                        <Legend />
                        <Bar dataKey="receita" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="despesa" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="h-80 w-full">
                <h3 className="text-lg font-semibold mb-4 text-center">Tendência de Saldo</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip
                            formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                            labelStyle={{ color: 'black' }}
                        />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey={(d) => d.receita - d.despesa}
                            name="Saldo Acumulado"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            dot={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
