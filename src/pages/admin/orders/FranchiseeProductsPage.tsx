'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Package, Search, Filter, Sparkles, LayoutGrid, Tag, Upload, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import {
    useFranchiseeProducts,
    useCreateFranchiseeProduct,
    useUpdateFranchiseeProduct,
    useDeleteFranchiseeProduct
} from '@/hooks/useFranchiseeProducts';
import { FranchiseeProductForm } from './components/FranchiseeProductForm';
import { CategoryManagementDialog } from './components/CategoryManagementDialog';
import { ImportSpreadsheetDialog } from './components/ImportSpreadsheetDialog';
import { ExportProductsDialog } from './components/ExportProductsDialog';
import { ProductImagePlaceholder } from './components/ProductImagePlaceholder';
import { formatBRL, cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

export default function FranchiseeProductsPage() {
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const { data: products, isLoading } = useFranchiseeProducts(selectedCategory === 'all' ? undefined : selectedCategory);

    const { data: categories } = useQuery({
        queryKey: ['franchisee_categories_admin'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('franchisee_product_categories' as any)
                .select('*')
                .order('display_order', { ascending: true });
            if (error) throw error;
            return data as any[];
        }
    });

    const createProduct = useCreateFranchiseeProduct();
    const updateProduct = useUpdateFranchiseeProduct();
    const deleteProduct = useDeleteFranchiseeProduct();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>();
    const [deletingProduct, setDeletingProduct] = useState<any>();

    const handleCreate = async (data: any) => {
        await createProduct.mutateAsync(data);
        setIsDialogOpen(false);
    };

    const handleUpdate = async (data: any) => {
        if (editingProduct) {
            await updateProduct.mutateAsync({
                id: editingProduct.id,
                ...data,
            });
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
            key: 'name',
            label: 'Insumo',
            render: (product: any) => (
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 shadow-sm border border-purple-100 dark:border-purple-500/20 overflow-hidden">
                        {product.image_url ? (
                            <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <ProductImagePlaceholder compact className="bg-transparent" />
                        )}
                    </div>
                    <div>
                        <p className="font-black text-sm text-gray-900 dark:text-white leading-tight">{product.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0 rounded-md bg-gray-100 dark:bg-white/5 text-gray-500">
                                {product.unit}
                            </Badge>
                            {product.display_order > 0 && (
                                <span className="text-[10px] text-gray-400 font-bold">Posição: {product.display_order}</span>
                            )}
                        </div>
                    </div>
                </div>
            )
        },
        {
            key: 'category',
            label: 'Categoria',
            render: (product: any) => (
                <Badge variant="outline" className="rounded-xl border-gray-100 dark:border-white/10 font-bold text-xs px-3 py-1 bg-white/50 dark:bg-white/5 backdrop-blur-sm">
                    {product.category?.name || '-'}
                </Badge>
            )
        },
        {
            key: 'code',
            label: 'Código',
            render: (product: any) => (
                <span className="font-mono text-xs text-gray-400 font-bold bg-gray-50 dark:bg-white/5 px-2 py-1 rounded">
                    {product.code || '-'}
                </span>
            )
        },
        {
            key: 'distribution_center',
            label: 'CD',
            render: (product: any) => (
                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border-0 font-bold text-[10px] rounded-lg">
                    {product.distribution_center?.name || 'Geral'}
                </Badge>
            )
        },
        {
            key: 'price',
            label: 'Custo de Venda',
            render: (product: any) => (
                <div className="flex flex-col">
                    <span className="font-black text-gray-900 dark:text-white">{formatBRL(product.price)}</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Preço Base</span>
                </div>
            )
        },
        {
            key: 'taxa',
            label: 'Taxa Boleto',
            render: (product: any) => (
                <div className="flex flex-col">
                    <span className={cn(
                        "font-bold text-sm",
                        product.taxa > 0 ? "text-orange-600" : "text-gray-300"
                    )}>
                        {product.taxa > 0 ? `+ ${formatBRL(product.taxa)}` : 'R$ 0,00'}
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Fixo p/ Item</span>
                </div>
            )
        },
        {
            key: 'advertising',
            label: 'Publi (%)',
            render: (product: any) => (
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "w-2 h-2 rounded-full",
                        product.has_advertising_fee ? "bg-blue-500 animate-pulse" : "bg-gray-200"
                    )} />
                    <span className={cn(
                        "font-black text-sm",
                        product.has_advertising_fee ? "text-blue-600" : "text-gray-400"
                    )}>
                        {product.has_advertising_fee ? `${product.advertising_fee_percentage}%` : '0%'}
                    </span>
                </div>
            )
        },
        {
            key: 'active',
            label: 'Status',
            render: (product: any) => (
                <Badge
                    variant={product.active ? 'default' : 'secondary'}
                    className={cn(
                        "rounded-xl border-0 font-black uppercase tracking-widest text-[10px] px-3",
                        product.active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400"
                    )}
                >
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
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-xl border-gray-100 dark:border-white/10 hover:bg-purple-50 dark:hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 transition-all active:scale-90"
                        onClick={() => {
                            setEditingProduct(product);
                            setIsDialogOpen(true);
                        }}
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-xl border-gray-100 dark:border-white/10 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-all active:scale-90"
                        onClick={() => setDeletingProduct(product)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="min-h-screen bg-[#FDFDFD] dark:bg-[#030303] text-gray-900 dark:text-gray-100">
            {/* Mesh Background */}
            <div className="fixed inset-0 pointer-events-none opacity-40 dark:opacity-20 transition-opacity">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-400 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-400 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <div className="relative z-10 p-8 max-w-7xl mx-auto space-y-12">
                <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-4"
                    >
                        <div className="flex items-center gap-2">
                            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0 flex gap-1.5 items-center px-4 py-1.5 rounded-full font-black text-[10px] tracking-widest uppercase">
                                <Sparkles className="h-3 w-3" />
                                Gestão Logística
                            </Badge>
                        </div>
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white">
                                Catálogo de Insumos
                            </h1>
                            <p className="text-gray-500 font-medium text-lg mt-2 max-w-2xl leading-relaxed">
                                Gerencie os produtos, preços e taxas disponíveis para toda a rede de franqueados.
                            </p>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-4"
                    >
                        <Button
                            onClick={() => setIsExportDialogOpen(true)}
                            variant="outline"
                            className="rounded-3xl h-16 px-8 border-purple-200 dark:border-white/10 hover:bg-purple-50 dark:hover:bg-purple-500/10 text-purple-600 dark:text-purple-400 font-black tracking-tight transition-all active:scale-95 group shadow-lg shadow-purple-500/5"
                        >
                            <Download className="h-5 w-5 mr-3 group-hover:translate-y-0.5 transition-transform duration-300" />
                            Exportar
                        </Button>

                        <Button
                            onClick={() => setIsImportDialogOpen(true)}
                            variant="outline"
                            className="rounded-3xl h-16 px-8 border-purple-200 dark:border-white/10 hover:bg-purple-50 dark:hover:bg-purple-500/10 text-purple-600 dark:text-purple-400 font-black tracking-tight transition-all active:scale-95 group shadow-lg shadow-purple-500/5"
                        >
                            <Upload className="h-5 w-5 mr-3 group-hover:-translate-y-0.5 transition-transform duration-300" />
                            Importar Planilha
                        </Button>

                        <Button
                            onClick={() => setIsCategoryDialogOpen(true)}
                            variant="outline"
                            className="rounded-3xl h-16 px-8 border-purple-200 dark:border-white/10 hover:bg-purple-50 dark:hover:bg-purple-500/10 text-purple-600 dark:text-purple-400 font-black tracking-tight transition-all active:scale-95 group shadow-lg shadow-purple-500/5"
                        >
                            <Tag className="h-5 w-5 mr-3 group-hover:rotate-12 transition-transform duration-300" />
                            Gerenciar Categorias
                        </Button>

                        <Button
                            onClick={() => setIsDialogOpen(true)}
                            className="bg-purple-600 hover:bg-purple-700 rounded-3xl h-16 px-10 shadow-2xl shadow-purple-500/30 text-lg font-black tracking-tight transition-all active:scale-95 group"
                        >
                            <Plus className="h-6 w-6 mr-3 group-hover:rotate-90 transition-transform duration-300" />
                            Novo Insumo
                        </Button>
                    </motion.div>
                </header>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row gap-5"
                >
                    <div className="relative flex-1 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                        <Input
                            placeholder="Buscar insumos por nome ou descrição..."
                            className="pl-14 h-16 rounded-[1.75rem] border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-xl focus:ring-purple-500 font-medium text-lg shadow-sm transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-3 bg-white/60 dark:bg-white/5 backdrop-blur-xl px-6 h-16 rounded-[1.75rem] border border-gray-200 dark:border-white/10 shadow-sm transition-all hover:border-purple-300 dark:hover:border-purple-500/30">
                            <Tag className="h-5 w-5 text-gray-400" />
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger className="border-0 focus:ring-0 w-[200px] font-black text-sm shadow-none bg-transparent h-auto p-0">
                                    <SelectValue placeholder="Categoria" />
                                </SelectTrigger>
                                <SelectContent className="rounded-[1.5rem] border-gray-100 dark:border-white/10 p-2 shadow-2xl">
                                    <SelectItem value="all" className="rounded-xl font-bold">Todas as categorias</SelectItem>
                                    {categories?.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id} className="rounded-xl font-bold">
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/40 dark:bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-gray-200/50 dark:border-white/10 overflow-hidden shadow-2xl shadow-purple-500/5"
                >
                    <DataTable
                        data={products || []}
                        columns={columns}
                        isLoading={isLoading}
                        searchPlaceholder="Buscar insumos..."
                        emptyMessage="Nenhum insumo encontrado para os filtros selecionados."
                    />
                </motion.div>
            </div>

            <CategoryManagementDialog
                open={isCategoryDialogOpen}
                onOpenChange={setIsCategoryDialogOpen}
            />

            <ImportSpreadsheetDialog
                open={isImportDialogOpen}
                onOpenChange={setIsImportDialogOpen}
            />

            <ExportProductsDialog
                open={isExportDialogOpen}
                onOpenChange={setIsExportDialogOpen}
                categorias={categories || []}
            />

            <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) setEditingProduct(undefined);
                }}
            >
                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white dark:bg-[#080808] border-0 rounded-[3.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)]">
                    <div className="grid grid-cols-1 md:grid-cols-12 h-full min-h-[600px]">
                        {/* Side Branding */}
                        <div className="hidden md:flex md:col-span-4 bg-gradient-to-br from-purple-600 via-indigo-600 to-indigo-900 p-12 flex-col justify-between relative overflow-hidden">
                            <div className="relative z-10">
                                <Package className="h-16 w-16 text-white mb-8 opacity-90" />
                                <h3 className="text-3xl font-black text-white tracking-tighter leading-[0.9]">Configuração de Produto</h3>
                                <p className="text-white/60 font-medium text-sm mt-4 leading-relaxed">Defina a logística, preços e taxas para operação logística.</p>
                            </div>

                            <div className="relative z-10 space-y-4">
                                <div className="flex items-center gap-3 text-white/40 group">
                                    <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-xs font-bold">1</div>
                                    <span className="text-xs font-black uppercase tracking-widest">Informações</span>
                                </div>
                                <div className="flex items-center gap-3 text-white/40">
                                    <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-xs font-bold">2</div>
                                    <span className="text-xs font-black uppercase tracking-widest">Pricing & Taxas</span>
                                </div>
                            </div>

                            {/* Decorative blobs */}
                            <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                            <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-indigo-400/10 rounded-full blur-3xl" />
                        </div>

                        <div className="col-span-1 md:col-span-8 p-12 overflow-y-auto max-h-[90vh]">
                            <DialogHeader className="mb-8">
                                <DialogTitle className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                                    {editingProduct ? 'Editar Insumo' : 'Cadastro de Insumo'}
                                </DialogTitle>
                                <DialogDescription className="text-gray-500 font-medium text-base">
                                    {editingProduct
                                        ? 'Ajuste as propriedades logísticas do produto selecionado.'
                                        : 'Adicione um novo item à rede de suprimentos Açaí no Grau.'}
                                </DialogDescription>
                            </DialogHeader>

                            <FranchiseeProductForm
                                product={editingProduct}
                                onSubmit={editingProduct ? handleUpdate : handleCreate}
                                onCancel={() => {
                                    setIsDialogOpen(false);
                                    setEditingProduct(undefined);
                                }}
                                isSubmitting={createProduct.isPending || updateProduct.isPending}
                            />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <AnimatePresence>
                {deletingProduct && (
                    <AlertDialog
                        open={!!deletingProduct}
                        onOpenChange={(open) => !open && setDeletingProduct(undefined)}
                        key="delete-alert"
                    >
                        <AlertDialogContent className="rounded-[3rem] border-0 p-10 bg-white dark:bg-[#080808] shadow-2xl">
                            <AlertDialogHeader>
                                <div className="w-20 h-20 rounded-3xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-500 mb-6">
                                    <Trash2 className="h-10 w-10" />
                                </div>
                                <AlertDialogTitle className="text-3xl font-black tracking-tight">Confirmar Exclusão</AlertDialogTitle>
                                <AlertDialogDescription className="text-gray-500 font-medium text-lg leading-relaxed mt-2">
                                    Tem certeza que deseja remover <span className="text-gray-900 dark:text-white font-black underline underline-offset-4 decoration-red-500/30">"{deletingProduct?.name}"</span>? Esta ação não pode ser desfeita e o item sumirá do catálogo dos franqueados imediatamente.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-10 gap-4">
                                <AlertDialogCancel className="h-14 rounded-2xl px-8 border-gray-100 dark:border-white/10 font-bold hover:bg-gray-50 transition-all">
                                    Manter Produto
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleDelete}
                                    className="bg-red-500 hover:bg-red-600 h-14 rounded-2xl px-10 text-white font-black shadow-xl shadow-red-500/20 transition-all active:scale-95"
                                >
                                    Excluir Agora
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </AnimatePresence>
        </div>
    );
}
