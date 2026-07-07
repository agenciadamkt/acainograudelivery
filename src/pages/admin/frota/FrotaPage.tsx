'use client';

import React, { useState } from 'react';
import { GrauOSLayout } from '@/components/admin/GrauOSLayout';
import { RotaDoDiaTab } from '@/components/admin/frota/RotaDoDiaTab';
import { RelatorioRotasTab } from '@/components/admin/frota/RelatorioRotasTab';
import { ComprovantesTab } from '@/components/admin/frota/ComprovantesTab';
import { FleetSettingsTab } from '@/components/admin/frota/FleetSettingsTab';
import { 
    Truck, 
    Users, 
    Calendar, 
    Plus, 
    Search, 
    History, 
    BarChart3, 
    ArrowUpRight, 
    ArrowDownLeft,
    Navigation,
    Clock,
    User,
    CheckCircle2,
    Calendar as CalendarIcon,
    Filter,
    MoreVertical,
    Edit2,
    Trash2,
    AlertCircle,
    ClipboardList,
    Camera,
    Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
    Tabs, 
    TabsContent, 
    TabsList, 
    TabsTrigger 
} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function FrotaPage() {
    const [activeTab, setActiveTab] = useState('rotas');
    const [isTripDialogOpen, setIsTripDialogOpen] = useState(false);
    const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
    const [isDriverDialogOpen, setIsDriverDialogOpen] = useState(false);
    const [editingDriver, setEditingDriver] = useState<any>(null);
    const [deletingDriver, setDeletingDriver] = useState<any>(null);
    
    // New Trip state
    const [newTrip, setNewTrip] = useState({
        vehicle_id: '',
        driver_id: '',
        km_start: '',
        order_number: '',
        departure_time: format(new Date(), 'HH:mm')
    });

    const queryClient = useQueryClient();

    // Queries
    const { data: vehicles = [] } = useQuery({
        queryKey: ['fleet-vehicles'],
        queryFn: async () => {
            const { data, error } = await supabase.from('fleet_vehicles').select('*').order('name');
            if (error) throw error;
            return data;
        }
    });

    const { data: drivers = [] } = useQuery({
        queryKey: ['fleet-drivers'],
        queryFn: async () => {
            const { data, error } = await supabase.from('fleet_drivers').select('*').order('name');
            if (error) throw error;
            return data;
        }
    });

    const { data: trips = [] } = useQuery({
        queryKey: ['fleet-trips'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('fleet_trips')
                .select('*, fleet_vehicles(name, plate), fleet_drivers(name)')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    // Mutations
    const createTripMutation = useMutation({
        mutationFn: async (tripData: any) => {
            const payload: any = {
                vehicle_id: tripData.vehicle_id || null,
                driver_id: tripData.driver_id || null,
                km_start: tripData.km_start !== '' ? Number(tripData.km_start) : 0,
                departure_time: tripData.departure_time,
                order_number: tripData.order_number || null,
            };
            if (!payload.vehicle_id) throw new Error('Selecione um veículo.');
            const { error } = await supabase.from('fleet_trips').insert([payload]);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fleet-trips'] });
            toast.success('Saída registrada com sucesso!');
            setIsTripDialogOpen(false);
        },
        onError: (err) => toast.error('Erro ao registrar saída: ' + err.message)
    });

    const endTripMutation = useMutation({
        mutationFn: async ({ id, km_end }: { id: string, km_end: number }) => {
            const { error } = await supabase
                .from('fleet_trips')
                .update({ 
                    km_end, 
                    arrival_time: format(new Date(), 'HH:mm') 
                })
                .eq('id', id);
            if (error) throw error;

            // Also update vehicle current_km
            const trip = trips.find(t => t.id === id);
            if (trip) {
                await supabase
                    .from('fleet_vehicles')
                    .update({ current_km: km_end })
                    .eq('id', trip.vehicle_id);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fleet-trips'] });
            queryClient.invalidateQueries({ queryKey: ['fleet-vehicles'] });
            toast.success('Chegada registrada com sucesso!');
        }
    });

    const deleteDriverMutation = useMutation({
        mutationFn: async (driverId: string) => {
            // fleet_trips.driver_id é ON DELETE CASCADE — excluir o motorista apagaria
            // o histórico de quilometragem. Se já tiver viagens, inativa em vez de excluir.
            const { count } = await supabase
                .from('fleet_trips')
                .select('id', { count: 'exact', head: true })
                .eq('driver_id', driverId);

            if (count && count > 0) {
                const { error } = await supabase.from('fleet_drivers').update({ active: false }).eq('id', driverId);
                if (error) throw error;
                return { deactivated: true };
            }

            const { error } = await supabase.from('fleet_drivers').delete().eq('id', driverId);
            if (error) throw error;
            return { deactivated: false };
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['fleet-drivers'] });
            setDeletingDriver(null);
            if (result.deactivated) {
                toast.info('Este motorista já tem viagens registradas e não pode ser excluído — foi marcado como inativo.');
            } else {
                toast.success('Motorista excluído!');
            }
        },
        onError: (e: any) => toast.error('Erro ao excluir motorista: ' + e.message),
    });

    const activeTrips = trips.filter(t => !t.km_end);
    const completedTrips = trips.filter(t => t.km_end);
    const totalKmMonth = completedTrips
        .filter(t => new Date(t.date) >= startOfMonth(new Date()))
        .reduce((acc, t) => acc + (t.km_total || 0), 0);

    return (
        <GrauOSLayout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-400 shadow-lg shadow-indigo-500/20">
                            <Truck className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Controle de Frota</h2>
                            <p className="text-sm text-gray-500 dark:text-white/40">Gestão de saídas, motoristas e quilometragem</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Dialog open={isTripDialogOpen} onOpenChange={setIsTripDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-lg shadow-indigo-600/20">
                                    <Plus className="h-4 w-4" />
                                    Registrar Saída
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Registrar Saída de Veículo</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="vehicle">Veículo</Label>
                                        <Select onValueChange={(val) => {
                                            const v = vehicles.find(v => v.id === val);
                                            setNewTrip(prev => ({ ...prev, vehicle_id: val, km_start: v?.current_km?.toString() || '' }));
                                        }}>
                                            <SelectTrigger><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
                                            <SelectContent>
                                                {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.name} ({v.plate})</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="driver">Motorista</Label>
                                        <Select onValueChange={(val) => setNewTrip(prev => ({ ...prev, driver_id: val }))}>
                                            <SelectTrigger><SelectValue placeholder="Selecione o motorista" /></SelectTrigger>
                                            <SelectContent>
                                                {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="km_start">KM Inicial</Label>
                                            <Input 
                                                id="km_start" 
                                                type="number" 
                                                value={newTrip.km_start} 
                                                onChange={e => setNewTrip(prev => ({ ...prev, km_start: e.target.value }))}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="time">Hora de Saída</Label>
                                            <Input 
                                                id="time" 
                                                type="time" 
                                                value={newTrip.departure_time} 
                                                onChange={e => setNewTrip(prev => ({ ...prev, departure_time: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="order">Nº do Pedido (Opcional)</Label>
                                        <Input 
                                            id="order" 
                                            placeholder="Ex: 1234" 
                                            value={newTrip.order_number} 
                                            onChange={e => setNewTrip(prev => ({ ...prev, order_number: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsTripDialogOpen(false)}>Cancelar</Button>
                                    <Button
                                        className="bg-indigo-600"
                                        onClick={() => createTripMutation.mutate(newTrip)}
                                        disabled={!newTrip.vehicle_id || createTripMutation.isPending}
                                    >
                                        Salvar Saída
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Main Content */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-1 rounded-xl h-11">
                        <TabsTrigger value="rotas" className="rounded-lg gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm">
                            <Navigation className="h-4 w-4" />
                            Rotas
                        </TabsTrigger>
                        <TabsTrigger value="relatorio-rotas" className="rounded-lg gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm">
                            <ClipboardList className="h-4 w-4" />
                            Relatório de Rotas
                        </TabsTrigger>
                        <TabsTrigger value="comprovantes" className="rounded-lg gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm">
                            <Camera className="h-4 w-4" />
                            Comprovantes
                        </TabsTrigger>
                        <TabsTrigger value="motoristas" className="rounded-lg gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm">
                            <Users className="h-4 w-4" />
                            Motoristas
                        </TabsTrigger>
                        <TabsTrigger value="dashboard" className="rounded-lg gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm">
                            <LayoutDashboardIcon className="h-4 w-4" />
                            Painel
                        </TabsTrigger>
                        <TabsTrigger value="veiculos" className="rounded-lg gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm">
                            <Truck className="h-4 w-4" />
                            Veículos
                        </TabsTrigger>
                        <TabsTrigger value="relatorios" className="rounded-lg gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm">
                            <BarChart3 className="h-4 w-4" />
                            Relatórios
                        </TabsTrigger>
                        <TabsTrigger value="configuracoes" className="rounded-lg gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm">
                            <Settings className="h-4 w-4" />
                            Configurações
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="dashboard" className="space-y-6 outline-none">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <KPICard 
                                title="Veículos Ativos" 
                                value={vehicles.filter(v => v.active).length.toString().padStart(2, '0')} 
                                icon={Truck} 
                                color="text-blue-500" 
                                bgColor="bg-blue-100 dark:bg-blue-500/10" 
                            />
                            <KPICard 
                                title="Viagens Hoje" 
                                value={trips.filter(t => t.date === format(new Date(), 'yyyy-MM-dd')).length.toString().padStart(2, '0')} 
                                icon={Navigation} 
                                color="text-indigo-500" 
                                bgColor="bg-indigo-100 dark:bg-indigo-500/10" 
                            />
                            <KPICard 
                                title="KM Percorrido (Mês)" 
                                value={totalKmMonth.toLocaleString()} 
                                icon={TrendingUpIcon} 
                                color="text-emerald-500" 
                                bgColor="bg-emerald-100 dark:bg-emerald-500/10" 
                            />
                            <KPICard 
                                title="Motoristas em Rota" 
                                value={activeTrips.length.toString().padStart(2, '0')} 
                                icon={User} 
                                color="text-amber-500" 
                                bgColor="bg-amber-100 dark:bg-amber-500/10" 
                            />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-4">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <History className="h-5 w-5 text-indigo-500" />
                                    Movimentação Recente
                                </h3>
                                <div className="space-y-3">
                                    {trips.slice(0, 10).map((trip) => (
                                        <TripCard key={trip.id} trip={trip} onEndTrip={(km_end) => endTripMutation.mutate({ id: trip.id, km_end })} />
                                    ))}
                                    {trips.length === 0 && (
                                        <div className="p-8 text-center text-gray-400 border-2 border-dashed rounded-2xl">
                                            Nenhum registro encontrado
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-xl shadow-indigo-600/20">
                                    <h3 className="text-lg font-bold mb-4">Giro da Frota</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between text-xs mb-1.5 opacity-80">
                                                <span>Km Total ({format(new Date(), 'MMMM', { locale: ptBR })})</span>
                                                <span>{totalKmMonth} km</span>
                                            </div>
                                            <Progress value={(totalKmMonth / 5000) * 100} className="h-2 bg-white/20" />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 shadow-sm">
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-indigo-500" />
                                        Status dos Veículos
                                    </h4>
                                    <div className="space-y-3">
                                        {vehicles.map(v => (
                                            <div key={v.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-white dark:bg-white/10 shadow-sm text-indigo-500">
                                                        <Truck className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{v.name}</p>
                                                        <p className="text-[10px] text-gray-400">{v.plate}</p>
                                                    </div>
                                                </div>
                                                <Badge className={trips.some(t => t.vehicle_id === v.id && !t.km_end) ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}>
                                                    {trips.some(t => t.vehicle_id === v.id && !t.km_end) ? 'Em Rota' : 'Livre'}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="veiculos">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                             {vehicles.map(v => <VehicleCard key={v.id} vehicle={v} />)}
                             <Dialog open={isVehicleDialogOpen} onOpenChange={setIsVehicleDialogOpen}>
                                 <DialogTrigger asChild>
                                     <button className="border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-gray-400 hover:text-indigo-500 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all">
                                         <Plus className="h-8 w-8" />
                                         <span className="text-sm font-medium">Novo Veículo</span>
                                     </button>
                                 </DialogTrigger>
                                 <VehicleForm onSuccess={() => {
                                     setIsVehicleDialogOpen(false);
                                     queryClient.invalidateQueries({ queryKey: ['fleet-vehicles'] });
                                 }} />
                             </Dialog>
                        </div>
                    </TabsContent>

                    <TabsContent value="motoristas">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                             {drivers.map(d => (
                                 <DriverCard
                                     key={d.id}
                                     driver={d}
                                     onEdit={() => { setEditingDriver(d); setIsDriverDialogOpen(true); }}
                                     onDelete={() => setDeletingDriver(d)}
                                 />
                             ))}
                             <Dialog
                                 open={isDriverDialogOpen}
                                 onOpenChange={(open) => {
                                     setIsDriverDialogOpen(open);
                                     if (!open) setEditingDriver(null);
                                 }}
                             >
                                 <DialogTrigger asChild>
                                     <button
                                         className="border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-gray-400 hover:text-indigo-500 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all"
                                         onClick={() => setEditingDriver(null)}
                                     >
                                         <Plus className="h-8 w-8" />
                                         <span className="text-sm font-medium">Novo Motorista</span>
                                     </button>
                                 </DialogTrigger>
                                 <DriverForm
                                     key={editingDriver?.id ?? 'new'}
                                     driver={editingDriver}
                                     onSuccess={() => {
                                         setIsDriverDialogOpen(false);
                                         setEditingDriver(null);
                                         queryClient.invalidateQueries({ queryKey: ['fleet-drivers'] });
                                     }}
                                 />
                             </Dialog>
                        </div>

                        <AlertDialog open={!!deletingDriver} onOpenChange={(open) => !open && setDeletingDriver(null)}>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir Motorista</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Tem certeza que deseja excluir "{deletingDriver?.name}"? Se ele já tiver viagens
                                        registradas, será apenas marcado como inativo para preservar o histórico.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        onClick={() => deleteDriverMutation.mutate(deletingDriver.id)}
                                    >
                                        Excluir
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </TabsContent>

                    <TabsContent value="relatorios">
                        <div className="p-6 rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Relatório de Quilometragem</h3>
                                    <p className="text-xs text-gray-500 dark:text-white/40">Análise cruzada de veículos e motoristas por período</p>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-gray-100 dark:border-white/5 pb-4">
                                            <th className="pb-4 pt-0 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">Data</th>
                                            <th className="pb-4 pt-0 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Motorista</th>
                                            <th className="pb-4 pt-0 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Veículo</th>
                                            <th className="pb-4 pt-0 text-[11px] font-bold text-gray-400 uppercase tracking-widest">KM Inicial</th>
                                            <th className="pb-4 pt-0 text-[11px] font-bold text-gray-400 uppercase tracking-widest">KM Final</th>
                                            <th className="pb-4 pt-0 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">Total KM</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-white/[0.02]">
                                        {completedTrips.map(trip => (
                                            <tr key={trip.id} className="group">
                                                <td className="py-4 text-xs font-medium text-gray-700 dark:text-gray-300 text-center">
                                                    {format(new Date(trip.date), 'dd/MM/yyyy')}
                                                </td>
                                                <td className="py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-500/10 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                                                            {trip.fleet_drivers?.name?.[0] || '?'}
                                                        </div>
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">{trip.fleet_drivers?.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 text-xs text-gray-600 dark:text-gray-400 tracking-tight">
                                                    {trip.fleet_vehicles?.name} <span className="opacity-50">({trip.fleet_vehicles?.plate})</span>
                                                </td>
                                                <td className="py-4 text-sm text-gray-600 dark:text-gray-400">{trip.km_start?.toLocaleString()}</td>
                                                <td className="py-4 text-sm text-gray-600 dark:text-gray-400">{trip.km_end?.toLocaleString()}</td>
                                                <td className="py-4 text-sm font-bold text-indigo-600 dark:text-indigo-400 text-right">{trip.km_total} km</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 border-gray-100 dark:border-white/10 font-bold">
                                            <td colSpan={5} className="py-4 text-sm text-gray-900 dark:text-white uppercase tracking-wider">Total Geral do Período</td>
                                            <td className="py-4 text-lg text-indigo-600 dark:text-indigo-400 text-right">{totalKmMonth} km</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="rotas" className="outline-none">
                        <RotaDoDiaTab />
                    </TabsContent>

                    <TabsContent value="relatorio-rotas" className="outline-none">
                        <RelatorioRotasTab />
                    </TabsContent>

                    <TabsContent value="comprovantes" className="outline-none">
                        <ComprovantesTab />
                    </TabsContent>

                    <TabsContent value="configuracoes" className="outline-none">
                        <FleetSettingsTab />
                    </TabsContent>
                </Tabs>
            </div>
        </GrauOSLayout>
    );
}

// --- Components ---

function KPICard({ title, value, icon: Icon, color, bgColor }: any) {
    return (
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${bgColor}`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-0.5">{value}</p>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{title}</p>
        </div>
    );
}

function TripCard({ trip, onEndTrip }: { trip: any, onEndTrip: (km: number) => void }) {
    const [kmEnd, setKmEnd] = useState('');
    const [isEnding, setIsEnding] = useState(false);
    const isActive = !trip.km_end;
    
    return (
        <div className={`p-4 rounded-2xl border transition-all ${
            isActive 
            ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-700/30' 
            : 'bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/10'
        }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${isActive ? 'bg-amber-500/20 text-amber-600' : 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600'} shadow-sm`}>
                        <Truck className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">{trip.fleet_vehicles?.name}</h4>
                            {trip.order_number && (
                                <Badge variant="outline" className="text-[10px] h-4 border-gray-200 dark:border-white/10 text-gray-500">
                                    Pedido #{trip.order_number}
                                </Badge>
                            )}
                            {isActive && <Badge className="bg-amber-500 dark:bg-amber-600 text-white animate-pulse h-4 text-[9px]">Em Rota</Badge>}
                        </div>
                        <div className="flex items-center gap-4 text-[11px] text-gray-500 dark:text-white/40">
                            <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {trip.fleet_drivers?.name}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {trip.departure_time} {trip.arrival_time ? `→ ${trip.arrival_time}` : ''}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Km {isActive ? 'Início' : 'Percorrido'}</span>
                        <span className={`text-sm font-bold ${isActive ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {isActive ? `${trip.km_start.toLocaleString()} km` : `${trip.km_total} km`}
                        </span>
                    </div>
                    
                    {isActive && (
                        isEnding ? (
                            <div className="flex items-center gap-2">
                                <Input 
                                    className="w-24 h-8 text-xs" 
                                    placeholder="KM Final" 
                                    type="number"
                                    value={kmEnd}
                                    onChange={e => setKmEnd(e.target.value)}
                                />
                                <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onEndTrip(Number(kmEnd))}>OK</Button>
                                <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => setIsEnding(false)}>X</Button>
                            </div>
                        ) : (
                            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 px-4 rounded-lg" onClick={() => setIsEnding(true)}>
                                Chegada
                            </Button>
                        )
                    )}

                    {!isActive && (
                        <div className="p-1 px-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                            <CheckCircle2 className="h-4 w-4" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function VehicleCard({ vehicle }: any) {
    return (
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500">
                    <Truck className="h-6 w-6" />
                </div>
                <Badge className={vehicle.active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-100 text-gray-500'}>
                    {vehicle.active ? 'Ativo' : 'Inativo'}
                </Badge>
            </div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{vehicle.name}</h4>
            <p className="text-xs text-gray-500 dark:text-white/40 mb-4">{vehicle.plate} • {vehicle.model}</p>
            <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex justify-between items-center">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Km Atual</span>
                <span className="text-sm font-bold text-gray-700 dark:text-white">{vehicle.current_km?.toLocaleString() || 0} km</span>
            </div>
        </div>
    );
}

function DriverCard({ driver, onEdit, onDelete }: any) {
    return (
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                        {driver.name[0]}
                    </div>
                    <div>
                        <h4 className="text-base font-bold text-gray-900 dark:text-white">{driver.name}</h4>
                        <p className="text-xs text-gray-500 dark:text-white/40">{driver.phone || 'Sem telefone'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-indigo-500" onClick={onEdit}>
                        <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-500" onClick={onDelete}>
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/5">
                <Badge className={driver.active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-100 text-gray-500'}>
                    {driver.active ? 'Disponível' : 'Indisponível'}
                </Badge>
                <Button variant="ghost" size="sm" className="h-7 text-[11px] text-indigo-500">Histórico</Button>
            </div>
        </div>
    );
}

function VehicleForm({ onSuccess }: { onSuccess: () => void }) {
    const [name, setName] = useState('');
    const [plate, setPlate] = useState('');
    const [model, setModel] = useState('');
    const [km, setKm] = useState('');

    const mutate = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.from('fleet_vehicles').insert([
                { name, plate, model, current_km: Number(km) }
            ]);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Veículo cadastrado!');
            onSuccess();
        },
        onError: (e) => toast.error(e.message)
    });

    return (
        <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar Veículo</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2"><Label>Nome/Identificação</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Fiorino Branca 01" /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label>Placa</Label><Input value={plate} onChange={e => setPlate(e.target.value)} placeholder="ABC-1234" /></div>
                    <div className="grid gap-2"><Label>Modelo/Ano</Label><Input value={model} onChange={e => setModel(e.target.value)} placeholder="2023" /></div>
                </div>
                <div className="grid gap-2"><Label>KM Inicial Atual</Label><Input value={km} onChange={e => setKm(e.target.value)} type="number" /></div>
            </div>
            <DialogFooter><Button className="bg-indigo-600" onClick={() => mutate.mutate()}>Cadastrar</Button></DialogFooter>
        </DialogContent>
    );
}

function DriverForm({ driver, onSuccess }: { driver?: any; onSuccess: () => void }) {
    const [name, setName] = useState(driver?.name ?? '');
    const [phone, setPhone] = useState(driver?.phone ?? '');
    const [license, setLicense] = useState(driver?.license_number ?? '');
    const isEdit = !!driver;

    const mutate = useMutation({
        mutationFn: async () => {
            if (isEdit) {
                const { error } = await supabase
                    .from('fleet_drivers')
                    .update({ name, phone, license_number: license })
                    .eq('id', driver.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('fleet_drivers').insert([
                    { name, phone, license_number: license }
                ]);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            toast.success(isEdit ? 'Motorista atualizado!' : 'Motorista cadastrado!');
            onSuccess();
        },
        onError: (e) => toast.error(e.message)
    });

    return (
        <DialogContent>
            <DialogHeader><DialogTitle>{isEdit ? 'Editar Motorista' : 'Cadastrar Motorista'}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2"><Label>Nome Completo</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
                <div className="grid gap-2"><Label>Telefone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
                <div className="grid gap-2"><Label>CNH</Label><Input value={license} onChange={e => setLicense(e.target.value)} /></div>
            </div>
            <DialogFooter>
                <Button className="bg-indigo-600" onClick={() => mutate.mutate()} disabled={mutate.isPending}>
                    {isEdit ? 'Salvar' : 'Cadastrar'}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}

// Support Icons
function LayoutDashboardIcon(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="15" rx="1"/></svg>;
}

function TrendingUpIcon(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>;
}
