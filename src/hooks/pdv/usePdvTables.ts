import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PdvTable {
    id: string;
    user_id: string;
    number: number;
    capacity: number;
    status: 'free' | 'occupied' | 'reserved';
    current_order_id: string | null;
    created_at: string;
    updated_at: string;
}

// Fetch all tables
export function usePdvTables() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['pdv_tables', user?.id],
        queryFn: async () => {
            if (!user) return [];

            const { data, error } = await supabase
                .from('pdv_tables' as any)
                .select('*')
                .eq('user_id', user.id)
                .order('number', { ascending: true });

            if (error) throw error;
            return (data || []) as unknown as PdvTable[];
        },
        enabled: !!user,
    });
}

// Create table
export function useCreatePdvTable() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (tableData: { number: number; capacity: number }) => {
            if (!user) throw new Error('User not authenticated');

            const { data, error } = await supabase
                .from('pdv_tables' as any)
                .insert({
                    user_id: user.id,
                    number: tableData.number,
                    capacity: tableData.capacity,
                    status: 'free',
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pdv_tables'] });
            toast.success('Mesa criada com sucesso!');
        },
        onError: (error: any) => {
            if (error.code === '23505') {
                toast.error('Já existe uma mesa com este número');
            } else {
                toast.error('Erro ao criar mesa: ' + error.message);
            }
        },
    });
}

// Update table
export function useUpdatePdvTable() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<PdvTable> & { id: string }) => {
            const { data, error } = await supabase
                .from('pdv_tables' as any)
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pdv_tables'] });
            toast.success('Mesa atualizada com sucesso!');
        },
        onError: (error: any) => {
            toast.error('Erro ao atualizar mesa: ' + error.message);
        },
    });
}

// Delete table
export function useDeletePdvTable() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('pdv_tables' as any)
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pdv_tables'] });
            toast.success('Mesa excluída com sucesso!');
        },
        onError: (error: any) => {
            toast.error('Erro ao excluir mesa: ' + error.message);
        },
    });
}

// Open table (set status to occupied and optionally link an order)
export function useOpenTable() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ tableId, orderId }: { tableId: string; orderId?: string }) => {
            const { data, error } = await supabase
                .from('pdv_tables' as any)
                .update({
                    status: 'occupied',
                    current_order_id: orderId || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', tableId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pdv_tables'] });
            toast.success('Mesa aberta!');
        },
        onError: (error: any) => {
            toast.error('Erro ao abrir mesa: ' + error.message);
        },
    });
}

// Close table (set status to free and clear order)
export function useCloseTable() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (tableId: string) => {
            const { data, error } = await supabase
                .from('pdv_tables' as any)
                .update({
                    status: 'free',
                    current_order_id: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', tableId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pdv_tables'] });
            toast.success('Mesa liberada!');
        },
        onError: (error: any) => {
            toast.error('Erro ao liberar mesa: ' + error.message);
        },
    });
}
