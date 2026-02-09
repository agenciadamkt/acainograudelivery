
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/admin/DataTable';
import { useIngredients } from '@/hooks/useIngredients';
import { useProducts } from '@/hooks/useProducts';
import { StockMovementDialog } from './StockMovementDialog';

export default function EstoquePage() {
    const { ingredients, isLoading: loadingIngredients } = useIngredients();
    const { data: products, isLoading: loadingProducts } = useProducts();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedIngredient, setSelectedIngredient] = useState<string | undefined>();

    const ingredientColumns = [
        { key: 'name', label: 'Ingrediente' },
        { key: 'unit', label: 'Unidade' },
        {
            key: 'current_stock',
            label: 'Estoque Atual',
            render: (row: any) => (
                <span className={row.current_stock <= row.minimum_stock ? "text-red-500 font-bold" : ""}>
                    {row.current_stock}
                </span>
            )
        },
        { key: 'minimum_stock', label: 'Mínimo' },
        {
            key: 'actions',
            label: 'Ações',
            render: (row: any) => (
                <Button variant="ghost" size="sm" onClick={() => {
                    setSelectedIngredient(row.id);
                    setIsDialogOpen(true);
                }}>
                    Movimentar
                </Button>
            )
        }
    ];

    const productColumns = [
        { key: 'name', label: 'Produto' },
        {
            key: 'current_stock',
            label: 'Estoque Atual',
            render: (row: any) => (
                <span className={row.current_stock <= row.minimum_stock ? "text-red-500 font-bold" : ""}>
                    {row.current_stock} {row.unit}
                </span>
            )
        },
        { key: 'minimum_stock', label: 'Mínimo' },
        {
            key: 'category',
            label: 'Categoria',
            render: (row: any) => row.category || row.category_id // handle both if populated
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Gerenciamento de Estoque</h1>
                    <p className="text-muted-foreground">
                        Acompanhe o estoque de ingredientes e produtos
                    </p>
                </div>
                <Button onClick={() => { setSelectedIngredient(undefined); setIsDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Movimentação
                </Button>
            </div>

            <Tabs defaultValue="ingredients">
                <TabsList>
                    <TabsTrigger value="ingredients">Ingredientes / Insumos</TabsTrigger>
                    <TabsTrigger value="products">Produtos Finais</TabsTrigger>
                </TabsList>

                <TabsContent value="ingredients" className="space-y-4">
                    <DataTable
                        columns={ingredientColumns}
                        data={ingredients || []}
                        isLoading={loadingIngredients}
                        searchPlaceholder="Buscar ingredientes..."
                        emptyMessage="Nenhum ingrediente cadastrado."
                    />
                </TabsContent>

                <TabsContent value="products" className="space-y-4">
                    <div className="text-sm text-muted-foreground mb-4">
                        * O estoque de produtos é deduzido automaticamente com base nas vendas. Se o produto tiver receita, os ingredientes serão baixados.
                    </div>
                    <DataTable
                        columns={productColumns}
                        data={products || []}
                        isLoading={loadingProducts}
                        searchPlaceholder="Buscar produtos..."
                        emptyMessage="Nenhum produto cadastrado."
                    />
                </TabsContent>
            </Tabs>

            <StockMovementDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                defaultIngredientId={selectedIngredient}
            />
        </div>
    );
}
