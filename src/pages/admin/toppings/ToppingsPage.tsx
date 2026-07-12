import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Image as ImageIcon, FolderPlus, FilterX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DataTable } from '@/components/admin/DataTable';
import { ToppingForm } from '@/components/admin/ToppingForm';
import { ToppingCategoryForm } from '@/components/admin/ToppingCategoryForm';
import {
  useToppings,
  useCreateTopping,
  useUpdateTopping,
  useDeleteTopping,
  Topping,
} from '@/hooks/useToppings';
import {
  useToppingCategories,
  useCreateToppingCategory,
  useUpdateToppingCategory,
  useDeleteToppingCategory,
  ToppingCategory,
} from '@/hooks/useToppingCategories';

export default function ToppingsPage() {
  const { data: toppings, isLoading: toppingsLoading } = useToppings();
  const { data: categories, isLoading: categoriesLoading } = useToppingCategories();
  const createTopping = useCreateTopping();
  const updateTopping = useUpdateTopping();
  const deleteTopping = useDeleteTopping();
  const createCategory = useCreateToppingCategory();
  const updateCategory = useUpdateToppingCategory();
  const deleteCategory = useDeleteToppingCategory();

  const [isToppingDialogOpen, setIsToppingDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingTopping, setEditingTopping] = useState<Topping | undefined>();
  const [editingCategory, setEditingCategory] = useState<ToppingCategory | undefined>();
  const [deletingTopping, setDeletingTopping] = useState<Topping | undefined>();
  const [deletingCategory, setDeletingCategory] = useState<ToppingCategory | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const handleCreateTopping = async (data: any) => {
    await createTopping.mutateAsync(data);
    setIsToppingDialogOpen(false);
  };

  const handleUpdateTopping = async (data: any) => {
    if (editingTopping) {
      await updateTopping.mutateAsync({ id: editingTopping.id, ...data });
      setEditingTopping(undefined);
      setIsToppingDialogOpen(false);
    }
  };

  const handleDeleteTopping = async () => {
    if (deletingTopping) {
      await deleteTopping.mutateAsync(deletingTopping.id);
      setDeletingTopping(undefined);
    }
  };

  const handleCreateCategory = async (data: any) => {
    await createCategory.mutateAsync(data);
    setIsCategoryDialogOpen(false);
  };

  const handleUpdateCategory = async (data: any) => {
    if (editingCategory) {
      await updateCategory.mutateAsync({ id: editingCategory.id, ...data });
      setEditingCategory(undefined);
      setIsCategoryDialogOpen(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (deletingCategory) {
      await deleteCategory.mutateAsync(deletingCategory.id);
      setDeletingCategory(undefined);
    }
  };

  const toppingColumns = [
    {
      key: 'image_url',
      label: 'Imagem',
      render: (topping: Topping) => (
        <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center overflow-hidden">
          {topping.image_url ? (
            <img
              src={topping.image_url}
              alt={topping.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
      ),
    },
    {
      key: 'name',
      label: 'Nome',
    },
    {
      key: 'category',
      label: 'Categoria',
      render: (topping: any) => topping.category?.name || '-',
    },
    {
      key: 'price',
      label: 'Preço',
      render: (topping: Topping) =>
        topping.price ? `R$ ${topping.price.toFixed(2)}` : 'Grátis',
    },
    {
      key: 'active',
      label: 'Status',
      render: (topping: Topping) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={topping.active}
            onCheckedChange={(checked) =>
              updateTopping.mutate({ id: topping.id, active: checked })
            }
            aria-label={topping.active ? 'Desativar complemento' : 'Ativar complemento'}
          />
          <span className={`text-sm ${topping.active ? '' : 'text-muted-foreground'}`}>
            {topping.active ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (topping: Topping) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditingTopping(topping);
              setIsToppingDialogOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeletingTopping(topping)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Filtrar por uma categoria pai também inclui os complementos das suas
  // subcategorias.
  const filteredToppings = useMemo(() => {
    let result = toppings || [];

    if (categoryFilter === 'none') {
      result = result.filter((t) => !t.category_id);
    } else if (categoryFilter !== 'all') {
      const childIds = (categories || [])
        .filter((c) => c.parent_id === categoryFilter)
        .map((c) => c.id);
      const matchIds = new Set([categoryFilter, ...childIds]);
      result = result.filter((t) => t.category_id && matchIds.has(t.category_id));
    }

    if (statusFilter !== 'all') {
      result = result.filter((t) => t.active === (statusFilter === 'active'));
    }

    return result;
  }, [toppings, categories, categoryFilter, statusFilter]);

  const hasActiveFilters = categoryFilter !== 'all' || statusFilter !== 'all';

  // Agrupa cada subcategoria logo abaixo da sua categoria pai, para a
  // hierarquia ficar visível na tabela.
  const sortedCategories = (() => {
    const list = categories || [];
    const topLevel = list.filter((c) => !c.parent_id);
    const childrenByParent = new Map<string, ToppingCategory[]>();
    list.forEach((c) => {
      if (c.parent_id) {
        childrenByParent.set(c.parent_id, [...(childrenByParent.get(c.parent_id) || []), c]);
      }
    });

    const result: ToppingCategory[] = [];
    topLevel.forEach((parent) => {
      result.push(parent);
      (childrenByParent.get(parent.id) || []).forEach((child) => result.push(child));
    });
    return result;
  })();

  const categoryColumns = [
    {
      key: 'name',
      label: 'Nome',
      render: (cat: ToppingCategory) => (
        <span className={cat.parent_id ? 'pl-6 flex items-center gap-1 text-muted-foreground' : 'font-medium'}>
          {cat.parent_id && '↳'} {cat.name}
        </span>
      ),
    },
    {
      key: 'max_selections',
      label: 'Máx. Seleções',
      render: (cat: ToppingCategory) => cat.max_selections || 'Ilimitado',
    },
    {
      key: 'display_order',
      label: 'Ordem',
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (cat: ToppingCategory) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditingCategory(cat);
              setIsCategoryDialogOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeletingCategory(cat)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Complementos (Toppings)</h1>
          <p className="text-muted-foreground">
            Gerencie os complementos e categorias
          </p>
        </div>
      </div>

      <Tabs defaultValue="toppings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="toppings">Complementos</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
        </TabsList>

        <TabsContent value="toppings" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                <SelectItem value="none">Sem categoria</SelectItem>
                {sortedCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.parent_id ? `↳ ${cat.name}` : cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCategoryFilter('all');
                  setStatusFilter('all');
                }}
              >
                <FilterX className="h-4 w-4 mr-2" />
                Limpar filtros
              </Button>
            )}

            <span className="text-sm text-muted-foreground">
              {filteredToppings.length} de {toppings?.length || 0} complementos
            </span>

            <Button className="ml-auto" onClick={() => setIsToppingDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Complemento
            </Button>
          </div>

          <DataTable
            data={filteredToppings}
            columns={toppingColumns}
            isLoading={toppingsLoading}
            searchPlaceholder="Buscar complementos..."
            emptyMessage={
              hasActiveFilters
                ? 'Nenhum complemento encontrado com os filtros aplicados'
                : 'Nenhum complemento cadastrado'
            }
          />
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setIsCategoryDialogOpen(true)}>
              <FolderPlus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          </div>

          <DataTable
            data={sortedCategories}
            columns={categoryColumns}
            isLoading={categoriesLoading}
            searchPlaceholder="Buscar categorias..."
            emptyMessage="Nenhuma categoria cadastrada"
          />
        </TabsContent>
      </Tabs>

      {/* Topping Dialog */}
      <Dialog
        open={isToppingDialogOpen}
        onOpenChange={(open) => {
          setIsToppingDialogOpen(open);
          if (!open) setEditingTopping(undefined);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTopping ? 'Editar Complemento' : 'Novo Complemento'}
            </DialogTitle>
            <DialogDescription>
              {editingTopping
                ? 'Edite as informações do complemento'
                : 'Preencha os dados do novo complemento'}
            </DialogDescription>
          </DialogHeader>
          <ToppingForm
            topping={editingTopping}
            onSubmit={editingTopping ? handleUpdateTopping : handleCreateTopping}
            onCancel={() => {
              setIsToppingDialogOpen(false);
              setEditingTopping(undefined);
            }}
            isSubmitting={createTopping.isPending || updateTopping.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog
        open={isCategoryDialogOpen}
        onOpenChange={(open) => {
          setIsCategoryDialogOpen(open);
          if (!open) setEditingCategory(undefined);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? 'Edite as informações da categoria'
                : 'Preencha os dados da nova categoria'}
            </DialogDescription>
          </DialogHeader>
          <ToppingCategoryForm
            category={editingCategory}
            onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory}
            onCancel={() => {
              setIsCategoryDialogOpen(false);
              setEditingCategory(undefined);
            }}
            isSubmitting={createCategory.isPending || updateCategory.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Topping Dialog */}
      <AlertDialog
        open={!!deletingTopping}
        onOpenChange={(open) => !open && setDeletingTopping(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o complemento "{deletingTopping?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTopping}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Category Dialog */}
      <AlertDialog
        open={!!deletingCategory}
        onOpenChange={(open) => !open && setDeletingCategory(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a categoria "{deletingCategory?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
