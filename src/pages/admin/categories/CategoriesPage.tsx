import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { CategoryForm } from '@/components/admin/CategoryForm';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  Category,
} from '@/hooks/useCategories';

export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>();
  const [deletingCategory, setDeletingCategory] = useState<Category | undefined>();

  // As mutations já avisam o usuário pelo toast em onError. Sem o catch, a
  // rejeição do mutateAsync escapa pelo handleSubmit do react-hook-form e vira
  // um "unhandledrejection" global — mantemos o diálogo aberto para o usuário
  // corrigir e tentar de novo.
  const handleCreate = async (data: any) => {
    try {
      await createCategory.mutateAsync(data);
      setIsDialogOpen(false);
    } catch {
      /* erro já reportado via toast */
    }
  };

  const handleUpdate = async (data: any) => {
    if (editingCategory) {
      try {
        await updateCategory.mutateAsync({ id: editingCategory.id, ...data });
        setEditingCategory(undefined);
        setIsDialogOpen(false);
      } catch {
        /* erro já reportado via toast */
      }
    }
  };

  const handleDelete = async () => {
    if (deletingCategory) {
      try {
        await deleteCategory.mutateAsync(deletingCategory.id);
      } catch {
        /* erro já reportado via toast */
      }
      setDeletingCategory(undefined);
    }
  };

  const columns = [
    {
      key: 'icon',
      label: 'Ícone',
      render: (cat: Category) => (
        <span className="text-2xl">{cat.icon || '📦'}</span>
      ),
    },
    {
      key: 'name',
      label: 'Nome',
    },
    {
      key: 'active',
      label: 'Status',
      render: (cat: Category) => (
        <Badge variant={cat.active ? 'default' : 'secondary'}>
          {cat.active ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'display_order',
      label: 'Ordem',
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (cat: Category) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditingCategory(cat);
              setIsDialogOpen(true);
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
          <h1 className="text-3xl font-bold">Categorias</h1>
          <p className="text-muted-foreground">
            Gerencie as categorias de produtos
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      <DataTable
        data={categories || []}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Buscar categorias..."
        emptyMessage="Nenhuma categoria cadastrada"
      />

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
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
          <CategoryForm
            category={editingCategory}
            onSubmit={editingCategory ? handleUpdate : handleCreate}
            onCancel={() => {
              setIsDialogOpen(false);
              setEditingCategory(undefined);
            }}
            isSubmitting={createCategory.isPending || updateCategory.isPending}
          />
        </DialogContent>
      </Dialog>

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
              onClick={handleDelete}
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
