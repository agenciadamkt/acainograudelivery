import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay } from 'date-fns';
import { optimizeStopsOrder, type RouteStop } from '@/lib/optimizeRoute';

export interface RotaOrdem {
  orderId: string;
  orderNumber: string;
  sequencia: number;
  customer: { name: string; phone: string };
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    complement: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  totalAmount: number;
  customerNotes: string | null;
  createdAt: string;
  confirmedAt: string | null;
  outForDeliveryAt: string | null;
  deliveredAt: string | null;
  deliveryObservation: string | null;
  proofPhotoUrl: string | null;
  status: string;
  isFranchiseeOrder?: boolean;
  isManualOrder?: boolean;
  // Fatos de trecho (acumulados desde o início da rota) vindos do OSRM na
  // última (re)otimização — null quando a rota nunca foi otimizada com ETA
  // ou quando essa parada foi adicionada depois da última otimização.
  estimatedTravelSeconds?: number | null;
  estimatedDistanceMeters?: number | null;
}

export interface RotaDoDia {
  routeId: string;
  routeName: string;
  driver: { id: string; name: string; phone: string } | null;
  status: 'pendente' | 'em_progresso' | 'concluida' | 'cancelada';
  startedAt: string | null;
  completedAt: string | null;
  estimatedDuration: number | null;
  orders: RotaOrdem[];
}

// SLA da rota — calculado, não armazenado. Só existe ETA da ROTA inteira
// (estimated_duration, opcional), não por parada, então o indicador compara
// progresso real (entregas feitas) com progresso esperado (tempo decorrido
// vs. duração estimada) — não inventa um horário que o banco não tem.
// Exportada daqui (não duplicada) porque é usada tanto no app do motorista
// (MotoristaDashboard.tsx) quanto na visão geral do admin (RotaDoDiaTab.tsx).
export function calcularStatusRota(rota: RotaDoDia): { status: 'no_horario' | 'atencao' | 'atrasado'; atrasoMin: number } | null {
  if (!rota.startedAt || rota.estimatedDuration == null || rota.orders.length === 0) return null;
  const elapsedMin = (Date.now() - new Date(rota.startedAt).getTime()) / 60_000;
  const concluidas = rota.orders.filter(o => o.status === 'delivered').length;
  const progressoReal = concluidas / rota.orders.length;
  const progressoEsperado = Math.min(elapsedMin / rota.estimatedDuration, 1);
  const diff = progressoEsperado - progressoReal;
  const atrasoMin = Math.round(diff * rota.estimatedDuration);
  if (diff > 0.25) return { status: 'atrasado', atrasoMin };
  if (diff > 0.1) return { status: 'atencao', atrasoMin };
  return { status: 'no_horario', atrasoMin: 0 };
}

async function fetchOrderStops(orderIds: string[]): Promise<RouteStop[]> {
  if (orderIds.length === 0) return [];
  const { data } = await supabase
    .from('orders')
    .select('id, delivery_address:customer_addresses(latitude, longitude)')
    .in('id', orderIds);
  return (data ?? [])
    .map((o: any) => {
      const addr = Array.isArray(o.delivery_address) ? o.delivery_address[0] : o.delivery_address;
      return addr?.latitude && addr?.longitude ? { id: o.id, lat: addr.latitude, lng: addr.longitude } : null;
    })
    .filter((s: any): s is RouteStop => !!s);
}

async function fetchManualOrderStops(manualOrderIds: string[]): Promise<RouteStop[]> {
  if (manualOrderIds.length === 0) return [];
  const { data } = await (supabase
    .from('manual_delivery_orders' as any)
    .select('id, address_latitude, address_longitude')
    .in('id', manualOrderIds) as any);
  return (data ?? [])
    .map((m: any) => (m.address_latitude && m.address_longitude
      ? { id: m.id, lat: m.address_latitude, lng: m.address_longitude }
      : null))
    .filter((s: any): s is RouteStop => !!s);
}

// Reordena orderIds/manualOrderIds pela rota mais econômica a partir da loja
// (mesma lógica usada pelo botão "Otimizar Rota"). Retorna as listas originais
// se não houver paradas suficientes com coordenadas ou se o serviço de
// roteamento falhar.
// `stopOrder` é a ordem de visita JÁ INTERCALADA entre pedidos do sistema e
// manuais (na coluna stop_order). order_ids/manual_order_ids continuam
// guardados separados (outras consultas dependem deles), mas sozinhos não
// conseguem representar "manual antes de um pedido do sistema" — só
// stop_order tem essa informação completa, por isso é sempre persistido
// junto em qualquer lugar que chame esta função.
async function autoOptimizeIds(
  orderIds: string[],
  manualOrderIds: string[] = []
): Promise<{ orderIds: string[]; manualOrderIds: string[]; stopOrder: string[] }> {
  const [orderStops, manualStops] = await Promise.all([
    fetchOrderStops(orderIds),
    fetchManualOrderStops(manualOrderIds),
  ]);
  const allStops = [...orderStops, ...manualStops];
  if (allStops.length < 2) {
    return { orderIds, manualOrderIds, stopOrder: [...orderIds, ...manualOrderIds] };
  }

  const optimizedIds = await optimizeStopsOrder(allStops);
  if (!optimizedIds) {
    return { orderIds, manualOrderIds, stopOrder: [...orderIds, ...manualOrderIds] };
  }

  const manualSet = new Set(manualOrderIds);
  const optimizedOrderIds = optimizedIds.filter(id => !manualSet.has(id));
  const optimizedManualIds = optimizedIds.filter(id => manualSet.has(id));
  const leftoverOrderIds = orderIds.filter(id => !optimizedOrderIds.includes(id));
  const leftoverManualIds = manualOrderIds.filter(id => !optimizedManualIds.includes(id));

  return {
    orderIds: [...optimizedOrderIds, ...leftoverOrderIds],
    manualOrderIds: [...optimizedManualIds, ...leftoverManualIds],
    stopOrder: [...optimizedIds, ...leftoverOrderIds, ...leftoverManualIds],
  };
}

function mapFranchiseeStatus(status: string): string {
  const map: Record<string, string> = {
    pending: 'pending',
    approved: 'confirmed',
    shipping: 'out_for_delivery',
    delivered: 'delivered',
    rejected: 'cancelled',
  };
  return map[status] ?? status;
}

async function expandRoute(route: any): Promise<RotaDoDia> {
  const orderIds: string[] = Array.isArray(route.order_ids) ? route.order_ids : [];
  const franchiseeOrderIds: string[] = Array.isArray((route as any).franchisee_order_ids)
    ? (route as any).franchisee_order_ids
    : [];

  let regularOrdems: RotaOrdem[] = [];

  // Pedidos de clientes (delivery)
  if (orderIds.length > 0) {
    // Tenta com campos opcionais; fallback sem eles se coluna não existir
    let ordersData: any[] | null = null;
    const { data: d1, error: e1 } = await supabase
      .from('orders')
      .select(`
        id, order_number, status, total_amount, customer_notes,
        created_at, confirmed_at, out_for_delivery_at, delivered_at,
        delivery_observation, proof_photo_url,
        customer:customers(name, phone),
        delivery_address:customer_addresses(
          street, number, neighborhood, city, complement, latitude, longitude
        )
      `)
      .in('id', orderIds);
    if (!e1) {
      ordersData = d1;
    } else {
      const { data: d2 } = await supabase
        .from('orders')
        .select(`
          id, order_number, status, total_amount, customer_notes,
          created_at, confirmed_at, delivered_at,
          customer:customers(name, phone),
          delivery_address:customer_addresses(
            street, number, neighborhood, city, complement
          )
        `)
        .in('id', orderIds);
      ordersData = d2;
    }

    if (ordersData) {
      regularOrdems = orderIds.map((oid) => {
        const o = ordersData!.find((d: any) => d.id === oid);
        if (!o) return null;
        const addr = Array.isArray(o.delivery_address) ? o.delivery_address[0] : o.delivery_address;
        const cust = Array.isArray(o.customer) ? o.customer[0] : o.customer;
        return {
          orderId: o.id,
          orderNumber: o.order_number,
          sequencia: 0, // definida abaixo, depois de intercalar com os pedidos manuais
          customer: { name: cust?.name ?? '—', phone: cust?.phone ?? '' },
          address: addr ?? null,
          totalAmount: Number(o.total_amount),
          customerNotes: o.customer_notes,
          createdAt: o.created_at,
          confirmedAt: o.confirmed_at,
          outForDeliveryAt: (o as any).out_for_delivery_at ?? null,
          deliveredAt: o.delivered_at,
          deliveryObservation: (o as any).delivery_observation ?? null,
          proofPhotoUrl: (o as any).proof_photo_url ?? null,
          status: o.status,
          isFranchiseeOrder: false,
        } as RotaOrdem;
      }).filter(Boolean) as RotaOrdem[];
    }
  }

  // Pedidos manuais
  const manualOrderIds: string[] = Array.isArray((route as any).manual_order_ids)
    ? (route as any).manual_order_ids
    : [];

  let manualOrdems: RotaOrdem[] = [];
  if (manualOrderIds.length > 0) {
    const { data: mOrders, error: mError } = await (supabase
      .from('manual_delivery_orders' as any)
      .select(`
        id, franchisee_name, order_number, order_date, notes, status,
        address_street, address_number, address_neighborhood, address_city,
        address_latitude, address_longitude, delivered_at, proof_photo_url,
        total_amount
      `)
      .in('id', manualOrderIds) as any);

    if (mError) {
      console.error('Erro ao buscar pedidos manuais:', mError);
    }

    if (mOrders) {
      manualOrdems = (mOrders as any[]).map((mo) => ({
        orderId: mo.id,
        orderNumber: mo.order_number,
        sequencia: 0, // definida abaixo, depois de intercalar com os pedidos do sistema
        customer: { name: mo.franchisee_name, phone: '' },
        address: (mo.address_latitude && mo.address_longitude) ? {
          street: mo.address_street ?? '',
          number: mo.address_number ?? '',
          neighborhood: mo.address_neighborhood ?? '',
          city: mo.address_city ?? '',
          complement: null,
          latitude: Number(mo.address_latitude),
          longitude: Number(mo.address_longitude),
        } : null,
        totalAmount: Number(mo.total_amount) || 0,
        customerNotes: mo.notes ?? null,
        createdAt: mo.order_date,
        confirmedAt: null,
        outForDeliveryAt: route.started_at ?? null,
        deliveredAt: mo.delivered_at ?? (mo.status === 'delivered' ? mo.order_date : null),
        deliveryObservation: null,
        proofPhotoUrl: mo.proof_photo_url ?? null,
        status: mo.status ?? 'out_for_delivery',
        isManualOrder: true,
        isFranchiseeOrder: false,
      }));
    }
  }

  // Intercala pedidos do sistema e manuais pela ordem de visita REAL
  // (stop_order, calculada na otimização). Sem isso, pedidos do sistema
  // sempre apareceriam antes dos manuais (e vice-versa não seria possível de
  // representar), mesmo quando o manual é a parada mais próxima da loja —
  // era exatamente esse o bug: a entrega mais perto não virava nº1 porque
  // pertencia ao "outro grupo". Pedidos sem posição em stop_order (rota
  // antiga, nunca otimizada) ficam ao final, na ordem original — mesmo
  // comportamento de antes desta correção.
  const stopOrder: string[] = Array.isArray((route as any).stop_order) ? (route as any).stop_order : [];
  let orders: RotaOrdem[] = [...regularOrdems, ...manualOrdems];
  if (stopOrder.length > 0) {
    const rank = new Map(stopOrder.map((id, idx) => [id, idx]));
    orders = orders
      .map((o, idx) => ({ o, rank: rank.has(o.orderId) ? rank.get(o.orderId)! : stopOrder.length + idx }))
      .sort((a, b) => a.rank - b.rank)
      .map(({ o }) => o);
  }
  orders.forEach((o, idx) => { o.sequencia = idx + 1; });

  // Pedidos de franquia (abastecimento)
  if (franchiseeOrderIds.length > 0) {
    const { data: fOrders } = await (supabase
      .from('franchisee_orders' as any)
      .select(`id, franchisee_user_id, total_amount, notes, status, created_at, profiles!franchisee_orders_franchisee_user_id_fkey(full_name)`)
      .in('id', franchiseeOrderIds) as any);

    if (fOrders) {
      // Busca o endereço/localização da loja de cada franqueado (cadastrado em /admin/settings)
      const franchiseeUserIds = [...new Set((fOrders as any[]).map(fo => fo.franchisee_user_id).filter(Boolean))];
      let storesByUser: Record<string, any> = {};
      if (franchiseeUserIds.length > 0) {
        const { data: stores } = await supabase
          .from('stores')
          .select('franchisee_user_id, address, address_number, neighborhood, city, latitude, longitude')
          .in('franchisee_user_id', franchiseeUserIds);
        storesByUser = Object.fromEntries((stores ?? []).map((s: any) => [s.franchisee_user_id, s]));
      }

      const franchiseeOrdems: RotaOrdem[] = (fOrders as any[]).map((fo, idx) => {
        const store = storesByUser[fo.franchisee_user_id];
        return {
          orderId: fo.id,
          orderNumber: fo.id.slice(0, 8).toUpperCase(),
          sequencia: orders.length + idx + 1,
          customer: { name: fo.profiles?.full_name ?? 'Franqueado', phone: '' },
          address: (store?.latitude && store?.longitude) ? {
            street: store.address ?? '',
            number: store.address_number ?? '',
            neighborhood: store.neighborhood ?? '',
            city: store.city ?? '',
            complement: null,
            latitude: Number(store.latitude),
            longitude: Number(store.longitude),
          } : null,
          totalAmount: Number(fo.total_amount),
          customerNotes: fo.notes,
          createdAt: fo.created_at,
          confirmedAt: null,
          outForDeliveryAt: route.started_at ?? null,
          deliveredAt: null,
          deliveryObservation: null,
          proofPhotoUrl: null,
          status: mapFranchiseeStatus(fo.status),
          isFranchiseeOrder: true,
        };
      });
      orders = [...orders, ...franchiseeOrdems];
    }
  }

  const driver = route.driver
    ? { id: route.driver_id, name: route.driver.name, phone: route.driver.phone }
    : null;

  return {
    routeId: route.id,
    routeName: route.name,
    driver,
    status: route.status,
    startedAt: route.started_at,
    completedAt: route.completed_at,
    estimatedDuration: (route as any).estimated_duration ?? null,
    orders,
  };
}

// driverId (opcional): filtra rotas de um único fleet_driver — usado pelo app
// do motorista da Frota para achar "minha rota do dia" (sem isso, traz todas
// as rotas do dia, uso atual do admin em RotaDoDiaTab).
export function useRotaDoDia(selectedDate?: string, driverId?: string) {
  const queryClient = useQueryClient();
  const date = selectedDate ?? format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const channel = supabase
      .channel('rota-do-dia-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_routes' }, () => {
        queryClient.invalidateQueries({ queryKey: ['rota-do-dia'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        queryClient.invalidateQueries({ queryKey: ['rota-do-dia'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manual_delivery_orders' }, () => {
        queryClient.invalidateQueries({ queryKey: ['rota-do-dia'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return useQuery({
    queryKey: ['rota-do-dia', date, driverId ?? null],
    queryFn: async () => {
      const dayStart = startOfDay(new Date(date + 'T00:00:00')).toISOString();
      const dayEnd   = endOfDay(new Date(date + 'T00:00:00')).toISOString();

      let query = supabase
        .from('delivery_routes')
        .select('*, driver:fleet_drivers(name, phone)')
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)
        .order('created_at', { ascending: false });

      if (driverId) {
        query = query.eq('driver_id', driverId);
      }

      const { data: routes, error } = await query;

      if (error) throw error;
      if (!routes || routes.length === 0) return [];

      return Promise.all(routes.map(expandRoute));
    },
    refetchInterval: 30_000,
  });
}

export function useCriarRota() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      driver_id: string | null;
      order_ids: string[];
      franchisee_order_ids?: string[];
      estimated_duration?: number | null;
    }) => {
      // Monta a rota já na ordem mais econômica (a partir da loja) antes de
      // inserir — assim o admin não precisa lembrar de clicar em "Otimizar Rota".
      const optimized = await autoOptimizeIds(payload.order_ids);

      // Tenta inserir com todos os campos; se falhar por coluna ausente, tenta sem os opcionais
      const baseRecord: any = {
        name: payload.name,
        driver_id: payload.driver_id ?? null,
        order_ids: optimized.orderIds,
        stop_order: optimized.stopOrder,
        status: 'pendente',
      };
      if (payload.franchisee_order_ids !== undefined) {
        baseRecord.franchisee_order_ids = payload.franchisee_order_ids;
      }
      if (payload.estimated_duration != null) {
        baseRecord.estimated_duration = payload.estimated_duration;
      }

      const { data, error } = await (supabase
        .from('delivery_routes')
        .insert(baseRecord)
        .select()
        .single() as any);

      if (error) {
        // FK ainda aponta para delivery_drivers? Tenta sem driver_id
        // Também serve como fallback para colunas opcionais ausentes
        const isFkError = error.message?.includes('foreign key') || error.code === '23503';
        const fallback: any = {
          name: payload.name,
          driver_id: isFkError ? null : (payload.driver_id ?? null),
          order_ids: optimized.orderIds,
          stop_order: optimized.stopOrder,
          status: 'pendente',
        };
        const { data: d2, error: e2 } = await (supabase
          .from('delivery_routes')
          .insert(fallback)
          .select()
          .single() as any);
        if (e2) throw e2;
        if (isFkError) toast.error('Motorista não vinculado: rode o FIX_FROTA_ROTAS.sql no Supabase para ativar o vínculo com motoristas.', { duration: 8000 });
        return d2;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rota-do-dia'] });
      toast.success('Rota criada com sucesso!');
    },
    onError: (err: any) => toast.error('Erro ao criar rota: ' + err.message),
  });
}

export function useIniciarRota() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      routeId,
      orderIds,
      franchiseeOrderIds,
    }: { routeId: string; orderIds: string[]; franchiseeOrderIds?: string[] }) => {
      const now = new Date().toISOString();

      const { error: routeErr } = await supabase
        .from('delivery_routes')
        .update({ status: 'em_progresso', started_at: now })
        .eq('id', routeId);
      if (routeErr) throw routeErr;

      if (orderIds.length > 0) {
        const { error: ordersErr } = await supabase
          .from('orders')
          .update({ status: 'out_for_delivery', out_for_delivery_at: now } as any)
          .in('id', orderIds);
        if (ordersErr) throw ordersErr;
      }

      if (franchiseeOrderIds && franchiseeOrderIds.length > 0) {
        const { error: fErr } = await (supabase
          .from('franchisee_orders' as any)
          .update({ status: 'shipping' } as any)
          .in('id', franchiseeOrderIds) as any);
        if (fErr) throw fErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rota-do-dia'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Rota iniciada! Motorista em rota.');
    },
    onError: (err: any) => toast.error('Erro ao iniciar rota: ' + err.message),
  });
}

export function useRegistrarEntrega() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      observation,
      isFranchiseeOrder,
      isManualOrder,
      photoUrl,
    }: {
      orderId: string; observation?: string; isFranchiseeOrder?: boolean;
      isManualOrder?: boolean; photoUrl?: string;
    }) => {
      if (isManualOrder) {
        const { error } = await (supabase
          .from('manual_delivery_orders' as any)
          .update({
            status: 'delivered',
            notes: observation ?? null,
            delivered_at: new Date().toISOString(),
            ...(photoUrl ? { proof_photo_url: photoUrl } : {}),
          } as any)
          .eq('id', orderId) as any);
        if (error) throw error;
      } else if (isFranchiseeOrder) {
        const { error } = await (supabase
          .from('franchisee_orders' as any)
          .update({ status: 'delivered' } as any)
          .eq('id', orderId) as any);
        if (error) throw error;
      } else {
        const updates: any = {
          status: 'delivered',
          delivered_at: new Date().toISOString(),
          payment_status: 'paid',
        };
        if (observation !== undefined) updates.delivery_observation = observation;
        if (photoUrl) updates.proof_photo_url = photoUrl;
        const { error } = await supabase.from('orders').update(updates).eq('id', orderId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rota-do-dia'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin_orders'] });
      toast.success('Entrega registrada!');
    },
    onError: (err: any) => toast.error('Erro ao registrar entrega: ' + err.message),
  });
}

export function useSalvarObservacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, observation }: { orderId: string; observation: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ delivery_observation: observation } as any)
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rota-do-dia'] });
      toast.success('Observação salva!');
    },
    onError: (err: any) => toast.error('Erro ao salvar observação: ' + err.message),
  });
}

export function useConcluirRota() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (routeId: string) => {
      const { error } = await supabase
        .from('delivery_routes')
        .update({ status: 'concluida', completed_at: new Date().toISOString() })
        .eq('id', routeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rota-do-dia'] });
      toast.success('Rota concluída!');
    },
    onError: (err: any) => toast.error('Erro ao concluir rota: ' + err.message),
  });
}

// Reatribui o motorista de uma rota já existente — afeta a rota inteira (todas
// as paradas dela), não só uma entrega específica, já que motorista é uma
// propriedade da rota. Usada pelo campo "Motorista" do diálogo de pedido
// manual quando o admin troca o motorista mostrado pra rota selecionada.
export function useReatribuirMotoristaRota() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ routeId, driverId }: { routeId: string; driverId: string | null }) => {
      const { error } = await supabase
        .from('delivery_routes')
        .update({ driver_id: driverId } as any)
        .eq('id', routeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rota-do-dia'] });
    },
    onError: (err: any) => toast.error('Erro ao reatribuir motorista da rota: ' + err.message),
  });
}

export function useAdicionarPedidoManual() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      routeId: string;
      franchiseeUserId: string | null;
      franchiseeName: string;
      orderNumber: string;
      orderDate: string;
      notes?: string;
      addressStreet?: string;
      addressNumber?: string;
      addressNeighborhood?: string;
      addressCity?: string;
      addressLatitude?: number | null;
      addressLongitude?: number | null;
      driverId?: string | null;
      totalAmount?: number;
      // Motorista já atribuído à rota selecionada no painel (routeId), se
      // houver — usado só pra decidir se a escolha de motorista no diálogo é
      // uma TROCA de motorista ou só confirma quem já está na rota.
      currentRouteDriverId?: string | null;
    }) => {
      // 1. Cria o pedido manual
      const { data: newOrder, error: insertError } = await (supabase
        .from('manual_delivery_orders' as any)
        .insert({
          franchisee_user_id: payload.franchiseeUserId,
          franchisee_name: payload.franchiseeName,
          order_number: payload.orderNumber,
          order_date: payload.orderDate,
          total_amount: payload.totalAmount ?? 0,
          notes: payload.notes ?? null,
          status: 'out_for_delivery',
          address_street: payload.addressStreet ?? null,
          address_number: payload.addressNumber ?? null,
          address_neighborhood: payload.addressNeighborhood ?? null,
          address_city: payload.addressCity ?? null,
          address_latitude: payload.addressLatitude ?? null,
          address_longitude: payload.addressLongitude ?? null,
        } as any)
        .select('id')
        .single() as any);
      if (insertError) throw insertError;

      // 2. Resolve a rota de destino. IMPORTANTE: nunca reatribui o driver_id
      //    de uma rota já existente — isso "roubaria" as paradas de quem já
      //    estava com aquela rota. Só procura/cria a rota DE OUTRO motorista
      //    quando o motorista escolhido no diálogo for DIFERENTE do que já
      //    está na rota selecionada (troca de motorista de verdade). Quando o
      //    motorista escolhido é o mesmo da rota (ou a rota ainda não tinha
      //    motorista), usa a rota selecionada no painel diretamente — sem
      //    isso, um motorista com duas rotas no mesmo dia (ex: Manhã/Tarde)
      //    sempre acabava recebendo o pedido manual na rota mais recente
      //    dele, ignorando qual rota o admin tinha selecionado de propósito.
      let targetRouteId = payload.routeId;
      const isTrocaDeMotorista =
        !!payload.driverId && !!payload.currentRouteDriverId && payload.driverId !== payload.currentRouteDriverId;

      if (isTrocaDeMotorista) {
        const dayStart = startOfDay(new Date()).toISOString();
        const dayEnd = endOfDay(new Date()).toISOString();
        const { data: driverRoutes, error: driverRouteError } = await supabase
          .from('delivery_routes')
          .select('id')
          .eq('driver_id', payload.driverId)
          .in('status', ['pendente', 'em_progresso'])
          .gte('created_at', dayStart)
          .lte('created_at', dayEnd)
          .order('created_at', { ascending: false })
          .limit(1);
        if (driverRouteError) throw driverRouteError;

        if (driverRoutes && driverRoutes.length > 0) {
          targetRouteId = driverRoutes[0].id;
        } else {
          const { data: newRoute, error: newRouteError } = await (supabase
            .from('delivery_routes')
            .insert({
              name: `Rota Manual - ${format(new Date(), 'dd/MM/yyyy')}`,
              driver_id: payload.driverId,
              order_ids: [],
              status: 'pendente',
            } as any)
            .select('id')
            .single() as any);
          if (newRouteError) throw newRouteError;
          targetRouteId = (newRoute as any).id;
        }
      }

      // 3. Adiciona o ID na lista da rota (Supabase não suporta array_append diretamente via JS SDK,
      //    então buscamos o array atual e atualizamos)
      const { data: route, error: fetchError } = await (supabase
        .from('delivery_routes')
        .select('order_ids, manual_order_ids')
        .eq('id', targetRouteId)
        .single() as any);
      if (fetchError) throw fetchError;

      const currentOrderIds: string[] = Array.isArray((route as any).order_ids)
        ? (route as any).order_ids
        : [];
      const currentManualIds: string[] = Array.isArray((route as any).manual_order_ids)
        ? (route as any).manual_order_ids
        : [];
      const updatedManualIds = [...currentManualIds, (newOrder as any).id];

      // Reotimiza a rota inteira (pedidos + manuais) já com a nova parada,
      // em vez de simplesmente jogar o pedido manual no fim da sequência.
      const optimized = await autoOptimizeIds(currentOrderIds, updatedManualIds);

      const routeUpdate: any = {
        order_ids: optimized.orderIds,
        manual_order_ids: optimized.manualOrderIds,
        stop_order: optimized.stopOrder,
      };

      const { error: updateError } = await (supabase
        .from('delivery_routes')
        .update(routeUpdate)
        .eq('id', targetRouteId) as any);
      if (updateError) throw updateError;

      return { routeId: targetRouteId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rota-do-dia'] });
      toast.success('Pedido manual adicionado à rota!');
    },
    onError: (err: any) => toast.error('Erro ao adicionar pedido: ' + err.message),
  });
}

// Remove uma única entrega da rota, sem afetar as demais. Pedido manual só
// existe no contexto da rota, então removê-lo significa excluí-lo de verdade;
// pedidos normais/franquia continuam existindo fora da rota e voltam pro
// status "disponível" se já estavam em trânsito, pra não ficarem presos em
// out_for_delivery/shipping sem nenhuma rota responsável por eles.
export function useRemoverPedidoDaRota() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      routeId: string;
      orderId: string;
      isFranchiseeOrder?: boolean;
      isManualOrder?: boolean;
    }) => {
      const field = payload.isManualOrder
        ? 'manual_order_ids'
        : payload.isFranchiseeOrder
          ? 'franchisee_order_ids'
          : 'order_ids';

      const { data: route, error: fetchError } = await supabase
        .from('delivery_routes')
        .select(field)
        .eq('id', payload.routeId)
        .single();
      if (fetchError) throw fetchError;

      const currentIds: string[] = Array.isArray((route as any)?.[field]) ? (route as any)[field] : [];
      const updatedIds = currentIds.filter(id => id !== payload.orderId);

      const { error: updateError } = await supabase
        .from('delivery_routes')
        .update({ [field]: updatedIds } as any)
        .eq('id', payload.routeId);
      if (updateError) throw updateError;

      if (payload.isManualOrder) {
        await (supabase.from('manual_delivery_orders' as any).delete().eq('id', payload.orderId) as any);
        return;
      }

      if (payload.isFranchiseeOrder) {
        const { data: fo } = await (supabase
          .from('franchisee_orders' as any)
          .select('status')
          .eq('id', payload.orderId)
          .single() as any);
        if (fo?.status === 'shipping') {
          await (supabase
            .from('franchisee_orders' as any)
            .update({ status: 'approved' } as any)
            .eq('id', payload.orderId) as any);
        }
      } else {
        const { data: o } = await supabase.from('orders').select('status').eq('id', payload.orderId).single();
        if (o?.status === 'out_for_delivery') {
          await supabase
            .from('orders')
            .update({ status: 'ready', out_for_delivery_at: null } as any)
            .eq('id', payload.orderId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rota-do-dia'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-prontos'] });
      toast.success('Entrega removida da rota!');
    },
    onError: (err: any) => toast.error('Erro ao remover entrega da rota: ' + err.message),
  });
}

// Edita os dados de um pedido manual já existente (nome, nº, data, endereço,
// observações), sem precisar excluir e recriar a parada na rota.
export function useEditarPedidoManual() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      franchiseeName: string;
      orderNumber: string;
      orderDate: string;
      notes?: string;
      addressStreet?: string;
      addressNumber?: string;
      addressNeighborhood?: string;
      addressCity?: string;
      addressLatitude?: number | null;
      addressLongitude?: number | null;
      totalAmount?: number;
      // Rota atual e rota de destino — quando diferentes, move a entrega de
      // uma rota pra outra (ex: corrigir uma entrega lançada na rota da
      // manhã que não foi finalizada, e passar pra rota da tarde).
      oldRouteId?: string;
      newRouteId?: string;
    }) => {
      const { error } = await (supabase
        .from('manual_delivery_orders' as any)
        .update({
          franchisee_name: payload.franchiseeName,
          order_number: payload.orderNumber,
          order_date: payload.orderDate,
          total_amount: payload.totalAmount ?? 0,
          notes: payload.notes ?? null,
          address_street: payload.addressStreet ?? null,
          address_number: payload.addressNumber ?? null,
          address_neighborhood: payload.addressNeighborhood ?? null,
          address_city: payload.addressCity ?? null,
          address_latitude: payload.addressLatitude ?? null,
          address_longitude: payload.addressLongitude ?? null,
        } as any)
        .eq('id', payload.id) as any);
      if (error) throw error;

      if (payload.oldRouteId && payload.newRouteId && payload.oldRouteId !== payload.newRouteId) {
        const { data: oldRoute, error: oldRouteError } = await supabase
          .from('delivery_routes')
          .select('manual_order_ids')
          .eq('id', payload.oldRouteId)
          .single();
        if (oldRouteError) throw oldRouteError;

        const oldManualIds: string[] = Array.isArray((oldRoute as any)?.manual_order_ids)
          ? (oldRoute as any).manual_order_ids.filter((id: string) => id !== payload.id)
          : [];
        const { error: removeError } = await supabase
          .from('delivery_routes')
          .update({ manual_order_ids: oldManualIds } as any)
          .eq('id', payload.oldRouteId);
        if (removeError) throw removeError;

        const { data: newRoute, error: newRouteError } = await supabase
          .from('delivery_routes')
          .select('order_ids, manual_order_ids')
          .eq('id', payload.newRouteId)
          .single();
        if (newRouteError) throw newRouteError;

        const newOrderIds: string[] = Array.isArray((newRoute as any)?.order_ids) ? (newRoute as any).order_ids : [];
        const newManualIds: string[] = [
          ...(Array.isArray((newRoute as any)?.manual_order_ids) ? (newRoute as any).manual_order_ids : []),
          payload.id,
        ];
        const optimized = await autoOptimizeIds(newOrderIds, newManualIds);
        const { error: addError } = await supabase
          .from('delivery_routes')
          .update({
            order_ids: optimized.orderIds,
            manual_order_ids: optimized.manualOrderIds,
            stop_order: optimized.stopOrder,
          } as any)
          .eq('id', payload.newRouteId);
        if (addError) throw addError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rota-do-dia'] });
      toast.success('Entrega atualizada!');
    },
    onError: (err: any) => toast.error('Erro ao atualizar entrega: ' + err.message),
  });
}

export function useDespacharFranqueado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      franchiseeOrderId,
      franchiseeName,
    }: { franchiseeOrderId: string; franchiseeName: string }) => {
      const now = new Date().toISOString();
      const routeName = `Entrega Franquia: ${franchiseeName}`;

      const routeRecord: any = {
        name: routeName,
        driver_id: null,
        order_ids: [],
        franchisee_order_ids: [franchiseeOrderId],
        status: 'em_progresso',
        started_at: now,
      };
      const { error: routeError } = await (supabase
        .from('delivery_routes')
        .insert(routeRecord) as any);
      if (routeError) {
        // Fallback sem franchisee_order_ids se coluna ainda não existe
        const { error: fallbackError } = await supabase
          .from('delivery_routes')
          .insert({ name: routeName, driver_id: null, order_ids: [], status: 'em_progresso', started_at: now });
        if (fallbackError) throw fallbackError;
      }

      const { error: orderError } = await (supabase
        .from('franchisee_orders' as any)
        .update({ status: 'shipping' } as any)
        .eq('id', franchiseeOrderId) as any);
      if (orderError) throw orderError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rota-do-dia'] });
      queryClient.invalidateQueries({ queryKey: ['admin_orders'] });
      toast.success('Carga despachada! Veja em Frota → Rotas.');
    },
    onError: (err: any) => toast.error('Erro ao despachar: ' + err.message),
  });
}

export function useExcluirRotas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (routeIds: string[]) => {
      // Limpa pedidos manuais associados às rotas excluídas
      const { data: routes } = await supabase
        .from('delivery_routes')
        .select('manual_order_ids')
        .in('id', routeIds);

      const manualIds = (routes ?? [])
        .flatMap((r: any) => (Array.isArray(r.manual_order_ids) ? r.manual_order_ids : []));

      if (manualIds.length > 0) {
        await (supabase
          .from('manual_delivery_orders' as any)
          .delete()
          .in('id', manualIds) as any);
      }

      const { error } = await supabase
        .from('delivery_routes')
        .delete()
        .in('id', routeIds);
      if (error) throw error;
    },
    onSuccess: (_data, routeIds) => {
      queryClient.invalidateQueries({ queryKey: ['rota-do-dia'] });
      toast.success(routeIds.length > 1 ? `${routeIds.length} rotas excluídas!` : 'Rota excluída!');
    },
    onError: (err: any) => toast.error('Erro ao excluir rota(s): ' + err.message),
  });
}

export function useOtimizarRota() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      routeId, orderIds, manualOrderIds, stopOrder,
    }: { routeId: string; orderIds: string[]; manualOrderIds?: string[]; stopOrder?: string[] }) => {
      const updates: any = { order_ids: orderIds };
      if (manualOrderIds !== undefined) updates.manual_order_ids = manualOrderIds;
      if (stopOrder !== undefined) updates.stop_order = stopOrder;
      const { error } = await supabase
        .from('delivery_routes')
        .update(updates)
        .eq('id', routeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rota-do-dia'] });
      toast.success('Rota otimizada com sucesso!');
    },
    onError: (err: any) => toast.error('Erro ao otimizar rota: ' + err.message),
  });
}

export function usePedidosProntos() {
  const { currentStore } = useStore();
  return useQuery({
    queryKey: ['pedidos-prontos', currentStore?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, order_number, total_amount, customer_notes,
          customer:customers(name, phone),
          delivery_address:customer_addresses(neighborhood, city)
        `)
        .eq('store_id', currentStore!.id)
        .eq('status', 'ready')
        .eq('order_type', 'delivery')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!currentStore?.id,
  });
}

export interface Comprovante {
  id: string;
  tipo: 'order' | 'manual';
  orderNumber: string;
  destinatario: string;
  deliveredAt: string | null;
  proofPhotoUrl: string;
  routeName: string | null;
  driverName: string | null;
}

// Comprovantes (foto + hora) de entregas já registradas — vinculados ao
// PEDIDO (orders.proof_photo_url / manual_delivery_orders.proof_photo_url),
// e aqui também resolvemos a rota/motorista que fez a entrega para exibição.
export function useComprovantesEntrega() {
  return useQuery({
    queryKey: ['comprovantes-entrega'],
    queryFn: async () => {
      const [ordersRes, manualRes, routesRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id, order_number, delivered_at, proof_photo_url, customer:customers(name)')
          .not('proof_photo_url', 'is', null)
          .order('delivered_at', { ascending: false }),
        (supabase
          .from('manual_delivery_orders' as any)
          .select('id, order_number, delivered_at, proof_photo_url, franchisee_name')
          .not('proof_photo_url', 'is', null)
          .order('delivered_at', { ascending: false }) as any),
        supabase
          .from('delivery_routes')
          .select('id, name, order_ids, manual_order_ids, driver:fleet_drivers(name)'),
      ]);

      const routes = (routesRes.data ?? []) as any[];
      const findRoute = (id: string, isManual: boolean) =>
        routes.find(r => {
          const arr = isManual ? r.manual_order_ids : r.order_ids;
          return Array.isArray(arr) && arr.includes(id);
        });

      const fromOrders: Comprovante[] = ((ordersRes.data ?? []) as any[]).map(o => {
        const route = findRoute(o.id, false);
        const cust = Array.isArray(o.customer) ? o.customer[0] : o.customer;
        return {
          id: o.id,
          tipo: 'order',
          orderNumber: o.order_number,
          destinatario: cust?.name ?? '—',
          deliveredAt: o.delivered_at,
          proofPhotoUrl: o.proof_photo_url,
          routeName: route?.name ?? null,
          driverName: route?.driver?.name ?? null,
        };
      });

      const fromManual: Comprovante[] = ((manualRes.data ?? []) as any[]).map(m => {
        const route = findRoute(m.id, true);
        return {
          id: m.id,
          tipo: 'manual',
          orderNumber: m.order_number,
          destinatario: m.franchisee_name,
          deliveredAt: m.delivered_at,
          proofPhotoUrl: m.proof_photo_url,
          routeName: route?.name ?? null,
          driverName: route?.driver?.name ?? null,
        };
      });

      return [...fromOrders, ...fromManual].sort(
        (a, b) => new Date(b.deliveredAt ?? 0).getTime() - new Date(a.deliveredAt ?? 0).getTime()
      );
    },
  });
}
