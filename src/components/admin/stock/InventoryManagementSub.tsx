'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { Plus, Trash2, Tag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export function InventoryCategoryManagement() {
  const { currentStore } = useStore();
  const queryClient = useQueryClient();
  const [newCategory, setNewCategory] = useState('');
  const [selectedColor, setSelectedColor] = useState('#8D42DD');

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['inventory_categories', currentStore?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_categories')
        .select('*')
        .eq('store_id', currentStore?.id);
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('inventory_categories')
        .insert([{ 
          name: newCategory, 
          color: selectedColor, 
          store_id: currentStore?.id 
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_categories'] });
      setNewCategory('');
      toast.success('Categoria criada!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('inventory_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_categories'] });
      toast.success('Categoria removida');
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input 
            placeholder="Nome da categoria..." 
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="bg-muted/50"
          />
        </div>
        <div className="flex gap-1">
          {['#8D42DD', '#21C3D9', '#65E62E', '#F97316', '#EF4444'].map(color => (
            <button
              key={color}
              className={`w-10 h-10 rounded-lg transition-transform ${selectedColor === color ? 'scale-110 ring-2 ring-primary ring-offset-2' : 'opacity-50 hover:opacity-100'}`}
              style={{ backgroundColor: color }}
              onClick={() => setSelectedColor(color)}
            />
          ))}
        </div>
        <Button onClick={() => createMutation.mutate()} disabled={!newCategory || createMutation.isPending}>
          {createMutation.isPending ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {categories.map((cat: any) => (
          <div key={cat.id} className="glass-card p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
              <span className="font-bold text-sm">{cat.name}</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-destructive hover:bg-destructive/10"
              onClick={() => deleteMutation.mutate(cat.id)}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InventorySupplierManagement() {
  const { currentStore } = useStore();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');

  const { data: suppliers = [] } = useQuery({
    queryKey: ['inventory_suppliers', currentStore?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_suppliers')
        .select('*')
        .eq('store_id', currentStore?.id);
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('inventory_suppliers')
        .insert([{ name, store_id: currentStore?.id }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_suppliers'] });
      setName('');
      toast.success('Fornecedor cadastrado!');
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Input 
          placeholder="Nome do fornecedor..." 
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-muted/50"
        />
        <Button onClick={() => createMutation.mutate()} disabled={!name}>
          <Plus size={20} />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {suppliers.map((sup: any) => (
          <div key={sup.id} className="glass-card p-3 flex items-center justify-between">
            <span className="font-bold text-sm">{sup.name}</span>
            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
              <Trash2 size={14} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
