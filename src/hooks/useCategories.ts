import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useStore } from '@/contexts/StoreContext';

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  image_url: string | null;
  active: boolean;
  display_order: number;
  store_id: string | null;
  pdv_only?: boolean; // When true, category only appears in PDV
  created_at: string;
  updated_at: string;
}

interface UseCategoriesOptions {
  activeOnly?: boolean;
  storeId?: string;
  excludePdvOnly?: boolean; // For delivery app - excludes PDV-only categories
}

export function useCategories(activeOnly = false, storeId?: string, options?: { excludePdvOnly?: boolean }) {
  const { currentStore } = useStore();
  const effectiveStoreId = storeId || currentStore?.id;
  const excludePdvOnly = options?.excludePdvOnly ?? false;

  return useQuery({
    queryKey: ['categories', effectiveStoreId, activeOnly, excludePdvOnly],
    queryFn: async () => {
      let query = supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (effectiveStoreId) {
        query = query.eq('store_id', effectiveStoreId);
      }

      if (activeOnly) {
        query = query.eq('active', true);
      }

      // Exclude PDV-only categories for delivery app
      if (excludePdvOnly) {
        query = query.or('pdv_only.is.null,pdv_only.eq.false');
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching categories:", error);
        return [];
      }
      return data as Category[];
    },
    // Remover enabled para permitir buscar todas as categorias quando não há loja específica
  });
}

// Quando a RLS bloqueia a escrita, o Postgres não devolve erro: simplesmente
// afeta 0 linhas. Com `.single()` isso virava um PGRST116 ("JSON object
// requested...") ilegível, e no delete passava como sucesso silencioso.
const NO_PERMISSION =
  'Você não tem permissão para alterar categorias desta loja. ' +
  'Verifique se seu usuário está vinculado à loja selecionada.';

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { currentStore } = useStore();

  return useMutation({
    mutationFn: async (category: Omit<Category, 'id' | 'created_at' | 'updated_at' | 'store_id'>) => {
      const { data, error } = await supabase
        .from('categories')
        .insert({ ...category, store_id: currentStore?.id })
        .select();

      if (error) throw error;
      if (!data?.length) throw new Error(NO_PERMISSION);
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'Categoria criada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar categoria',
        description: error.message,
        variant: 'destructive'
      });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Category> & { id: string }) => {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      if (!data?.length) throw new Error(NO_PERMISSION);
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'Categoria atualizada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar categoria',
        description: error.message,
        variant: 'destructive'
      });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .select();

      if (error) throw error;
      if (!data?.length) throw new Error(NO_PERMISSION);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'Categoria excluída com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir categoria',
        description: error.message,
        variant: 'destructive'
      });
    },
  });
}

export function useUploadCategoryImage() {
  return useMutation({
    mutationFn: async ({ file, categoryId }: { file: File; categoryId: string }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `category-${categoryId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('products')
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
