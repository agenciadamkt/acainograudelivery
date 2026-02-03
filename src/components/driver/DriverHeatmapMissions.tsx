import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from '@/components/ui/alert';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Navigation,
    MapPin,
    Clock,
    Star,
    CheckCircle2,
    XCircle,
    Flame,
    ArrowRight,
    Locate,
    Trophy,
    Target,
    Loader2,
} from 'lucide-react';
import {
    useDriverMissions,
    useAcceptMission,
    useRejectMission,
    useZoneCheckin,
    useHeatmapData,
    DriverMission,
    HeatmapZone,
} from '@/hooks/useFleetDisplacement';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DriverHeatmapMissionsProps {
    driverId: string;
    driverName?: string;
}

export default function DriverHeatmapMissions({ driverId, driverName }: DriverHeatmapMissionsProps) {
    const [selectedMission, setSelectedMission] = useState<DriverMission | null>(null);
    const [isTracking, setIsTracking] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

    const { data: missions = [], isLoading: missionsLoading } = useDriverMissions(driverId);
    const { data: heatmapData = [] } = useHeatmapData();

    const acceptMission = useAcceptMission();
    const rejectMission = useRejectMission();
    const zoneCheckin = useZoneCheckin();

    // Monitorar localização quando em trânsito
    useEffect(() => {
        let watchId: number;

        const activeMission = missions.find(m => m.status === 'in_transit' || m.status === 'accepted');

        if (activeMission && isTracking) {
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setCurrentLocation({ lat: latitude, lng: longitude });

                    // Fazer check-in automático
                    zoneCheckin.mutate({
                        driverId,
                        lat: latitude,
                        lng: longitude,
                    });
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    toast.error('Erro ao obter localização');
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
            );
        }

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [missions, isTracking, driverId]);

    // Missão pendente mais recente
    const pendingMission = missions.find(m => m.status === 'pending');
    const activeMission = missions.find(m => m.status === 'accepted' || m.status === 'in_transit');

    // Zonas quentes (demanda alta)
    const hotZones = heatmapData.filter(z => z.heat_level >= 4);

    const handleAccept = async (mission: DriverMission) => {
        await acceptMission.mutateAsync({ missionId: mission.mission_id, driverId });
        setSelectedMission(null);
        setIsTracking(true);
        toast.success('Missão aceita! GPS ativado.', {
            description: 'Dirija-se à zona indicada para ganhar Priority Status.',
        });
    };

    const handleReject = async (mission: DriverMission) => {
        await rejectMission.mutateAsync({ missionId: mission.mission_id, driverId });
        setSelectedMission(null);
    };

    const getTimeRemaining = (expiresAt: string) => {
        const diff = new Date(expiresAt).getTime() - Date.now();
        if (diff <= 0) return 'Expirado';
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const getHeatColor = (level: number) => {
        switch (level) {
            case 5: return 'bg-red-500';
            case 4: return 'bg-orange-500';
            case 3: return 'bg-yellow-500';
            default: return 'bg-green-500';
        }
    };

    return (
        <div className="space-y-6 max-w-lg mx-auto">
            {/* Notificação de Nova Missão */}
            {pendingMission && !activeMission && (
                <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950 animate-pulse">
                    <Navigation className="h-5 w-5 text-blue-600" />
                    <AlertTitle className="text-blue-800 dark:text-blue-200 font-bold">
                        🎯 NOVA MISSÃO DE DESLOCAMENTO!
                    </AlertTitle>
                    <AlertDescription className="text-blue-700 dark:text-blue-300">
                        <p className="mb-2">
                            Há uma zona com alta demanda e poucos entregadores.
                            Complete a missão e ganhe <strong>Priority Status</strong> por 2 horas!
                        </p>
                        <div className="flex items-center gap-4 mb-3 text-sm">
                            <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {pendingMission.zone_name}
                            </span>
                            <span className="flex items-center gap-1">
                                <Navigation className="h-4 w-4" />
                                {pendingMission.distance_km?.toFixed(1)} km
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                ~{pendingMission.estimated_time_minutes} min
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                onClick={() => handleAccept(pendingMission)}
                                disabled={acceptMission.isPending}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {acceptMission.isPending ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                )}
                                Aceitar Missão
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(pendingMission)}
                                disabled={rejectMission.isPending}
                            >
                                <XCircle className="h-4 w-4 mr-2" />
                                Recusar
                            </Button>
                        </div>
                        <p className="text-xs mt-2 opacity-70">
                            ⏱ Expira em: {getTimeRemaining(pendingMission.expires_at)}
                        </p>
                    </AlertDescription>
                </Alert>
            )}

            {/* Missão Ativa */}
            {activeMission && (
                <Card className="border-2 border-green-500 bg-green-50 dark:bg-green-950">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
                                <Navigation className="h-5 w-5 animate-pulse" />
                                Missão em Andamento
                            </CardTitle>
                            <Badge variant="default" className="bg-green-600">
                                {activeMission.status === 'accepted' ? 'Aceita' : 'Em Trânsito'}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* Destino */}
                            <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                                <div>
                                    <p className="font-bold text-lg">{activeMission.zone_name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {activeMission.distance_km?.toFixed(1)} km • ~{activeMission.estimated_time_minutes} min
                                    </p>
                                </div>
                                <div className="text-right">
                                    <MapPin className="h-8 w-8 text-green-600 mx-auto" />
                                </div>
                            </div>

                            {/* Coordenadas para navegação */}
                            <Button
                                className="w-full"
                                variant="outline"
                                onClick={() => {
                                    const url = `https://www.google.com/maps/dir/?api=1&destination=${activeMission.zone_center_lat},${activeMission.zone_center_lng}`;
                                    window.open(url, '_blank');
                                }}
                            >
                                <Navigation className="h-4 w-4 mr-2" />
                                Abrir no Google Maps
                            </Button>

                            {/* Status de GPS */}
                            <div className="flex items-center justify-center gap-2 text-sm">
                                <Locate className={cn(
                                    "h-4 w-4",
                                    isTracking ? "text-green-500 animate-pulse" : "text-gray-400"
                                )} />
                                <span className={isTracking ? "text-green-600" : "text-muted-foreground"}>
                                    {isTracking ? 'GPS ativo - rastreando chegada' : 'GPS inativo'}
                                </span>
                            </div>

                            {!isTracking && (
                                <Button
                                    variant="secondary"
                                    className="w-full"
                                    onClick={() => setIsTracking(true)}
                                >
                                    <Locate className="h-4 w-4 mr-2" />
                                    Ativar Rastreamento
                                </Button>
                            )}

                            {/* Recompensa */}
                            <div className="flex items-center justify-center gap-2 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                                <Trophy className="h-5 w-5 text-yellow-600" />
                                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                    Chegue na zona e ganhe Priority Status por 2 horas!
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Mapa de Calor */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Flame className="h-5 w-5 text-orange-500" />
                        Zonas Quentes
                    </CardTitle>
                    <CardDescription>
                        Áreas com alta demanda e poucos entregadores
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {hotZones.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                            <p>Todas as zonas estão cobertas!</p>
                            <p className="text-sm">Continue na sua área atual.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {hotZones.map(zone => (
                                <div
                                    key={zone.zone_id}
                                    className={cn(
                                        "p-4 rounded-lg border-2 transition-all",
                                        zone.heat_level === 5 ? "border-red-400 bg-red-50 dark:bg-red-950/50" :
                                            "border-orange-400 bg-orange-50 dark:bg-orange-950/50"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-3 h-3 rounded-full animate-pulse", getHeatColor(zone.heat_level))} />
                                            <span className="font-bold">{zone.zone_name}</span>
                                        </div>
                                        <Badge variant={zone.heat_level === 5 ? 'destructive' : 'secondary'}>
                                            {zone.heat_level === 5 ? '🔥 Crítico' : '⚠️ Alto'}
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Target className="h-3 w-3" />
                                            {zone.pending_orders} pedidos
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Star className="h-3 w-3" />
                                            {zone.drivers_available} drivers
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <ArrowRight className="h-3 w-3" />
                                            +{zone.drivers_needed} precisa
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Legenda */}
                    <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-500" /> Normal
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-yellow-500" /> Médio
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-orange-500" /> Alto
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-red-500" /> Crítico
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Histórico de Missões */}
            {missions.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Missões Recentes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {missions.slice(0, 5).map(mission => (
                                <div
                                    key={mission.mission_id}
                                    className="flex items-center justify-between p-2 rounded border text-sm"
                                >
                                    <div className="flex items-center gap-2">
                                        {mission.priority_granted ? (
                                            <Star className="h-4 w-4 text-yellow-500" />
                                        ) : (
                                            <MapPin className="h-4 w-4 text-muted-foreground" />
                                        )}
                                        <span>{mission.zone_name}</span>
                                    </div>
                                    <Badge
                                        variant={
                                            mission.status === 'arrived' ? 'default' :
                                                mission.status === 'rejected' ? 'destructive' :
                                                    mission.status === 'expired' ? 'secondary' :
                                                        'outline'
                                        }
                                        className="text-xs"
                                    >
                                        {mission.status === 'arrived' ? 'Concluída' :
                                            mission.status === 'rejected' ? 'Recusada' :
                                                mission.status === 'expired' ? 'Expirada' :
                                                    mission.status}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Dica sobre Priority Status */}
            <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-purple-200">
                <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                        <Star className="h-6 w-6 text-purple-500 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-purple-800 dark:text-purple-200">
                                O que é Priority Status?
                            </p>
                            <p className="text-sm text-purple-700 dark:text-purple-300">
                                Quando você aceita uma missão e chega na zona, recebe prioridade
                                na fila de pedidos por 2 horas. Você receberá os pedidos antes
                                dos outros entregadores!
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
