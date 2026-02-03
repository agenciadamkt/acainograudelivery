import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Truck, User, MapPin, Star, Plus, Edit, Phone, Copy, Link, FileBarChart } from 'lucide-react';
import { useDeliveryDrivers, useCreateDeliveryDriver, useUpdateDeliveryDriver } from '@/hooks/useDeliveryDrivers';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DriverForm } from '@/components/admin/delivery/DriverForm';
import TrackingMap from '@/components/admin/delivery/TrackingMap';
import RoutePlanner from '@/components/admin/delivery/RoutePlanner';
import DeliveryReportsTab from '@/components/admin/delivery/DeliveryReportsTab';
import { useOrders } from '@/hooks/useOrders';
import { useDeliveryAreas } from '@/hooks/useDeliveryAreas';
import { useStore } from '@/contexts/StoreContext';
import { toast } from 'sonner';

export default function DeliveryPage() {
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any>(null);
  const { currentStore } = useStore();

  const { data: drivers } = useDeliveryDrivers();
  const { deliveryAreas: areas } = useDeliveryAreas(currentStore?.id);
  const { data: orders = [] } = useOrders(); // Fetch all orders to filter locally
  const createDriver = useCreateDeliveryDriver();
  const updateDriver = useUpdateDeliveryDriver();

  // Filter active delivery orders (Ready or Delivered but recently?)
  // For tracking, we care about 'ready' (assigned) + 'out_for_delivery'.
  const activeOrders = orders.filter(o =>
    (o.status === 'ready' || o.status === 'out_for_delivery') &&
    o.order_type === 'delivery'
  );

  // Calculate real status based on Orders, not just Driver Status field
  const deliveringDriverIds = new Set(
    orders
      .filter(o => o.status === 'out_for_delivery' && (o as any).driver_id)
      .map(o => (o as any).driver_id)
  );

  const availableDrivers = drivers?.filter(d =>
    d.status === 'disponivel' &&
    d.active &&
    !deliveringDriverIds.has(d.id)
  ) || [];

  const activeDeliveriesCount = orders.filter(o => o.status === 'out_for_delivery').length;

  const handleCreateDriver = async (data: any) => {
    await createDriver.mutateAsync(data);
    setDriverDialogOpen(false);
    setEditingDriver(null);
  };

  const handleUpdateDriver = async (data: any) => {
    if (editingDriver) {
      await updateDriver.mutateAsync({ id: editingDriver.id, ...data });
      setDriverDialogOpen(false);
      setEditingDriver(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      disponivel: { variant: 'default' as const, text: 'Disponível' },
      em_entrega: { variant: 'secondary' as const, text: 'Em Entrega' },
      offline: { variant: 'outline' as const, text: 'Offline' },
    };
    return variants[status as keyof typeof variants] || variants.offline;
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Gestão de Entregas</h1>
        <p className="text-muted-foreground">Roteirização e rastreamento</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entregadores</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{drivers?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disponíveis</CardTitle>
            <Truck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{availableDrivers.length}</div>
            <p className="text-xs text-muted-foreground">Prontos para entregar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Entrega</CardTitle>
            <MapPin className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeDeliveriesCount}</div>
            <p className="text-xs text-muted-foreground">Entregas ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avaliação Média</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {drivers && drivers.length > 0
                ? (drivers.reduce((sum, d) => sum + d.rating, 0) / drivers.length).toFixed(1)
                : '0.0'
              }
            </div>
            <p className="text-xs text-muted-foreground">De 5.0 estrelas</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="active">Entregas Ativas</TabsTrigger>
            <TabsTrigger value="routes">Rotas</TabsTrigger>
            <TabsTrigger value="drivers">Entregadores</TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-1">
              <FileBarChart className="h-4 w-4" />
              Relatórios
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const url = `${window.location.origin}/driver/dashboard`;
                navigator.clipboard.writeText(url);
                toast.success('Link copiado!', { description: url });
              }}
            >
              <Link className="h-4 w-4 mr-2" />
              App Entregador
              <Copy className="h-3 w-3 ml-2 opacity-50" />
            </Button>
            <Button onClick={() => setDriverDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Entregador
            </Button>
          </div>
        </div>

        <TabsContent value="drivers" className="space-y-4">
          {drivers && drivers.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {drivers.map((driver) => {
                const statusBadge = getStatusBadge(driver.status);
                return (
                  <Card key={driver.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{driver.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{driver.phone}</span>
                          </div>
                        </div>
                        <Badge variant={statusBadge.variant}>{statusBadge.text}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {driver.vehicle_type && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Veículo:</span>
                          <span className="capitalize">{driver.vehicle_type}</span>
                        </div>
                      )}

                      {driver.vehicle_plate && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Placa:</span>
                          <span className="font-mono">{driver.vehicle_plate}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Entregas realizadas:</span>
                        <span className="font-semibold">{driver.total_deliveries}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Avaliação:</span>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                          <span className="font-semibold">{driver.rating.toFixed(1)}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        <Button
                          className="w-full"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingDriver(driver);
                            setDriverDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <User className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum entregador cadastrado</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Comece cadastrando entregadores para gerenciar as entregas
                </p>
                <Button onClick={() => setDriverDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Primeiro Entregador
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="active" className="h-[600px]">
          <Card className="h-full">
            <CardContent className="p-0 h-full">
              <TrackingMap
                orders={activeOrders}
                drivers={drivers || []}
                areas={areas || []}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routes">
          <RoutePlanner />
        </TabsContent>

        <TabsContent value="reports">
          <DeliveryReportsTab />
        </TabsContent>
      </Tabs>

      {/* Diálogo de Entregador */}
      <Dialog open={driverDialogOpen} onOpenChange={setDriverDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingDriver ? 'Editar Entregador' : 'Novo Entregador'}</DialogTitle>
          </DialogHeader>
          <DriverForm
            driver={editingDriver}
            onSubmit={editingDriver ? handleUpdateDriver : handleCreateDriver}
            onCancel={() => {
              setDriverDialogOpen(false);
              setEditingDriver(null);
            }}
            isSubmitting={createDriver.isPending || updateDriver.isPending}
          />
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
