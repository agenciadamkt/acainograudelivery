import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useFranchiseeId() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['effective_franchisee_id', user?.id],
        queryFn: async () => {
            if (!user) return null;

            // Check if this user is an employee in financial_users
            const { data, error } = await supabase
                .from('financial_users' as any)
                .select('created_by')
                .eq('email', user.email)
                .eq('active', true)
                .maybeSingle();

            if (data?.created_by) {
                return data.created_by;
            }

            // Otherwise, they are the root franchisee or an admin
            return user.id;
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 60, // 1 hour
    });
}
