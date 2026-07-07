'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface InventoryItemFormProps {
  onSuccess?: () => void;
  initialData?: any;
}

export function InventoryItemForm({ onSuccess, initialData }: InventoryItemFormProps) {
  const { currentStore } = useStore();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const isEdit = !!initialData;

  // Form State
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    category_id: initialData?.category_id || '',
    supplier_id: initialData?.supplier_id || '',
    unit: initialData?.unit || 'kg',
    current_qty: initialData?.current_qty || 0,
    minimum_qty: initialData?.minimum_qty || 0,
    avg_price: initialData?.avg_price || 0,
    composes_cmv: initialData?.composes_cmv ?? true,
    manipulation_days: initialData?.manipulation_days || 0,
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['inventory_categories', currentStore?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('inventory_categories')
        .select('id, name')
        .eq('store_id', currentStore?.id)
        .order('name');
      return data || [];
    },
    enabled: !!currentStore?.id
  });

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ['inventory_suppliers', currentStore?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('inventory_suppliers')
        .select('id, name')
        .eq('store_id', currentStore?.id)
        .order('name');
      return data || [];
    },
    enabled: !!currentStore?.id
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore?.id) return;
    
    setIsLoading(true);
    try {
      if (isEdit) {
        // UPDATE
        const { error } = await supabase
          .from('inventory_items')
          .update({
            ...formData,
            store_id: currentStore.id
          })
          .eq('id', initialData.id);
        
        if (error) throw error;
        toast.success('Insumo atualizado!');
      } else {
        // CREATE
        const { data: product, error: productError } = await supabase
          .from('inventory_items')
          .insert([{
            ...formData,
            store_id: currentStore.id,
            last_price: formData.avg_price
          }])
          .select()
          .single();

        if (productError) throw productError;

        if (formData.current_qty > 0) {
          await supabase.from('inventory_movements').insert([{
            store_id: currentStore.id,
            item_id: product.id,
            user_id: user?.id,
            action: 'inventory',
            classification: 'initial',
            qty: formData.current_qty,
            unit_price: formData.avg_price,
            total_value: formData.current_qty * formData.avg_price,
            notes: 'Inventário Inicial'
          }]);
        }
        toast.success('Insumo cadastrado!');
      }

      queryClient.invalidateQueries({ queryKey: [ 'inventory'] });
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="name">Nome do Insumo</Label>
          <Input 
            id="name" 
            placeholder="Ex: Arroz Agulhinha" 
            required 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="bg-muted/50"
          />
        </div>

        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select 
            value={formData.category_id} 
            onValueChange={(val) => setFormData({...formData, category_id: val})}
          >
            <SelectTrigger className="bg-muted/50">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat: any) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Unidade de Medida</Label>
          <Select 
            value={formData.unit} 
            onValueChange={(val) => setFormData({...formData, unit: val})}
          >
            <SelectTrigger className="bg-muted/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kg">Quilograma (kg)</SelectItem>
              <SelectItem value="g">Grama (g)</SelectItem>
              <SelectItem value="L">Litro (L)</SelectItem>
              <SelectItem value="ml">Mililitro (ml)</SelectItem>
              <SelectItem value="und">Unidade (und)</SelectItem>
              <SelectItem value="cx">Caixa (cx)</SelectItem>
              <SelectItem value="fardo">Fardo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Estoque Inicial</Label>
          <Input 
            type="number" 
            step="0.01" 
            required 
            value={formData.current_qty}
            onChange={(e) => setFormData({...formData, current_qty: parseFloat(e.target.value)})}
            className="bg-muted/50"
          />
        </div>

        <div className="space-y-2">
          <Label>Custo Unitário (R$)</Label>
          <Input 
            type="number" 
            step="0.01" 
            required 
            value={formData.avg_price}
            onChange={(e) => setFormData({...formData, avg_price: parseFloat(e.target.value)})}
            className="bg-muted/50"
          />
        </div>

        <div className="space-y-2">
          <Label>Estoque Mínimo (Alerta)</Label>
          <Input 
            type="number" 
            step="0.1" 
            required 
            value={formData.minimum_qty}
            onChange={(e) => setFormData({...formData, minimum_qty: parseFloat(e.target.value)})}
            className="bg-muted/50"
          />
        </div>

        <div className="space-y-2">
          <Label>Fornecedor Principal</Label>
          <Select 
            value={formData.supplier_id} 
            onValueChange={(val) => setFormData({...formData, supplier_id: val})}
          >
            <SelectTrigger className="bg-muted/50">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((sup: any) => (
                <SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="glass-card p-4 space-y-4 bg-primary/5 border-primary/10">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Compõe CMV</Label>
            <p className="text-xs text-muted-foreground">Incluir gastos deste insumo no cálculo do custo de mercadoria vendida.</p>
          </div>
          <Switch 
            checked={formData.composes_cmv}
            onCheckedChange={(val) => setFormData({...formData, composes_cmv: val})}
          />
        </div>
      </div>

      <Button type="submit" className="w-full h-12 text-lg font-bold gap-2" disabled={isLoading}>
        {isLoading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
        Salvar Produto
      </Button>
    </form>
  );
}
