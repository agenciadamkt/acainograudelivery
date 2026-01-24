import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Product {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
  base_image_url: string | null;
  active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export function useProducts(categoryId?: string, activeOnly = false) {
  return useQuery({
    queryKey: ['products', categoryId, activeOnly],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name),
          sizes:product_sizes(*)
        `)
        .order('display_order', { ascending: true });
      
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }
      
      if (activeOnly) {
        query = query.eq('active', true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name),
          sizes:product_sizes(*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Produto criado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao criar produto',
        description: error.message,
        variant: 'destructive'
      });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      const { error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      return { id, ...updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Produto atualizado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao atualizar produto',
        description: error.message,
        variant: 'destructive'
      });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Produto excluído com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao excluir produto',
        description: error.message,
        variant: 'destructive'
      });
    },
  });
}

export function useUploadProductImage() {
  return useMutation({
    mutationFn: async ({ file, productId }: { file: File; productId: string }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${productId}-${Date.now()}.${fileExt}`;
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
