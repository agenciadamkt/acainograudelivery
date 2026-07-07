import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Plus, Play, CheckSquare, Clock, User, Package,
  MapPin, CheckCircle2, Loader2, PackagePlus, Trash2, ListChecks, AlertTriangle, Check,
} from 'lucide-react';
import { AdicionarPedidoManualDialog } from './AdicionarPedidoManualDialog';
import { ExcluirRotasDialog } from './ExcluirRotasDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  RotaDoDia,
  RotaOrdem,
  useIniciarRota,
  useConcluirRota,
  useRegistrarEntrega,
  useSalvarObservacao,
  useCriarRota,
  useRemoverPedidoDaRota,
} from '@/hooks/useRotaDoDia';
import { RotaOrderCard } from './RotaOrderCard';
import { useEventosDaRota, useResolverEvento } from '@/hooks/frota/useRouteEvents';

interface RotaDoDiaPanelProps {
  rotas: RotaDoDia[];
  selectedRouteId: string | null;
  onSelectRoute: (id: string) => void;
  onCriarRota: () => void;
}

const EVENTO_TIPO_LABEL: Record<string, string> = {
  cliente_ausente: 'Cliente ausente',
  endereco_incorreto: 'Endereço incorreto',
  veiculo_problema: 'Veículo com problema',
  pedido_recusado: 'Pedido recusado',
  observacao: 'Observação',
  atraso: 'Atraso',
  outro: 'Outro',
};

const STATUS_ROTA: Record<string, { label: string; color: string }> = {
  pendente:     { label: 'Pendente',   color: 'bg-yellow-500/10 text-yellow-600 border-yellow-200' },
  em_progresso: { label: 'Em Rota',   color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  concluida:    { label: 'Concluída', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
  cancelada:    { label: 'Cancelada', color: 'bg-gray-500/10 text-gray-500 border-gray-200' },
};

export function RotaDoDiaPanel({ rotas, selectedRouteId, onSelectRoute, onCriarRota }: RotaDoDiaPanelProps) {
  const rota = rotas.find(r => r.routeId === selectedRouteId) ?? rotas[0] ?? null;
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [excluirDialogOpen, setExcluirDialogOpen] = useState(false);
  const [manualRouteId, setManualRouteId] = useState<string | null>(null);
  const [editandoOrdem, setEditandoOrdem] = useState<RotaOrdem | null>(null);
  const [removendoOrdem, setRemovendoOrdem] = useState<RotaOrdem | null>(null);

  const iniciar   = useIniciarRota();
  const concluir  = useConcluirRota();
  const entregar  = useRegistrarEntrega();
  const salvarObs = useSalvarObservacao();
  const criarRota = useCriarRota();
  const remover   = useRemoverPedidoDaRota();

  const { data: eventos = [] } = useEventosDaRota(rota?.routeId ?? null);
  const resolverEvento = useResolverEvento();

  const entregues = rota?.orders.filter(o => o.status === 'delivered').length ?? 0;
  const total     = rota?.orders.length ?? 0;
  const pedidosAbaixoMinimo = rota?.orders.filter(o => o.ruleViolations.length > 0).length ?? 0;

  const handleIniciar = () => {
    if (!rota) return;
    iniciar.mutate({
      routeId: rota.routeId,
      orderIds: rota.orders.filter(o => !o.isFranchiseeOrder && !o.isManualOrder).map(o => o.orderId),
      franchiseeOrderIds: rota.orders.filter(o => o.isFranchiseeOrder).map(o => o.orderId),
    });
  };

  const handleConcluir = () => {
    if (!rota) return;
    concluir.mutate(rota.routeId);
  };

  const handleEntrega = (orderId: string, observation: string, isFranchiseeOrder?: boolean, isManualOrder?: boolean) => {
    entregar.mutate({ orderId, observation: observation || undefined, isFranchiseeOrder, isManualOrder });
  };

  const handleObs = (orderId: string, obs: string) => {
    salvarObs.mutate({ orderId, observation: obs });
  };

  const handleEditar = (ordem: RotaOrdem) => {
    setEditandoOrdem(ordem);
  };

  const handleConfirmarRemocao = () => {
    if (!rota || !removendoOrdem) return;
    remover.mutate(
      {
        routeId: rota.routeId,
        orderId: removendoOrdem.orderId,
        isFranchiseeOrder: removendoOrdem.isFranchiseeOrder,
        isManualOrder: removendoOrdem.isManualOrder,
      },
      { onSuccess: () => setRemovendoOrdem(null) },
    );
  };

  const handleAbrirPedidoManual = async () => {
    if (rota) {
      setManualRouteId(rota.routeId);
      setManualDialogOpen(true);
      return;
    }
    // Sem rota no dia: cria uma rota vazia para receber o pedido manual
    try {
      const novaRota = await criarRota.mutateAsync({
        name: `Rota Manual - ${format(new Date(), 'dd/MM/yyyy')}`,
        driver_id: null,
        order_ids: [],
      });
      setManualRouteId(novaRota.id);
      setManualDialogOpen(true);
    } catch {
      // erro já notificado pelo hook useCriarRota
    }
  };

  return (
    <div className="flex flex-col h-full border rounded-xl bg-card overflow-hidden">
      {/* ── Seletor de rota ── */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center gap-2">
          <Select
            value={rota?.routeId ?? ''}
            onValueChange={onSelectRoute}
            disabled={rotas.length === 0}
          >
            <SelectTrigger className="flex-1 h-9 text-sm">
              <SelectValue placeholder="Selecione uma rota..." />
            </SelectTrigger>
            <SelectContent>
              {rotas.map(r => (
                <SelectItem key={r.routeId} value={r.routeId}>
                  {r.routeName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {rotas.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setExcluirDialogOpen(true)}
              className="h-9 shrink-0 gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
              title="Excluir rota(s)"
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          )}
        </div>

        {/* Duas formas de colocar pedidos numa rota — cada botão diz o que faz,
            pra ninguém ficar em dúvida entre "criar rota" e "pedido manual". */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCriarRota}
            className="flex flex-col items-start gap-0.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors px-3 py-2 text-left"
          >
            <span className="flex items-center gap-1.5 text-sm font-semibold text-blue-700">
              <ListChecks className="h-4 w-4 shrink-0" /> Selecionar Pedidos
            </span>
            <span className="text-[11px] text-blue-600/80 leading-tight">
              Pedidos prontos e de franquia já no sistema
            </span>
          </button>

          <button
            type="button"
            onClick={handleAbrirPedidoManual}
            disabled={criarRota.isPending}
            className="flex flex-col items-start gap-0.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 transition-colors px-3 py-2 text-left disabled:opacity-60"
          >
            <span className="flex items-center gap-1.5 text-sm font-semibold text-purple-700">
              {criarRota.isPending ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <PackagePlus className="h-4 w-4 shrink-0" />
              )}
              Pedido Manual
            </span>
            <span className="text-[11px] text-purple-600/80 leading-tight">
              {rota ? 'Adicionar entrega digitada à rota atual' : 'Criar rota e adicionar entrega digitada'}
            </span>
          </button>
        </div>

        {/* Resumo da rota */}
        {rota && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate font-medium">{rota.driver?.name ?? 'Sem motorista'}</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
              <Package className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium">{entregues}/{total} entregues</span>
            </div>
            {rota.startedAt && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                <Play className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-xs">Saiu: {format(new Date(rota.startedAt), 'HH:mm', { locale: ptBR })}</span>
              </div>
            )}
            {rota.estimatedDuration && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-xs">Est. {rota.estimatedDuration} min</span>
              </div>
            )}
          </div>
        )}

        {/* Alerta: pelo menos um pedido desta rota está abaixo do valor
            mínimo configurado (Configurações → Valor Mínimo do Pedido). */}
        {rota && pedidosAbaixoMinimo > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            ⚠ {pedidosAbaixoMinimo} pedido{pedidosAbaixoMinimo > 1 ? 's' : ''} abaixo do valor mínimo
          </div>
        )}

        {/* Eventos registrados pelo motorista nesta rota (ocorrências,
            observações etc.) — só leitura + marcar como resolvido, sem aba
            nova. Não some quando resolvido: fica visível, só some o destaque. */}
        {rota && eventos.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Eventos da rota ({eventos.filter(e => !e.resolvedAt).length} aberto{eventos.filter(e => !e.resolvedAt).length === 1 ? '' : 's'})
            </p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {eventos.map(evento => (
                <div
                  key={evento.id}
                  className={`flex items-center justify-between gap-2 p-2 rounded-lg text-xs ${
                    evento.resolvedAt ? 'bg-muted/30 text-muted-foreground' :
                    evento.severity === 'critical' ? 'bg-red-50 border border-red-200' :
                    evento.severity === 'warning' ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-200'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{EVENTO_TIPO_LABEL[evento.tipo] ?? evento.tipo}</p>
                    {evento.observacao && <p className="text-[11px] text-muted-foreground truncate">{evento.observacao}</p>}
                  </div>
                  {!evento.resolvedAt && (
                    <Button
                      size="sm" variant="ghost" className="h-6 px-2 text-[11px] shrink-0 gap-1"
                      onClick={() => resolverEvento.mutate(evento.id)}
                      disabled={resolverEvento.isPending}
                    >
                      <Check className="h-3 w-3" /> Resolver
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Lista de pedidos ── */}
      {!rota ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <MapPin className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhuma rota criada hoje.</p>
          <Button variant="outline" size="sm" onClick={onCriarRota}>
            <Plus className="h-4 w-4 mr-1" /> Criar primeira rota
          </Button>
        </div>
      ) : (
        <ScrollArea className="flex-1 p-3">
          <div className="space-y-3">
            {rota.orders.map(ordem => (
              <RotaOrderCard
                key={ordem.orderId}
                ordem={ordem}
                onRegistrarEntrega={handleEntrega}
                onSalvarObservacao={handleObs}
                onRemover={setRemovendoOrdem}
                onEditar={handleEditar}
                isLoading={entregar.isPending || salvarObs.isPending}
              />
            ))}
            {rota.orders.length === 0 && (
              <p className="text-sm text-center text-muted-foreground py-6">
                Nenhum pedido nesta rota.
              </p>
            )}
          </div>
        </ScrollArea>
      )}

      {manualRouteId && (
        <AdicionarPedidoManualDialog
          routeId={manualRouteId}
          open={manualDialogOpen}
          onOpenChange={setManualDialogOpen}
          rotas={rotas}
        />
      )}

      {rota && editandoOrdem && (
        <AdicionarPedidoManualDialog
          routeId={rota.routeId}
          open={!!editandoOrdem}
          onOpenChange={(v) => { if (!v) setEditandoOrdem(null); }}
          rotas={rotas}
          editingOrder={{
            id: editandoOrdem.orderId,
            franchiseeName: editandoOrdem.customer.name,
            orderNumber: editandoOrdem.orderNumber,
            orderDate: editandoOrdem.createdAt,
            totalAmount: editandoOrdem.totalAmount,
            notes: editandoOrdem.customerNotes,
            addressStreet: editandoOrdem.address?.street ?? null,
            addressNumber: editandoOrdem.address?.number ?? null,
            addressNeighborhood: editandoOrdem.address?.neighborhood ?? null,
            addressCity: editandoOrdem.address?.city ?? null,
            addressLatitude: editandoOrdem.address?.latitude ?? null,
            addressLongitude: editandoOrdem.address?.longitude ?? null,
          }}
        />
      )}

      <ExcluirRotasDialog
        rotas={rotas}
        open={excluirDialogOpen}
        onOpenChange={setExcluirDialogOpen}
      />

      {/* Confirmação de remoção de uma única entrega da rota */}
      <Dialog open={!!removendoOrdem} onOpenChange={(v) => { if (!v) setRemovendoOrdem(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Remover entrega da rota
            </DialogTitle>
          </DialogHeader>
          {removendoOrdem && (
            <p className="text-sm text-muted-foreground">
              Remover <span className="font-medium text-foreground">#{removendoOrdem.orderNumber} — {removendoOrdem.customer.name}</span> desta rota?
              {removendoOrdem.isManualOrder
                ? ' Este pedido manual será excluído, pois só existe no contexto desta rota.'
                : ' O pedido continuará existindo e poderá ser colocado em outra rota.'}
            </p>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRemovendoOrdem(null)} disabled={remover.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarRemocao} disabled={remover.isPending} variant="destructive">
              {remover.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {rota && (
        <div className="p-4 border-t space-y-2">
          {rota.status === 'pendente' && (
            <Button
              onClick={handleIniciar}
              disabled={iniciar.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {iniciar.isPending
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : <Play className="h-4 w-4 mr-2" />}
              Iniciar Rota
            </Button>
          )}
          {rota.status === 'em_progresso' && entregues === total && total > 0 && (
            <Button
              onClick={handleConcluir}
              disabled={concluir.isPending}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {concluir.isPending
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : <CheckSquare className="h-4 w-4 mr-2" />}
              Concluir Rota
            </Button>
          )}
          {rota.status === 'concluida' && (
            <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm font-medium py-1">
              <CheckCircle2 className="h-4 w-4" />
              Rota concluída
              {rota.completedAt && (
                <span className="text-muted-foreground font-normal">
                  às {format(new Date(rota.completedAt), 'HH:mm', { locale: ptBR })}
                </span>
              )}
            </div>
          )}
          <Badge
            variant="outline"
            className={`w-full justify-center text-xs py-1 ${STATUS_ROTA[rota.status]?.color}`}
          >
            {STATUS_ROTA[rota.status]?.label} · {entregues}/{total} pedidos
          </Badge>
        </div>
      )}
    </div>
  );
}
