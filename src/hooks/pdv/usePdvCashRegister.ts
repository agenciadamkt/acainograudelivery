
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function usePdvCashRegister() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // 1. Get Current Open Register
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
        enabled: !!user
    });

    // 2. Get Movements for Current Register
    const { data: movements } = useQuery({
        queryKey: ['pdv_movements', currentRegister?.id],
        queryFn: async () => {
            if (!currentRegister) return [];
            const { data, error } = await supabase
                .from('pdv_cash_movements')
                .select('*')
                .eq('cash_register_id', currentRegister.id);
            if (error) throw error;
            return data;
        },
        enabled: !!currentRegister
    });

    // 3. Get Sales for Current Register (all payment methods)
    const { data: salesSummary } = useQuery({
        queryKey: ['pdv_register_sales', currentRegister?.id],
        queryFn: async () => {
            if (!currentRegister) return { total: 0, count: 0, byMethod: {} };
            const { data, error } = await supabase
                .from('pdv_orders')
                .select('amount_paid, payment_method')
                .eq('cash_register_id', currentRegister.id)
                .eq('status', 'paid');

            if (error) throw error;

            const byMethod: Record<string, number> = {};
            let moneyTotal = 0;
            data.forEach(row => {
                const method = row.payment_method || 'money';
                byMethod[method] = (byMethod[method] || 0) + Number(row.amount_paid);
                if (method === 'money') moneyTotal += Number(row.amount_paid);
            });

            return { total: moneyTotal, count: data.length, byMethod };
        },
        enabled: !!currentRegister
    });

    // Open Register
    const openRegister = useMutation({
        mutationFn: async (openingAmount: number) => {
            if (!user) throw new Error("No user");

            // Double check if already open to avoid race conditions
            const { data: existing } = await supabase
                .from('pdv_cash_registers')
                .select('id')
                .eq('user_id', user.id)
                .eq('status', 'open')
                .maybeSingle();

            if (existing) throw new Error("Já existe um caixa aberto para este usuário.");

            const { error } = await supabase.from('pdv_cash_registers').insert({
                user_id: user.id,
                opening_amount: openingAmount,
                status: 'open',
                opened_at: new Date().toISOString()
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pdv_cash_register'] });
            toast.success("Caixa aberto com sucesso!");
        },
        onError: (err) => toast.error("Erro ao abrir caixa: " + err.message)
    });

    // Close Register
    const closeRegister = useMutation({
        mutationFn: async ({ closingAmount, notes }: { closingAmount: number, notes?: string }) => {
            if (!currentRegister) throw new Error("No open register");

            // Calculate expected
            const opening = Number(currentRegister.opening_amount);
            const supply = movements?.filter(m => m.type === 'suprimento').reduce((s, m) => s + Number(m.amount), 0) || 0;
            const bleed = movements?.filter(m => m.type === 'sangria').reduce((s, m) => s + Number(m.amount), 0) || 0;
            const sales = salesSummary?.total || 0;
            const expected = opening + sales + supply - bleed;

            const { error } = await supabase.from('pdv_cash_registers').update({
                status: 'closed',
                closed_at: new Date().toISOString(),
                closing_amount: closingAmount,
                expected_amount: expected,
                notes: notes
            }).eq('id', currentRegister.id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pdv_cash_register'] });
            toast.success("Caixa fechado com sucesso!");
        },
        onError: (err) => toast.error("Erro ao fechar caixa: " + err.message)
    });

    // Add Movement
    const addMovement = useMutation({
        mutationFn: async ({ type, amount, reason }: { type: 'sangria' | 'suprimento', amount: number, reason: string }) => {
            if (!currentRegister || !user) throw new Error("No open register");
            const { error } = await supabase.from('pdv_cash_movements').insert({
                cash_register_id: currentRegister.id,
                user_id: user.id,
                type,
                amount,
                reason
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pdv_movements'] });
            toast.success("Movimentação registrada!");
        },
        onError: (err) => toast.error("Erro ao registrar movimentação")
    });

    return {
        currentRegister,
        isLoadingRegister,
        movements,
        salesSummary,
        openRegister,
        closeRegister,
        addMovement
    };
}
