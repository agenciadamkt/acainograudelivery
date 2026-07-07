import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  MapPin, Phone, Loader2, Route as RouteIcon,
  CheckCircle2, Navigation, AlertTriangle, RefreshCw, Smartphone,
  Map as MapIcon, ChevronRight, Package, Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { getMotoristaSession, clearMotoristaSession } from '@/hooks/frota/useMotoristaAuth';
import { saveDriverOnlineCache, readDriverOnlineCache } from '@/hooks/frota/useDriverOnlineCache';
import { useLocationQueue } from '@/hooks/frota/useLocationQueue';
import { useEventosDaRota } from '@/hooks/frota/useRouteEvents';
import { watchPosition, type GeoPosition } from '@/lib/platform/geolocation';
import { App as CapacitorApp } from '@capacitor/app';
import { useRotaDoDia, useIniciarRota, useConcluirRota, calcularStatusRota, type RotaOrdem, type RotaDoDia } from '@/hooks/useRotaDoDia';
import { EntregaComprovanteDialog } from '@/components/frota/motorista/EntregaComprovanteDialog';
import { OcorrenciaDialog } from '@/components/frota/motorista/OcorrenciaDialog';
import { MotoristaHeader } from '@/components/frota/motorista/MotoristaHeader';
import { StatusBar } from '@/components/frota/motorista/StatusBar';
import { BottomNav, type MotoristaTab } from '@/components/frota/motorista/BottomNav';
import { HistoricoTab } from '@/components/frota/motorista/HistoricoTab';
import { PerfilTab } from '@/components/frota/motorista/PerfilTab';
import { RotaPreviewMap } from '@/components/frota/motorista/RotaPreviewMap';

// Tempo sem nenhum fix de GPS (mesmo sem gravar no banco) considerado "GPS
// travado" — dispara o alerta visível pro motorista e força reinício do
// watchPosition. Status crítico de operação não pode depender só do React
// "lembrar" que estava online: aqui ele é cruzado com cache local + banco.
const GPS_STALE_THRESHOLD_MS = 120_000;
const HEARTBEAT_INTERVAL_MS = 30_000;
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Ritmo médio (min/parada) até agora — usado só pra estimar "~Xmin" até a
// próxima parada. Não é ETA real (não existe no banco), é uma estimativa
// explicitamente marcada como tal na tela.
function calcularRitmoMedioMin(rota: RotaDoDia): number | null {
  if (!rota.startedAt) return null;
  const concluidas = rota.orders.filter(o => o.status === 'delivered').length;
  if (concluidas === 0) return null;
  const elapsedMin = (Date.now() - new Date(rota.startedAt).getTime()) / 60_000;
  return elapsedMin / concluidas;
}

// Tempo desde a última entrega (ou desde o início, se nenhuma ainda) — sinal
// passivo de "motorista parado / GPS travado / cliente ausente" sem precisar
// abrir o mapa.
function calcularMinutosDesdeUltimaEntrega(rota: RotaDoDia): number | null {
  const entregues = rota.orders.filter(o => o.deliveredAt).map(o => new Date(o.deliveredAt!).getTime());
  const referencia = entregues.length > 0 ? Math.max(...entregues) : (rota.startedAt ? new Date(rota.startedAt).getTime() : null);
  if (referencia == null) return null;
  return Math.round((Date.now() - referencia) / 60_000);
}

// Distância total estimada da rota — soma derivada do maior valor de
// estimatedDistanceMeters entre as paradas (campo já é acumulado desde o
// início da rota pela última otimização OSRM). Sem otimização prévia, não
// existe esse dado — mostra "—" em vez de inventar um número.
function distanciaTotalKm(rota: RotaDoDia): number | null {
  const valores = rota.orders.map(o => o.estimatedDistanceMeters).filter((v): v is number => v != null);
  if (valores.length === 0) return null;
  return Math.max(...valores) / 1000;
}

export default function MotoristaDashboard() {
  const navigate = useNavigate();
  const session = getMotoristaSession();

  const [activeTab, setActiveTab] = useState<MotoristaTab>('rotas');
  const [isOnline, setIsOnline]       = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [lastLocationAt, setLastLocationAt] = useState<number | null>(null);
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<number | null>(null);
  const [gpsStale, setGpsStale] = useState(false);
  const [paradaSelecionada, setParadaSelecionada] = useState<RotaOrdem | null>(null);
  const [ocorrenciaOpen, setOcorrenciaOpen] = useState(false);
  const [lastPosition, setLastPosition] = useState<GeoPosition | null>(null);

  // Reinicia o watchPosition (efeito de GPS abaixo depende disso) — usado
  // tanto pela recuperação automática ao voltar a ficar visível quanto pelo
  // botão manual "Reativar" do alerta de GPS travado.
  const [trackingResumeKey, setTrackingResumeKey] = useState(0);

  // Último fix recebido do navegador, mesmo que descartado pelo throttle —
  // é o sinal de que o watchPosition ainda está vivo, independente de ter
  // gravado no banco ou não.
  const lastGpsCallbackAtRef = useRef<number>(0);

  // Tick periódico só pra forçar re-render de indicadores baseados em tempo
  // (tempo desde última entrega, atraso) mesmo sem nenhum evento de GPS novo.
  const [, setNowTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNowTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!session) navigate('/frota/login');
  }, [session, navigate]);

  const motoristaId = session?.id ?? null;
  const locationQueue = useLocationQueue(motoristaId);

  // Restaura o status "Online" ao reabrir o app. Isso é um ESTADO CRÍTICO DE
  // OPERAÇÃO (controla GPS, monitoramento de rota), não um estado efêmero de
  // UI — por isso não confia só em useState: primeiro lê o cache local
  // (restauração instantânea, sem esperar rede) e em seguida confirma/corrige
  // pelo banco (fonte de verdade). Sem isso, toda vez que o navegador
  // recarrega a página (ou mata a aba em segundo plano, comum em celular), o
  // app "esquece" que estava online e para de mandar localização — mesmo com
  // o banco ainda dizendo que a rota está em andamento.
  useEffect(() => {
    if (!motoristaId) return;

    const cached = readDriverOnlineCache(motoristaId);
    if (cached) setIsOnline(true);

    supabase
      .from('fleet_drivers' as any)
      .select('status')
      .eq('id', motoristaId)
      .single()
      .then(({ data }: any) => {
        const dbOnline = !!data?.status && data.status !== 'offline';
        setIsOnline(dbOnline);
        saveDriverOnlineCache(motoristaId, dbOnline);
      });
  }, [motoristaId]);

  // Mantém a tela acesa enquanto estiver Online — em muitos celulares, a
  // tela apagar suspende o GPS (watchPosition) sem nenhum erro reportado ao
  // app, então o motorista "sai do mapa" sem perceber. O wake lock é
  // liberado automaticamente pelo navegador quando a aba perde foco, então
  // reativa de novo ao voltar pro app (visibilitychange). NÃO É SUPORTADO NO
  // SAFARI/iOS — nesse caso o aviso B.3 abaixo é o que resta fazer.
  useEffect(() => {
    let wakeLock: any = null;
    let cancelled = false;

    const requestWakeLock = async () => {
      if (!isOnline || cancelled || !('wakeLock' in navigator)) return;
      try {
        wakeLock = await (navigator as any).wakeLock.request('screen');
      } catch {
        // não suportado / permissão negada — segue sem wake lock
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };

    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      wakeLock?.release?.().catch(() => {});
    };
  }, [isOnline]);

  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: rotas = [], isLoading } = useRotaDoDia(today, motoristaId ?? undefined);
  const iniciarRota = useIniciarRota();
  const concluirRota = useConcluirRota();

  const updateMotoristaStatus = async (status: 'offline' | 'disponivel' | 'em_rota') => {
    if (!motoristaId) return;
    await supabase.from('fleet_drivers' as any).update({ status }).eq('id', motoristaId);
  };

  const handleToggleOnline = async () => {
    const next = !isOnline;
    setIsOnline(next);
    saveDriverOnlineCache(motoristaId!, next);
    await updateMotoristaStatus(next ? 'disponivel' : 'offline');
    toast.success(next ? 'Você está Online!' : 'Você está Offline');
  };

  // Em muitos navegadores mobile, o watchPosition é congelado/encerrado
  // quando a aba vai pra segundo plano (tela bloqueada, troca de app) e NÃO
  // volta a funcionar sozinho quando o app é reaberto — sem erro nenhum,
  // simplesmente para de mandar localização. Forçar o efeito de GPS a
  // reiniciar (novo watchPosition) sempre que a aba volta a ficar visível
  // corrige isso. `visibilitychange` cobre o navegador; `@capacitor/app`
  // (`resume`) cobre o app nativo voltando de segundo plano — no Capacitor,
  // isso é bem mais confiável que o antigo `document.addEventListener('resume', ...)`,
  // que nunca disparava de verdade (não existe esse DOM event nativamente,
  // era um nome herdado do Cordova). Fora de contexto nativo, o listener do
  // plugin simplesmente nunca dispara — sem erro, sem efeito colateral.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') setTrackingResumeKey(k => k + 1);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const resumeListener = CapacitorApp.addListener('resume', () => {
      setTrackingResumeKey(k => k + 1);
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      resumeListener.then(listener => listener.remove());
    };
  }, []);

  // Heartbeat — sinal de vida do app INDEPENDENTE do GPS. Sem isso, o admin
  // não consegue distinguir "motorista com GPS travado, mas app aberto" de
  // "app fechado/morto": os dois parecem iguais no mapa (current_location
  // parado). Atualiza a cada 30s enquanto online, e uma vez imediatamente ao
  // ficar online (não espera o primeiro intervalo).
  useEffect(() => {
    if (!isOnline || !motoristaId) return;

    const sendHeartbeat = async () => {
      const now = Date.now();
      const { error } = await supabase
        .from('fleet_drivers' as any)
        .update({ last_heartbeat: new Date(now).toISOString() })
        .eq('id', motoristaId);
      if (!error) setLastHeartbeatAt(now);
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isOnline, motoristaId]);

  // Watchdog de GPS travado — se nenhum fix chegar por mais de 2 minutos
  // (mesmo sem gravar no banco, já contaria como "vivo"), assume que o
  // watchPosition travou silenciosamente: avisa o motorista (hoje esse
  // problema é mudo — o app parece funcionando, mas não está) e força um
  // reinício automático do rastreamento.
  useEffect(() => {
    if (!isOnline) { setGpsStale(false); return; }
    const interval = setInterval(() => {
      const last = lastGpsCallbackAtRef.current;
      if (last === 0) return; // ainda não recebeu nenhum fix — dá tempo antes de alarmar
      if (Date.now() - last > GPS_STALE_THRESHOLD_MS) {
        setGpsStale(true);
        setTrackingResumeKey(k => k + 1);
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [isOnline]);

  const handleReativarRastreamento = () => {
    setGpsStale(false);
    lastGpsCallbackAtRef.current = Date.now();
    setTrackingResumeKey(k => k + 1);
    toast.info('Reativando rastreamento...');
  };

  // GPS Tracking — grava em fleet_drivers.current_location (independente do
  // módulo Delivery, que usa a tabela delivery_drivers). Usa a abstração em
  // src/lib/platform/geolocation.ts (não navigator.geolocation direto) pra
  // já deixar pronta a troca futura pra @capacitor/geolocation sem tocar
  // aqui. Quando a escrita falha (queda breve de rede), guarda na fila
  // offline em vez de perder o ponto em silêncio.
  useEffect(() => {
    let lastThrottleTime = 0;
    let lastDbUpdateTime = 0;

    if (!isOnline || !motoristaId) {
      setGpsAccuracy(null);
      return;
    }

    const unsubscribe = watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position;
        const now = Date.now();

        lastGpsCallbackAtRef.current = now;
        setGpsStale(false);
        setGpsAccuracy(Math.round(accuracy));
        setLocationError(null);
        setLastPosition(position);

        if (now - lastThrottleTime < 3000) return;
        lastThrottleTime = now;

        const ACCURACY_THRESHOLD_M = 100;
        const MAX_STALE_MS = 30_000;
        const isAccurate = accuracy <= ACCURACY_THRESHOLD_M;
        const isStale = (now - lastDbUpdateTime) > MAX_STALE_MS;
        if (!isAccurate && !isStale) return;
        lastDbUpdateTime = now;

        const { error } = await supabase
          .from('fleet_drivers' as any)
          .update({
            current_location: { lat: latitude, lng: longitude, accuracy: Math.round(accuracy), timestamp: now },
            updated_at: new Date().toISOString(),
          })
          .eq('id', motoristaId);

        if (error) {
          locationQueue.enqueue({ lat: latitude, lng: longitude, accuracy: Math.round(accuracy), timestamp: now });
        } else {
          setLastLocationAt(now);
        }
      },
      (error) => {
        console.error('[Frota] Erro de localização:', error.code, error.message);
        switch (error.code) {
          case 1: setLocationError('Permissão de localização negada. Ative nas configurações.'); break;
          case 2: setLocationError('Localização indisponível. Verifique o GPS do dispositivo.'); break;
          case 3: setLocationError('Tempo esgotado ao obter localização. Tente novamente.'); break;
          // Erros vindos do plugin nativo (background-geolocation) não têm
          // um dos 3 códigos acima — mostrar a mensagem real em vez de um
          // texto genérico, senão fica impossível diagnosticar em campo.
          default: setLocationError(error.message ? `Erro ao obter localização: ${error.message}` : 'Erro ao obter localização.');
        }
        setGpsAccuracy(null);
      },
    );

    return () => {
      unsubscribe();
      setGpsAccuracy(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, motoristaId, trackingResumeKey]);

  const handleLogout = () => {
    clearMotoristaSession();
    navigate('/frota/login');
  };

  const openMap = (parada: RotaOrdem) => {
    const addr = parada.address;
    if (!addr) return;
    const query = addr.latitude && addr.longitude
      ? `${addr.latitude},${addr.longitude}`
      : encodeURIComponent(`${addr.street} ${addr.number}, ${addr.neighborhood}, ${addr.city}`);
    window.open(`https://waze.com/ul?q=${query}&navigate=yes`, '_blank');
  };

  const handleIniciarRota = async (rota: typeof rotas[number]) => {
    const orderIds = rota.orders.filter(o => !o.isManualOrder && !o.isFranchiseeOrder).map(o => o.orderId);
    await iniciarRota.mutateAsync({ routeId: rota.routeId, orderIds });
    await updateMotoristaStatus('em_rota');
    setIsOnline(true);
    if (motoristaId) saveDriverOnlineCache(motoristaId, true);
  };

  const handleConcluirRota = async (rota: typeof rotas[number]) => {
    await concluirRota.mutateAsync(rota.routeId);
    await updateMotoristaStatus('disponivel');
  };

  const rotasAtivas = rotas.filter(r => r.status === 'pendente' || r.status === 'em_progresso');
  const rotaEmProgresso = rotasAtivas.find(r => r.status === 'em_progresso') ?? null;
  const rotasPendentes = rotasAtivas.filter(r => r.status === 'pendente');

  // FAB de ocorrência: visível também antes de iniciar a rota (referência
  // 001.png já mostra o FAB na tela "Pendente") — usa a primeira rota
  // pendente como contexto quando ainda não há nenhuma em andamento.
  const rotaParaOcorrencia = rotaEmProgresso ?? rotasPendentes[0] ?? null;

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <MotoristaHeader
        nome={session?.nome ?? ''}
        isOnline={isOnline}
        onToggleOnline={handleToggleOnline}
        onLogout={handleLogout}
      />

      {/* Alerta visível — sem isso, o motorista acredita estar sendo
          monitorado mesmo quando o GPS travou silenciosamente. */}
      {isOnline && gpsStale && (
        <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-3">
          <p className="text-sm text-amber-800 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Localização não atualizada há mais de 2 minutos.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-amber-300 text-amber-800 hover:bg-amber-100 shrink-0 gap-1"
            onClick={handleReativarRastreamento}
          >
            <RefreshCw className="h-3 w-3" /> Reativar
          </Button>
        </div>
      )}

      {/* Dica pra iPhone — Wake Lock não existe no Safari/iOS, então não tem
          correção técnica hoje (limite de plataforma, não bug). Transformar
          uma falha silenciosa numa limitação visível é o que dá pra fazer. */}
      {isOnline && IS_IOS && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 flex items-center gap-2 text-sm text-blue-800">
          <Smartphone className="h-3.5 w-3.5 shrink-0" />
          iPhone: mantenha a tela acesa e o app aberto pra o rastreamento continuar.
        </div>
      )}

      {isOnline && (
        <StatusBar
          gpsAccuracy={gpsAccuracy}
          gpsStale={gpsStale}
          lastLocationAt={lastLocationAt}
          lastHeartbeatAt={lastHeartbeatAt}
          pendingSyncCount={locationQueue.pendingCount}
          locationError={locationError}
        />
      )}

      {activeTab === 'rotas' && (
        <main className="px-4 py-4 space-y-4 max-w-lg mx-auto">
          {isLoading && (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-violet-600" /></div>
          )}

          {!isLoading && rotasAtivas.length === 0 && (
            <Card className="rounded-2xl">
              <CardContent className="p-8 text-center text-muted-foreground">
                <RouteIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma rota atribuída hoje.</p>
              </CardContent>
            </Card>
          )}

          {rotaEmProgresso && (
            <RotaAtivaPainel
              rota={rotaEmProgresso}
              lastPosition={lastPosition}
              onAbrirMapa={openMap}
              onEntregar={setParadaSelecionada}
              onConcluirRota={() => handleConcluirRota(rotaEmProgresso)}
              concluirPending={concluirRota.isPending}
            />
          )}

          {!rotaEmProgresso && rotasPendentes.length > 0 && (
            <>
              <div>
                <h1 className="text-xl font-extrabold">Minhas Rotas</h1>
                <p className="text-sm text-muted-foreground">Selecione uma rota para iniciar sua jornada.</p>
              </div>
              {rotasPendentes.map(rota => (
                <RotaPendenteCard
                  key={rota.routeId}
                  rota={rota}
                  lastPosition={lastPosition}
                  onIniciar={() => handleIniciarRota(rota)}
                  iniciarPending={iniciarRota.isPending}
                />
              ))}
            </>
          )}
        </main>
      )}

      {activeTab === 'historico' && motoristaId && (
        <HistoricoTab motoristaId={motoristaId} />
      )}

      {activeTab === 'perfil' && motoristaId && (
        <PerfilTab motoristaId={motoristaId} nome={session?.nome ?? ''} onLogout={handleLogout} />
      )}

      {/* FAB de ocorrência — fixo, acima da bottom nav, dentro da safe area. */}
      {activeTab === 'rotas' && rotaParaOcorrencia && motoristaId && (
        <button
          onClick={() => setOcorrenciaOpen(true)}
          className="fixed right-4 h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg flex items-center justify-center z-20"
          style={{ bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))' }}
          title="Registrar ocorrência"
        >
          <AlertTriangle className="h-6 w-6" />
        </button>
      )}

      <BottomNav active={activeTab} onChange={setActiveTab} />

      {paradaSelecionada && (
        <EntregaComprovanteDialog
          parada={paradaSelecionada}
          open={!!paradaSelecionada}
          onOpenChange={v => !v && setParadaSelecionada(null)}
        />
      )}

      {rotaParaOcorrencia && motoristaId && (
        <OcorrenciaDialog
          open={ocorrenciaOpen}
          onOpenChange={setOcorrenciaOpen}
          routeId={rotaParaOcorrencia.routeId}
          driverId={motoristaId}
        />
      )}
    </div>
  );
}

// ── Card de rota pendente (ainda não iniciada) ──────────────────────────────
// Referência 001.png: nome + badge "Pendente", caixas de Distância/Previsto,
// CTA grande "Iniciar Rota" e preview do percurso com link "Ver Detalhes".

function RotaPendenteCard({
  rota, lastPosition, onIniciar, iniciarPending,
}: {
  rota: RotaDoDia;
  lastPosition: GeoPosition | null;
  onIniciar: () => void;
  iniciarPending: boolean;
}) {
  const [verDetalhes, setVerDetalhes] = useState(false);
  const primeira = rota.orders[0] ?? null;
  const distanciaKm = distanciaTotalKm(rota);

  // Subtítulo descritivo real (sem inventar "região/setor" que não existe no
  // banco): cidade/bairro predominante das paradas, ou contagem de paradas.
  const cidades = [...new Set(rota.orders.map(o => o.address?.city).filter(Boolean))];
  const subtitulo = cidades.length === 1
    ? cidades[0]
    : `${rota.orders.length} parada${rota.orders.length !== 1 ? 's' : ''}`;

  return (
    <Card className="rounded-3xl overflow-hidden shadow-sm">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold text-base truncate">{rota.routeName}</p>
            {subtitulo && <p className="text-xs text-muted-foreground truncate">{subtitulo}</p>}
          </div>
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 shrink-0">Pendente</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Distância
            </p>
            <p className="font-bold text-lg mt-0.5">{distanciaKm != null ? `${distanciaKm.toFixed(1)} km` : '—'}</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <Target className="h-3 w-3" /> Previsto
            </p>
            <p className="font-bold text-lg mt-0.5">{rota.estimatedDuration != null ? `${rota.estimatedDuration} min` : '—'}</p>
          </div>
        </div>

        <Button
          className="w-full h-14 rounded-2xl bg-violet-600 hover:bg-violet-700 text-base font-bold gap-2"
          onClick={onIniciar}
          disabled={iniciarPending}
        >
          {iniciarPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Navigation className="h-5 w-5" />}
          Iniciar Rota ({rota.orders.length} parada{rota.orders.length !== 1 ? 's' : ''})
        </Button>
      </CardContent>

      <div className="border-t">
        <RotaPreviewMap
          driverPosition={lastPosition ? { lat: lastPosition.latitude, lng: lastPosition.longitude } : null}
          destination={primeira?.address?.latitude && primeira?.address?.longitude
            ? { lat: primeira.address.latitude, lng: primeira.address.longitude }
            : null}
          heightClass="h-32"
          className="rounded-none"
        />
        <button
          onClick={() => setVerDetalhes(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm"
        >
          <span className="flex items-center gap-1.5 font-semibold text-muted-foreground">
            <MapIcon className="h-3.5 w-3.5" /> Prévia do Percurso
          </span>
          <span className="flex items-center gap-1 font-semibold text-violet-600">
            Ver Detalhes <ChevronRight className={`h-3.5 w-3.5 transition-transform ${verDetalhes ? 'rotate-90' : ''}`} />
          </span>
        </button>

        {verDetalhes && (
          <div className="px-4 pb-4 space-y-2">
            {rota.orders.map(parada => (
              <div key={parada.orderId} className="flex items-center gap-2 text-xs py-1.5 border-t first:border-t-0">
                <span className="h-5 w-5 rounded-full bg-violet-100 text-violet-700 font-bold flex items-center justify-center shrink-0">
                  {parada.sequencia}
                </span>
                <span className="truncate font-medium">{parada.customer.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Painel da rota em andamento ─────────────────────────────────────────────
// Card de "Próxima Entrega" dominante (com as 3 ações nele mesmo, sem
// precisar rolar até a lista) + preview de mapa + progresso/atraso/resumo +
// lista completa de paradas como apoio/conferência abaixo.

function RotaAtivaPainel({
  rota, lastPosition, onAbrirMapa, onEntregar, onConcluirRota, concluirPending,
}: {
  rota: RotaDoDia;
  lastPosition: GeoPosition | null;
  onAbrirMapa: (p: RotaOrdem) => void;
  onEntregar: (p: RotaOrdem) => void;
  onConcluirRota: () => void;
  concluirPending: boolean;
}) {
  const { data: eventos = [] } = useEventosDaRota(rota.routeId);

  const total = rota.orders.length;
  const concluidas = rota.orders.filter(o => o.status === 'delivered').length;
  const pendentes = total - concluidas;
  const proxima = rota.orders.find(o => o.status !== 'delivered') ?? null;
  const criticas = rota.orders.filter(o =>
    o.status !== 'delivered' &&
    eventos.some(e => e.orderId === o.orderId && e.severity !== 'info' && !e.resolvedAt),
  ).length;

  const statusRota = calcularStatusRota(rota);
  const ritmoMedioMin = calcularRitmoMedioMin(rota);
  const minutosDesdeUltima = calcularMinutosDesdeUltimaEntrega(rota);
  const pct = total > 0 ? Math.round((concluidas / total) * 100) : 0;

  const distanciaKm = (proxima?.address?.latitude && proxima?.address?.longitude && lastPosition)
    ? haversineKm(lastPosition.latitude, lastPosition.longitude, proxima.address.latitude, proxima.address.longitude)
    : null;

  const etaProximaMin = ritmoMedioMin != null ? Math.round(ritmoMedioMin) : null;

  const corTempoUltimaEntrega = (() => {
    if (minutosDesdeUltima == null) return 'text-muted-foreground';
    const limiteAtencao = ritmoMedioMin != null ? ritmoMedioMin * 1.5 : 20;
    const limiteAlerta = ritmoMedioMin != null ? ritmoMedioMin * 2.5 : 40;
    if (minutosDesdeUltima > limiteAlerta) return 'text-red-600 font-bold';
    if (minutosDesdeUltima > limiteAtencao) return 'text-amber-600 font-bold';
    return 'text-emerald-600';
  })();

  return (
    <div className="space-y-4">
      <Card className="rounded-3xl border-2 border-violet-200 shadow-md overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Badge className="bg-violet-600 text-white">Próxima Entrega</Badge>
            {statusRota && (
              <span className={
                statusRota.status === 'atrasado' ? 'text-red-600 text-xs font-bold flex items-center gap-1' :
                statusRota.status === 'atencao' ? 'text-amber-600 text-xs font-bold flex items-center gap-1' :
                'text-emerald-600 text-xs font-bold flex items-center gap-1'
              }>
                {statusRota.status === 'atrasado' ? `🔴 Atrasado ~${statusRota.atrasoMin}min` :
                 statusRota.status === 'atencao' ? '🟡 Atenção' : '🟢 No horário'}
              </span>
            )}
          </div>

          {proxima ? (
            <>
              <div>
                <p className="font-bold text-lg">{proxima.sequencia}. {proxima.customer.name}</p>
                {proxima.address && (
                  <p className="text-sm text-muted-foreground flex items-start gap-1 mt-0.5">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    {[proxima.address.street, proxima.address.number, proxima.address.neighborhood, proxima.address.city].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {distanciaKm != null && <span>📍 {distanciaKm < 1 ? `${Math.round(distanciaKm * 1000)}m` : `${distanciaKm.toFixed(1)}km`}</span>}
                {etaProximaMin != null && <span>~{etaProximaMin}min até lá (estimado)</span>}
              </div>

              <RotaPreviewMap
                driverPosition={lastPosition ? { lat: lastPosition.latitude, lng: lastPosition.longitude } : null}
                destination={proxima.address?.latitude && proxima.address?.longitude
                  ? { lat: proxima.address.latitude, lng: proxima.address.longitude }
                  : null}
                heightClass="h-32"
              />

              <div className="flex gap-2">
                {proxima.address && (
                  <Button size="sm" variant="outline" className="flex-1 h-12 rounded-xl gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-50" onClick={() => onAbrirMapa(proxima)}>
                    <Navigation className="h-4 w-4" /> Navegar
                  </Button>
                )}
                {proxima.customer.phone && (
                  <Button size="sm" variant="outline" className="h-12 w-12 rounded-xl p-0" asChild>
                    <a href={`https://wa.me/55${proxima.customer.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                      <Phone className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                {!proxima.isFranchiseeOrder && (
                  <Button size="sm" className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold" onClick={() => onEntregar(proxima)}>
                    Entreguei
                  </Button>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-emerald-700 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Todas as entregas concluídas!
            </p>
          )}

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{concluidas} de {total} entregas</span>
              <span>{pct}%</span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t">
            <span className={corTempoUltimaEntrega}>
              ⏱ {minutosDesdeUltima != null ? `${minutosDesdeUltima}min desde a última entrega` : 'Aguardando primeira entrega'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span>{total} entregas</span>
            <span className="text-emerald-600">{concluidas} concluídas</span>
            <span className="text-amber-600">{pendentes} pendentes</span>
            {criticas > 0 && <span className="text-red-600 font-bold">{criticas} crítica(s)</span>}
          </div>

          {rota.orders.every(o => o.status === 'delivered' || o.isFranchiseeOrder) && (
            <Button className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700" onClick={onConcluirRota} disabled={concluirPending}>
              {concluirPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Concluir Rota
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Indicadores operacionais — métricas reais já calculadas acima (sem
          gamificação fictícia: entregas concluídas e % de progresso da rota). */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-violet-50 flex items-center justify-center shrink-0">
              <Package className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Entregas</p>
              <p className="font-bold text-base">{concluidas}/{total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
              <Target className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Progresso</p>
              <p className="font-bold text-base">{pct}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Demais paradas — apoio/conferência. A parada "próxima" já está em
          destaque no card acima, então fica de fora daqui pra não repetir o
          mesmo endereço duas vezes na tela (parecia uma segunda entrega). Se
          só existir essa uma parada, não há "demais" e o card nem aparece. */}
      {rota.orders.filter(p => p.orderId !== proxima?.orderId).length > 0 && (
      <Card className="rounded-2xl overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{rota.routeName} — demais paradas</p>
          {rota.orders.filter(p => p.orderId !== proxima?.orderId).map(parada => {
            const entregue = parada.status === 'delivered';
            const podeEntregar = !parada.isFranchiseeOrder;
            return (
              <div key={parada.orderId} className="border rounded-xl p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold">{parada.sequencia}. {parada.customer.name}</p>
                    <p className="text-xs text-muted-foreground">Pedido {parada.orderNumber}</p>
                  </div>
                  {entregue && (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Entregue
                    </Badge>
                  )}
                </div>

                {parada.address && (
                  <p className="text-xs text-muted-foreground flex items-start gap-1">
                    <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                    {[parada.address.street, parada.address.number, parada.address.neighborhood, parada.address.city].filter(Boolean).join(', ')}
                  </p>
                )}

                {entregue ? (
                  <div className="flex items-center gap-2">
                    {parada.deliveredAt && (
                      <span className="text-sm text-muted-foreground">
                        Entregue às {format(new Date(parada.deliveredAt), 'HH:mm')}
                      </span>
                    )}
                    {parada.proofPhotoUrl && (
                      <img src={parada.proofPhotoUrl} alt="Comprovante" className="h-10 w-10 rounded object-cover border" />
                    )}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {parada.address && (
                      <Button size="sm" variant="outline" className="flex-1 gap-1.5 h-10" onClick={() => onAbrirMapa(parada)}>
                        <Navigation className="h-3.5 w-3.5" /> Mapa
                      </Button>
                    )}
                    {parada.customer.phone && (
                      <Button size="sm" variant="outline" className="gap-1.5 h-10" asChild>
                        <a href={`https://wa.me/55${parada.customer.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                    {podeEntregar && (
                      <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-10" onClick={() => onEntregar(parada)}>
                        Entreguei
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
      )}
    </div>
  );
}
