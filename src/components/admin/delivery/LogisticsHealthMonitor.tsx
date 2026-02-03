import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Activity,
    Users,
    Clock,
    AlertTriangle,
    AlertCircle,
    CheckCircle2,
    TrendingUp,
    TrendingDown,
    Timer,
    Settings,
    Bell,
    BellRing,
    UserPlus,
    Play,
    Pause,
    Coffee,
    RefreshCw,
    Zap,
    Target,
    Gauge,
} from 'lucide-react';
import {
    useLogisticsHealth,
    useLogisticsAlerts,
    useAssemblers,
    useUpdateAssemblerStatus,
    useCreateAssembler,
    useLogisticsConfig,
    useUpdateLogisticsConfig,
    useAcknowledgeLogisticsAlert,
    LogisticsConfig,
    Assembler,
} from '@/hooks/useLogisticsHealth';
import { cn } from '@/lib/utils';

export default function LogisticsHealthMonitor() {
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [addAssemblerOpen, setAddAssemblerOpen] = useState(false);
    const [newAssemblerName, setNewAssemblerName] = useState('');
    const [configForm, setConfigForm] = useState<Partial<LogisticsConfig>>({});

    const { data: health, isLoading, refetch } = useLogisticsHealth();
    const { data: alerts = [] } = useLogisticsAlerts();
    const { data: assemblers = [] } = useAssemblers();
    const { data: config } = useLogisticsConfig();

    const updateStatus = useUpdateAssemblerStatus();
    const createAssembler = useCreateAssembler();
    const updateConfig = useUpdateLogisticsConfig();
    const acknowledgeAlert = useAcknowledgeLogisticsAlert();

    useEffect(() => {
        if (config) {
            setConfigForm(config);
        }
    }, [config]);

    const pendingAlerts = alerts.filter(a => !a.acknowledged_at);

    const getHealthColor = (status: string) => {
        switch (status) {
            case 'critical': return 'text-red-600 bg-red-50 dark:bg-red-950 border-red-500';
            case 'warning': return 'text-amber-600 bg-amber-50 dark:bg-amber-950 border-amber-500';
            default: return 'text-green-600 bg-green-50 dark:bg-green-950 border-green-500';
        }
    };

    const getHealthIcon = (status: string) => {
        switch (status) {
            case 'critical': return <AlertCircle className="h-6 w-6" />;
            case 'warning': return <AlertTriangle className="h-6 w-6" />;
            default: return <CheckCircle2 className="h-6 w-6" />;
        }
    };

    const getHealthLabel = (status: string) => {
        switch (status) {
            case 'critical': return 'CRÍTICO - Gargalo Iminente';
            case 'warning': return 'ATENÇÃO - Capacidade Próxima do Limite';
            default: return 'SAUDÁVEL - Operação Normal';
        }
    };

    const getStatusIcon = (status: Assembler['status']) => {
        switch (status) {
            case 'online': return <Play className="h-4 w-4 text-green-500" />;
            case 'busy': return <Zap className="h-4 w-4 text-blue-500" />;
            case 'break': return <Coffee className="h-4 w-4 text-amber-500" />;
            default: return <Pause className="h-4 w-4 text-gray-500" />;
        }
    };

    const getOccupancyColor = (rate: number) => {
        if (rate >= 100) return 'bg-red-500';
        if (rate >= 80) return 'bg-amber-500';
        if (rate >= 60) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const formatTime = (minutes: number | null) => {
        if (minutes === null) return '-';
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}min`;
    };

    const handleAddAssembler = async () => {
        if (!newAssemblerName.trim()) return;
        await createAssembler.mutateAsync({ name: newAssemblerName.trim() });
        setNewAssemblerName('');
        setAddAssemblerOpen(false);
    };

    const handleSaveConfig = async () => {
        await updateConfig.mutateAsync(configForm);
        setSettingsOpen(false);
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                    {[1, 2, 3, 4].map(i => (
                        <Card key={i}><CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
                            <CardContent><Skeleton className="h-8 w-16" /></CardContent></Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Alerta Crítico em Banner */}
            {health?.health_status === 'critical' && (
                <Alert variant="destructive" className="border-red-600 bg-red-50 dark:bg-red-950 animate-pulse">
                    <AlertCircle className="h-5 w-5" />
                    <AlertTitle className="text-lg font-bold">
                        🚨 GARGALO LOGÍSTICO IMINENTE - AÇÃO IMEDIATA NECESSÁRIA
                    </AlertTitle>
                    <AlertDescription className="mt-2 space-y-2">
                        <p className="font-medium">
                            A meta de <strong>{health.target_assembly_time} min/copo</strong> será ultrapassada em{' '}
                            <strong className="text-red-800 dark:text-red-300">
                                {formatTime(health.minutes_until_bottleneck)}
                            </strong>!
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mt-2">
                            <div><strong>Pedidos:</strong> {health.active_orders}</div>
                            <div><strong>Montadores Online:</strong> {health.online_assemblers}</div>
                            <div><strong>Capacidade:</strong> {health.current_capacity} copos</div>
                            <div><strong>Ocupação:</strong> {Math.round(health.occupancy_rate)}%</div>
                        </div>
                        <div className="flex gap-2 mt-3">
                            <Button variant="destructive" size="sm" onClick={() => setAddAssemblerOpen(true)}>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Ativar Montador
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => refetch()}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Atualizar
                            </Button>
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {/* Alerta de Atenção */}
            {health?.health_status === 'warning' && (
                <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <AlertTitle className="text-amber-800 dark:text-amber-200 font-bold">
                        ⚠️ ALERTA PREDITIVO - Capacidade em {Math.round(health.occupancy_rate)}%
                    </AlertTitle>
                    <AlertDescription className="text-amber-700 dark:text-amber-300">
                        Gargalo previsto em <strong>{formatTime(health.minutes_until_bottleneck)}</strong>.
                        Considere ativar montadores de reserva.
                    </AlertDescription>
                </Alert>
            )}

            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Activity className="h-6 w-6" />
                        Monitor de Saúde Logística
                    </h2>
                    <p className="text-muted-foreground">
                        Monitoramento preditivo baseado na metodologia Souza Ramos
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => refetch()}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Atualizar
                    </Button>
                    <Button variant="outline" onClick={() => setSettingsOpen(true)}>
                        <Settings className="h-4 w-4 mr-2" />
                        Configurar
                    </Button>
                </div>
            </div>

            {/* Status Card Principal */}
            <Card className={cn("relative overflow-hidden border-2", getHealthColor(health?.health_status || 'healthy'))}>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            {getHealthIcon(health?.health_status || 'healthy')}
                            Status de Saúde Logística
                        </CardTitle>
                        <Badge
                            variant={health?.health_status === 'critical' ? 'destructive' :
                                health?.health_status === 'warning' ? 'secondary' : 'default'}
                            className="text-sm px-3 py-1"
                        >
                            {getHealthLabel(health?.health_status || 'healthy')}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Barra de Ocupação */}
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span>Taxa de Ocupação</span>
                                <span className="font-bold">{Math.round(health?.occupancy_rate || 0)}%</span>
                            </div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className={cn("h-full transition-all duration-500", getOccupancyColor(health?.occupancy_rate || 0))}
                                    style={{ width: `${Math.min(health?.occupancy_rate || 0, 100)}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>0%</span>
                                <span className="text-amber-500">80% (Atenção)</span>
                                <span className="text-red-500">100% (Crítico)</span>
                            </div>
                        </div>

                        {/* Métricas Principais */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                            <div className="text-center p-3 bg-background/50 rounded-lg">
                                <Gauge className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                                <div className="text-2xl font-bold">{health?.current_capacity || 0}</div>
                                <div className="text-xs text-muted-foreground">Capacidade (copos)</div>
                            </div>
                            <div className="text-center p-3 bg-background/50 rounded-lg">
                                <Target className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                                <div className="text-2xl font-bold">{health?.required_capacity || 0}</div>
                                <div className="text-xs text-muted-foreground">Necessário (copos)</div>
                            </div>
                            <div className="text-center p-3 bg-background/50 rounded-lg">
                                <Timer className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                                <div className="text-2xl font-bold">{formatTime(health?.remaining_shift_minutes || 0)}</div>
                                <div className="text-xs text-muted-foreground">Tempo Restante</div>
                            </div>
                            <div className="text-center p-3 bg-background/50 rounded-lg">
                                {(health?.available_capacity || 0) >= 0 ? (
                                    <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-500" />
                                ) : (
                                    <TrendingDown className="h-5 w-5 mx-auto mb-1 text-red-500" />
                                )}
                                <div className={cn("text-2xl font-bold",
                                    (health?.available_capacity || 0) < 0 ? 'text-red-500' : 'text-green-500'
                                )}>
                                    {health?.available_capacity || 0}
                                </div>
                                <div className="text-xs text-muted-foreground">Margem (copos)</div>
                            </div>
                        </div>

                        {/* Info do Ritual de Montagem */}
                        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground border-t pt-3">
                            <span>⏱️ Ritual de Montagem: <strong>{health?.assembly_time || 10} min/copo</strong></span>
                            <span>🎯 Meta: <strong>{health?.target_assembly_time || 9.6} min/copo</strong></span>
                            <span>📊 Margem Segurança: <strong>{((health?.safety_margin || 1.2) * 100 - 100).toFixed(0)}%</strong></span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Grid de Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Pedidos Ativos */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pedidos Ativos</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{health?.active_orders || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {health?.pending_assembly || 0} aguardando montagem
                        </p>
                    </CardContent>
                </Card>

                {/* Montadores Online */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Montadores</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            <span className="text-green-600">{health?.online_assemblers || 0}</span>
                            <span className="text-muted-foreground text-lg">/{health?.total_assemblers || 0}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Online / Cadastrados</p>
                    </CardContent>
                </Card>

                {/* Tempo até Gargalo */}
                <Card className={cn(
                    health?.minutes_until_bottleneck !== null && health?.minutes_until_bottleneck < 30
                        ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                        : ''
                )}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tempo até Gargalo</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-3xl font-bold",
                            health?.minutes_until_bottleneck !== null && health?.minutes_until_bottleneck < 30
                                ? 'text-red-600 animate-pulse'
                                : ''
                        )}>
                            {health?.minutes_until_bottleneck !== null
                                ? formatTime(health.minutes_until_bottleneck)
                                : '∞'}
                        </div>
                        <p className="text-xs text-muted-foreground">Previsão de sobrecarga</p>
                    </CardContent>
                </Card>

                {/* Alertas */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Alertas</CardTitle>
                        {pendingAlerts.length > 0 ? (
                            <BellRing className="h-4 w-4 text-amber-500 animate-bounce" />
                        ) : (
                            <Bell className="h-4 w-4 text-muted-foreground" />
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{pendingAlerts.length}</div>
                        <p className="text-xs text-muted-foreground">Não reconhecidos</p>
                    </CardContent>
                </Card>
            </div>

            {/* Duas Colunas: Montadores e Alertas */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Seção Montadores */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Montadores (Etapa 8)
                            </CardTitle>
                            <Button size="sm" onClick={() => setAddAssemblerOpen(true)}>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Adicionar
                            </Button>
                        </div>
                        <CardDescription>
                            Jornada produtiva: {config?.shift_duration_minutes || 480} minutos
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {assemblers.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>Nenhum montador cadastrado</p>
                                <Button variant="link" onClick={() => setAddAssemblerOpen(true)}>
                                    Adicionar primeiro montador
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {assemblers.map((assembler) => (
                                    <div
                                        key={assembler.id}
                                        className="flex items-center justify-between p-3 rounded-lg border"
                                    >
                                        <div className="flex items-center gap-3">
                                            {getStatusIcon(assembler.status)}
                                            <div>
                                                <p className="font-medium">{assembler.name}</p>
                                                <p className="text-xs text-muted-foreground capitalize">
                                                    {assembler.status === 'online' ? 'Ativo' :
                                                        assembler.status === 'busy' ? 'Ocupado' :
                                                            assembler.status === 'break' ? 'Intervalo' : 'Offline'}
                                                </p>
                                            </div>
                                        </div>
                                        <Select
                                            value={assembler.status}
                                            onValueChange={(value: Assembler['status']) =>
                                                updateStatus.mutate({ id: assembler.id, status: value })
                                            }
                                        >
                                            <SelectTrigger className="w-32">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="online">Ativo</SelectItem>
                                                <SelectItem value="busy">Ocupado</SelectItem>
                                                <SelectItem value="break">Intervalo</SelectItem>
                                                <SelectItem value="offline">Offline</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Seção Alertas */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {pendingAlerts.length > 0 ? (
                                <BellRing className="h-5 w-5 text-amber-500 animate-pulse" />
                            ) : (
                                <Bell className="h-5 w-5" />
                            )}
                            Alertas Preditivos (Etapa 4)
                            {pendingAlerts.length > 0 && (
                                <Badge variant="destructive">{pendingAlerts.length}</Badge>
                            )}
                        </CardTitle>
                        <CardDescription>
                            Ritual de Alerta - Notificações do sistema
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {alerts.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>Nenhum alerta ativo</p>
                                <p className="text-xs">O sistema está operando normalmente</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-80 overflow-y-auto">
                                {alerts.slice(0, 10).map((alert) => (
                                    <div
                                        key={alert.id}
                                        className={cn(
                                            "p-3 rounded-lg border",
                                            alert.alert_type === 'critical' ? 'border-red-300 bg-red-50 dark:bg-red-950/50' :
                                                alert.alert_type === 'warning' ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/50' :
                                                    'border-green-300 bg-green-50 dark:bg-green-950/50'
                                        )}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-2 flex-1">
                                                {alert.alert_type === 'critical' ? (
                                                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                                                ) : (
                                                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium">{alert.message}</p>
                                                    {alert.suggested_action && (
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            💡 {alert.suggested_action}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {new Date(alert.created_at).toLocaleString('pt-BR')}
                                                    </p>
                                                </div>
                                            </div>
                                            {!alert.acknowledged_at && (
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
            </div>

            {/* Dialog Adicionar Montador */}
            <Dialog open={addAssemblerOpen} onOpenChange={setAddAssemblerOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Adicionar Montador</DialogTitle>
                        <DialogDescription>
                            Cadastre um novo montador para aumentar a capacidade
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nome do Montador</Label>
                            <Input
                                value={newAssemblerName}
                                onChange={(e) => setNewAssemblerName(e.target.value)}
                                placeholder="Ex: João Silva"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddAssemblerOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleAddAssembler} disabled={createAssembler.isPending}>
                            {createAssembler.isPending ? 'Salvando...' : 'Adicionar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Configurações */}
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Configurações de Capacidade</DialogTitle>
                        <DialogDescription>
                            Ajuste os parâmetros do Ritual de Montagem (Etapa 8)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tempo por Copo (min)</Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={configForm.assembly_time_minutes || 10}
                                    onChange={(e) => setConfigForm({
                                        ...configForm,
                                        assembly_time_minutes: Number(e.target.value)
                                    })}
                                />
                                <p className="text-xs text-muted-foreground">Ritual de Montagem</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Meta de Tempo (min)</Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={configForm.target_assembly_time || 9.6}
                                    onChange={(e) => setConfigForm({
                                        ...configForm,
                                        target_assembly_time: Number(e.target.value)
                                    })}
                                />
                                <p className="text-xs text-muted-foreground">Não ultrapassar</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Jornada Produtiva (min)</Label>
                                <Input
                                    type="number"
                                    value={configForm.shift_duration_minutes || 480}
                                    onChange={(e) => setConfigForm({
                                        ...configForm,
                                        shift_duration_minutes: Number(e.target.value)
                                    })}
                                />
                                <p className="text-xs text-muted-foreground">8h = 480 min</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Margem de Segurança</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={configForm.safety_margin || 1.2}
                                    onChange={(e) => setConfigForm({
                                        ...configForm,
                                        safety_margin: Number(e.target.value)
                                    })}
                                />
                                <p className="text-xs text-muted-foreground">1.2 = 20%</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Limite Atenção (%)</Label>
                                <Input
                                    type="number"
                                    value={configForm.warning_threshold_percent || 80}
                                    onChange={(e) => setConfigForm({
                                        ...configForm,
                                        warning_threshold_percent: Number(e.target.value)
                                    })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Limite Crítico (%)</Label>
                                <Input
                                    type="number"
                                    value={configForm.critical_threshold_percent || 100}
                                    onChange={(e) => setConfigForm({
                                        ...configForm,
                                        critical_threshold_percent: Number(e.target.value)
                                    })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Webhook Geolocalização</Label>
                                <Switch
                                    checked={configForm.webhook_enabled || false}
                                    onCheckedChange={(checked) => setConfigForm({
                                        ...configForm,
                                        webhook_enabled: checked
                                    })}
                                />
                            </div>
                            {configForm.webhook_enabled && (
                                <Input
                                    value={configForm.webhook_url || ''}
                                    onChange={(e) => setConfigForm({
                                        ...configForm,
                                        webhook_url: e.target.value
                                    })}
                                    placeholder="https://api.exemplo.com/webhook"
                                />
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSettingsOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveConfig} disabled={updateConfig.isPending}>
                            {updateConfig.isPending ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
