import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import 'leaflet/dist/leaflet.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, PackagePlus, MapPin, Search, Truck, Route as RouteIcon, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  useAdicionarPedidoManual,
  useEditarPedidoManual,
  useCriarRota,
  useReatribuirMotoristaRota,
  type RotaDoDia,
} from '@/hooks/useRotaDoDia';
import { STORE_CENTER } from '@/lib/optimizeRoute';

// Sentinela pro item "+ Criar nova rota" no seletor de Rota — distinto de
// qualquer routeId real (uuid).
const NOVA_ROTA_VALUE = '__nova_rota__';

export interface EditingManualOrder {
  id: string;
  franchiseeName: string;
  orderNumber: string;
  orderDate: string;
  totalAmount: number;
  notes: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressNeighborhood: string | null;
  addressCity: string | null;
  addressLatitude: number | null;
  addressLongitude: number | null;
}

interface Props {
  routeId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingOrder?: EditingManualOrder | null;
  // Rotas do dia (já carregadas no painel) — permite escolher explicitamente
  // em qual rota nomeada a entrega entra (ex: "Rota da Manhã" x "Rota da
  // Tarde" do mesmo motorista), em vez de adivinhar pela rota mais recente.
  rotas?: RotaDoDia[];
}

export function AdicionarPedidoManualDialog({ routeId, open, onOpenChange, editingOrder = null, rotas = [] }: Props) {
  const isEditing = !!editingOrder;
  const [franchiseeId, setFranchiseeId]     = useState('');
  const [franchiseeName, setFranchiseeName]   = useState('');
  const [orderNumber, setOrderNumber]         = useState('');
  const [orderDate, setOrderDate]             = useState(format(new Date(), 'yyyy-MM-dd'));
  const [orderTime, setOrderTime]             = useState(format(new Date(), 'HH:mm'));
  const [totalAmount, setTotalAmount]         = useState('');
  const [notes, setNotes]                     = useState('');
  const [driverId, setDriverId]               = useState<string>('__sem_motorista__');
  const [selectedRouteId, setSelectedRouteId] = useState(routeId);
  const [novaRotaNome, setNovaRotaNome]       = useState('');

  // Endereço
  const [street, setStreet]             = useState('');
  const [number, setNumber]             = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity]                 = useState('');
  const [latitude, setLatitude]         = useState<number | null>(null);
  const [longitude, setLongitude]       = useState<number | null>(null);
  const [geocoding, setGeocoding]       = useState(false);
  const [geocodeOk, setGeocodeOk]       = useState(false);
  const [coordsInput, setCoordsInput]   = useState('');

  // Mapa interativo — permite marcar o ponto manualmente quando a busca por
  // texto não encontra o endereço (comum em ruas não mapeadas no OpenStreetMap)
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<any>(null);
  const leafletRef      = useRef<any>(null);
  const markerRef       = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  const adicionar = useAdicionarPedidoManual();
  const editar    = useEditarPedidoManual();
  const criarRota = useCriarRota();
  const reatribuirMotorista = useReatribuirMotoristaRota();

  const { data: franchisees = [], isLoading: loadingFranchisees } = useQuery({
    queryKey: ['franchisee-stores-for-manual'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, franchisee_user_id, address, address_number, neighborhood, city, latitude, longitude')
        .not('franchisee_user_id', 'is', null)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      return (data ?? []) as {
        id: string; name: string; franchisee_user_id: string;
        address: string | null; address_number: string | null;
        neighborhood: string | null; city: string | null;
        latitude: number | null; longitude: number | null;
      }[];
    },
    enabled: open,
  });

  const { data: drivers = [], isLoading: loadingDrivers } = useQuery({
    queryKey: ['fleet-drivers-for-manual'],
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

  // Sincroniza a rota selecionada com a rota que estava ativa no painel
  // sempre que o diálogo abre (ou a rota do painel muda) — ponto de partida,
  // mas o admin pode trocar no seletor "Rota" abaixo.
  useEffect(() => {
    if (!open) return;
    setSelectedRouteId(routeId);
  }, [open, routeId]);

  // Motorista já atribuído à rota selecionada — derivado direto da lista de
  // rotas do dia (já carregada no painel, sem precisar de nova consulta).
  // Reage também à troca manual no seletor "Rota" (inclusive ao editar: trocar
  // a rota também troca o motorista mostrado, já que cada rota tem o seu).
  useEffect(() => {
    if (!open || selectedRouteId === NOVA_ROTA_VALUE) return;
    const rotaAtual = rotas.find(r => r.routeId === selectedRouteId);
    setDriverId(rotaAtual?.driver?.id ?? '__sem_motorista__');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEditing, selectedRouteId]);

  // Preenche o formulário com os dados da entrega ao abrir em modo de edição
  useEffect(() => {
    if (!open || !editingOrder) return;
    setFranchiseeId('');
    setFranchiseeName(editingOrder.franchiseeName);
    setOrderNumber(editingOrder.orderNumber);
    const dt = new Date(editingOrder.orderDate);
    setOrderDate(format(dt, 'yyyy-MM-dd'));
    setOrderTime(format(dt, 'HH:mm'));
    setTotalAmount(editingOrder.totalAmount ? String(editingOrder.totalAmount) : '');
    setNotes(editingOrder.notes ?? '');
    setStreet(editingOrder.addressStreet ?? '');
    setNumber(editingOrder.addressNumber ?? '');
    setNeighborhood(editingOrder.addressNeighborhood ?? '');
    setCity(editingOrder.addressCity ?? '');
    if (editingOrder.addressLatitude != null && editingOrder.addressLongitude != null) {
      setLatitude(editingOrder.addressLatitude);
      setLongitude(editingOrder.addressLongitude);
      setGeocodeOk(true);
    }
  }, [open, editingOrder]);

  // Inicializa o mapa quando o diálogo abre; clicar nele marca o pino manualmente
  useEffect(() => {
    if (!open) {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      setMapReady(false);
      return;
    }
    import('leaflet').then((L) => {
      if (!mapContainerRef.current || mapRef.current) return;
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      const map = L.map(mapContainerRef.current).setView(STORE_CENTER, 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);
      map.on('click', (e: any) => {
        setLatitude(e.latlng.lat);
        setLongitude(e.latlng.lng);
        setGeocodeOk(true);
      });
      leafletRef.current = L;
      mapRef.current = map;
      setMapReady(true);
    });
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      setMapReady(false);
    };
  }, [open]);

  // Cria/move o pino sempre que a coordenada mudar (busca por texto, clique ou arrastar)
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !mapReady || latitude == null || longitude == null) return;

    map.setView([latitude, longitude], 16);
    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    } else {
      markerRef.current = L.marker([latitude, longitude], { draggable: true }).addTo(map);
      markerRef.current.on('dragend', (e: any) => {
        const { lat, lng } = e.target.getLatLng();
        setLatitude(lat);
        setLongitude(lng);
        setGeocodeOk(true);
      });
    }
  }, [latitude, longitude, mapReady]);

  const handleFranchiseeChange = (value: string) => {
    if (value === '__manual__') {
      setFranchiseeId('');
      setFranchiseeName('');
      return;
    }
    const found = franchisees.find(f => f.franchisee_user_id === value);
    setFranchiseeId(value);
    setFranchiseeName(found?.name ?? '');

    // Puxa o endereço cadastrado da loja do franqueado
    setStreet(found?.address ?? '');
    setNumber(found?.address_number ?? '');
    setNeighborhood(found?.neighborhood ?? '');
    setCity(found?.city ?? '');
    if (found?.latitude != null && found?.longitude != null) {
      setLatitude(found.latitude);
      setLongitude(found.longitude);
      setGeocodeOk(true);
    } else {
      setLatitude(null);
      setLongitude(null);
      setGeocodeOk(false);
    }
  };

  const tryGeocode = async (query: string): Promise<{ lat: number; lng: number } | null> => {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'pt-BR' } }
    );
    const results = await res.json();
    if (results?.[0]) {
      return { lat: Number(results[0].lat), lng: Number(results[0].lon) };
    }
    return null;
  };

  const geocodeAddress = async (): Promise<{ lat: number; lng: number } | null> => {
    if (!street) return null;
    setGeocoding(true);
    setGeocodeOk(false);
    try {
      // 1ª tentativa: endereço completo (rua, número, bairro, cidade)
      const fullQuery = [street, number, neighborhood, city || 'Teresina', 'Brasil'].filter(Boolean).join(', ');
      let result = await tryGeocode(fullQuery);

      // 2ª tentativa: sem o número (muitas ruas não têm numeração mapeada no OSM)
      if (!result && number) {
        const noNumberQuery = [street, neighborhood, city || 'Teresina', 'Brasil'].filter(Boolean).join(', ');
        result = await tryGeocode(noNumberQuery);
      }

      // 3ª tentativa: apenas rua + cidade (sem bairro, caso o bairro esteja com nome diferente)
      if (!result && neighborhood) {
        const noNeighborhoodQuery = [street, city || 'Teresina', 'Brasil'].filter(Boolean).join(', ');
        result = await tryGeocode(noNeighborhoodQuery);
      }

      // 4ª tentativa (aproximada): só bairro + cidade — a rua pode não existir no
      // OpenStreetMap (lacuna comum em ruas menores), mas o bairro geralmente existe.
      // Melhor um pino aproximado no bairro do que nenhum pino.
      let approximate = false;
      if (!result && neighborhood) {
        const neighborhoodOnlyQuery = [neighborhood, city || 'Teresina', 'Brasil'].filter(Boolean).join(', ');
        result = await tryGeocode(neighborhoodOnlyQuery);
        approximate = !!result;
      }

      if (result) {
        setLatitude(result.lat);
        setLongitude(result.lng);
        setGeocodeOk(true);
        if (approximate) {
          toast.info('Rua não encontrada — usando localização aproximada do bairro.');
        }
        return result;
      }
      setLatitude(null);
      setLongitude(null);
      setGeocodeOk(false);
      return null;
    } catch {
      setLatitude(null);
      setLongitude(null);
      return null;
    } finally {
      setGeocoding(false);
    }
  };

  const handleGeocode = () => { geocodeAddress(); };

  const handleApplyCoords = () => {
    const parts = coordsInput.split(',').map(p => p.trim());
    const lat = Number(parts[0]);
    const lng = Number(parts[1]);
    if (parts.length !== 2 || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      toast.error('Coordenadas inválidas. Use o formato: latitude, longitude');
      return;
    }
    setLatitude(lat);
    setLongitude(lng);
    setGeocodeOk(true);
  };

  const reset = () => {
    setFranchiseeId('');
    setFranchiseeName('');
    setOrderNumber('');
    setOrderDate(format(new Date(), 'yyyy-MM-dd'));
    setOrderTime(format(new Date(), 'HH:mm'));
    setTotalAmount('');
    setNotes('');
    setStreet('');
    setNumber('');
    setNeighborhood('');
    setCity('');
    setLatitude(null);
    setLongitude(null);
    setGeocodeOk(false);
    setDriverId('__sem_motorista__');
    setCoordsInput('');
    setSelectedRouteId(routeId);
    setNovaRotaNome('');
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!franchiseeName.trim() || !orderNumber.trim() || !orderDate) return;

    let lat = latitude;
    let lng = longitude;

    // new Date(`${orderDate}T${orderTime}:00`) é interpretado pelo navegador
    // como horário LOCAL (Brasília); .toISOString() converte pra UTC com o
    // offset correto antes de enviar pro banco. Sem isso, o servidor (que
    // roda em UTC) grava o texto como se já fosse UTC, e a hora exibida
    // depois aparece 3h adiantada/atrasada (ex: 09:33 salvo, exibido 06:33).
    const orderDateTimeIso = new Date(`${orderDate}T${orderTime}:00`).toISOString();
    const totalAmountNumber = Number(totalAmount.replace(',', '.')) || 0;
    const motoristaEscolhidoId = driverId === '__sem_motorista__' ? null : driverId;

    // Se o motorista mostrado pra rota selecionada foi trocado, reatribui a
    // rota inteira pra esse motorista (campo "Motorista" edita a rota, não só
    // esta entrega). Retorna o motorista final daquela rota (já atualizado).
    const aplicarMotoristaNaRota = async (routeIdParaChecar: string): Promise<string | null> => {
      const rotaAtual = rotas.find(r => r.routeId === routeIdParaChecar);
      const motoristaAtualId = rotaAtual?.driver?.id ?? null;
      if (motoristaEscolhidoId === motoristaAtualId) return motoristaAtualId;
      await reatribuirMotorista.mutateAsync({ routeId: routeIdParaChecar, driverId: motoristaEscolhidoId });
      return motoristaEscolhidoId;
    };

    // Geocodifica automaticamente se endereço foi preenchido mas ainda não localizado
    if (street.trim() && (!geocodeOk || lat === null || lng === null)) {
      const result = await geocodeAddress();
      if (result) {
        lat = result.lat;
        lng = result.lng;
      }
    }

    if (isEditing && editingOrder) {
      // Trocar a rota aqui (inclusive criando uma nova) MOVE a entrega da
      // rota original (routeId, a que estava selecionada quando o diálogo
      // abriu) pra rota escolhida agora.
      let newRouteId = selectedRouteId;
      try {
        if (selectedRouteId === NOVA_ROTA_VALUE) {
          const novaRota = await criarRota.mutateAsync({
            name: novaRotaNome.trim() || `Rota Manual - ${format(new Date(), 'dd/MM/yyyy')}`,
            driver_id: motoristaEscolhidoId,
            order_ids: [],
          });
          newRouteId = novaRota.id;
        } else {
          await aplicarMotoristaNaRota(selectedRouteId);
        }
      } catch {
        return; // erro já notificado pelo hook correspondente
      }

      editar.mutate(
        {
          id: editingOrder.id,
          franchiseeName: franchiseeName.trim(),
          orderNumber: orderNumber.trim(),
          orderDate: orderDateTimeIso,
          totalAmount: totalAmountNumber,
          notes: notes.trim() || undefined,
          addressStreet: street.trim() || undefined,
          addressNumber: number.trim() || undefined,
          addressNeighborhood: neighborhood.trim() || undefined,
          addressCity: city.trim() || undefined,
          addressLatitude: lat,
          addressLongitude: lng,
          oldRouteId: routeId,
          newRouteId,
        },
        { onSuccess: handleClose },
      );
      return;
    }

    // "+ Criar nova rota": cria a rota primeiro (já com o motorista escolhido
    // aqui mesmo), depois adiciona o pedido manual nela — permite abrir uma
    // segunda rota nomeada (ex: "Rota da Tarde") pro mesmo motorista sem
    // precisar fechar esse diálogo e usar o fluxo "Selecionar Pedidos".
    let targetRouteId = selectedRouteId;
    let currentRouteDriverId: string | null = null;

    try {
      if (selectedRouteId === NOVA_ROTA_VALUE) {
        const novaRota = await criarRota.mutateAsync({
          name: novaRotaNome.trim() || `Rota Manual - ${format(new Date(), 'dd/MM/yyyy')}`,
          driver_id: motoristaEscolhidoId,
          order_ids: [],
        });
        targetRouteId = novaRota.id;
      } else {
        currentRouteDriverId = await aplicarMotoristaNaRota(selectedRouteId);
      }
    } catch {
      return; // erro já notificado pelo hook correspondente
    }

    adicionar.mutate(
      {
        routeId: targetRouteId,
        franchiseeUserId: franchiseeId || null,
        franchiseeName: franchiseeName.trim(),
        orderNumber: orderNumber.trim(),
        orderDate: orderDateTimeIso,
        totalAmount: totalAmountNumber,
        notes: notes.trim() || undefined,
        addressStreet: street.trim() || undefined,
        addressNumber: number.trim() || undefined,
        addressNeighborhood: neighborhood.trim() || undefined,
        addressCity: city.trim() || undefined,
        addressLatitude: lat,
        addressLongitude: lng,
        driverId: motoristaEscolhidoId,
        currentRouteDriverId,
      },
      { onSuccess: handleClose },
    );
  };

  const isPending = adicionar.isPending || editar.isPending || criarRota.isPending || reatribuirMotorista.isPending;
  const canSubmit = franchiseeName.trim() && orderNumber.trim() && orderDate;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-purple-600" />
            {isEditing ? 'Editar Entrega' : 'Adicionar Pedido Manual'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Franqueado */}
          <div className="space-y-2">
            <Label>Franqueado / Cliente</Label>
            {isEditing ? (
              <Input
                placeholder="Nome do cliente / franqueado"
                value={franchiseeName}
                onChange={e => setFranchiseeName(e.target.value)}
              />
            ) : (
              <>
                {loadingFranchisees ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                  </div>
                ) : (
                  <Select
                    value={franchiseeId || '__manual__'}
                    onValueChange={handleFranchiseeChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o franqueado..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__manual__">— Digitar manualmente —</SelectItem>
                      {franchisees.map(f => (
                        <SelectItem key={f.id} value={f.franchisee_user_id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {!franchiseeId && (
                  <Input
                    placeholder="Nome do cliente / franqueado"
                    value={franchiseeName}
                    onChange={e => setFranchiseeName(e.target.value)}
                  />
                )}
              </>
            )}
          </div>

          {/* Rota — escolha explícita de qual rota nomeada do dia recebe essa
              entrega (ex: "Rota da Manhã" x "Rota da Tarde" do mesmo
              motorista), em vez de cair sempre na rota mais recente. Também
              disponível ao editar: trocar a rota aqui MOVE a entrega da rota
              antiga pra rota nova (ex: corrigir uma entrega da manhã que não
              foi finalizada e passar pra rota da tarde). */}
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
                <div className="space-y-2 pl-2 border-l-2 border-purple-200">
                  <Input
                    value={novaRotaNome}
                    onChange={e => setNovaRotaNome(e.target.value)}
                    placeholder="Ex: Rota da Tarde"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setNovaRotaNome('Rota da Manhã')}
                    >
                      Manhã
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setNovaRotaNome('Rota da Tarde')}
                    >
                      Tarde
                    </Button>
                  </div>
                </div>
              )}
          </div>

          {/* Motorista da rota selecionada acima. Trocar aqui REATRIBUI o
              motorista pra rota inteira (todas as paradas dela, não só esta
              entrega) — é assim que "editar o motorista" funciona, já que
              motorista é uma propriedade da rota, não de uma entrega isolada.
              Numa rota nova ("+ Criar nova rota"), define quem assume ela. */}
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

          {/* Nº Pedido + Valor */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-2">
              <Label>Nº Pedido / Nota Fiscal</Label>
              <Input
                placeholder="Ex: NF-00123 ou Pedido #456"
                value={orderNumber}
                onChange={e => setOrderNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={totalAmount}
                onChange={e => setTotalAmount(e.target.value)}
              />
            </div>
          </div>

          {/* Data e Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data do Pedido</Label>
              <Input
                type="date"
                value={orderDate}
                onChange={e => setOrderDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Horário</Label>
              <Input
                type="time"
                value={orderTime}
                onChange={e => setOrderTime(e.target.value)}
              />
            </div>
          </div>

          {/* Endereço de entrega */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-purple-600" />
              Endereço de Entrega
              <span className="text-muted-foreground text-xs font-normal">(para pino no mapa)</span>
            </Label>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Input
                  placeholder="Rua / Avenida"
                  value={street}
                  onChange={e => { setStreet(e.target.value); setGeocodeOk(false); }}
                />
              </div>
              <div>
                <Input
                  placeholder="Nº"
                  value={number}
                  onChange={e => { setNumber(e.target.value); setGeocodeOk(false); }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Bairro"
                value={neighborhood}
                onChange={e => { setNeighborhood(e.target.value); setGeocodeOk(false); }}
              />
              <Input
                placeholder="Cidade"
                value={city}
                onChange={e => { setCity(e.target.value); setGeocodeOk(false); }}
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGeocode}
              disabled={!street || geocoding}
              className="w-full gap-2 text-xs"
            >
              {geocoding ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
              {geocoding ? 'Buscando localização...' : 'Localizar Endereço no Mapa'}
            </Button>

            {geocodeOk && latitude && longitude && (
              <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                Localizado: {latitude.toFixed(5)}, {longitude.toFixed(5)} — pino aparecerá no mapa
              </div>
            )}
            {geocoding === false && latitude === null && street && !geocodeOk && (
              <p className="text-xs text-muted-foreground">Endereço não encontrado. Tente com cidade incluída.</p>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Ou cole: latitude, longitude"
                value={coordsInput}
                onChange={e => setCoordsInput(e.target.value)}
                className="text-xs"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleApplyCoords} disabled={!coordsInput.trim()}>
                Usar
              </Button>
            </div>

            <div ref={mapContainerRef} className="h-48 w-full rounded-lg border overflow-hidden" />
            <p className="text-[11px] text-muted-foreground">
              Não achou o endereço certo? Clique no mapa pra marcar o ponto exato, ou arraste o pino.
            </p>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Textarea
              placeholder="Ex: Caixa extra, produto frágil..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="min-h-[72px] resize-none text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isPending || geocoding}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {(isPending || geocoding) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEditing ? 'Salvar Alterações' : 'Adicionar à Rota'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
