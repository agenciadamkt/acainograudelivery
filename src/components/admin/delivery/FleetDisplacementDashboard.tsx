import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from '@/components/ui/alert';
import {
    MapPin,
    Users,
    AlertTriangle,
    AlertCircle,
    CheckCircle2,
    RefreshCw,
    Plus,
    Navigation,
    TrendingUp,
    Target,
    Clock,
    Flame,
    Activity,
    BarChart3,
    Send,
} from 'lucide-react';
import {
    useGeoZones,
    useCreateGeoZone,
    useUpdateGeoZone,
    useCheckZoneCoverage,
    useZoneCoverageStatus,
    useHeatmapData,
    useDisplacementMissions,
    useDisplacementAnalytics,
    GeoZone,
    HeatmapZone,
} from '@/hooks/useFleetDisplacement';
import { cn } from '@/lib/utils';

export default function FleetDisplacementDashboard() {
    const [createZoneOpen, setCreateZoneOpen] = useState(false);
    const [newZone, setNewZone] = useState<Partial<GeoZone>>({
        name: '',
        city: 'Teresina',
        state: 'PI',
        center_lat: -5.0892,
        center_lng: -42.8019,
        radius_km: 2.0,
        min_drivers_required: 2,
        priority_level: 2,
    });

    const { data: zones = [], isLoading: zonesLoading } = useGeoZones();
    const { data: coverageStatus = [] } = useZoneCoverageStatus();
    const { data: heatmapData = [] } = useHeatmapData();
    const { data: missions = [] } = useDisplacementMissions();
    const { data: analytics = [] } = useDisplacementAnalytics();

    const checkCoverage = useCheckZoneCoverage();
    const createZone = useCreateGeoZone();

    // Contadores
    const criticalZones = heatmapData.filter(z => z.coverage_status === 'critical_void');
    const warningZones = heatmapData.filter(z => z.coverage_status === 'warning');
    const healthyZones = heatmapData.filter(z => z.coverage_status === 'healthy');
    const activeMissions = missions.filter((m: any) => ['pending', 'accepted', 'in_transit'].includes(m.status));

    // Analytics totais
    const totalVoids = analytics.reduce((sum, a) => sum + a.total_voids, 0);
    const totalFilled = analytics.reduce((sum, a) => sum + a.voids_filled, 0);
    const avgAcceptanceRate = analytics.length > 0
        ? analytics.reduce((sum, a) => sum + a.acceptance_rate, 0) / analytics.length
        : 0;

    const getHeatColor = (level: number) => {
        switch (level) {
            case 5: return 'bg-red-500';
            case 4: return 'bg-orange-500';
            case 3: return 'bg-yellow-500';
            case 2: return 'bg-lime-500';
            default: return 'bg-green-500';
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'critical_void':
                return <Badge variant="destructive" className="animate-pulse">VAZIO CRÍTICO</Badge>;
            case 'warning':
                return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Atenção</Badge>;
            case 'healthy':
                return <Badge variant="default" className="bg-green-100 text-green-800">Saudável</Badge>;
            default:
                return <Badge variant="outline">Sem Lojas</Badge>;
        }
    };

    const handleCreateZone = async () => {
        await createZone.mutateAsync(newZone);
        setCreateZoneOpen(false);
        setNewZone({
            name: '',
            city: 'Teresina',
            state: 'PI',
            center_lat: -5.0892,
            center_lng: -42.8019,
            radius_km: 2.0,
            min_drivers_required: 2,
            priority_level: 2,
        });
    };

    if (zonesLoading) {
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
            {/* Alerta de Vazios Críticos */}
            {criticalZones.length > 0 && (
                <Alert variant="destructive" className="border-red-600 bg-red-50 dark:bg-red-950">
                    <AlertCircle className="h-5 w-5" />
                    <AlertTitle className="text-lg font-bold">
                        🚨 {criticalZones.length} VAZIO(S) DE COBERTURA DETECTADO(S)
                    </AlertTitle>
                    <AlertDescription className="mt-2">
                        <div className="flex flex-wrap gap-2">
                            {criticalZones.map(zone => (
                                <Badge key={zone.zone_id} variant="destructive">
                                    {zone.zone_name}: {zone.drivers_needed} driver(s) necessário(s)
                                </Badge>
                            ))}
                        </div>
                        <Button
                            variant="destructive"
                            size="sm"
                            className="mt-3"
                            onClick={() => checkCoverage.mutate()}
                            disabled={checkCoverage.isPending}
                        >
                            <Send className="h-4 w-4 mr-2" />
                            Iniciar Deslocamento de Frota
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Navigation className="h-6 w-6" />
                        Ritual de Deslocamento de Frota
                    </h2>
                    <p className="text-muted-foreground">
                        Monitoramento de cobertura e redistribuição inteligente
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => checkCoverage.mutate()}
                        disabled={checkCoverage.isPending}
                    >
                        <RefreshCw className={cn("h-4 w-4 mr-2", checkCoverage.isPending && "animate-spin")} />
                        Verificar Cobertura
                    </Button>
                    <Button onClick={() => setCreateZoneOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Zona
                    </Button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-5">
                <Card className={cn(criticalZones.length > 0 && "border-red-500 bg-red-50 dark:bg-red-950/30")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vazios Críticos</CardTitle>
                        <AlertCircle className={cn("h-4 w-4", criticalZones.length > 0 ? "text-red-500 animate-pulse" : "text-muted-foreground")} />
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-3xl font-bold", criticalZones.length > 0 && "text-red-600")}>
                            {criticalZones.length}
                        </div>
                        <p className="text-xs text-muted-foreground">Zonas sem cobertura</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Em Atenção</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-amber-600">{warningZones.length}</div>
                        <p className="text-xs text-muted-foreground">Cobertura baixa</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Saudáveis</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">{healthyZones.length}</div>
                        <p className="text-xs text-muted-foreground">Cobertura ok</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Missões Ativas</CardTitle>
                        <Navigation className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-600">{activeMissions.length}</div>
                        <p className="text-xs text-muted-foreground">Drivers em deslocamento</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Eficácia (7d)</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {totalVoids > 0 ? Math.round((totalFilled / totalVoids) * 100) : 100}%
                        </div>
                        <p className="text-xs text-muted-foreground">Vazios preenchidos</p>
                    </CardContent>
                </Card>
            </div>

            {/* Mapa de Calor e Zonas */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Mapa de Calor Visual */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Flame className="h-5 w-5 text-orange-500" />
                            Mapa de Calor
                        </CardTitle>
                        <CardDescription>Intensidade de demanda por zona</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                            {heatmapData.slice(0, 8).map(zone => (
                                <div
                                    key={zone.zone_id}
                                    className={cn(
                                        "p-3 rounded-lg border-2 transition-all",
                                        zone.coverage_status === 'critical_void' ? "border-red-500 bg-red-50 dark:bg-red-950/50 animate-pulse" :
                                            zone.coverage_status === 'warning' ? "border-amber-400 bg-amber-50 dark:bg-amber-950/50" :
                                                "border-gray-200 bg-gray-50 dark:bg-gray-800/50"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-sm truncate">{zone.zone_name}</span>
                                        <div className={cn("w-3 h-3 rounded-full", getHeatColor(zone.heat_level))} />
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Users className="h-3 w-3" />
                                            {zone.drivers_available}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Target className="h-3 w-3" />
                                            {zone.pending_orders}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            {zone.drivers_needed > 0 && (
                                                <Badge variant="destructive" className="text-xs px-1">
                                                    -{zone.drivers_needed}
                                                </Badge>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-green-500" /> Normal
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-yellow-500" /> Médio
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-orange-500" /> Alto
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-red-500" /> Crítico
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Lista de Zonas */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5" />
                            Zonas Cadastradas ({zones.length})
                        </CardTitle>
                        <CardDescription>Clique para editar</CardDescription>
                    </CardHeader>
                    <CardContent className="max-h-80 overflow-y-auto">
                        <div className="space-y-2">
                            {zones.map(zone => {
                                const coverage = heatmapData.find(h => h.zone_id === zone.id);
                                return (
                                    <div
                                        key={zone.id}
                                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                                    >
                                        <div>
                                            <p className="font-medium">{zone.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Raio: {zone.radius_km}km • Mín: {zone.min_drivers_required} drivers
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs">
                                                P{zone.priority_level}
                                            </Badge>
                                            {coverage && getStatusBadge(coverage.coverage_status)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Analytics (Etapa 14) */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Analytics de Eficácia (Etapa 14)
                    </CardTitle>
                    <CardDescription>Últimos 7 dias - Métricas do Ritual de Deslocamento</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Zona</TableHead>
                                <TableHead className="text-center">Vazios</TableHead>
                                <TableHead className="text-center">Notificados</TableHead>
                                <TableHead className="text-center">Aceitos</TableHead>
                                <TableHead className="text-center">Taxa Aceitação</TableHead>
                                <TableHead className="text-center">Tempo Médio</TableHead>
                                <TableHead className="text-center">Preenchidos</TableHead>
                                <TableHead className="text-center">Eficácia</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {analytics.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                        Nenhum dado de analytics ainda. Execute verificações de cobertura para gerar dados.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                analytics.map(a => (
                                    <TableRow key={a.zone_id}>
                                        <TableCell className="font-medium">{a.zone_name}</TableCell>
                                        <TableCell className="text-center">{a.total_voids}</TableCell>
                                        <TableCell className="text-center">{a.total_drivers_notified}</TableCell>
                                        <TableCell className="text-center">{a.total_drivers_accepted}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={a.acceptance_rate >= 50 ? 'default' : 'secondary'}>
                                                {a.acceptance_rate}%
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {a.avg_time_to_fill_minutes ? `${Math.round(a.avg_time_to_fill_minutes)} min` : '-'}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {a.voids_filled} / {a.total_voids}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={a.effectiveness_rate >= 70 ? 'default' : a.effectiveness_rate >= 40 ? 'secondary' : 'destructive'}>
                                                {a.effectiveness_rate}%
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Missões Ativas */}
            {activeMissions.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Navigation className="h-5 w-5 text-blue-500" />
                            Missões de Deslocamento Ativas ({activeMissions.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {activeMissions.slice(0, 6).map((mission: any) => (
                                <div
                                    key={mission.id}
                                    className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/30"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium">{mission.delivery_drivers?.name || 'Driver'}</span>
                                        <Badge variant={mission.status === 'pending' ? 'outline' : 'default'}>
                                            {mission.status === 'pending' ? 'Aguardando' :
                                                mission.status === 'accepted' ? 'Aceito' : 'Em Trânsito'}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        → {mission.geo_zones?.name || 'Zona'}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        {mission.estimated_time_minutes} min • {mission.distance_km?.toFixed(1)} km
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Dialog Nova Zona */}
            <Dialog open={createZoneOpen} onOpenChange={setCreateZoneOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Criar Nova Geo-Zone</DialogTitle>
                        <DialogDescription>
                            Defina uma nova zona para monitoramento de cobertura
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nome da Zona/Bairro</Label>
                            <Input
                                value={newZone.name}
                                onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                                placeholder="Ex: Centro, Jóquei, Fátima..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Latitude (Centro)</Label>
                                <Input
                                    type="number"
                                    step="0.0001"
                                    value={newZone.center_lat}
                                    onChange={(e) => setNewZone({ ...newZone, center_lat: Number(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Longitude (Centro)</Label>
                                <Input
                                    type="number"
                                    step="0.0001"
                                    value={newZone.center_lng}
                                    onChange={(e) => setNewZone({ ...newZone, center_lng: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Raio (km)</Label>
                                <Input
                                    type="number"
                                    step="0.5"
                                    value={newZone.radius_km}
                                    onChange={(e) => setNewZone({ ...newZone, radius_km: Number(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Mín. Drivers</Label>
                                <Input
                                    type="number"
                                    value={newZone.min_drivers_required}
                                    onChange={(e) => setNewZone({ ...newZone, min_drivers_required: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Prioridade</Label>
                            <Select
                                value={String(newZone.priority_level)}
                                onValueChange={(v) => setNewZone({ ...newZone, priority_level: Number(v) })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1 - Baixa</SelectItem>
                                    <SelectItem value="2">2 - Média</SelectItem>
                                    <SelectItem value="3">3 - Alta</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateZoneOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleCreateZone} disabled={createZone.isPending || !newZone.name}>
                            {createZone.isPending ? 'Criando...' : 'Criar Zona'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
