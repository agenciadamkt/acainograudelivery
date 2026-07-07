'use client';

import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  ChevronRight, 
  Search,
  Scale,
  Zap,
  CheckCircle2,
  Package,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InventoryItemForm } from '@/components/admin/stock/InventoryItemForm';
import { toast } from 'sonner';

export default function StockRecipesPage() {
  const navigate = useNavigate();
  const { currentStore } = useStore();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isAddingIngredient, setIsAddingIngredient] = useState(false);
  const [newIngredient, setNewIngredient] = useState({
    item_id: '',
    quantity: 0
  });
  const [isNewItemOpen, setIsNewItemOpen] = useState(false);

  // 1. Fetch Products
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products_for_recipes', currentStore?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, image_url, category_id, product_categories(name)')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // 2. Fetch Inventory Items (for the recipe)
  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['inventory_items_recipes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('inventory_items')
        .select('id, name, unit')
        .eq('store_id', currentStore?.id)
        .eq('is_active', true);
      return data || [];
    },
    enabled: !!currentStore?.id
  });

  // 3. Fetch Recipe for selected product
  const { data: recipe = [], isLoading: isLoadingRecipe } = useQuery({
    queryKey: ['recipe', selectedProduct?.id],
    queryFn: async () => {
      if (!selectedProduct?.id) return [];
      const { data, error } = await supabase
        .from('inventory_recipes')
        .select(`
          *,
          inventory_items(name, unit)
        `)
        .eq('product_id', selectedProduct.id);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProduct?.id
  });

  // Mutations
  const addIngredientMutation = useMutation({
    mutationFn: async () => {
      const item = inventoryItems.find(i => i.id === newIngredient.item_id);
      const { error } = await supabase
        .from('inventory_recipes')
        .insert([{
          store_id: currentStore?.id,
          product_id: selectedProduct.id,
          item_id: newIngredient.item_id,
          quantity: newIngredient.quantity,
          unit: item?.unit || 'kg'
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe', selectedProduct?.id] });
      setIsAddingIngredient(false);
      setNewIngredient({ item_id: '', quantity: 0 });
      toast.success('Ingrediente adicionado!');
    },
    onError: (err: any) => toast.error('Erro: ' + err.message)
  });

  const removeIngredientMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('inventory_recipes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe', selectedProduct?.id] });
      toast.success('Removido da receita');
    }
  });

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-700">
      <button onClick={() => navigate('/admin/stock/dashboard')} className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-primary/50 hover:text-primary hover:bg-primary/10 transition-all w-fit">
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /><span>Estoque & Operações</span>
      </button>
    <div className="flex flex-col lg:flex-row h-[calc(100vh-12rem)] gap-8">
      {/* Product List Sidebar */}
      <div className="w-full lg:w-1/3 flex flex-col gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400">
            Fichas Técnicas
          </h1>
          <p className="text-muted-foreground text-sm">Configure a composição dos seus produtos</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar produto..." 
            className="pl-10 glass-card border-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
          {isLoadingProducts ? (
            <div className="p-8 text-center animate-pulse">Carregando cardápio...</div>
          ) : filteredProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => setSelectedProduct(product)}
              className={cn(
                "w-full p-4 rounded-3xl text-left transition-all flex items-center justify-between group",
                selectedProduct?.id === product.id 
                  ? "bg-primary text-white shadow-xl shadow-primary/20" 
                  : "glass-card hover:bg-white/40 dark:hover:bg-black/30"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 overflow-hidden flex-shrink-0">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Package size={16} /></div>
                  )}
                </div>
                <div>
                  <p className="font-bold text-sm leading-tight">{product.name}</p>
                  <p className={cn("text-[10px] opacity-70", selectedProduct?.id === product.id ? "text-white" : "text-muted-foreground")}>
                    {product.product_categories?.name || 'Geral'}
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className={cn("transition-transform", selectedProduct?.id === product.id ? "rotate-90" : "group-hover:translate-x-1")} />
            </button>
          ))}
        </div>
      </div>

      {/* Recipe Detail Area */}
      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {selectedProduct ? (
            <motion.div
              key={selectedProduct.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 flex flex-col gap-6"
            >
              <Card className="glass-card border-none overflow-hidden shrink-0">
                <div className="h-32 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent relative">
                  <div className="absolute inset-0 flex items-center px-8 gap-6">
                     <div className="w-20 h-20 rounded-3xl bg-white shadow-2xl overflow-hidden border-4 border-white">
                        <img src={selectedProduct.image_url} alt="" className="w-full h-full object-cover" />
                     </div>
                     <div>
                        <Badge variant="secondary" className="mb-2 bg-primary/20 text-primary border-none font-bold uppercase tracking-widest text-[9px]">
                          Composição Técnica
                        </Badge>
                        <h2 className="text-3xl font-black">{selectedProduct.name}</h2>
                     </div>
                  </div>
                </div>
              </Card>

              <div className="flex-1 glass-card border-none flex flex-col p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <Scale className="text-primary" size={20} />
                    <h3 className="font-bold text-lg">Ingredientes do Estoque</h3>
                  </div>
                  <Button onClick={() => setIsAddingIngredient(true)} className="gap-2 font-bold h-11 px-6 rounded-2xl shadow-lg shadow-primary/10">
                    <Plus size={18} /> Adicionar Insumo
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                  {isLoadingRecipe ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-50">
                      <Loader2 className="animate-spin mb-2" />
                      <p>Lendo receita...</p>
                    </div>
                  ) : recipe.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed border-muted/50">
                      <Zap size={40} className="text-muted-foreground mb-4 opacity-20" />
                      <h4 className="font-bold">Receita Vazia</h4>
                      <p className="text-sm text-muted-foreground max-w-[250px] mt-1">Este produto ainda não tem baixas de estoque automáticas configuradas.</p>
                    </div>
                  ) : recipe.map((ing) => (
                    <div key={ing.id} className="flex items-center justify-between p-4 bg-white/40 dark:bg-black/20 rounded-2xl group hover:shadow-md transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          <Package size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-sm tracking-tight">{(ing.inventory_items as any)?.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest leading-none mt-1">Baixa Automática</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-lg font-black text-primary">
                            {ing.quantity}
                            <span className="text-xs ml-1 font-bold">{(ing.inventory_items as any)?.unit}</span>
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeIngredientMutation.mutate(ing.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center glass-card border-none opacity-50">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                <BookOpen size={40} className="text-muted-foreground" />
              </div>
              <h3 className="text-xl font-black">Selecione um Produto</h3>
              <p className="text-muted-foreground text-sm mt-1">Escolha um item do cardápio para começar a montar a ficha técnica</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Ingredient Dialog */}
      <Dialog open={isAddingIngredient} onOpenChange={setIsAddingIngredient}>
        <DialogContent className="sm:max-w-[450px] glass-card border-none">
          <DialogHeader>
            <DialogTitle>Adicionar Insumo à Receita</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold">Insumo do Estoque</label>
                <Button 
                    type="button" 
                    variant="link" 
                    className="h-auto p-0 text-primary font-bold text-xs gap-1"
                    onClick={() => setIsNewItemOpen(true)}
                >
                    <Plus size={14} /> Novo Insumo
                </Button>
              </div>
              <Select value={newIngredient.item_id} onValueChange={(val) => setNewIngredient({...newIngredient, item_id: val})}>
                <SelectTrigger className="bg-muted/50">
                  <SelectValue placeholder="Selecione o insumo..." />
                </SelectTrigger>
                <SelectContent>
                  {inventoryItems.map(item => (
                    <SelectItem key={item.id} value={item.id}>{item.name} ({item.unit})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">Quantidade Gasta ({(inventoryItems.find(i => i.id === newIngredient.item_id) as any)?.unit || ''})</label>
              <Input 
                type="number" 
                step="0.001"
                className="bg-muted/50"
                value={newIngredient.quantity}
                onChange={(e) => setNewIngredient({...newIngredient, quantity: parseFloat(e.target.value)})}
              />
              <p className="text-[10px] text-muted-foreground">Esta quantidade será subtraída do estoque a cada venda deste produto.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingIngredient(false)}>Cancelar</Button>
            <Button 
                onClick={() => addIngredientMutation.mutate()} 
                disabled={!newIngredient.item_id || newIngredient.quantity <= 0 || addIngredientMutation.isPending}
                className="font-bold gap-2"
            >
              {addIngredientMutation.isPending ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={18} />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick New Item Dialog */}
      <Dialog open={isNewItemOpen} onOpenChange={setIsNewItemOpen}>
        <DialogContent className="sm:max-w-[600px] glass-card border-none z-[60]">
            <DialogHeader>
                <DialogTitle>Novo Insumo / Produto de Estoque</DialogTitle>
            </DialogHeader>
            <InventoryItemForm onSuccess={() => {
                setIsNewItemOpen(false);
                queryClient.invalidateQueries({ queryKey: ['inventory_items_recipes'] });
            }} />
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
