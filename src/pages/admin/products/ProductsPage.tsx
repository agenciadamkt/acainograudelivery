import { useState } from 'react';
import { Plus, Pencil, Trash2, Image as ImageIcon } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/admin/DataTable';
import { ProductForm } from '@/components/admin/ProductForm';
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useCreateProductSize, useUpdateProductSize } from '@/hooks/useProductSizes';

export default function ProductsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { data: products, isLoading } = useProducts(selectedCategory === 'all' ? undefined : selectedCategory);
  const { data: categories } = useCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const createSize = useCreateProductSize();
  const updateSize = useUpdateProductSize();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>();
  const [deletingProduct, setDeletingProduct] = useState<any>();

  const handleCreate = async (data: any) => {
    const { sizes, ...productData } = data;
    const product = await createProduct.mutateAsync(productData);
    
    // Criar tamanhos
    for (const size of sizes) {
      await createSize.mutateAsync({
        ...size,
        product_id: product.id,
      });
    }
    
    setIsDialogOpen(false);
  };

  const handleUpdate = async (data: any) => {
    if (editingProduct) {
      const { sizes, ...productData } = data;
      await updateProduct.mutateAsync({ 
        id: editingProduct.id, 
        ...productData,
        active: data.active
      });
      
      // Atualizar tamanhos existentes
      for (const size of sizes) {
        if (size.id) {
          await updateSize.mutateAsync({
            id: size.id,
            product_id: editingProduct.id,
            ...size,
          });
        } else {
          await createSize.mutateAsync({
            ...size,
            product_id: editingProduct.id,
          });
        }
      }
      
      setEditingProduct(undefined);
      setIsDialogOpen(false);
    }
  };

  const handleDelete = async () => {
    if (deletingProduct) {
      await deleteProduct.mutateAsync(deletingProduct.id);
      setDeletingProduct(undefined);
    }
  };

  const columns = [
    {
      key: 'base_image_url',
      label: 'Imagem',
      render: (product: any) => (
        <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center overflow-hidden">
          {product.base_image_url ? (
            <img
              src={product.base_image_url}
              alt={product.name}
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
      render: (product: any) => product.category?.name || '-',
    },
    {
      key: 'sizes',
      label: 'Tamanhos',
      render: (product: any) => (
        <span className="text-sm text-muted-foreground">
          {product.sizes?.length || 0} tamanhos
        </span>
      ),
    },
    {
      key: 'active',
      label: 'Status',
      render: (product: any) => (
        <Badge variant={product.active ? 'default' : 'secondary'}>
          {product.active ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (product: any) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditingProduct({
                ...product,
                category_id: product.category?.id || product.category_id,
              });
              setIsDialogOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeletingProduct(product)}
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
          <h1 className="text-3xl font-bold">Produtos</h1>
          <p className="text-muted-foreground">
            Gerencie o cardápio de produtos
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Todas as categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories?.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={products || []}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Buscar produtos..."
        emptyMessage="Nenhum produto cadastrado"
      />

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingProduct(undefined);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? 'Edite as informações do produto'
                : 'Preencha os dados do novo produto'}
            </DialogDescription>
          </DialogHeader>
          <ProductForm
            product={editingProduct}
            onSubmit={editingProduct ? handleUpdate : handleCreate}
            onCancel={() => {
              setIsDialogOpen(false);
              setEditingProduct(undefined);
            }}
            isSubmitting={
              createProduct.isPending ||
              updateProduct.isPending ||
              createSize.isPending ||
              updateSize.isPending
            }
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingProduct}
        onOpenChange={(open) => !open && setDeletingProduct(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o produto "{deletingProduct?.name}"?
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
