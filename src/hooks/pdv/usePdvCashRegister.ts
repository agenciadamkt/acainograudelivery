
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { toast } from 'sonner';
import { logAudit } from '@/lib/audit';

const deviceInfo = () => (typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 160) : null);

export function usePdvCashRegister() {
    const { user } = useAuth();
    const { currentStore } = useStore();
    const queryClient = useQueryClient();

    // 1. Current open register
    const { data: currentRegister, isLoading: isLoadingRegister } = useQuery({
        queryKey: ['pdv_cash_register', user?.id],
        queryFn: async () => {
            if (!user) return null;
            const { data, error } = await supabase
                .from('pdv_cash_registers')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'open')
                .maybeSingle();
            if (error) throw error;
            return data;
        },
        enabled: !!user,
    });

    // 2. Cash movements (sangria / suprimento)
    const { data: movements } = useQuery({
        queryKey: ['pdv_movements', currentRegister?.id],
        queryFn: async () => {
            if (!currentRegister) return [];
            const { data, error } = await supabase
                .from('pdv_cash_movements')
                .select('*')
                .eq('cash_register_id', currentRegister.id)
                .order('created_at', { ascending: true });
            if (error) throw error;
            return data;
        },
        enabled: !!currentRegister,
    });

    // 3. PDV sales for this register (all payment methods)
    const { data: pdvSalesData } = useQuery({
        queryKey: ['pdv_register_sales', currentRegister?.id],
        queryFn: async () => {
            if (!currentRegister) return [];
            const { data, error } = await supabase
                .from('pdv_orders')
                .select('amount_paid, payment_method')
                .eq('cash_register_id', currentRegister.id)
                .eq('status', 'paid');
            if (error) throw error;
            return data || [];
        },
        enabled: !!currentRegister,
        refetchInterval: 30_000,
    });

    // 4. Delivery sales since register opened (linked by store + time window)
    const { data: deliverySalesData } = useQuery({
        queryKey: ['pdv_delivery_sales', currentRegister?.id, currentStore?.id],
        queryFn: async () => {
            if (!currentRegister || !currentStore?.id) return [];
            const { data, error } = await supabase
                .from('orders')
                .select('total_amount, payment_method, order_type')
                .eq('store_id', currentStore.id)
                .eq('payment_status', 'paid')
                .neq('status', 'cancelled')
                .gte('created_at', currentRegister.opened_at);
            if (error) throw error;
            return data || [];
        },
        enabled: !!currentRegister && !!currentStore?.id,
        refetchInterval: 30_000,
    });

    // Compute PDV summary
    const salesSummary = useMemo(() => {
        const byMethod: Record<string, number> = {};
        let total = 0;
        let moneyTotal = 0;
        (pdvSalesData || []).forEach((row: any) => {
            const method = row.payment_method || 'money';
            const amount = Number(row.amount_paid);
            byMethod[method] = (byMethod[method] || 0) + amount;
            total += amount;
            if (method === 'money') moneyTotal += amount;
        });
        return { total, moneyTotal, count: (pdvSalesData || []).length, byMethod };
    }, [pdvSalesData]);

    // Compute Delivery summary
    const deliverySummary = useMemo(() => {
        const byMethod: Record<string, number> = {};
        let total = 0;
        let moneyTotal = 0;
        (deliverySalesData || []).forEach((row: any) => {
            const method = row.payment_method || 'dinheiro';
            const amount = Number(row.total_amount);
            byMethod[method] = (byMethod[method] || 0) + amount;
            total += amount;
            if (method === 'dinheiro') moneyTotal += amount;
        });
        return { total, moneyTotal, count: (deliverySalesData || []).length, byMethod };
    }, [deliverySalesData]);

    // Open register
    const openRegister = useMutation({
        mutationFn: async ({ openingAmount, operatorId, physicalRegisterId }: { openingAmount: number; operatorId?: string | null; physicalRegisterId?: string | null }) => {
            if (!user) throw new Error('No user');
            const { data: existing } = await supabase
                .from('pdv_cash_registers')
                .select('id')
                .eq('user_id', user.id)
                .eq('status', 'open')
                .maybeSingle();
            if (existing) throw new Error('Já existe um caixa aberto para este usuário.');
            const { data: inserted, error } = await (supabase as any).from('pdv_cash_registers').insert({
                user_id: user.id,
                store_id: currentStore?.id ?? null,
                operator_id: operatorId ?? null,
                physical_register_id: physicalRegisterId ?? null,
                opening_amount: openingAmount,
                status: 'open',
                opened_at: new Date().toISOString(),
                device: deviceInfo(),
            }).select('id').single();
            if (error) throw error;
            await logAudit({ entity_type: 'pdv_cash_register', entity_id: inserted?.id, action: 'abertura', user_id: user.id, operator_id: operatorId, store_id: currentStore?.id, details: { opening_amount: openingAmount } });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pdv_cash_register'] });
            toast.success('Caixa aberto com sucesso!');
        },
        onError: (err) => toast.error('Erro ao abrir caixa: ' + err.message),
    });

    // Close register
    const closeRegister = useMutation({
        mutationFn: async ({ closingAmount, notes, checkedById }: { closingAmount: number; notes?: string; checkedById?: string | null }) => {
            if (!currentRegister) throw new Error('No open register');
            const opening = Number(currentRegister.opening_amount);
            const supply = (movements || []).filter(m => m.type === 'suprimento').reduce((s, m) => s + Number(m.amount), 0);
            const bleed = (movements || []).filter(m => m.type === 'sangria').reduce((s, m) => s + Number(m.amount), 0);
            // Physical cash expected = opening + cash pdv sales + cash delivery sales + supply - bleed
            const expected = opening + salesSummary.moneyTotal + deliverySummary.moneyTotal + supply - bleed;
            const difference = closingAmount - expected;
            const { error } = await (supabase as any).from('pdv_cash_registers').update({
                status: 'closed',
                closed_at: new Date().toISOString(),
                closed_by: user?.id ?? null,
                closing_amount: closingAmount,
                expected_amount: expected,
                difference,
                checked_by_id: checkedById ?? null,
                notes,
            }).eq('id', currentRegister.id);
            if (error) throw error;
            await logAudit({ entity_type: 'pdv_cash_register', entity_id: currentRegister.id, action: 'fechamento', user_id: user?.id, operator_id: (currentRegister as any).operator_id, store_id: currentStore?.id, details: { closing_amount: closingAmount, expected, difference } });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pdv_cash_register'] });
            toast.success('Caixa fechado com sucesso!');
        },
        onError: (err) => toast.error('Erro ao fechar caixa: ' + err.message),
    });

    // Add movement
    const addMovement = useMutation({
        mutationFn: async ({ type, amount, reason, operatorId }: { type: 'sangria' | 'suprimento'; amount: number; reason: string; operatorId?: string | null }) => {
            if (!currentRegister || !user) throw new Error('No open register');
            const op = operatorId ?? (currentRegister as any).operator_id ?? null;
            const { error } = await (supabase as any).from('pdv_cash_movements').insert({
                cash_register_id: currentRegister.id,
                user_id: user.id,
                operator_id: op,
                type,
                amount,
                reason,
            });
            if (error) throw error;
            await logAudit({ entity_type: 'pdv_cash_register', entity_id: currentRegister.id, action: type, user_id: user.id, operator_id: op, store_id: currentStore?.id, reason, details: { amount } });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pdv_movements'] });
            toast.success('Movimentação registrada!');
        },
        onError: () => toast.error('Erro ao registrar movimentação'),
    });

    return {
        currentRegister,
        isLoadingRegister,
        movements,
        salesSummary,
        deliverySummary,
        openRegister,
        closeRegister,
        addMovement,
    };
}
