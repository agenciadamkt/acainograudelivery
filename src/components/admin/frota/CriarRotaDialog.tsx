import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ChevronRight, ChevronLeft, User, Package, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { usePedidosProntos, useCriarRota } from '@/hooks/useRotaDoDia';
import { formatBRL } from '@/lib/utils';

interface CriarRotaDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  ready: 'Pronto',
  shipping: 'Em envio',
};

export function CriarRotaDialog({ open, onOpenChange }: CriarRotaDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [driverId, setDriverId]   = useState('');
  const [routeName, setRouteName] = useState(`Rota ${format(new Date(), "dd/MM HH:mm", { locale: ptBR })}`);
  const [estimativa, setEstimativa] = useState('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [selectedFranchiseeIds, setSelectedFranchiseeIds] = useState<string[]>([]);

  // Motoristas cadastrados em /admin/frota (fleet_drivers)
  const { data: drivers = [], isLoading: loadingDrivers } = useQuery({
    queryKey: ['fleet-drivers-rota'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fleet_drivers')
        .select('id, name, phone, active')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return (data ?? []) as { id: string; name: string; phone: string | null; active: boolean }[];
    },
    enabled: open,
  });

  // Pedidos de clientes prontos para entrega
  const { data: clientOrders = [], isLoading: loadingClient } = usePedidosProntos();

  // Pedidos de franquia prontos para despacho (pending ou approved)
  const { data: franchiseeOrders = [], isLoading: loadingFranchisee } = useQuery({
    queryKey: ['franchisee-orders-para-rota'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('franchisee_orders' as any)
        .select(`
          id, total_amount, notes, status, created_at,
          profiles!franchisee_orders_franchisee_user_id_fkey(full_name)
        `)
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: true }) as any);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: open,
  });

  const criarRota = useCriarRota();

  const totalSelecionados = selectedCustomerIds.length + selectedFranchiseeIds.length;

  const reset = () => {
    setStep(1);
    setDriverId('');
    setRouteName(`Rota ${format(new Date(), "dd/MM HH:mm", { locale: ptBR })}`);
    setEstimativa('');
    setSelectedCustomerIds([]);
    setSelectedFranchiseeIds([]);
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const toggleCustomer = (id: string) =>
    setSelectedCustomerIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const toggleFranchisee = (id: string) =>
    setSelectedFranchiseeIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handleSubmit = () => {
    if (totalSelecionados === 0) return;
    criarRota.mutate(
      {
        name: routeName,
        driver_id: driverId || null,
        order_ids: selectedCustomerIds,
        franchisee_order_ids: selectedFranchiseeIds,
        estimated_duration: estimativa ? Number(estimativa) : null,
      },
      { onSuccess: handleClose },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 1 ? <User className="h-5 w-5" /> : <Package className="h-5 w-5" />}
            {step === 1 ? 'Nova Rota — Motorista' : 'Nova Rota — Pedidos'}
            <Badge variant="outline" className="ml-auto text-xs">Passo {step}/2</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* ── Passo 1 ── */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Motorista <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              {loadingDrivers ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                </div>
              ) : drivers.length === 0 ? (
                <div className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/40 flex items-center gap-2">
                  <Truck className="h-4 w-4 shrink-0" />
                  Nenhum motorista ativo cadastrado. A rota será criada sem motorista.
                </div>
              ) : (
                <Select value={driverId || 'none'} onValueChange={v => setDriverId(v === 'none' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o motorista (opcional)..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Sem motorista —</SelectItem>
                    {drivers.map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        <div className="flex items-center gap-2">
                          <span>{d.name}</span>
                          {d.phone && (
                            <span className="text-muted-foreground text-xs">· {d.phone}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Nome da Rota</Label>
              <Input
                value={routeName}
                onChange={e => setRouteName(e.target.value)}
                placeholder="Ex: Rota da Tarde"
              />
              {/* Atalhos pra nomear por turno — útil quando o mesmo motorista
                  sai duas vezes no dia (manhã/tarde) e o admin precisa
                  diferenciar as rotas pra adicionar pedidos manuais na certa. */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setRouteName('Rota da Manhã')}
                >
                  Manhã
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setRouteName('Rota da Tarde')}
                >
                  Tarde
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Estimativa de Duração (minutos, opcional)</Label>
              <Input
                type="number"
                min="1"
                value={estimativa}
                onChange={e => setEstimativa(e.target.value)}
                placeholder="Ex: 60"
              />
            </div>
          </div>
        )}

        {/* ── Passo 2 ── */}
        {step === 2 && (
          <div className="space-y-3 py-2">
            <Tabs defaultValue="franquia">
              <TabsList className="w-full">
                <TabsTrigger value="franquia" className="flex-1">
                  Pedidos Franquia
                  {selectedFranchiseeIds.length > 0 && (
                    <Badge className="ml-1 h-4 px-1 text-[10px]">{selectedFranchiseeIds.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="clientes" className="flex-1">
                  Delivery Clientes
                  {selectedCustomerIds.length > 0 && (
                    <Badge className="ml-1 h-4 px-1 text-[10px]">{selectedCustomerIds.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Pedidos de Franquia */}
              <TabsContent value="franquia" className="mt-3">
                {loadingFranchisee ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : franchiseeOrders.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Nenhum pedido de franquia com status <strong>Pendente</strong> ou <strong>Aprovado</strong>.
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                    {franchiseeOrders.map((p: any) => {
                      const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
                      const checked = selectedFranchiseeIds.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors select-none ${
                            checked ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
                          }`}
                        >
                          <Checkbox checked={checked} onCheckedChange={() => toggleFranchisee(p.id)} className="mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{profile?.full_name ?? 'Franqueado'}</span>
                              <Badge variant="outline" className="text-[10px] shrink-0">
                                {STATUS_LABEL[p.status] ?? p.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {format(new Date(p.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                              {' · '}{formatBRL(p.total_amount)}
                            </div>
                            {p.notes && (
                              <div className="text-xs text-yellow-700 mt-0.5 truncate">⚠️ {p.notes}</div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Pedidos de Clientes */}
              <TabsContent value="clientes" className="mt-3">
                {loadingClient ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : clientOrders.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground space-y-1">
                    <p>Nenhum pedido de delivery com status <strong>Pronto</strong>.</p>
                    <p className="text-xs">Avance os pedidos para <strong>Pronto</strong> na tela de Pedidos antes de criar a rota.</p>
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                    {(clientOrders as any[]).map((p: any) => {
                      const cust = Array.isArray(p.customer) ? p.customer[0] : p.customer;
                      const addr = Array.isArray(p.delivery_address) ? p.delivery_address[0] : p.delivery_address;
                      const checked = selectedCustomerIds.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors select-none ${
                            checked ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
                          }`}
                        >
                          <Checkbox checked={checked} onCheckedChange={() => toggleCustomer(p.id)} className="mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">#{p.order_number}</span>
                              <span className="text-sm text-muted-foreground truncate">{cust?.name}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {addr?.neighborhood ? `${addr.neighborhood} · ` : ''}{formatBRL(p.total_amount)}
                            </div>
                            {p.customer_notes && (
                              <div className="text-xs text-yellow-700 mt-0.5 truncate">⚠️ {p.customer_notes}</div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {totalSelecionados > 0 && (
              <div className="text-xs text-muted-foreground text-center pt-1">
                {totalSelecionados} pedido(s) selecionado(s)
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 2 && (
            <Button variant="outline" onClick={() => setStep(1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          )}
          {step === 1 && (
            <Button onClick={() => setStep(2)} disabled={!routeName}>
              Próximo <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {step === 2 && (
            <Button
              onClick={handleSubmit}
              disabled={totalSelecionados === 0 || criarRota.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {criarRota.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Criar Rota ({totalSelecionados})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
