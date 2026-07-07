import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Route, Maximize, Minimize, Volume2, User, AlertTriangle, Clock, WifiOff, Banknote } from 'lucide-react';
import { useRotaDoDia, useOtimizarRota, calcularStatusRota } from '@/hooks/useRotaDoDia';
import { useOcorrenciasAbertasCount } from '@/hooks/frota/useRouteEvents';
import { supabase } from '@/integrations/supabase/client';
import {
  speakDeliveryCompleted,
  getPortugueseVoices,
  getSelectedVoiceURI,
  setSelectedVoiceURI,
} from '@/lib/voiceFeedback';
import RotaDoDiaMap from './RotaDoDiaMap';
import { RotaDoDiaPanel } from './RotaDoDiaPanel';
import { CriarRotaDialog } from './CriarRotaDialog';

// Mesmo limite usado no watchdog de GPS do app do motorista
// (MotoristaDashboard.tsx) — motorista online sem heartbeat há mais que
// isso é considerado "GPS offline" também aqui na visão do admin.
const GPS_STALE_THRESHOLD_MS = 120_000;

export function RotaDoDiaTab() {
  const [selectedDate, setSelectedDate]     = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen]         = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const mapWrapperRef = useRef<HTMLDivElement>(null);

  const { data: rotas = [], isLoading } = useRotaDoDia(selectedDate);
  const otimizar = useOtimizarRota();

  // Visão operacional — 4 indicadores calculados a partir do que já existe
  // (fleet_drivers + rotas do dia + fleet_route_events), sem tabela nova.
  const { data: motoristas = [] } = useQuery({
    queryKey: ['fleet_drivers_status_summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fleet_drivers' as any)
        .select('id, status, last_heartbeat');
      if (error) throw error;
      return (data ?? []) as { id: string; status: string; last_heartbeat: string | null }[];
    },
    refetchInterval: 30_000,
  });
  const { data: ocorrenciasAbertas = 0 } = useOcorrenciasAbertasCount();

  const motoristasEmRota = motoristas.filter(m => m.status === 'em_rota').length;
  const gpsOffline = motoristas.filter(m =>
    m.status !== 'offline' &&
    (!m.last_heartbeat || Date.now() - new Date(m.last_heartbeat).getTime() > GPS_STALE_THRESHOLD_MS),
  ).length;
  const rotasAtrasadas = rotas.filter(r => calcularStatusRota(r)?.status === 'atrasado').length;
  const pedidosAbaixoMinimo = rotas.flatMap(r => r.orders).filter(o => o.ruleViolations.length > 0).length;

  // Aviso falado "Entrega do [cliente] foi concluída" — toca aqui no admin
  // (quem está de olho na aba Rotas), não no app do motorista. Detecta a
  // TRANSIÇÃO de status pra "delivered" (não dispara só por já estar
  // entregue) e nunca repete a mesma entrega — sem isso, toda vez que a tela
  // recarrega ou o React refaz a query, todo pedido já entregue seria
  // anunciado de novo.
  const announcedDeliveriesRef = useRef<Set<string>>(new Set());
  const prevStatusRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const allOrders = rotas.flatMap(r => r.orders);

    for (const ordem of allOrders) {
      const prevStatus = prevStatusRef.current.get(ordem.orderId);
      const isFirstSighting = prevStatus === undefined;
      const justBecameDelivered = ordem.status === 'delivered' && prevStatus !== 'delivered';

      if (justBecameDelivered && !isFirstSighting && !announcedDeliveriesRef.current.has(ordem.orderId)) {
        announcedDeliveriesRef.current.add(ordem.orderId);
        speakDeliveryCompleted(ordem.customer.name);
        toast.success(`✅ Entrega do ${ordem.customer.name} concluída.`);
      }

      // Primeira vez que esse pedido aparece (montagem da tela, troca de
      // data, refetch inicial): só estabelece a linha de base, nunca
      // anuncia — mesmo que já venha "delivered" do banco.
      if (isFirstSighting && ordem.status === 'delivered') {
        announcedDeliveriesRef.current.add(ordem.orderId);
      }

      prevStatusRef.current.set(ordem.orderId, ordem.status);
    }
  }, [rotas]);

  // BOTÃO TEMPORÁRIO DE TESTE — só dispara a fala + toast localmente, não
  // grava nada no banco, não toca em nenhum pedido/rota real. Seguro pra
  // testar com as rotas já lançadas em produção. Remover depois do teste.
  const handleTestarAvisoVoz = () => {
    speakDeliveryCompleted('Açaí no Grau - Dom Severino');
    toast.success('✅ Entrega do Açaí no Grau - Dom Severino concluída.');
  };

  // Seletor de voz (temporário, junto do botão de teste) — algumas vozes do
  // navegador (ex: "Google português do Brasil" no Chrome) soam muito
  // robotizadas; outras instaladas no mesmo dispositivo costumam ser mais
  // naturais. A escolha fica salva (localStorage) e já vale pra próxima
  // entrega anunciada de verdade, não só pro teste.
  const [voiceOptions, setVoiceOptions] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURIState] = useState('');

  useEffect(() => {
    const loadVoices = () => {
      const voices = getPortugueseVoices();
      setVoiceOptions(voices);
      const saved = getSelectedVoiceURI();
      if (saved && voices.some(v => v.voiceURI === saved)) {
        setSelectedVoiceURIState(saved);
      } else if (voices.length > 0 && !selectedVoiceURI) {
        setSelectedVoiceURIState(voices[0].voiceURI);
      }
    };
    loadVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVoiceChange = (voiceURI: string) => {
    setSelectedVoiceURIState(voiceURI);
    setSelectedVoiceURI(voiceURI);
  };

  // Modo "só o mapa" — mesma lógica do admin/kds (Fullscreen API do navegador),
  // aplicada só no container do mapa, pra esconder painel/sidebar sem distração.
  const toggleMapFullscreen = () => {
    if (!document.fullscreenElement) {
      mapWrapperRef.current?.requestFullscreen();
      setIsMapFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsMapFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => setIsMapFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-seleciona a primeira rota
  const effectiveRouteId =
    selectedRouteId && rotas.some(r => r.routeId === selectedRouteId)
      ? selectedRouteId
      : rotas[0]?.routeId ?? null;

  const rotaSelecionada = rotas.find(r => r.routeId === effectiveRouteId) ?? null;

  return (
    <div className="space-y-4">
      {/* Visão operacional — não substitui o painel/mapa abaixo, é um
          resumo rápido de "o que precisa de atenção agora". */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <OperacaoKPI icon={User} label="Motoristas em Rota" value={motoristasEmRota} color="text-blue-600" bg="bg-blue-50" />
        <OperacaoKPI icon={AlertTriangle} label="Ocorrências Abertas" value={ocorrenciasAbertas} color="text-amber-600" bg="bg-amber-50" />
        <OperacaoKPI icon={Clock} label="Rotas Atrasadas" value={rotasAtrasadas} color="text-red-600" bg="bg-red-50" />
        <OperacaoKPI icon={WifiOff} label="GPS Offline" value={gpsOffline} color="text-slate-600" bg="bg-slate-100" />
        <OperacaoKPI icon={Banknote} label="Pedidos Abaixo do Mínimo" value={pedidosAbaixoMinimo} color="text-red-600" bg="bg-red-50" />
      </div>

      {/* BOTÃO TEMPORÁRIO DE TESTE DO AVISO DE VOZ — não grava nada no banco,
          não afeta nenhuma rota real. Remover esta faixa depois do teste. */}
      <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-yellow-50 border border-yellow-200 flex-wrap">
        <span className="text-[11px] text-yellow-800 font-medium">🧪 Teste (temporário) — não afeta rotas reais</span>
        <div className="flex items-center gap-2">
          {voiceOptions.length > 0 && (
            <Select value={selectedVoiceURI} onValueChange={handleVoiceChange}>
              <SelectTrigger className="h-7 w-56 text-xs bg-white border-yellow-300">
                <SelectValue placeholder="Escolher voz..." />
              </SelectTrigger>
              <SelectContent>
                {voiceOptions.map(v => (
                  <SelectItem key={v.voiceURI} value={v.voiceURI} className="text-xs">
                    {v.name} ({v.lang})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5 border-yellow-300 text-yellow-800 hover:bg-yellow-100"
            onClick={handleTestarAvisoVoz}
          >
            <Volume2 className="h-3.5 w-3.5" /> Testar aviso de voz
          </Button>
        </div>
      </div>

      {/* Seletor de data */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Label htmlFor="data-rota" className="text-sm font-medium whitespace-nowrap">
            Data da rota:
          </Label>
          <Input
            id="data-rota"
            type="date"
            value={selectedDate}
            onChange={e => {
              setSelectedDate(e.target.value);
              setSelectedRouteId(null);
            }}
            className="h-9 w-40 text-sm"
          />
        </div>
        {!isLoading && (
          <span className="text-sm text-muted-foreground">
            {rotas.length === 0
              ? 'Nenhuma rota neste dia'
              : `${rotas.length} rota(s) · ${format(new Date(selectedDate + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR })}`}
          </span>
        )}
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Layout split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: 'calc(100vh - 260px)', minHeight: '500px' }}>
        {/* Painel lateral */}
        <div className="lg:col-span-1 h-full">
          <RotaDoDiaPanel
            rotas={rotas}
            selectedRouteId={effectiveRouteId}
            onSelectRoute={setSelectedRouteId}
            onCriarRota={() => setDialogOpen(true)}
          />
        </div>

        {/* Mapa */}
        <div
          ref={mapWrapperRef}
          className={`relative ${isMapFullscreen ? 'w-screen h-screen bg-background p-4' : 'lg:col-span-2 h-full'}`}
        >
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={toggleMapFullscreen}
            className="absolute bottom-3 right-3 z-[1000] bg-white hover:bg-gray-50 shadow-md gap-1.5 text-xs font-semibold"
          >
            {isMapFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
            {isMapFullscreen ? 'Sair da Tela Cheia' : 'Expandir Mapa'}
          </Button>

          {rotaSelecionada && rotaSelecionada.orders.length > 0 ? (
            <RotaDoDiaMap
              orders={rotaSelecionada.orders}
              routeId={rotaSelecionada.routeId}
              onOptimize={(orderedIds, manualOrderedIds, stopOrder) =>
                otimizar.mutate({ routeId: rotaSelecionada.routeId, orderIds: orderedIds, manualOrderIds: manualOrderedIds, stopOrder })
              }
              optimizing={otimizar.isPending}
              driverId={rotaSelecionada.status === 'em_progresso' ? rotaSelecionada.driver?.id : undefined}
              routeInfo={{
                driverName: rotaSelecionada.driver?.name ?? 'Sem motorista',
                status: rotaSelecionada.status,
                startedAt: rotaSelecionada.startedAt,
                completedAt: rotaSelecionada.completedAt,
              }}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 rounded-xl border bg-muted/20 text-muted-foreground">
              <Route className="h-12 w-12 opacity-30" />
              <p className="text-sm">
                {rotas.length === 0
                  ? 'Crie uma rota para visualizar no mapa'
                  : 'Selecione uma rota com pedidos para ver no mapa'}
              </p>
            </div>
          )}
        </div>
      </div>

      <CriarRotaDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

function OperacaoKPI({ icon: Icon, label, value, color, bg }: { icon: any; label: string; value: number; color: string; bg: string }) {
  return (
    <div className={`rounded-xl border p-3 flex items-center gap-3 ${bg}`}>
      <Icon className={`h-5 w-5 shrink-0 ${color}`} />
      <div>
        <p className={`text-xl font-bold leading-tight ${color}`}>{value}</p>
        <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
      </div>
    </div>
  );
}
