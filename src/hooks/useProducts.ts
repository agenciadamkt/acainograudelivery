import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Product {
  id: string;
  user_id?: string;
  name: string;
  code?: string;
  description?: string | null;
  base_image_url?: string | null;
  category_id?: string;
  category?: {
    id: string;
    name: string;
    icon?: string | null;
  } | null;
  sale_price: number;
  cost_price: number;
  profit_margin: number;
  sale_type: string; // 'unidade' | 'peso'
  unit: string;
  current_stock: number;
  minimum_stock: number;
  active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

// Type for creating/updating products (uses category_id, not category object)
export type ProductInput = Omit<Product, 'id' | 'created_at' | 'updated_at' | 'category'> & {
  category_id: string;
};

export function useProducts(categoryId?: string, activeOnly = false) {
  return useQuery({
    queryKey: ['products', categoryId, activeOnly],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name, icon)
        `)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (categoryId && categoryId !== 'all') {
        query = query.eq('category_id', categoryId);
      }

      if (activeOnly) {
        query = query.eq('active', true);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching products:", error);
        return [];
      }
      return data as Product[];
    },
  });
}

export function useProduct(id?: string) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as unknown as Product;
    },
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: Record<string, any>) => {
      const { data, error } = await supabase
        .from('products')
        .insert(product as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar produto: ${error.message}`);
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, any>) => {
      // Remove category object if present (only category_id should be sent)
      const { category, ...cleanUpdates } = updates;

      const { error } = await supabase
        .from('products')
        .update(cleanUpdates)
        .eq('id', id);

      if (error) throw error;
      return { id, ...cleanUpdates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar produto: ${error.message}`);
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
      toast.success('Produto excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir produto: ${error.message}`);
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
      toast.error(`Erro ao fazer upload da imagem: ${error.message}`);
    },
  });
}

// Hook para buscar vídeos do produto
export function useProductVideos(productId: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['product_videos', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_videos' as any)
        .select('*')
        .eq('product_id', productId)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching product videos:', error);
        return [];
      }
      return data;
    },
    enabled: !!productId
  });
}

// Hook para criar vídeo do produto
export function useCreateProductVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      product_id: string;
      video_url: string;
      title?: string;
      description?: string
    }) => {
      const { data: newVideo, error } = await supabase
        .from('product_videos' as any)
        .insert({
          product_id: data.product_id,
          video_url: data.video_url,
          title: data.title || null,
          description: data.description || null
        })
        .select()
        .single();

      if (error) throw error;
      return newVideo;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product_videos', variables.product_id] });
      toast.success('Vídeo adicionado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar vídeo: ${error.message}`);
    }
  });
}

// Hook para deletar vídeo do produto
export function useDeleteProductVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, productId }: { id: string; productId: string }) => {
      const { error } = await supabase
        .from('product_videos' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, productId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['product_videos', data.productId] });
      toast.success('Vídeo removido com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover vídeo: ${error.message}`);
    }
  });
}
