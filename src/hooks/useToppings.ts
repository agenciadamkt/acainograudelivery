import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useStore } from '@/contexts/StoreContext';

export interface Topping {
  id: string;
  name: string;
  price: number | null;
  category_id: string | null;
  store_id: string | null;
  image_url: string | null;
  active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export function useToppings(categoryId?: string, activeOnly = false) {
  const { currentStore } = useStore();

  return useQuery({
    queryKey: ['toppings', currentStore?.id, categoryId, activeOnly],
    queryFn: async () => {
      try {
        let query = supabase
          .from('toppings')
          .select(`
            *,
            category:topping_categories(id, name)
          `)
          .order('display_order', { ascending: true });

        if (currentStore?.id) {
          query = query.eq('store_id', currentStore.id);
        }

        if (categoryId) {
          query = query.eq('category_id', categoryId);
        }

        if (activeOnly) {
          query = query.eq('active', true);
        }

        const { data, error } = await query;
        if (error) {
          console.error("Error fetching toppings:", error);
          return [];
        }
        return data;
      } catch (err) {
        console.error("Unexpected error in useToppings:", err);
        return [];
      }
    },
    enabled: !!currentStore?.id,
  });
}

export function useCreateTopping() {
  const queryClient = useQueryClient();
  const { currentStore } = useStore();

  return useMutation({
    mutationFn: async (topping: Omit<Topping, 'id' | 'created_at' | 'updated_at' | 'store_id'>) => {
      const { data, error } = await supabase
        .from('toppings')
        .insert({ ...topping, store_id: currentStore?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['toppings'] });
      toast({ title: 'Topping criado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar topping',
        description: error.message,
        variant: 'destructive'
      });
    },
  });
}

export function useUpdateTopping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Topping> & { id: string }) => {
      const { data, error } = await supabase
        .from('toppings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['toppings'] });
      toast({ title: 'Topping atualizado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar topping',
        description: error.message,
        variant: 'destructive'
      });
    },
  });
}

export function useDeleteTopping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('toppings')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['toppings'] });
      toast({ title: 'Topping excluído com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir topping',
        description: error.message,
        variant: 'destructive'
      });
    },
  });
}

export function useUploadToppingImage() {
  return useMutation({
    mutationFn: async ({ file, toppingId }: { file: File; toppingId: string }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${toppingId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('toppings')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('toppings')
        .getPublicUrl(filePath);

      return publicUrl;
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao fazer upload da imagem',
        description: error.message,
        variant: 'destructive'
      });
    },
  });
}
