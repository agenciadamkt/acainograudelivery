import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateCheckoutResponse {
  success: boolean;
  checkoutUrl: string;
  order_nsu: string;
  invoice_slug?: string;
  requestId: string;
  error?: string;
}

interface PaymentCheckResponse {
  paid: boolean;
  status: string;
  order_nsu: string;
  transaction_nsu?: string;
  receipt_url?: string;
  amount?: number;
  paid_amount?: number;
  installments?: number;
  capture_method?: string;
  requestId: string;
  error?: string;
}

interface InfinitePayCheckout {
  id: string;
  user_id: string;
  order_id: string;
  order_nsu: string;
  invoice_slug: string | null;
  transaction_nsu: string | null;
  receipt_url: string | null;
  amount: number;
  paid_amount: number | null;
  installments: number | null;
  capture_method: string | null;
  status: string;
  items: any;
  customer: any;
  address: any;
  checkout_url: string | null;
  raw_webhook: any;
  created_at: string;
  updated_at: string;
}

export function useInfinitePayCheckout() {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const createCheckout = async (orderId: string): Promise<CreateCheckoutResponse> => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/infinitepay-create-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ orderId }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar checkout');
      }

      return data;
    } catch (error: any) {
      console.error('Error creating InfinitePay checkout:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const checkPayment = async (params: {
    orderId?: string;
    order_nsu?: string;
    slug?: string;
    transaction_nsu?: string;
  }): Promise<PaymentCheckResponse> => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/infinitepay-payment-check`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(params),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao verificar pagamento');
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['infinitepay-checkout'] });

      return data;
    } catch (error: any) {
      console.error('Error checking payment:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createCheckout,
    checkPayment,
    isLoading,
  };
}

export function useCheckoutByOrderId(orderId: string | undefined) {
  return useQuery({
    queryKey: ['infinitepay-checkout', orderId],
    queryFn: async () => {
      if (!orderId) return null;

      const { data, error } = await supabase
        .from('infinitepay_checkouts')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching checkout:', error);
        return null;
      }

      return data as InfinitePayCheckout | null;
    },
    enabled: !!orderId,
  });
}

export function useCheckoutByOrderNsu(orderNsu: string | undefined) {
  return useQuery({
    queryKey: ['infinitepay-checkout-nsu', orderNsu],
    queryFn: async () => {
      if (!orderNsu) return null;

      const { data, error } = await supabase
        .from('infinitepay_checkouts')
        .select('*')
        .eq('order_nsu', orderNsu)
        .maybeSingle();

      if (error) {
        console.error('Error fetching checkout by NSU:', error);
        return null;
      }

      return data as InfinitePayCheckout | null;
    },
    enabled: !!orderNsu,
  });
}
