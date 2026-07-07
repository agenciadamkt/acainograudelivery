import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NewFranchiseeOrderAlertData {
  id: string;
  franchiseeName: string;
  totalAmount: number;
  paymentMethod: string;
  createdAt: string;
}

// Resolve o nome de exibição de um único pedido recém-criado — mesma regra
// usada na listagem de OrderManagement.tsx (profiles.full_name, com fallback
// pro nome da loja via user_unidades quando o perfil nunca teve nome
// preenchido), só que pra 1 id por vez (evento de realtime).
async function resolveFranchiseeName(franchiseeUserId: string): Promise<string> {
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('full_name')
    .eq('id', franchiseeUserId)
    .single();
  if (profile?.full_name) return profile.full_name;

  const { data: unidade } = await (supabase as any)
    .from('user_unidades')
    .select('store:stores(name)')
    .eq('usuario_id', franchiseeUserId)
    .limit(1)
    .single();
  if (unidade?.store?.name) return unidade.store.name;

  return 'Unidade não identificada';
}

// Alerta global de novo pedido de franquia — mesmo padrão sonoro/visual do
// "chegou pedido" do Delivery (useRealtimeOrders.ts), mas independente: som
// em loop que só para quando o colaborador clica "OK" no diálogo. Montado
// UMA ÚNICA VEZ na raiz do App (acima de <Routes>, não dentro de um layout
// específico) — AdminLayout não envolve todas as páginas (ex: /admin/hub
// renderiza <GrauOSHub /> direto), então só funcionaria nas telas que usam
// aquele layout. `enabled` evita assinar o canal antes de saber se há
// sessão de colaborador (staff/manager/admin).
export function useRealtimeFranchiseeOrders(enabled: boolean) {
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [newOrderAlert, setNewOrderAlert] = useState<NewFranchiseeOrderAlertData | null>(null);

  useEffect(() => {
    const audio = new Audio('/sounds/chegou.mp3');
    audio.loop = true;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  const playSound = () => {
    audioRef.current?.play().catch(() => {
      // Navegador pode bloquear autoplay sem interação prévia do usuário —
      // o diálogo visual ainda aparece normalmente nesse caso.
    });
  };

  const stopSound = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const clearNewOrderAlert = () => {
    setNewOrderAlert(null);
    stopSound();
  };

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('global-franchisee-order-alert')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'franchisee_orders' },
        async (payload) => {
          queryClient.invalidateQueries({ queryKey: ['admin_orders'] });

          const order = payload.new as any;
          const franchiseeName = order.franchisee_user_id
            ? await resolveFranchiseeName(order.franchisee_user_id)
            : 'Franqueado';

          setNewOrderAlert({
            id: order.id,
            franchiseeName,
            totalAmount: Number(order.total_amount) || 0,
            paymentMethod: order.payment_method || '—',
            createdAt: order.created_at,
          });
          playSound();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      stopSound();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, enabled]);

  return { newOrderAlert, clearNewOrderAlert };
}
