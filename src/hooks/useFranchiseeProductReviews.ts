import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FranchiseeProductReview {
    id: string;
    product_id: string;
    user_id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    updated_at: string;
    profiles?: {
        full_name: string | null;
        avatar_url: string | null;
    } | null;
}

export function useFranchiseeProductReviews(productId: string) {
    return useQuery({
        queryKey: ['franchisee_product_reviews', productId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('franchisee_product_reviews' as any)
                .select(`
                    *,
                    profiles:user_id (
                        full_name,
                        avatar_url
                    )
                `)
                .eq('product_id', productId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching reviews:", error);
                return [];
            }
            return (data as unknown) as FranchiseeProductReview[];
        },
        enabled: !!productId,
    });
}

export function useCreateFranchiseeProductReview() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (review: Omit<FranchiseeProductReview, 'id' | 'created_at' | 'updated_at' | 'profiles'>) => {
            const { data, error } = await supabase
                .from('franchisee_product_reviews' as any)
                .insert(review)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['franchisee_product_reviews', variables.product_id] });
            toast.success('Avaliação enviada com sucesso!');
        },
        onError: (error: Error) => {
            toast.error(`Erro ao enviar avaliação: ${error.message}`);
        },
    });
}
