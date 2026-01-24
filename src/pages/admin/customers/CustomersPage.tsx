import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Tag, Ticket, TrendingUp, Plus, Search, DollarSign, UserPlus, ShoppingBag } from 'lucide-react';
import { useCustomerSegments } from '@/hooks/useCustomerSegments';
import { useCustomers, Customer } from '@/hooks/useCustomers';
import { useCoupons, useCreateCoupon, useUpdateCoupon } from '@/hooks/useCoupons';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CouponForm } from '@/components/admin/crm/CouponForm';
import { CustomerDetailsDialog } from '@/components/admin/crm/CustomerDetailsDialog';
import { format, isPast, isFuture, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

export default function CustomersPage() {
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // State para detalhes do cliente
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: segments } = useCustomerSegments();
  const { data: coupons } = useCoupons();
  const { data: customersList } = useCustomers();
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();

  const handleCreateCoupon = async (data: any) => {
    await createCoupon.mutateAsync(data);
    setCouponDialogOpen(false);
    setEditingCoupon(null);
  };

  const handleUpdateCoupon = async (data: any) => {
    if (editingCoupon) {
      await updateCoupon.mutateAsync({ id: editingCoupon.id, ...data });
      setCouponDialogOpen(false);
      setEditingCoupon(null);
    }
  };

  const handlesCustomerClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailsOpen(true);
  };

  const getCouponStatus = (coupon: any) => {
    const now = new Date();
    const validFrom = new Date(coupon.valid_from);
    const validUntil = new Date(coupon.valid_until);

    if (!coupon.active) return { text: 'Inativo', variant: 'secondary' as const };
    if (isPast(validUntil)) return { text: 'Expirado', variant: 'destructive' as const };
    if (isFuture(validFrom)) return { text: 'Agendado', variant: 'outline' as const };
    return { text: 'Ativo', variant: 'default' as const };
  };

  const getCustomerSegment = (customer: Customer) => {
    const totalSpent = customer.total_spent || 0;
    const ordersCount = customer.orders_count || 0;
    const daysSinceLastOrder = customer.last_order_date
      ? Math.floor((new Date().getTime() - new Date(customer.last_order_date).getTime()) / (1000 * 3600 * 24))
      : 999;
    const daysSinceCreation = Math.floor((new Date().getTime() - new Date(customer.created_at).getTime()) / (1000 * 3600 * 24));

    if (daysSinceLastOrder > 60) return { label: 'Inativo', color: 'secondary' };
    if (ordersCount > 10 || totalSpent > 500) return { label: 'VIP', color: 'default', className: 'bg-yellow-500 hover:bg-yellow-600' };
    if (daysSinceCreation < 30 && ordersCount <= 1) return { label: 'Novo', color: 'outline', className: 'text-blue-500 border-blue-500' };
    return { label: 'Recorrente', color: 'secondary', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' };
  };

  const filteredCoupons = coupons?.filter(coupon =>
    coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coupon.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCustomers = customersList?.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );

  // Analytics Calculations
  const totalRevenue = customersList?.reduce((acc, c) => acc + c.total_spent, 0) || 0;
  const totalOrders = customersList?.reduce((acc, c) => acc + c.orders_count, 0) || 0;
  const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const newCustomers30Days = customersList?.filter(c =>
    new Date(c.created_at) > subDays(new Date(), 30)
  ).length || 0;

  const topCustomers = customersList
    ?.sort((a, b) => b.total_spent - a.total_spent)
    .slice(0, 5)
    .map(c => ({
      name: c.name?.split(' ')[0] || 'Cliente',
      total: c.total_spent
    }));

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">CRM Clientes</h1>
        <p className="text-muted-foreground">Gestão de relacionamento com clientes</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Segmentos</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{segments?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Segmentos ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cupons</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coupons?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Cupons cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cupons Ativos</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {coupons?.filter(c => c.active && !isPast(new Date(c.valid_until))).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Disponíveis para uso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customersList?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Clientes cadastrados</p>
          </CardContent>
        </Card>
      </div>


      <Tabs defaultValue="analytics" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="analytics">Análises</TabsTrigger>
            <TabsTrigger value="list">Lista de Clientes</TabsTrigger>
            <TabsTrigger value="segments">Segmentos</TabsTrigger>
            <TabsTrigger value="coupons">Cupons</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list" className="space-y-4">
          {!customersList ? (
            <div className="flex justify-center py-8">Carregando clientes...</div>
          ) : (
            <div className="grid gap-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="rounded-md border">
                    <div className="flex bg-muted/50 p-4 text-sm font-medium text-muted-foreground">
                      <div className="flex-1">Cliente</div>
                      <div className="w-[120px] text-center">Segmento</div>
                      <div className="w-[100px] text-center">Pedidos</div>
                      <div className="w-[150px] text-right">Total Gasto</div>
                      <div className="w-[150px] text-right">Último Pedido</div>
                    </div>
                    {filteredCustomers?.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        Nenhum cliente encontrado.
                      </div>
                    ) : (
                      filteredCustomers?.slice(0, 50).map((customer) => {
                        const segment = getCustomerSegment(customer);
                        return (
                          <div
                            key={customer.id}
                            className="flex items-center border-t p-4 text-sm hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => handlesCustomerClick(customer)}
                          >
                            <div className="flex-1">
                              <div className="font-medium text-primary hover:underline">{customer.name}</div>
                              <div className="text-xs text-muted-foreground">{customer.phone || 'Sem telefone'}</div>
                            </div>
                            <div className="w-[120px] text-center">
                              <Badge variant={segment.color as any} className={segment.className}>
                                {segment.label}
                              </Badge>
                            </div>
                            <div className="w-[100px] text-center">
                              <Badge variant="secondary">{customer.orders_count}</Badge>
                            </div>
                            <div className="w-[150px] text-right font-medium text-green-600">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(customer.total_spent)}
                            </div>
                            <div className="w-[150px] text-right text-muted-foreground">
                              {customer.last_order_date
                                ? format(new Date(customer.last_order_date), 'dd/MM/yy', { locale: ptBR })
                                : '-'}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
              <div className="text-xs text-center text-muted-foreground mt-2">
                Mostrando os 50 clientes mais recentes
              </div>
            </div>
          )}
        </TabsContent>


        <TabsContent value="segments" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {segments?.map((segment) => (
              <Card key={segment.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{segment.name}</CardTitle>
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: segment.color || '#8b5cf6' }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">{segment.description}</p>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline">Ativo</Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          {!segments || segments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Tag className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum segmento encontrado</h3>
                <p className="text-sm text-muted-foreground">
                  Os segmentos padrões foram criados no banco de dados
                </p>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="coupons" className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cupons..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => setCouponDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cupom
            </Button>
          </div>

          {filteredCoupons && filteredCoupons.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredCoupons.map((coupon) => {
                const status = getCouponStatus(coupon);
                return (
                  <Card key={coupon.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-mono">{coupon.code}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">{coupon.description}</p>
                        </div>
                        <Badge variant={status.variant}>{status.text}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Desconto:</span>
                        <span className="font-bold text-lg text-primary">
                          {coupon.discount_type === 'percentage'
                            ? `${coupon.discount_value}%`
                            : `R$ ${Number(coupon.discount_value).toFixed(2)}`
                          }
                        </span>
                      </div>

                      {coupon.min_order_value && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Pedido mínimo:</span>
                          <span>R$ {Number(coupon.min_order_value).toFixed(2)}</span>
                        </div>
                      )}

                      {coupon.usage_limit && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Usos:</span>
                          <span>{coupon.usage_count} / {coupon.usage_limit}</span>
                        </div>
                      )}

                      <div className="pt-2 border-t space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Válido de:</span>
                          <span>{format(new Date(coupon.valid_from), 'dd/MM/yyyy', { locale: ptBR })}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Válido até:</span>
                          <span>{format(new Date(coupon.valid_until), 'dd/MM/yyyy', { locale: ptBR })}</span>
                        </div>
                      </div>

                      <Button
                        className="w-full"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingCoupon(coupon);
                          setCouponDialogOpen(true);
                        }}
                      >
                        Editar Cupom
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm ? 'Nenhum cupom encontrado' : 'Nenhum cupom cadastrado'}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchTerm
                    ? 'Tente buscar por outro termo'
                    : 'Comece criando cupons para oferecer descontos aos clientes'
                  }
                </p>
                {!searchTerm && (
                  <Button onClick={() => setCouponDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Cupom
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(averageTicket)}</div>
                <p className="text-xs text-muted-foreground">Média de gasto por pedido</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Novos (30 dias)</CardTitle>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+{newCustomers30Days}</div>
                <p className="text-xs text-muted-foreground">Clientes cadastrados recentemente</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">LTV Total</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalRevenue)}
                </div>
                <p className="text-xs text-muted-foreground">Faturamento vindo de clientes</p>
              </CardContent>
            </Card>
          </div>

          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Top 5 Clientes Vip</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCustomers}>
                    <XAxis
                      dataKey="name"
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `R$${value}`}
                    />
                    <Tooltip
                      formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                      cursor={{ fill: 'transparent' }}
                    />
                    <Bar
                      dataKey="total"
                      fill="#8b5cf6"
                      radius={[4, 4, 0, 0]}
                      barSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Diálogo de Cupom */}
      <Dialog open={couponDialogOpen} onOpenChange={setCouponDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}</DialogTitle>
          </DialogHeader>
          <CouponForm
            coupon={editingCoupon}
            onSubmit={editingCoupon ? handleUpdateCoupon : handleCreateCoupon}
            onCancel={() => {
              setCouponDialogOpen(false);
              setEditingCoupon(null);
            }}
            isSubmitting={createCoupon.isPending || updateCoupon.isPending}
          />
        </DialogContent>
      </Dialog>

      <CustomerDetailsDialog
        customer={selectedCustomer}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </AdminLayout>
  );
}
