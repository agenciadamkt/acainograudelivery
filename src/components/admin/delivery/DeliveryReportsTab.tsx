import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Truck,
    Clock,
    DollarSign,
    TrendingUp,
    User,
    Star,
    Package,
    Calendar,
    Download,
    XCircle,
    CheckCircle2,
    Timer,
    BarChart3,
} from 'lucide-react';
import { useDeliveryReports } from '@/hooks/useDeliveryReports';

type PeriodType = '7d' | '30d' | '90d' | 'custom';

export default function DeliveryReportsTab() {
    const [period, setPeriod] = useState<PeriodType>('30d');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');

    // Calculate date range based on period
    const { dateFrom, dateTo } = useMemo(() => {
        const now = new Date();
        const to = now.toISOString();
        let from: string;

        switch (period) {
            case '7d':
                from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
                break;
            case '30d':
                from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
                break;
            case '90d':
                from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
                break;
            case 'custom':
                from = customFrom ? new Date(customFrom).toISOString() : '';
                return {
                    dateFrom: from,
                    dateTo: customTo ? new Date(customTo + 'T23:59:59').toISOString() : to
                };
            default:
                from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        }

        return { dateFrom: from, dateTo: to };
    }, [period, customFrom, customTo]);

    const { data: report, isLoading } = useDeliveryReports(dateFrom, dateTo);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    const formatTime = (minutes: number | null) => {
        if (minutes === null) return '-';
        if (minutes < 60) return `${Math.round(minutes)} min`;
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return `${hours}h ${mins}min`;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
        });
    };

    const handleExportCSV = () => {
        if (!report) return;

        // Create CSV content
        let csv = 'Relatório de Entregas\n\n';
        csv += 'Resumo Geral\n';
        csv += `Total de Entregas,${report.totalDeliveries}\n`;
        csv += `Entregas Concluídas,${report.completedDeliveries}\n`;
        csv += `Entregas Canceladas,${report.cancelledDeliveries}\n`;
        csv += `Faturamento Total,${formatCurrency(report.totalRevenue)}\n`;
        csv += `Taxa de Entrega Total,${formatCurrency(report.totalDeliveryFees)}\n`;
        csv += `Tempo Médio de Entrega,${formatTime(report.avgDeliveryTime)}\n`;
        csv += '\n';

        csv += 'Performance por Entregador\n';
        csv += 'Nome,Telefone,Entregas,Tempo Médio,Avaliação,Faturamento\n';
        report.driverStats.forEach(driver => {
            csv += `${driver.name},${driver.phone},${driver.totalDeliveries},${formatTime(driver.avgTime)},${driver.rating.toFixed(1)},${formatCurrency(driver.revenue)}\n`;
        });
        csv += '\n';

        csv += 'Entregas por Dia\n';
        csv += 'Data,Quantidade,Faturamento\n';
        report.dailyStats.forEach(day => {
            csv += `${formatDate(day.date)},${day.count},${formatCurrency(day.revenue)}\n`;
        });

        // Download file
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `relatorio-entregas-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    // Calculate max for chart visualization
    const maxHourlyCount = Math.max(...(report?.hourlyDistribution.map(h => h.count) || [1]));
    const maxDailyCount = Math.max(...(report?.dailyStats.map(d => d.count) || [1]));

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                    {[1, 2, 3, 4].map(i => (
                        <Card key={i}>
                            <CardHeader className="pb-2">
                                <Skeleton className="h-4 w-24" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-16" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <Card>
                    <CardContent className="py-12">
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Period Selector */}
            <Card>
                <CardContent className="py-4">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-2">
                            <Label>Período</Label>
                            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
                                <SelectTrigger className="w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="7d">Últimos 7 dias</SelectItem>
                                    <SelectItem value="30d">Últimos 30 dias</SelectItem>
                                    <SelectItem value="90d">Últimos 90 dias</SelectItem>
                                    <SelectItem value="custom">Personalizado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {period === 'custom' && (
                            <>
                                <div className="space-y-2">
                                    <Label>De</Label>
                                    <Input
                                        type="date"
                                        value={customFrom}
                                        onChange={(e) => setCustomFrom(e.target.value)}
                                        className="w-40"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Até</Label>
                                    <Input
                                        type="date"
                                        value={customTo}
                                        onChange={(e) => setCustomTo(e.target.value)}
                                        className="w-40"
                                    />
                                </div>
                            </>
                        )}

                        <Button variant="outline" onClick={handleExportCSV} className="ml-auto">
                            <Download className="h-4 w-4 mr-2" />
                            Exportar CSV
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Entregas</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{report?.totalDeliveries || 0}</div>
                        <div className="flex gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                {report?.completedDeliveries || 0}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                                <XCircle className="h-3 w-3 mr-1" />
                                {report?.cancelledDeliveries || 0}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Faturamento</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(report?.totalRevenue || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Taxa de entrega: {formatCurrency(report?.totalDeliveryFees || 0)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
                        <Timer className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {formatTime(report?.avgDeliveryTime || null)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Da saída até entrega
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Entregadores Ativos</CardTitle>
                        <User className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">
                            {report?.driverStats.filter(d => d.totalDeliveries > 0).length || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Com entregas no período
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Hourly Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Distribuição por Horário
                        </CardTitle>
                        <CardDescription>Quantidade de entregas por hora do dia</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {report?.hourlyDistribution
                                .filter(h => h.count > 0 || (h.hour >= 10 && h.hour <= 22))
                                .map(h => (
                                    <div key={h.hour} className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground w-12">
                                            {h.hour.toString().padStart(2, '0')}:00
                                        </span>
                                        <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                                            <div
                                                className="h-full bg-primary/80 rounded transition-all"
                                                style={{ width: `${(h.count / maxHourlyCount) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-medium w-8 text-right">{h.count}</span>
                                    </div>
                                ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Daily Trend */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Tendência Diária
                        </CardTitle>
                        <CardDescription>Entregas concluídas por dia</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {report?.dailyStats && report.dailyStats.length > 0 ? (
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                                {report.dailyStats.slice(-14).map(day => (
                                    <div key={day.date} className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground w-16">
                                            {formatDate(day.date)}
                                        </span>
                                        <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                                            <div
                                                className="h-full bg-green-500/80 rounded transition-all"
                                                style={{ width: `${(day.count / maxDailyCount) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-medium w-8 text-right">{day.count}</span>
                                        <span className="text-xs text-muted-foreground w-20 text-right">
                                            {formatCurrency(day.revenue)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                <BarChart3 className="h-12 w-12 mb-2 opacity-50" />
                                <p>Nenhuma entrega no período</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Driver Performance Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        Performance por Entregador
                    </CardTitle>
                    <CardDescription>Estatísticas individuais de cada entregador</CardDescription>
                </CardHeader>
                <CardContent>
                    {report?.driverStats && report.driverStats.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Entregador</TableHead>
                                    <TableHead>Telefone</TableHead>
                                    <TableHead className="text-center">Entregas</TableHead>
                                    <TableHead className="text-center">Tempo Médio</TableHead>
                                    <TableHead className="text-center">Avaliação</TableHead>
                                    <TableHead className="text-right">Faturamento</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {report.driverStats.map((driver, index) => (
                                    <TableRow key={driver.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {index === 0 && driver.totalDeliveries > 0 && (
                                                    <Badge variant="default" className="text-xs">🏆</Badge>
                                                )}
                                                <span className="font-medium">{driver.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{driver.phone}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary">{driver.totalDeliveries}</Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {formatTime(driver.avgTime)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                                                <span>{driver.rating.toFixed(1)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatCurrency(driver.revenue)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <User className="h-12 w-12 mb-2 opacity-50" />
                            <p>Nenhum entregador com entregas no período</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
