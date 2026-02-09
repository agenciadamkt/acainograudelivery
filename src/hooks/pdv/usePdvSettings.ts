
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function usePdvSettings() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: settings, isLoading } = useQuery({
        queryKey: ['pdv_settings', user?.id],
        queryFn: async () => {
            if (!user) return null;
            const { data, error } = await supabase
                .from('pdv_settings')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) {
                console.error("Error fetching PDV settings:", error);
                return null;
            }
            return data;
        },
        enabled: !!user
    });

    const updateSettings = useMutation({
        mutationFn: async (newSettings: any) => {
            if (!user) throw new Error("No user");

            // Check if exists, update or insert
            const { data: existing } = await supabase
                .from('pdv_settings')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();

            if (existing) {
                const { error } = await supabase
                    .from('pdv_settings')
                    .update(newSettings)
                    .eq('id', existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('pdv_settings')
                    .insert({ ...newSettings, user_id: user.id });
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pdv_settings'] });
            toast.success("Configurações salvas!");
        },
        onError: (err) => toast.error("Erro ao salvar: " + err.message)
    });

    return { settings, isLoading, updateSettings };
}
