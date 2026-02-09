
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, AlertTriangle, ArrowUpDown } from 'lucide-react';
import { useIngredients, Ingredient } from '@/hooks/useIngredients';
import { IngredientForm } from '@/components/admin/ingredients/IngredientForm';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export default function Ingredientes() {
    const { ingredients, isLoading, deleteIngredient } = useIngredients();
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);

    // Filter logic
    const filtered = ingredients?.filter(i => {
        const matchesSearch =
            i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.category.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = categoryFilter === 'all' || i.category === categoryFilter;

        return matchesSearch && matchesCategory;
    }) || [];

    const handleEdit = (ingredient: Ingredient) => {
        setSelectedIngredient(ingredient);
        setIsDialogOpen(true);
    };

    const handleCreate = () => {
        setSelectedIngredient(null);
        setIsDialogOpen(true);
    };

    const handleDelete = (id: string, name: string) => {
        if (confirm(`Tem certeza que deseja excluir "${name}"?`)) {
            deleteIngredient.mutate(id);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Ingredientes</h2>
                    <p className="text-muted-foreground">Gerencie seu estoque de matéria-prima e custos.</p>
                </div>
                <Button onClick={handleCreate} className="gap-2 shadow-lg hover:shadow-xl transition-all">
                    <Plus className="h-4 w-4" /> Novo Ingrediente
                </Button>
            </div>

            <Card className="border-none shadow-md">
                <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <CardTitle className="hidden md:block">Visão Geral</CardTitle>
                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar ingrediente..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Categoria" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as Categorias</SelectItem>
                                    <SelectItem value="Frutas">Frutas</SelectItem>
                                    <SelectItem value="Complementos">Complementos</SelectItem>
                                    <SelectItem value="Caldas">Caldas</SelectItem>
                                    <SelectItem value="Outros">Outros</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Categoria</TableHead>
                                    <TableHead>Custo Médio</TableHead>
                                    <TableHead>Estoque</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-32">
                                            <div className="flex justify-center items-center h-full">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                                            Nenhum ingrediente encontrado.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filtered.map((ing) => (
                                        <TableRow key={ing.id} className="hover:bg-muted/50 transition-colors">
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span>{ing.name}</span>
                                                    {ing.supplier && (
                                                        <span className="text-[10px] text-muted-foreground">Forn: {ing.supplier}</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-normal">
                                                    {ing.category}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                R$ {ing.cost_per_unit?.toFixed(2)} / {ing.unit}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className={ing.current_stock <= ing.minimum_stock ? "text-destructive font-bold flex items-center gap-1" : "font-medium"}>
                                                        {ing.current_stock} {ing.unit}
                                                        {ing.current_stock <= ing.minimum_stock && <AlertTriangle className="h-3 w-3" />}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">Mín: {ing.minimum_stock} {ing.unit}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {ing.is_active ? (
                                                    <Badge className="bg-emerald-500 hover:bg-emerald-600">Ativo</Badge>
                                                ) : (
                                                    <Badge variant="secondary">Inativo</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(ing)} className="h-8 w-8 hover:text-primary">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(ing.id, ing.name)} className="h-8 w-8 hover:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <IngredientForm
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                ingredient={selectedIngredient}
                onSuccess={() => {
                    // Refresh is handled by react-query invalidation in the hook
                }}
            />
        </div>
    );
}
