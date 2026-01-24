import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Package, TrendingUp, AlertTriangle, ClipboardList, Edit, ArrowUpDown } from 'lucide-react';
import { useInventoryItems, useCreateInventoryItem, useUpdateInventoryItem } from '@/hooks/useInventoryItems';
import { useInventoryMovements } from '@/hooks/useInventoryMovements';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InventoryItemForm } from '@/components/admin/inventory/InventoryItemForm';
import { MovementDialog } from '@/components/admin/inventory/MovementDialog';

export default function InventoryPage() {
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const { data: items, isLoading } = useInventoryItems();
  const { data: movements } = useInventoryMovements();
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();

  const lowStockItems = items?.filter(item => item.current_stock <= item.min_stock) || [];
  const totalValue = items?.reduce((sum, item) => sum + (item.current_stock * item.unit_cost), 0) || 0;

  const handleCreateItem = async (data: any) => {
    await createItem.mutateAsync(data);
    setItemDialogOpen(false);
    setEditingItem(null);
  };

  const handleUpdateItem = async (data: any) => {
    if (editingItem) {
      await updateItem.mutateAsync({ id: editingItem.id, ...data });
      setItemDialogOpen(false);
      setEditingItem(null);
    }
  };

  const handleOpenMovement = (item: any) => {
    setSelectedItem(item);
    setMovementDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Controle de Estoque</h1>
        <p className="text-muted-foreground">Gestão de insumos e movimentações</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor em Estoque</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalValue.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground">Estoque baixo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Movimentações</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{movements?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="items" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="items">Itens</TabsTrigger>
            <TabsTrigger value="movements">Movimentações</TabsTrigger>
            <TabsTrigger value="alerts">Alertas</TabsTrigger>
          </TabsList>
          <Button onClick={() => setItemDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Item
          </Button>
        </div>

        <TabsContent value="items" className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : items && items.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <Card key={item.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={item.active ? 'default' : 'secondary'}>
                          {item.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingItem(item);
                            setItemDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Estoque Atual:</span>
                        <span className={`font-semibold ${item.current_stock <= item.min_stock ? 'text-destructive' : ''}`}>
                          {item.current_stock} {item.unit}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Estoque Mínimo:</span>
                        <span className="font-medium">{item.min_stock} {item.unit}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Custo Unitário:</span>
                        <span className="font-medium">R$ {item.unit_cost.toFixed(2)}</span>
                      </div>
                      {item.supplier && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Fornecedor:</span>
                          <span className="text-sm">{item.supplier}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      className="w-full"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenMovement(item)}
                    >
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                      Movimentar Estoque
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum item cadastrado</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Comece adicionando itens ao estoque
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Primeiro Item
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          {movements && movements.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Últimas Movimentações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {movements.slice(0, 20).map((movement) => (
                    <div key={movement.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                      <div className="flex-1">
                        <p className="font-medium">{movement.item?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {movement.reason || movement.movement_type}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={
                          movement.movement_type === 'entrada' ? 'default' :
                          movement.movement_type === 'saida' ? 'destructive' :
                          'secondary'
                        }>
                          {movement.movement_type}
                        </Badge>
                        <span className={`font-semibold ${movement.movement_type === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                          {movement.movement_type === 'entrada' ? '+' : '-'}{movement.quantity} {movement.item?.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma movimentação</h3>
                <p className="text-sm text-muted-foreground">
                  As movimentações de estoque aparecerão aqui
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {lowStockItems.length > 0 ? (
            <div className="space-y-4">
              {lowStockItems.map((item) => (
                <Card key={item.id} className="border-destructive">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Estoque abaixo do mínimo recomendado
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Estoque Atual</p>
                        <p className="text-xl font-bold text-destructive">
                          {item.current_stock} {item.unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Estoque Mínimo</p>
                        <p className="text-xl font-bold">
                          {item.min_stock} {item.unit}
                        </p>
                      </div>
                    </div>
                    {item.supplier && (
                      <p className="text-sm text-muted-foreground mt-4">
                        Fornecedor: <span className="font-medium">{item.supplier}</span>
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertTriangle className="h-12 w-12 text-green-600 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Tudo em ordem!</h3>
                <p className="text-sm text-muted-foreground">
                  Nenhum item com estoque baixo
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Diálogos */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Item' : 'Novo Item de Estoque'}</DialogTitle>
          </DialogHeader>
          <InventoryItemForm
            item={editingItem}
            onSubmit={editingItem ? handleUpdateItem : handleCreateItem}
            onCancel={() => {
              setItemDialogOpen(false);
              setEditingItem(null);
            }}
            isSubmitting={createItem.isPending || updateItem.isPending}
          />
        </DialogContent>
      </Dialog>

      {selectedItem && (
        <MovementDialog
          open={movementDialogOpen}
          onOpenChange={setMovementDialogOpen}
          item={selectedItem}
        />
      )}
    </AdminLayout>
  );
}
