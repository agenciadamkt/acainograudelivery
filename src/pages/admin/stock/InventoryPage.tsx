'use client';

import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  TriangleAlert, 
  ArrowUpRight, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  Grid, 
  List,
  ChevronRight,
  Truck,
  Layers,
  FileDown,
  Tag,
  Download,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { 
  InventoryCategoryManagement, 
  InventorySupplierManagement 
} from '@/components/admin/stock/InventoryManagementSub';
import { InventoryItemForm } from '@/components/admin/stock/InventoryItemForm';

// --- Types ---
interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  current_qty: number;
  minimum_qty: number;
  avg_price: number;
  last_price: number;
  is_active: boolean;
  category_id?: string;
  supplier_id?: string;
  inventory_categories?: { name: string, color: string };
  inventory_suppliers?: { name: string };
}

const MASTER_EMAIL = 'agenciadamkt@gmail.com';

export default function StockInventoryPage() {
  const navigate = useNavigate();
  const { currentStore } = useStore();
  const { user } = useAuth();
  const isMaster = user?.email === MASTER_EMAIL;
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [isNewProductOpen, setIsNewProductOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isSupplierOpen, setIsSupplierOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);

  // --- Import from Franchisee Catalog ---
  const handleImportFromCatalog = async () => {
    if (!currentStore?.id) return;
    if (!confirm('Deseja importar os insumos do Catálogo da Distribuidora?\n\nIsso criará as categorias e os itens que ainda não existem no seu estoque.')) return;

    setIsImporting(true);
    try {
      // 1. Fetch source categories
      const { data: srcCategories } = await supabase
        .from('franchisee_product_categories')
        .select('id, name')
        .eq('active', true);

      // 2. Fetch existing inventory categories for this store
      const { data: existingCats } = await supabase
        .from('inventory_categories')
        .select('id, name')
        .eq('store_id', currentStore.id);

      const existingCatNames = new Set((existingCats || []).map(c => c.name.toLowerCase()));
      const categoryMap: Record<string, string> = {}; // old_id -> new_id

      // Map existing
      for (const ec of (existingCats || [])) {
        const src = (srcCategories || []).find(s => s.name.toLowerCase() === ec.name.toLowerCase());
        if (src) categoryMap[src.id] = ec.id;
      }

      // 3. Create missing categories
      const categoriesToCreate = (srcCategories || []).filter(
        c => !existingCatNames.has(c.name.toLowerCase())
      );

      if (categoriesToCreate.length > 0) {
        const { data: newCats } = await supabase
          .from('inventory_categories')
          .insert(categoriesToCreate.map(c => ({
            store_id: currentStore.id,
            name: c.name,
            color: '#8b5cf6'
          })))
          .select();

        for (const nc of (newCats || [])) {
          const src = categoriesToCreate.find(c => c.name === nc.name);
          if (src) categoryMap[src.id] = nc.id;
        }
      }

      // 4. Fetch source products (incluindo code)
      const { data: srcProducts } = await supabase
        .from('franchisee_products')
        .select('id, name, unit, category_id, price, code')
        .eq('active', true);

      // 5. Fetch existing inventory items for this store (id + name para poder atualizar)
      const { data: existingItems } = await supabase
        .from('inventory_items')
        .select('id, name')
        .eq('store_id', currentStore.id);

      const existingItemMap: Record<string, string> = {}; // name_lower → id
      for (const ei of (existingItems || [])) {
        existingItemMap[ei.name.toLowerCase()] = ei.id;
      }

      // 6. Criar itens que ainda não existem
      const itemsToCreate = (srcProducts || [])
        .filter(p => !existingItemMap[p.name.toLowerCase()])
        .map(p => ({
          store_id: currentStore.id,
          name: p.name,
          unit: p.unit || 'und',
          category_id: categoryMap[p.category_id] || null,
          current_qty: 0,
          minimum_qty: 0,
          avg_price: Number(p.price) || 0,
          last_price: Number(p.price) || 0,
          composes_cmv: true,
          is_active: true,
          ...(p.code ? { code: p.code } : {}),
        }));

      if (itemsToCreate.length > 0) {
        const { error } = await supabase
          .from('inventory_items')
          .insert(itemsToCreate);
        if (error) throw error;
      }

      // 7. Atualizar code e preço nos itens que já existem
      const updatePromises = (srcProducts || [])
        .filter(p => existingItemMap[p.name.toLowerCase()])
        .map(p =>
          (supabase as any)
            .from('inventory_items')
            .update({
              ...(p.code ? { code: p.code } : {}),
              avg_price: Number(p.price) || 0,
              last_price: Number(p.price) || 0,
            })
            .eq('id', existingItemMap[p.name.toLowerCase()])
        );

      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
      }

      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_categories'] });
      toast.success(
        `Importação concluída! ${categoriesToCreate.length} categorias, ${itemsToCreate.length} insumos criados, ${updatePromises.length} preços e códigos atualizados.`
      );
    } catch (err: any) {
      toast.error('Erro na importação: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  // --- Mutations ---
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('inventory_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Insumo removido com sucesso');
    }
  });

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este insumo? Isso removerá também o histórico de movimentações.')) {
      deleteMutation.mutate(id);
    }
  };

  // --- Fetch Data ---
  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ['inventory', currentStore?.id],
    queryFn: async () => {
      if (!currentStore?.id) return [];
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          inventory_categories(name, color),
          inventory_suppliers(name)
        `)
        .eq('store_id', currentStore.id)
        .order('name');
      
      if (error) throw error;
      return data as InventoryItem[];
    },
    enabled: !!currentStore?.id
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['inventory_categories', currentStore?.id],
    queryFn: async () => {
      if (!currentStore?.id) return [];
      const { data, error } = await supabase
        .from('inventory_categories')
        .select('*')
        .eq('store_id', currentStore.id);
      if (error) throw error;
      return data;
    },
    enabled: !!currentStore?.id
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['inventory_suppliers', currentStore?.id],
    queryFn: async () => {
      if (!currentStore?.id) return [];
      const { data, error } = await supabase
        .from('inventory_suppliers')
        .select('id, name')
        .eq('store_id', currentStore.id)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!currentStore?.id
  });

  // --- Stats ---
  const totalStockValue = (inventory || []).reduce((acc, item) => acc + (item.current_qty * (item.avg_price || 0)), 0);
  const criticalItems = (inventory || []).filter(item => item.current_qty < item.minimum_qty).length;

  // --- Filtered Data ---
  const filteredInventory = (inventory || []).filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category_id === categoryFilter;
    const matchesSupplier = supplierFilter === 'all' || item.supplier_id === supplierFilter;
    return matchesSearch && matchesCategory && matchesSupplier;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <button onClick={() => navigate('/admin/stock/dashboard')} className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-primary/50 hover:text-primary hover:bg-primary/10 transition-all w-fit">
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /><span>Estoque & Operações</span>
      </button>
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:to-gray-400">
            Estoque Central
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestão inteligente de insumos e matérias-primas
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isMaster && (
            <Button
              variant="outline"
              size="sm"
              className="glass-card gap-2"
              onClick={handleImportFromCatalog}
              disabled={isImporting}
            >
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {isImporting ? 'Importando...' : 'Importar do Catálogo'}
            </Button>
          )}
          <Dialog open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="glass-card">
                <Tag className="h-4 w-4 mr-2" /> Categorias
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] glass-card">
              <DialogHeader>
                <DialogTitle>Gerenciar Categorias de Insumos</DialogTitle>
              </DialogHeader>
              <InventoryCategoryManagement />
            </DialogContent>
          </Dialog>

          <Dialog open={isSupplierOpen} onOpenChange={setIsSupplierOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="glass-card">
                <Truck className="h-4 w-4 mr-2" /> Fornecedores
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] glass-card">
              <DialogHeader>
                <DialogTitle>Meus Fornecedores</DialogTitle>
              </DialogHeader>
              <InventorySupplierManagement />
            </DialogContent>
          </Dialog>

          <Dialog open={isNewProductOpen} onOpenChange={setIsNewProductOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 gap-2">
                <Plus className="h-4 w-4" />
                Novo Insumo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] glass-card max-h-[90vh] overflow-y-auto border-none">
              <DialogHeader>
                <DialogTitle>Cadastrar Insumo no Estoque</DialogTitle>
              </DialogHeader>
              <InventoryItemForm onSuccess={() => setIsNewProductOpen(false)} />
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
            <DialogContent className="sm:max-w-[600px] glass-card max-h-[90vh] overflow-y-auto border-none">
              <DialogHeader>
                <DialogTitle>Editar Insumo</DialogTitle>
              </DialogHeader>
              {editingItem && (
                <InventoryItemForm 
                  initialData={editingItem} 
                  onSuccess={() => setEditingItem(null)} 
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard 
          title="Valor em Estoque" 
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalStockValue)} 
          icon={<ArrowUpRight className="text-secondary" />}
          gradient="from-secondary/10 to-blue-500/10"
        />
        <StatsCard 
          title="Itens Cadastrados" 
          value={inventory.length.toString()} 
          icon={<Package className="text-primary" />}
        />
        <StatsCard 
          title="Estoque Crítico" 
          value={criticalItems.toString()} 
          icon={<TriangleAlert className={criticalItems > 0 ? "text-orange-500" : "text-green-500"} />}
          badge={criticalItems > 0 ? "Atenção" : "OK"}
        />
        <StatsCard 
          title="Categorias" 
          value={categories.length.toString()} 
          icon={<Layers className="text-indigo-500" />}
        />
      </div>

      {/* Filters & View Toggle */}
      <div className="glass-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar insumo..." 
              className="pl-10 bg-muted/50 border-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px] bg-muted/50 border-none">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Categorias</SelectItem>
              {categories.map((cat: any) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="w-[160px] bg-muted/50 border-none">
              <SelectValue placeholder="Fornecedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Fornecedores</SelectItem>
              {(suppliers as any[]).map((s: any) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg">
          <Button 
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button 
            variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Inventory Display */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 bg-muted rounded-3xl" />
          ))}
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {viewMode === 'grid' ? (
            <motion.div 
              layout
              className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6"
            >
              {filteredInventory.map((item) => (
                <InventoryCard 
                  key={item.id} 
                  item={item} 
                  onEdit={() => setEditingItem(item)}
                  onDelete={() => handleDelete(item.id)}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div 
              layout
              className="glass-card overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="p-4 font-bold">Insumo</th>
                      <th className="p-4 font-bold">Categoria</th>
                      <th className="p-4 font-bold text-center">Quantidade</th>
                      <th className="p-4 font-bold text-right">Preço Médio</th>
                      <th className="p-4 font-bold text-right">Total</th>
                      <th className="p-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map((item) => (
                      <InventoryRow 
                        key={item.id} 
                        item={item} 
                        onEdit={() => setEditingItem(item)}
                        onDelete={() => handleDelete(item.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Empty State */}
      {!isLoading && filteredInventory.length === 0 && (
        <div className="py-20 text-center glass-card">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
          <h3 className="text-xl font-bold">Nenhum insumo encontrado</h3>
          <p className="text-muted-foreground mt-2">Tente ajustar seus filtros ou cadastre um novo produto.</p>
        </div>
      )}
    </div>
  );
}

// --- Subcomponents ---

function StatsCard({ title, value, icon, gradient, badge }: { title: string, value: string, icon: any, gradient?: string, badge?: string }) {
  return (
    <Card className={cn("glass-card overflow-hidden border-none shrink-0", gradient)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-muted-foreground tracking-wider uppercase">{title}</p>
          <div className="p-2 bg-white/10 rounded-xl">
            {icon}
          </div>
        </div>
        <div className="flex items-end gap-2">
          <h3 className="text-3xl font-black">{value}</h3>
          {badge && (
            <Badge variant="secondary" className="mb-1 text-[10px] font-bold">
              {badge}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function InventoryCard({ item, onEdit, onDelete }: { item: InventoryItem, onEdit: () => void, onDelete: () => void }) {
  const isCritical = item.current_qty < item.minimum_qty;
  const totalValue = item.current_qty * (item.avg_price || 0);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -5 }}
      className="glass-card p-5 group flex flex-col h-full bg-white/20 dark:bg-black/20"
    >
      <div className="flex justify-between items-start mb-4">
        <div 
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-white"
          style={{ backgroundColor: item.inventory_categories?.color || '#3b82f6' }}
        >
          <Package className="h-5 w-5" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="gap-2" onClick={() => onEdit()}>
              <Pencil className="h-4 w-4" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-destructive" onClick={() => onDelete()}>
              <Trash2 className="h-4 w-4" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1">
        <h4 className="font-bold text-lg leading-tight mb-1">{item.name}</h4>
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="text-[10px] font-medium h-5">
            {item.inventory_categories?.name || 'Geral'}
          </Badge>
          {item.inventory_suppliers?.name && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Truck size={10} /> {item.inventory_suppliers.name}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-auto">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Estoque Atual</p>
            <div className="flex items-center gap-1">
              <span className={cn(
                "text-xl font-black",
                isCritical ? "text-orange-500" : "text-gray-900 dark:text-gray-100"
              )}>
                {item.current_qty}
              </span>
              <span className="text-xs text-muted-foreground font-medium">{item.unit}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Valor Total</p>
            <p className="text-sm font-black">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
            </p>
          </div>
        </div>
      </div>

      {isCritical && (
        <div className="mt-4 pt-4 border-t border-orange-500/20 flex items-center gap-2 text-orange-500">
          <TriangleAlert size={14} className="animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Estoque abaixo do mínimo ({item.minimum_qty})</span>
        </div>
      )}
    </motion.div>
  );
}

function InventoryRow({ item, onEdit, onDelete }: { item: InventoryItem, onEdit: () => void, onDelete: () => void }) {
  const isCritical = item.current_qty < item.minimum_qty;
  const totalValue = item.current_qty * (item.avg_price || 0);

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors group">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
            style={{ backgroundColor: item.inventory_categories?.color || '#3b82f6' }}
          >
            <Package className="h-4 w-4" />
          </div>
          <div>
            <p className="font-bold text-sm">{item.name}</p>
            <p className="text-[10px] text-muted-foreground">Un: {item.unit}</p>
          </div>
        </div>
      </td>
      <td className="p-4">
        <Badge variant="outline" className="text-[10px]">
          {item.inventory_categories?.name || 'Geral'}
        </Badge>
      </td>
      <td className="p-4 text-center">
        <div className="flex flex-col items-center">
          <span className={cn(
            "font-black text-sm",
            isCritical ? "text-orange-500" : ""
          )}>
            {item.current_qty} {item.unit}
          </span>
          {isCritical && (
            <span className="text-[9px] text-orange-500 font-bold uppercase">Abaixo do mín. ({item.minimum_qty})</span>
          )}
        </div>
      </td>
      <td className="p-4 text-right font-medium text-sm">
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.avg_price || 0)}
      </td>
      <td className="p-4 text-right font-black text-sm">
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
      </td>
      <td className="p-4 text-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="gap-2" onClick={() => onEdit()}>
              <Pencil className="h-4 w-4" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-destructive" onClick={() => onDelete()}>
              <Trash2 className="h-4 w-4" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}
