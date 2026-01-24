import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    BarChart3, Users, TrendingUp, AlertTriangle,
    Gift, Trophy, Loader2, Sparkles, DollarSign, ArrowRight, MessageCircle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function FoodAnalyticsPage() {
    const navigate = useNavigate();
    const [dateRange, setDateRange] = useState('30d');
    const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

    // Fetch Analytics Data (View criada no banco)
    const { data: analytics, isLoading } = useQuery({
        queryKey: ['food-analytics', dateRange],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('customer_analytics') // View que já existe
                .select('*');

            if (error) {
                console.error('Error fetching analytics:', error);
                return [];
            }
            return data;
        },
    });

    // Calculate Aggregates
    const stats = {
        ltv: 0,
        active: 0,
        risk: 0,
        churn: 0,
        total_revenue: 0,
        leads: 0 // Total orders = 0
    };

    if (analytics) {
        analytics.forEach(curr => {
            stats.total_revenue += (curr.ltv || 0);
            if (curr.status === 'active') stats.active++;
            if (curr.status === 'risk') stats.risk++;
            if (curr.status === 'churn') stats.churn++;
            if (curr.status === 'lead') stats.leads++;
        });
    }

    const handleQuickCampaign = (type: string) => {
        let template = {
            name: '',
            message: '',
            segment: 'all'
        };

        switch (type) {
            case 'campeoes':
                template = {
                    name: 'Campanha VIP - Campeões',
                    message: 'Olá {name}! 🏆 Você é um dos nossos melhores clientes e merece um mimo especial. Peça hoje e ganhe entrega grátis!',
                    segment: 'vip' // AGORA USA O SEGMENTO VIP
                };
                break;
            case 'aniversario':
                template = {
                    name: 'Parabéns Aniversariante',
                    message: 'Parabéns {name}! 🎂 Hoje o dia é seu e o presente é nosso. Venha comemorar com um Açaí por nossa conta!',
                    segment: 'birthday'
                };
                break;
            case 'risco':
                template = {
                    name: 'Resgate - Estamos com saudades',
                    message: 'Oi {name}, faz tempo que não te vemos! 🥺 Que tal matar a saudade com 10% de desconto hoje?',
                    segment: 'inactive'
                };
                break;
            case 'cashback':
                template = {
                    name: 'Cashback Disponível',
                    message: 'Ei {name}, você tem saldo de cashback expirando! 💸 Use agora no seu próximo pedido.',
                    segment: 'all'
                };
                break;
        }

        navigate('/admin/marketing', {
            state: {
                type,
                template_name: template.name,
                template_message: template.message,
                segment: template.segment
            }
        });
    };

    // Filter customers for the table based on selected card/metric
    const filteredCustomers = analytics?.filter(c => {
        if (!selectedMetric) return true;
        return c.status === selectedMetric;
    }) || [];

    return (
        <AdminLayout>
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#8D42DD]">Food Analytics</h1>
                    <p className="text-muted-foreground">Inteligência de dados para vender mais e melhor.</p>
                </div>
                <div className="flex gap-2">
                    <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Período" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="30d">Últimos 30 dias</SelectItem>
                            <SelectItem value="90d">Últimos 3 meses</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* KPI Cards (Clickable) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card
                    className={`cursor-pointer transition-all hover:shadow-lg ${selectedMetric === 'active' ? 'ring-2 ring-[#21C3D9]' : ''}`}
                    onClick={() => setSelectedMetric('active')}
                >
                    <CardContent className="pt-6 border-l-4 border-l-[#21C3D9]">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-bold">Clientes Ativos</p>
                                <h3 className="text-2xl font-bold text-[#21C3D9]">
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.active}
                                </h3>
                                <p className="text-xs text-gray-400 mt-1">Compraram nos últimos 30d</p>
                            </div>
                            <div className="p-2 bg-[#21C3D9]/10 rounded-full">
                                <TrendingUp className="h-5 w-5 text-[#21C3D9]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className={`cursor-pointer transition-all hover:shadow-lg ${selectedMetric === 'risk' ? 'ring-2 ring-orange-500' : ''}`}
                    onClick={() => setSelectedMetric('risk')}
                >
                    <CardContent className="pt-6 border-l-4 border-l-orange-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-bold">Em Risco</p>
                                <h3 className="text-2xl font-bold text-orange-500">
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.risk}
                                </h3>
                                <p className="text-xs text-gray-400 mt-1">Ausentes 30-60 dias</p>
                            </div>
                            <div className="p-2 bg-orange-100 rounded-full">
                                <AlertTriangle className="h-5 w-5 text-orange-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className={`cursor-pointer transition-all hover:shadow-lg ${selectedMetric === 'churn' ? 'ring-2 ring-red-500' : ''}`}
                    onClick={() => setSelectedMetric('churn')}
                >
                    <CardContent className="pt-6 border-l-4 border-l-red-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-bold">Perdidos (Churn)</p>
                                <h3 className="text-2xl font-bold text-red-500">
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.churn}
                                </h3>
                                <p className="text-xs text-gray-400 mt-1">Sem comprar +60 dias</p>
                            </div>
                            <div className="p-2 bg-red-100 rounded-full">
                                <Users className="h-5 w-5 text-red-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-l-4 border-l-[#8D42DD]">
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-bold">Receita (LTV)</p>
                                <h3 className="text-2xl font-bold text-[#8D42DD]">
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> :
                                        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stats.total_revenue)}
                                </h3>
                                <p className="text-xs text-gray-400 mt-1">Valor vitalício total</p>
                            </div>
                            <div className="p-2 bg-[#8D42DD]/10 rounded-full">
                                <DollarSign className="h-5 w-5 text-[#8D42DD]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Quick Campaigns Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2 text-[#8D42DD]">
                        <Sparkles className="h-5 w-5" />
                        Ações Recomendadas
                    </h2>

                    <div className="space-y-3">
                        <Card className="cursor-pointer hover:shadow-md transition-all border-[#8D42DD]/20 hover:border-[#8D42DD]" onClick={() => handleQuickCampaign('campeoes')}>
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center text-xl shadow-inner">🏆</div>
                                <div>
                                    <h3 className="font-bold text-gray-800 text-sm">Recompensar Campeões</h3>
                                    <p className="text-xs text-muted-foreground">Fidelize seus VIPs</p>
                                </div>
                                <ArrowRight className="h-4 w-4 ml-auto text-gray-400" />
                            </CardContent>
                        </Card>

                        <Card className="cursor-pointer hover:shadow-md transition-all border-orange-200 hover:border-orange-400" onClick={() => handleQuickCampaign('risco')}>
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-xl shadow-inner">⚠️</div>
                                <div>
                                    <h3 className="font-bold text-gray-800 text-sm">Resgatar Clientes em Risco</h3>
                                    <p className="text-xs text-muted-foreground">Recupere {stats.risk} clientes</p>
                                </div>
                                <ArrowRight className="h-4 w-4 ml-auto text-gray-400" />
                            </CardContent>
                        </Card>

                        <Card className="cursor-pointer hover:shadow-md transition-all border-pink-200 hover:border-pink-400" onClick={() => handleQuickCampaign('aniversario')}>
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-pink-100 flex items-center justify-center text-xl shadow-inner">🎂</div>
                                <div>
                                    <h3 className="font-bold text-gray-800 text-sm">Aniversariantes do Mês</h3>
                                    <p className="text-xs text-muted-foreground">Mimo automático</p>
                                </div>
                                <ArrowRight className="h-4 w-4 ml-auto text-gray-400" />
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Main Data View */}
                <div className="lg:col-span-2">
                    <Card className="h-full border-none shadow-none bg-transparent">
                        <CardHeader className="px-0 pt-0">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Users className="h-5 w-5 text-gray-500" />
                                        {selectedMetric ?
                                            `Clientes: ${selectedMetric === 'churn' ? 'Perdidos' : selectedMetric === 'risk' ? 'Em Risco' : 'Ativos'}`
                                            : 'Todos os Clientes'}
                                    </CardTitle>
                                    <CardDescription>
                                        Mostrando {filteredCustomers.length} clientes encontrados
                                    </CardDescription>
                                </div>
                                {selectedMetric && (
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedMetric(null)}>
                                        Limpar Filtro
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="bg-white rounded-xl border p-0 overflow-hidden">
                            <div className="max-h-[500px] overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nome</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Total Pedidos</TableHead>
                                            <TableHead>Qtd. Gasta (LTV)</TableHead>
                                            <TableHead className="text-right">Ação</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8">
                                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                                                </TableCell>
                                            </TableRow>
                                        )}

                                        {!isLoading && filteredCustomers.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                    Nenhum cliente encontrado neste segmento.
                                                </TableCell>
                                            </TableRow>
                                        )}

                                        {filteredCustomers.map((customer: any) => (
                                            <TableRow key={customer.id} className="hover:bg-gray-50">
                                                <TableCell>
                                                    <div className="font-medium">{customer.name || 'Sem Nome'}</div>
                                                    <div className="text-xs text-muted-foreground">{customer.phone}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={`
                                                        ${customer.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                                                        ${customer.status === 'risk' ? 'bg-orange-50 text-orange-700 border-orange-200' : ''}
                                                        ${customer.status === 'churn' ? 'bg-red-50 text-red-700 border-red-200' : ''}
                                                        ${customer.status === 'lead' ? 'bg-gray-50 text-gray-700 border-gray-200' : ''}
                                                    `}>
                                                        {customer.status === 'active' && 'Ativo'}
                                                        {customer.status === 'risk' && 'Em Risco'}
                                                        {customer.status === 'churn' && 'Perdido'}
                                                        {customer.status === 'lead' && 'Lead'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{customer.total_orders}</TableCell>
                                                <TableCell>
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(customer.ltv || 0)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-[#8D42DD]"
                                                        onClick={() => {
                                                            navigate('/admin/marketing', {
                                                                state: {
                                                                    type: 'individual',
                                                                    template_message: `Oi ${customer.name}, vimos que você adora Açaí!`,
                                                                    template_name: `Msg para ${customer.name}`,
                                                                    segment: 'all' // Ou tratar envio individual no marketing page
                                                                }
                                                            });
                                                        }}
                                                    >
                                                        <MessageCircle className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
}
