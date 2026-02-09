
import { useState, useEffect } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useIngredients } from "@/hooks/useIngredients";
import { useProductRecipes } from "@/hooks/useProductRecipes";
import { toast } from "sonner";

const recipeSchema = z.object({
    ingredients: z.array(
        z.object({
            ingredient_id: z.string().min(1, "Selecione um ingrediente"),
            quantity: z.number().min(0.001, "Quantidade deve ser maior que 0"),
            unit: z.string().min(1, "Unidade é obrigatória"),
        })
    ),
});

type RecipeFormData = z.infer<typeof recipeSchema>;

interface ProductRecipeManagerProps {
    productId: string;
}

export function ProductRecipeManager({ productId }: ProductRecipeManagerProps) {
    const { ingredients } = useIngredients();
    const { recipes, isLoading, saveRecipe } = useProductRecipes(productId);
    const [isEditing, setIsEditing] = useState(false);

    const form = useForm<RecipeFormData>({
        resolver: zodResolver(recipeSchema),
        defaultValues: {
            ingredients: [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "ingredients",
    });

    useEffect(() => {
        if (recipes) {
            // @ts-ignore - types mismatch on optional fields but structure is compatible
            form.reset({
                ingredients: recipes.map((r: any) => ({
                    ingredient_id: r.ingredient_id,
                    quantity: r.quantity,
                    unit: r.unit,
                })),
            });
        }
    }, [recipes, form]);

    const onSubmit = async (data: RecipeFormData) => {
        try {
            // Ensure data is valid based on schema before sending
            const validItems = data.ingredients.map(i => ({
                ingredient_id: i.ingredient_id,
                quantity: i.quantity,
                unit: i.unit
            }));

            await saveRecipe.mutateAsync({
                productId,
                items: validItems,
            });
            setIsEditing(false);
            // cost calculation would happen here or in the hook
        } catch (error) {
            console.error(error);
        }
    };

    const calculateTotalCost = () => {
        const currentIngredients = form.watch("ingredients");
        return currentIngredients.reduce((total, item) => {
            const ingredient = ingredients?.find((i) => i.id === item.ingredient_id);
            if (!ingredient) return total;

            // Simple logic: if unit matches, direct multiply. 
            // If not, we might need conversion or just assume user handles it.
            // For now, assuming unit matches or cost_per_unit is generic.
            // Ideally, converting units (g -> kg) is complex.
            // We'll use the cost_per_unit from ingredient directly if units match.

            return total + (ingredient.cost_per_unit || 0) * item.quantity;
        }, 0);
    };

    if (isLoading) return <div>Carregando receita...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium">Ficha Técnica</h3>
                    <p className="text-sm text-muted-foreground">
                        Defina os ingredientes que compõem este produto para baixa automática de estoque.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-sm font-medium mr-4">
                        Custo Total (Estimado): <span className="text-green-600">R$ {calculateTotalCost().toFixed(2)}</span>
                    </div>
                    {!isEditing ? (
                        <Button onClick={() => setIsEditing(true)} variant="outline">
                            Editar Receita
                        </Button>
                    ) : (
                        <>
                            <Button variant="ghost" onClick={() => {
                                form.reset({ ingredients: recipes?.map(r => ({ ingredient_id: r.ingredient_id, quantity: r.quantity, unit: r.unit })) || [] });
                                setIsEditing(false);
                            }}>
                                Cancelar
                            </Button>
                            <Button onClick={form.handleSubmit(onSubmit)}>
                                <Save className="w-4 h-4 mr-2" />
                                Salvar Receita
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ingrediente</TableHead>
                                    <TableHead className="w-[150px]">Quantidade</TableHead>
                                    <TableHead className="w-[150px]">Unidade</TableHead>
                                    <TableHead className="w-[150px] text-right">Custo</TableHead>
                                    {isEditing && <TableHead className="w-[50px]"></TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((field, index) => {
                                    const selectedIngredientId = form.watch(`ingredients.${index}.ingredient_id`);
                                    const quantity = form.watch(`ingredients.${index}.quantity`) || 0;
                                    const selectedIngredient = ingredients?.find(i => i.id === selectedIngredientId);
                                    const cost = (selectedIngredient?.cost_per_unit || 0) * quantity;

                                    return (
                                        <TableRow key={field.id}>
                                            <TableCell>
                                                {isEditing ? (
                                                    <FormField
                                                        control={form.control}
                                                        name={`ingredients.${index}.ingredient_id`}
                                                        render={({ field }) => (
                                                            <FormItem className="mb-0">
                                                                <Select
                                                                    onValueChange={(val) => {
                                                                        field.onChange(val);
                                                                        const ing = ingredients?.find(i => i.id === val);
                                                                        if (ing) {
                                                                            form.setValue(`ingredients.${index}.unit`, ing.unit);
                                                                        }
                                                                    }}
                                                                    value={field.value}
                                                                >
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Selecione..." />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        {ingredients?.map((ingredient) => (
                                                                            <SelectItem key={ingredient.id} value={ingredient.id}>
                                                                                {ingredient.name} (R$ {ingredient.cost_per_unit?.toFixed(2)}/{ingredient.unit})
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </FormItem>
                                                        )}
                                                    />
                                                ) : (
                                                    <span>{ingredients?.find(i => i.id === selectedIngredientId)?.name || 'Ingrediente removido'}</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {isEditing ? (
                                                    <FormField
                                                        control={form.control}
                                                        name={`ingredients.${index}.quantity`}
                                                        render={({ field }) => (
                                                            <FormItem className="mb-0">
                                                                <FormControl>
                                                                    <Input
                                                                        type="number"
                                                                        step="0.001"
                                                                        {...field}
                                                                        onChange={e => field.onChange(parseFloat(e.target.value))}
                                                                    />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                ) : (
                                                    <span>{quantity}</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {isEditing ? (
                                                    <FormField
                                                        control={form.control}
                                                        name={`ingredients.${index}.unit`}
                                                        render={({ field }) => (
                                                            <FormItem className="mb-0">
                                                                <Select onValueChange={field.onChange} value={field.value}>
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        <SelectItem value="kg">kg</SelectItem>
                                                                        <SelectItem value="g">g</SelectItem>
                                                                        <SelectItem value="l">l</SelectItem>
                                                                        <SelectItem value="ml">ml</SelectItem>
                                                                        <SelectItem value="un">un</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </FormItem>
                                                        )}
                                                    />
                                                ) : (
                                                    <span>{form.watch(`ingredients.${index}.unit`)}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                R$ {cost.toFixed(2)}
                                            </TableCell>
                                            {isEditing && (
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        type="button"
                                                        onClick={() => remove(index)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    );
                                })}
                                {fields.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={isEditing ? 5 : 4} className="text-center text-muted-foreground py-8">
                                            Nenhum ingrediente adicionado à receita.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {isEditing && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => append({ ingredient_id: "", quantity: 1, unit: "un" })}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar Ingrediente
                        </Button>
                    )}
                </form>
            </Form>
        </div>
    );
}
