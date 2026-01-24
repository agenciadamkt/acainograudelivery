import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useStore } from '@/contexts/StoreContext';

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  store_id: string;
  order_type: 'delivery' | 'pickup' | 'dine_in';
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  payment_method: string;
  payment_status: string;
  subtotal: number;
  delivery_fee: number;
  discount_amount: number;
  total_amount: number;
  customer_notes: string | null;
  cancellation_reason: string | null;
  table_number: string | null;
  delivery_address_id: string | null;
  scheduled_for: string | null;
  confirmed_at: string | null;
  prepared_at: string | null;
  ready_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  customer?: any;
  delivery_address?: any;
  items?: any[];
}

interface OrderFilters {
  status?: string;
  order_type?: string;
  date_from?: string;
  date_to?: string;
  customer_id?: string;
}

export function useOrders(filters?: OrderFilters) {
  const { currentStore } = useStore();
  const queryClient = useQueryClient();

  // Setup Realtime Subscription
  useEffect(() => {
    if (!currentStore?.id) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `store_id=eq.${currentStore.id}`,
        },
        (payload) => {
          // Invalidate cache to refresh list
          queryClient.invalidateQueries({ queryKey: ['orders'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentStore?.id, queryClient]);

  return useQuery({
    queryKey: ['orders', currentStore?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          customer:customers(id, name, phone, email),
          delivery_address:customer_addresses(street, number, neighborhood, city),
          items:order_items(
            *,
            product:products(name, base_image_url),
            size:product_sizes(name, ml_size),
            toppings:order_item_toppings(
              *,
              topping:toppings(name, image_url)
            )
          )
        `)
        .order('created_at', { ascending: false });

      // No contexto admin, filtrar por loja
      // No contexto cliente, não filtrar por loja quando há customer_id
      if (currentStore?.id && !filters?.customer_id) {
        query = query.eq('store_id', currentStore.id);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.order_type) {
        query = query.eq('order_type', filters.order_type);
      }
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }
      if (filters?.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Order[];
    },
    enabled: !!currentStore?.id || !!filters?.customer_id,
  });
}

export function useOrderById(orderId: string) {
  return useQuery({
    queryKey: ['orders', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(id, name, phone, email),
          delivery_address:customer_addresses(street, number, complement, neighborhood, city, state, zipcode),
          items:order_items(
            *,
            product:products(name, base_image_url),
            size:product_sizes(name, ml_size),
            toppings:order_item_toppings(
              *,
              topping:toppings(name, price, image_url)
            )
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      return data as Order;
    },
    enabled: !!orderId,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (order: any) => {
      const { data, error } = await supabase
        .from('orders')
        .insert(order)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({ title: 'Pedido criado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar pedido',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const updates: any = { status };

      // Atualizar timestamps baseado no status
      if (status === 'confirmed') updates.confirmed_at = new Date().toISOString();
      if (status === 'preparing') updates.prepared_at = new Date().toISOString();
      if (status === 'ready') updates.ready_at = new Date().toISOString();
      if (status === 'delivered') {
        updates.delivered_at = new Date().toISOString();
        updates.payment_status = 'paid';
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({ title: 'Status do pedido atualizado!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      const { data, error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({ title: 'Pedido cancelado' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao cancelar pedido',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useOrderStats(dateFrom?: string, dateTo?: string) {
  const { currentStore } = useStore();

  return useQuery({
    queryKey: ['order-stats', currentStore?.id, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('id, total_amount, status, created_at');

      if (currentStore?.id) {
        query = query.eq('store_id', currentStore.id);
      }

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;

      const total = data.length;
      const totalRevenue = data.reduce((sum, order) => sum + Number(order.total_amount), 0);
      const avgTicket = total > 0 ? totalRevenue / total : 0;
      const byStatus = data.reduce((acc: any, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});

      return {
        total,
        totalRevenue,
        avgTicket,
        byStatus,
      };
    },
    enabled: !!currentStore?.id,
  });
}
