import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from '@/components/ui/alert';
import {
    Gauge,
    Users,
    Clock,
    AlertTriangle,
    AlertCircle,
    CheckCircle2,
    Truck,
    MapPin,
    Phone,
    Send,
    Settings,
    Bell,
    BellRing,
    Store,
    ArrowRight,
    RefreshCw,
    LayoutGrid,
} from 'lucide-react';
import {
    useCapacityMetrics,
    useCapacityAlerts,
    useCapacitySettings,
    useUpdateCapacitySettings,
    useAcknowledgeAlert,
    useResolveAlert,
    useNearbyStores,
    useSupportRequests,
    useCreateSupportRequest,
    useRespondSupportRequest,
    CapacityAlert,
    CapacitySettings,
} from '@/hooks/useCapacityMonitoring';
import { useStore } from '@/contexts/StoreContext';
import { cn } from '@/lib/utils';

export default function CapacityMonitoringDashboard() {
    const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
    const [supportDialogOpen, setSupportDialogOpen] = useState(false);
    const [settingsForm, setSettingsForm] = useState<Partial<CapacitySettings>>({});
    const [supportForm, setSupportForm] = useState({ needed_drivers: 1, reason: '' });

    const { currentStore } = useStore();

    const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useCapacityMetrics();
    const { data: alerts = [] } = useCapacityAlerts();
    const { data: settings } = useCapacitySettings();
    const { data: nearbyStores = [] } = useNearbyStores();
    const { data: supportRequests = [] } = useSupportRequests();

    const updateSettings = useUpdateCapacitySettings();
    const acknowledgeAlert = useAcknowledgeAlert();
    const resolveAlert = useResolveAlert();
    const createSupportRequest = useCreateSupportRequest();
    const respondSupportRequest = useRespondSupportRequest();

    // Initialize settings form when settings load
    useEffect(() => {
        if (settings) {
            setSettingsForm(settings);
        }
    }, [settings]);

    const formatTime = (minutes: number) => {
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}min`;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'critical':
                return 'text-red-600 bg-red-50 dark:bg-red-950';
            case 'warning':
                return 'text-amber-600 bg-amber-50 dark:bg-amber-950';
            default:
                return 'text-green-600 bg-green-50 dark:bg-green-950';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'critical':
                return <AlertCircle className="h-5 w-5" />;
            case 'warning':
                return <AlertTriangle className="h-5 w-5" />;
            default:
                return <CheckCircle2 className="h-5 w-5" />;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'critical':
                return 'Crítico';
            case 'warning':
                return 'Atenção';
            default:
                return 'Normal';
        }
    };

    const getProgressColor = (rate: number) => {
        if (rate >= 100) return 'bg-red-500';
        if (rate >= 80) return 'bg-amber-500';
        return 'bg-green-500';
    };

    const handleSaveSettings = async () => {
        await updateSettings.mutateAsync(settingsForm);
        setSettingsDialogOpen(false);
    };

    const handleCreateSupportRequest = async () => {
        await createSupportRequest.mutateAsync(supportForm);
        setSupportDialogOpen(false);
        setSupportForm({ needed_drivers: 1, reason: '' });
    };

    const pendingAlerts = alerts.filter(a => !a.acknowledged_at);
    const pendingSupportRequests = supportRequests.filter(r =>
        r.status === 'pending' && r.requesting_store_id !== currentStore?.id
    );

    if (metricsLoading) {
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
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Critical Alert Banner */}
            {metrics?.status === 'critical' && (
                <Alert variant="destructive" className="border-red-500 bg-red-50 dark:bg-red-950">
                    <AlertCircle className="h-5 w-5" />
                    <AlertTitle className="text-lg font-bold">🚨 Alerta Crítico de Capacidade</AlertTitle>
                    <AlertDescription className="mt-2">
                        <p>A capacidade de entrega foi excedida em {Math.round(metrics.occupancy_rate - 100)}%.</p>
                        <p className="mt-1">
                            <strong>{metrics.active_orders}</strong> pedidos ativos com apenas{' '}
                            <strong>{metrics.available_drivers}</strong> entregadores disponíveis.
                        </p>
                        <div className="mt-3 flex gap-2">
                            <Button variant="destructive" size="sm" onClick={() => setSupportDialogOpen(true)}>
                                <Send className="h-4 w-4 mr-2" />
                                Solicitar Suporte
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => refetchMetrics()}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Atualizar
                            </Button>
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {/* Warning Alert Banner */}
            {metrics?.status === 'warning' && (
                <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <AlertTitle className="text-amber-800 dark:text-amber-200 font-bold">
                        ⚠️ Capacidade Próxima do Limite
                    </AlertTitle>
                    <AlertDescription className="text-amber-700 dark:text-amber-300">
                        Taxa de ocupação em {Math.round(metrics.occupancy_rate)}%.
                        Considere chamar mais entregadores ou ajustar previsões de tempo.
                    </AlertDescription>
                </Alert>
            )}

            {/* Header with Actions */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Gauge className="h-6 w-6" />
                        Monitor de Capacidade
                    </h2>
                    <p className="text-muted-foreground">Monitoramento em tempo real da capacidade logística</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => refetchMetrics()}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Atualizar
                    </Button>
                    <Button variant="outline" onClick={() => setSettingsDialogOpen(true)}>
                        <Settings className="h-4 w-4 mr-2" />
                        Configurar
                    </Button>
                </div>
            </div>

            {/* Main Metrics */}
            <div className="grid gap-4 md:grid-cols-4">
                {/* Occupancy Rate Card */}
                <Card className={cn("relative overflow-hidden", getStatusColor(metrics?.status || 'normal'))}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Taxa de Ocupação</CardTitle>
                        {getStatusIcon(metrics?.status || 'normal')}
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{Math.round(metrics?.occupancy_rate || 0)}%</div>
                        <Progress
                            value={Math.min(metrics?.occupancy_rate || 0, 100)}
                            className="mt-2 h-2"
                        />
                        <Badge
                            variant={metrics?.status === 'critical' ? 'destructive' : metrics?.status === 'warning' ? 'secondary' : 'default'}
                            className="mt-2"
                        >
                            {getStatusLabel(metrics?.status || 'normal')}
                        </Badge>
                    </CardContent>
                </Card>

                {/* Active Orders Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pedidos Ativos</CardTitle>
                        <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{metrics?.active_orders || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Em fila para entrega
                        </p>
                    </CardContent>
                </Card>

                {/* Available Drivers Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Entregadores</CardTitle>
                        <Truck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            <span className="text-green-600">{metrics?.available_drivers || 0}</span>
                            <span className="text-muted-foreground text-lg">/{metrics?.total_drivers || 0}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Disponíveis / Total
                        </p>
                    </CardContent>
                </Card>

                {/* Estimated Wait Time Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tempo Estimado</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {formatTime(metrics?.estimated_wait_time || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Para próximas entregas
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Two Column Layout */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Alerts Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {pendingAlerts.length > 0 ? (
                                <BellRing className="h-5 w-5 text-amber-500 animate-pulse" />
                            ) : (
                                <Bell className="h-5 w-5" />
                            )}
                            Alertas Recentes
                            {pendingAlerts.length > 0 && (
                                <Badge variant="destructive">{pendingAlerts.length}</Badge>
                            )}
                        </CardTitle>
                        <CardDescription>Notificações de capacidade</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {alerts.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>Nenhum alerta ativo</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-80 overflow-y-auto">
                                {alerts.slice(0, 10).map((alert) => (
                                    <div
                                        key={alert.id}
                                        className={cn(
                                            "p-3 rounded-lg border",
                                            alert.alert_type === 'critical' ? 'border-red-200 bg-red-50 dark:bg-red-950/50' :
                                                alert.alert_type === 'warning' ? 'border-amber-200 bg-amber-50 dark:bg-amber-950/50' :
                                                    'border-green-200 bg-green-50 dark:bg-green-950/50'
                                        )}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-2">
                                                {alert.alert_type === 'critical' ? (
                                                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                                                ) : alert.alert_type === 'warning' ? (
                                                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                                                ) : (
                                                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                                                )}
                                                <div>
                                                    <p className="text-sm font-medium">{alert.message}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {new Date(alert.created_at).toLocaleString('pt-BR')}
                                                    </p>
                                                </div>
                                            </div>
                                            {!alert.acknowledged_at && !alert.resolved_at && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => acknowledgeAlert.mutate(alert.id)}
                                                >
                                                    OK
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Nearby Stores Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Store className="h-5 w-5" />
                            Lojas Próximas
                        </CardTitle>
                        <CardDescription>Disponíveis para suporte mútuo (raio de 5km)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {nearbyStores.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>Nenhuma loja próxima encontrada</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {nearbyStores.map((store) => (
                                    <div
                                        key={store.store_id}
                                        className="flex items-center justify-between p-3 rounded-lg border"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Store className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium">{store.store_name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {store.distance_km.toFixed(1)} km de distância
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant={store.available_drivers > 0 ? 'default' : 'secondary'}>
                                            {store.available_drivers} disponíveis
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}

                        {metrics?.status !== 'normal' && nearbyStores.length > 0 && (
                            <Button
                                className="w-full mt-4"
                                variant="outline"
                                onClick={() => setSupportDialogOpen(true)}
                            >
                                <Send className="h-4 w-4 mr-2" />
                                Solicitar Suporte
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Support Requests */}
            {supportRequests.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Solicitações de Suporte
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {supportRequests.map((request) => (
                                <div
                                    key={request.id}
                                    className="flex items-center justify-between p-3 rounded-lg border"
                                >
                                    <div>
                                        <p className="font-medium">
                                            Solicitação de {request.needed_drivers} entregador(es)
                                        </p>
                                        {request.reason && (
                                            <p className="text-sm text-muted-foreground">{request.reason}</p>
                                        )}
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {new Date(request.created_at).toLocaleString('pt-BR')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant={
                                                request.status === 'accepted' ? 'default' :
                                                    request.status === 'declined' ? 'destructive' :
                                                        request.status === 'completed' ? 'secondary' :
                                                            'outline'
                                            }
                                        >
                                            {request.status === 'pending' ? 'Pendente' :
                                                request.status === 'accepted' ? 'Aceito' :
                                                    request.status === 'declined' ? 'Recusado' :
                                                        request.status === 'completed' ? 'Concluído' : 'Expirado'}
                                        </Badge>
                                        {request.status === 'pending' && (
                                            <div className="flex gap-1">
                                                <Button
                                                    size="sm"
                                                    onClick={() => respondSupportRequest.mutate({ requestId: request.id, accept: true })}
                                                >
                                                    Aceitar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => respondSupportRequest.mutate({ requestId: request.id, accept: false })}
                                                >
                                                    Recusar
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Settings Dialog */}
            <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Configurações de Capacidade</DialogTitle>
                        <DialogDescription>
                            Ajuste os parâmetros do monitor de capacidade
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tempo Médio de Entrega (min)</Label>
                                <Input
                                    type="number"
                                    value={settingsForm.avg_delivery_time_minutes || 30}
                                    onChange={(e) => setSettingsForm({
                                        ...settingsForm,
                                        avg_delivery_time_minutes: Number(e.target.value)
                                    })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Max. Pedidos por Entregador</Label>
                                <Input
                                    type="number"
                                    value={settingsForm.max_orders_per_driver || 3}
                                    onChange={(e) => setSettingsForm({
                                        ...settingsForm,
                                        max_orders_per_driver: Number(e.target.value)
                                    })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Limite de Atenção (%)</Label>
                                <Input
                                    type="number"
                                    value={settingsForm.warning_threshold || 80}
                                    onChange={(e) => setSettingsForm({
                                        ...settingsForm,
                                        warning_threshold: Number(e.target.value)
                                    })}
                                />
                                <p className="text-xs text-muted-foreground">Alerta amarelo</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Limite Crítico (%)</Label>
                                <Input
                                    type="number"
                                    value={settingsForm.critical_threshold || 100}
                                    onChange={(e) => setSettingsForm({
                                        ...settingsForm,
                                        critical_threshold: Number(e.target.value)
                                    })}
                                />
                                <p className="text-xs text-muted-foreground">Alerta vermelho</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Raio para Lojas Próximas (km)</Label>
                            <Input
                                type="number"
                                value={settingsForm.alert_radius_km || 5}
                                onChange={(e) => setSettingsForm({
                                    ...settingsForm,
                                    alert_radius_km: Number(e.target.value)
                                })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveSettings} disabled={updateSettings.isPending}>
                            {updateSettings.isPending ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Support Request Dialog */}
            <Dialog open={supportDialogOpen} onOpenChange={setSupportDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Solicitar Suporte</DialogTitle>
                        <DialogDescription>
                            Envie uma solicitação para lojas próximas
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Quantidade de Entregadores Necessários</Label>
                            <Input
                                type="number"
                                min={1}
                                value={supportForm.needed_drivers}
                                onChange={(e) => setSupportForm({
                                    ...supportForm,
                                    needed_drivers: Number(e.target.value)
                                })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Motivo (opcional)</Label>
                            <Textarea
                                value={supportForm.reason}
                                onChange={(e) => setSupportForm({
                                    ...supportForm,
                                    reason: e.target.value
                                })}
                                placeholder="Ex: Alto volume de pedidos no horário de pico"
                                rows={3}
                            />
                        </div>

                        <p className="text-sm text-muted-foreground">
                            A solicitação será enviada para {nearbyStores.length} loja(s) próxima(s)
                            com entregadores disponíveis.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSupportDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleCreateSupportRequest} disabled={createSupportRequest.isPending}>
                            <Send className="h-4 w-4 mr-2" />
                            Enviar Solicitação
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
