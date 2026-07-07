import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, PackageIcon, Truck, Route as RouteIcon, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import {
  useCriarRota,
  useDespacharFranqueado,
  useReatribuirMotoristaRota,
  type RotaDoDia,
} from '@/hooks/useRotaDoDia';

// Sentinela pro item "+ Criar nova rota" — mesmo padrão usado no diálogo de
// Pedido Manual (AdicionarPedidoManualDialog.tsx), que já funciona bem.
const NOVA_ROTA_VALUE = '__nova_rota__';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  franchiseeOrderId: string;
  franchiseeName: string;
  rotas: RotaDoDia[];
}

export function DespacharCargaDialog({ open, onOpenChange, franchiseeOrderId, franchiseeName, rotas }: Props) {
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [novaRotaNome, setNovaRotaNome]       = useState('');
  const [driverId, setDriverId]               = useState<string>('__sem_motorista__');

  const criarRota = useCriarRota();
  const despachar = useDespacharFranqueado();
  const reatribuirMotorista = useReatribuirMotoristaRota();

  const { data: drivers = [], isLoading: loadingDrivers } = useQuery({
    queryKey: ['fleet-drivers-for-despacho'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fleet_drivers')
        .select('id, name, phone')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return (data ?? []) as { id: string; name: string; phone: string | null }[];
    },
    enabled: open,
  });

  // Ao abrir: pré-seleciona a rota mais recente em andamento, se houver, ou
  // cai em "+ Criar nova rota" quando não há nenhuma rota hoje ainda.
  useEffect(() => {
    if (!open) return;
    const emProgresso = rotas.find(r => r.status === 'em_progresso');
    setSelectedRouteId(emProgresso?.routeId ?? rotas[0]?.routeId ?? NOVA_ROTA_VALUE);
    setNovaRotaNome('');
  }, [open, rotas]);

  // Motorista já atribuído à rota selecionada — mesmo comportamento do
  // Pedido Manual: trocar aqui reatribui o motorista pra rota inteira.
  useEffect(() => {
    if (!open || selectedRouteId === NOVA_ROTA_VALUE) return;
    const rotaAtual = rotas.find(r => r.routeId === selectedRouteId);
    setDriverId(rotaAtual?.driver?.id ?? '__sem_motorista__');
  }, [open, selectedRouteId, rotas]);

  const handleClose = () => {
    setSelectedRouteId('');
    setNovaRotaNome('');
    setDriverId('__sem_motorista__');
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    const motoristaEscolhidoId = driverId === '__sem_motorista__' ? null : driverId;
    let targetRouteId = selectedRouteId;

    try {
      if (selectedRouteId === NOVA_ROTA_VALUE) {
        const novaRota = await criarRota.mutateAsync({
          name: novaRotaNome.trim() || `Entrega Franquia: ${franchiseeName}`,
          driver_id: motoristaEscolhidoId,
          order_ids: [],
          franchisee_order_ids: [],
        });
        targetRouteId = novaRota.id;
      } else {
        const rotaAtual = rotas.find(r => r.routeId === selectedRouteId);
        const motoristaAtualId = rotaAtual?.driver?.id ?? null;
        if (motoristaEscolhidoId !== motoristaAtualId) {
          await reatribuirMotorista.mutateAsync({ routeId: selectedRouteId, driverId: motoristaEscolhidoId });
        }
      }
    } catch {
      return; // erro já notificado pelo hook correspondente
    }

    despachar.mutate(
      { franchiseeOrderId, routeId: targetRouteId },
      { onSuccess: handleClose },
    );
  };

  const isPending = criarRota.isPending || despachar.isPending || reatribuirMotorista.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageIcon className="h-5 w-5 text-purple-600" />
            Despachar Carga
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Franqueado</p>
            <p className="font-semibold text-sm">{franchiseeName}</p>
          </div>

          {/* Rota — escolhe uma rota já existente do dia (de qualquer
              motorista) pra agrupar este despacho junto com os demais, em vez
              de criar sempre uma rota nova e separada. */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <RouteIcon className="h-3.5 w-3.5 text-purple-600" />
              Rota
            </Label>
            <Select value={selectedRouteId} onValueChange={setSelectedRouteId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a rota..." />
              </SelectTrigger>
              <SelectContent>
                {rotas.map(r => (
                  <SelectItem key={r.routeId} value={r.routeId}>
                    {r.routeName}{r.driver?.name ? ` · ${r.driver.name}` : ''}
                  </SelectItem>
                ))}
                <SelectItem value={NOVA_ROTA_VALUE}>
                  <span className="flex items-center gap-1.5 text-purple-700 font-medium">
                    <Plus className="h-3.5 w-3.5" /> Criar nova rota
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {selectedRouteId === NOVA_ROTA_VALUE && (
              <Input
                value={novaRotaNome}
                onChange={e => setNovaRotaNome(e.target.value)}
                placeholder={`Ex: Entrega Franquia: ${franchiseeName}`}
              />
            )}
          </div>

          {/* Motorista da rota selecionada — trocar aqui reatribui a rota
              inteira (mesma regra do Pedido Manual). Numa rota nova, define
              quem assume ela. */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-purple-600" />
              Motorista
            </Label>
            {loadingDrivers ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
              </div>
            ) : (
              <Select value={driverId} onValueChange={setDriverId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motorista..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__sem_motorista__">— Sem motorista —</SelectItem>
                  {drivers.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}{d.phone ? ` · ${d.phone}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedRouteId || isPending}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Despachar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
